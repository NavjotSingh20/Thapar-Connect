package com.thaparconnect.backend.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    String store(MultipartFile file, String subDir);
    void delete(String fileUrl);
    Resource loadAsResource(String filename);
    Resource loadAsResource(String subDir, String filename);
}
