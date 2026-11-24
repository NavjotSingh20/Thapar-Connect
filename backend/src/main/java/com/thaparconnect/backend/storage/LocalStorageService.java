package com.thaparconnect.backend.storage;

import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.ResourceNotFoundException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@Primary
public class LocalStorageService implements StorageService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg",
            "jpeg",
            "png",
            "webp"
    );

    @Value("${app.storage.local-dir:uploads}")
    private String localDir;

    @Value("${app.storage.base-url:/api/v1/storage}")
    private String baseUrl;

    private Path rootStoragePath;

    @PostConstruct
    public void init() {
        this.rootStoragePath = Paths.get(localDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootStoragePath);
            Files.createDirectories(this.rootStoragePath.resolve("marketplace"));
        } catch (IOException e) {
            log.error("Could not initialize local storage directory: {}", rootStoragePath, e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_INIT_FAILED", "Failed to initialize storage directory");
        }
    }

    @Override
    public String store(MultipartFile file, String subDir) {
        if (file == null || file.isEmpty() || file.getSize() == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Image file is empty or missing");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE", "Image file size exceeds the 5MB limit");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            if (originalFilename.contains("\0")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILENAME", "Filename contains invalid null byte characters");
            }
            if (originalFilename.contains("..") || originalFilename.contains("/") || originalFilename.contains("\\")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILENAME", "Filename contains path traversal sequences");
            }
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_TYPE", "Only JPEG, PNG, and WebP images are allowed");
        }

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "READ_ERROR", "Failed to read image content");
        }

        // Validate image content integrity
        boolean isWebp = isWebPImage(fileBytes);
        BufferedImage bufferedImage = null;
        try {
            bufferedImage = ImageIO.read(new ByteArrayInputStream(fileBytes));
        } catch (Exception ignored) {
            // WebP or other images may not decode via standard ImageIO
        }

        if (bufferedImage == null && !isWebp) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE_CONTENT", "File content is not a valid or readable image");
        }

        // Determine extension
        String extension = determineExtension(contentType, originalFilename);

        // Sanitize subDir
        String sanitizedSubDir = sanitizePathPart(subDir != null ? subDir : "marketplace");

        // Generate UUID filename to ensure clean path without any traversal
        String uniqueFilename = UUID.randomUUID().toString() + "." + extension;
        Path targetDir = rootStoragePath.resolve(sanitizedSubDir).normalize();
        Path targetPath = targetDir.resolve(uniqueFilename).normalize();

        if (!targetPath.startsWith(rootStoragePath)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PATH", "Storage path resolves outside allowed directory");
        }

        try {
            Files.createDirectories(targetDir);
            if (bufferedImage != null && ("jpg".equalsIgnoreCase(extension) || "jpeg".equalsIgnoreCase(extension) || "png".equalsIgnoreCase(extension))) {
                // Compress / re-encode image to strip any malicious trailing payloads/scripts
                String formatName = "png".equalsIgnoreCase(extension) ? "png" : "jpeg";
                boolean written = ImageIO.write(bufferedImage, formatName, targetPath.toFile());
                if (!written) {
                    Files.write(targetPath, fileBytes);
                }
            } else {
                Files.write(targetPath, fileBytes);
            }
        } catch (IOException e) {
            log.error("Failed to store file on disk: {}", targetPath, e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_WRITE_FAILED", "Failed to save image to disk");
        }

        String normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return normalizedBaseUrl + "/" + sanitizedSubDir + "/" + uniqueFilename;
    }

    @Override
    public Resource loadAsResource(String filename) {
        return loadAsResource(null, filename);
    }

    @Override
    public Resource loadAsResource(String subDir, String filename) {
        if (!StringUtils.hasText(filename)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILENAME", "Filename must be provided");
        }

        if (filename.contains("\0") || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PATH", "Path traversal sequences are not allowed");
        }

        Path filePath;
        if (StringUtils.hasText(subDir)) {
            String sanitizedSubDir = sanitizePathPart(subDir);
            filePath = rootStoragePath.resolve(sanitizedSubDir).resolve(filename).normalize();
        } else {
            filePath = rootStoragePath.resolve(filename).normalize();
        }

        if (!filePath.startsWith(rootStoragePath)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PATH", "Path resolves outside allowed directory");
        }

        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File", "filename", filename);
            }
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("File", "filename", filename);
        }
    }

    @Override
    public void delete(String fileUrl) {
        if (!StringUtils.hasText(fileUrl)) {
            return;
        }

        String normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        String relativePath = fileUrl;
        if (fileUrl.startsWith(normalizedBaseUrl)) {
            relativePath = fileUrl.substring(normalizedBaseUrl.length());
        }

        if (relativePath.contains("\0") || relativePath.contains("..")) {
            log.warn("Attempted path traversal in delete: {}", fileUrl);
            return;
        }

        Path target = rootStoragePath.resolve(relativePath).normalize();
        if (target.startsWith(rootStoragePath) && Files.exists(target)) {
            try {
                Files.deleteIfExists(target);
                log.info("Deleted stored file: {}", target);
            } catch (IOException e) {
                log.warn("Failed to delete file: {}", target, e);
            }
        }
    }

    private boolean isWebPImage(byte[] bytes) {
        if (bytes == null || bytes.length < 12) {
            return false;
        }
        // RIFF header
        boolean isRiff = bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F';
        // WEBP header at byte offset 8
        boolean isWebp = bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
        return isRiff && isWebp;
    }

    private String determineExtension(String contentType, String originalFilename) {
        if ("image/png".equalsIgnoreCase(contentType)) {
            return "png";
        }
        if ("image/webp".equalsIgnoreCase(contentType)) {
            return "webp";
        }
        if ("image/jpeg".equalsIgnoreCase(contentType)) {
            return "jpg";
        }

        if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
            String ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
            if (ALLOWED_EXTENSIONS.contains(ext)) {
                return "jpeg".equalsIgnoreCase(ext) ? "jpg" : ext;
            }
        }
        return "jpg";
    }

    private String sanitizePathPart(String part) {
        if (part == null) {
            return "marketplace";
        }
        String clean = part.replaceAll("[^a-zA-Z0-9_-]", "");
        return clean.isEmpty() ? "marketplace" : clean;
    }
}
