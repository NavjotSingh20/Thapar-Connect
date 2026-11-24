package com.thaparconnect.backend.storage;

import com.thaparconnect.backend.common.ApiException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class StorageServiceTest {

    private LocalStorageService storageService;

    @TempDir
    Path tempStorageDir;

    @BeforeEach
    void setUp() {
        storageService = new LocalStorageService();
        ReflectionTestUtils.setField(storageService, "localDir", tempStorageDir.toString());
        ReflectionTestUtils.setField(storageService, "baseUrl", "/api/v1/storage");
        storageService.init();
    }

    private byte[] createTestImageBytes(String format) throws IOException {
        BufferedImage img = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, format, baos);
        return baos.toByteArray();
    }

    @Test
    void store_validPngImage_storesSuccessfully() throws IOException {
        byte[] bytes = createTestImageBytes("png");
        MockMultipartFile file = new MockMultipartFile(
                "images",
                "test-image.png",
                "image/png",
                bytes
        );

        String url = storageService.store(file, "marketplace");

        assertNotNull(url);
        assertTrue(url.startsWith("/api/v1/storage/marketplace/"));
        assertTrue(url.endsWith(".png"));

        String filename = url.substring(url.lastIndexOf('/') + 1);
        Resource resource = storageService.loadAsResource("marketplace", filename);
        assertTrue(resource.exists());
        assertTrue(resource.isReadable());
    }

    @Test
    void store_validJpegImage_storesSuccessfully() throws IOException {
        byte[] bytes = createTestImageBytes("jpeg");
        MockMultipartFile file = new MockMultipartFile(
                "images",
                "test-image.jpg",
                "image/jpeg",
                bytes
        );

        String url = storageService.store(file, "marketplace");

        assertNotNull(url);
        assertTrue(url.startsWith("/api/v1/storage/marketplace/"));
        assertTrue(url.endsWith(".jpg"));
    }

    @Test
    void store_nullOrEmptyFile_throwsBadRequest() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "images",
                "empty.png",
                "image/png",
                new byte[0]
        );

        ApiException ex = assertThrows(ApiException.class, () -> storageService.store(emptyFile, "marketplace"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_FILE", ex.getError());
    }

    @Test
    void store_oversizedFileExceeding5MB_throwsBadRequest() {
        byte[] largeBytes = new byte[6 * 1024 * 1024]; // 6MB
        MockMultipartFile file = new MockMultipartFile(
                "images",
                "huge.png",
                "image/png",
                largeBytes
        );

        ApiException ex = assertThrows(ApiException.class, () -> storageService.store(file, "marketplace"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("FILE_TOO_LARGE", ex.getError());
    }

    @Test
    void store_nonImageMimeType_throwsBadRequest() {
        MockMultipartFile exeFile = new MockMultipartFile(
                "images",
                "malware.exe",
                "application/x-msdownload",
                "MZ...fake exe".getBytes()
        );

        ApiException ex = assertThrows(ApiException.class, () -> storageService.store(exeFile, "marketplace"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_FILE_TYPE", ex.getError());

        MockMultipartFile pdfFile = new MockMultipartFile(
                "images",
                "document.pdf",
                "application/pdf",
                "%PDF-1.4...".getBytes()
        );

        ApiException exPdf = assertThrows(ApiException.class, () -> storageService.store(pdfFile, "marketplace"));
        assertEquals(HttpStatus.BAD_REQUEST, exPdf.getStatus());
    }

    @Test
    void store_disguisedScriptWithPngExtension_throwsBadRequest() {
        // Disguised script with PNG mime type but invalid content
        byte[] scriptBytes = "#!/bin/bash\necho exploit\n".getBytes();
        MockMultipartFile disguisedFile = new MockMultipartFile(
                "images",
                "disguised.png",
                "image/png",
                scriptBytes
        );

        ApiException ex = assertThrows(ApiException.class, () -> storageService.store(disguisedFile, "marketplace"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_IMAGE_CONTENT", ex.getError());
    }

    @Test
    void store_pathTraversalInFilename_throwsBadRequest() throws IOException {
        byte[] bytes = createTestImageBytes("png");
        MockMultipartFile traversalFile = new MockMultipartFile(
                "images",
                "../../../../etc/passwd.png",
                "image/png",
                bytes
        );

        ApiException ex = assertThrows(ApiException.class, () -> storageService.store(traversalFile, "marketplace"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_FILENAME", ex.getError());
    }

    @Test
    void store_nullByteInFilename_throwsBadRequest() throws IOException {
        byte[] bytes = createTestImageBytes("png");
        MockMultipartFile nullByteFile = new MockMultipartFile(
                "images",
                "photo.png\0.exe",
                "image/png",
                bytes
        );

        ApiException ex = assertThrows(ApiException.class, () -> storageService.store(nullByteFile, "marketplace"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_FILENAME", ex.getError());
    }

    @Test
    void delete_removesStoredFileFromDisk() throws IOException {
        byte[] bytes = createTestImageBytes("png");
        MockMultipartFile file = new MockMultipartFile(
                "images",
                "to-delete.png",
                "image/png",
                bytes
        );

        String url = storageService.store(file, "marketplace");
        String filename = url.substring(url.lastIndexOf('/') + 1);

        Resource before = storageService.loadAsResource("marketplace", filename);
        assertTrue(before.exists());

        storageService.delete(url);

        assertThrows(Exception.class, () -> storageService.loadAsResource("marketplace", filename));
    }
}
