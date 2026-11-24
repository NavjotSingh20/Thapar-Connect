package com.thaparconnect.backend.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
public class CloudinaryStorageService implements StorageService {

    @Override
    public String store(MultipartFile file, String subDir) {
        log.info("Cloudinary pluggable storage skeleton invoked for file: {}", file != null ? file.getOriginalFilename() : "null");
        throw new UnsupportedOperationException("Cloudinary storage is configured for production deployments only");
    }

    @Override
    public void delete(String fileUrl) {
        log.info("Cloudinary delete skeleton invoked for url: {}", fileUrl);
    }

    @Override
    public Resource loadAsResource(String filename) {
        throw new UnsupportedOperationException("Cloudinary serves resources directly from CDN");
    }

    @Override
    public Resource loadAsResource(String subDir, String filename) {
        throw new UnsupportedOperationException("Cloudinary serves resources directly from CDN");
    }
}
