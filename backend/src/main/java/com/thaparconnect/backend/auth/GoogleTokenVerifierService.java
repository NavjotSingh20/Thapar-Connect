package com.thaparconnect.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.thaparconnect.backend.common.ApiException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Slf4j
@Service
public class GoogleTokenVerifierService {

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Value("${app.auth.allow-mock-tokens:false}")
    private boolean allowMockTokens;

    private final ObjectMapper objectMapper;
    private GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifierService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        if (this.verifier == null) {
            try {
                GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                        new NetHttpTransport(),
                        GsonFactory.getDefaultInstance()
                );

                if (googleClientId != null && !googleClientId.isBlank()) {
                    builder.setAudience(Collections.singletonList(googleClientId));
                }

                this.verifier = builder.build();
            } catch (Exception e) {
                log.warn("Could not initialize live GoogleIdTokenVerifier: {}", e.getMessage());
            }
        }
    }

    void setVerifier(GoogleIdTokenVerifier verifier) {
        this.verifier = verifier;
    }

    void setGoogleClientId(String googleClientId) {
        this.googleClientId = googleClientId;
    }

    void setAllowMockTokens(boolean allowMockTokens) {
        this.allowMockTokens = allowMockTokens;
    }

    public record GoogleUserInfo(String email, String name, String pictureUrl) {}

    public GoogleUserInfo verify(String idTokenString) {
        if (idTokenString == null || idTokenString.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Google ID token must not be empty");
        }

        // 1. Check for simulated mock token format used by automated tests (e.g., mock-token-for-user@thapar.edu)
        // Allowed ONLY in local dev / testing or when client-id is not configured
        if (idTokenString.startsWith("mock-token-for-")) {
            if (!allowMockTokens && (googleClientId != null && !googleClientId.isBlank())) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Mock tokens are disabled in production");
            }
            String email = idTokenString.substring("mock-token-for-".length()).trim();
            validateDomain(email);
            String name = email.contains("@") ? email.split("@")[0].replace('.', ' ') : "Mock User";
            return new GoogleUserInfo(email, name, null);
        }

        // 2. Standard tokens MUST be cryptographically validated with verifier.verify(idTokenString).
        // Any 3-part dot-separated JWT must never bypass signature verification.
        if (verifier == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Google token verifier is not configured");
        }

        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Invalid Google ID token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "EMAIL_NOT_VERIFIED", "Google email is not verified");
            }

            String email = payload.getEmail();
            validateDomain(email);

            String name = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");
            return new GoogleUserInfo(email, name != null ? name : email.split("@")[0], pictureUrl);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google token verification exception: {}", e.getMessage());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Invalid Google ID token");
        }
    }

    private void validateDomain(String email) {
        if (email == null || !email.trim().toLowerCase().matches("^[a-z0-9._%+-]+@thapar\\.edu$")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "INVALID_DOMAIN", "Access restricted to @thapar.edu domain");
        }
    }
}
