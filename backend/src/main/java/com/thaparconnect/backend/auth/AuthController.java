package com.thaparconnect.backend.auth;

import com.thaparconnect.backend.auth.dto.AuthResponse;
import com.thaparconnect.backend.auth.dto.DevLoginRequest;
import com.thaparconnect.backend.auth.dto.GoogleLoginRequest;
import com.thaparconnect.backend.auth.dto.TokenRefreshResponse;
import com.thaparconnect.backend.common.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for Google OAuth login, dev login, token refresh, and logout")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/google")
    @Operation(summary = "Google OAuth login", description = "Verifies Google ID token and returns JWT access token + refresh cookie")
    public ResponseEntity<AuthResponse> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        AuthService.AuthExecutionResult result = authService.loginWithGoogle(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, result.refreshCookie().toString())
                .body(result.authResponse());
    }

    @PostMapping("/dev-login")
    @Operation(summary = "Developer mock login", description = "Simulated login for testing with @thapar.edu emails")
    public ResponseEntity<AuthResponse> devLogin(@Valid @RequestBody DevLoginRequest request) {
        AuthService.AuthExecutionResult result = authService.devLogin(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, result.refreshCookie().toString())
                .body(result.authResponse());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh JWT access token", description = "Rotates refresh token and returns new access token")
    public ResponseEntity<TokenRefreshResponse> refreshToken(
            @CookieValue(name = "refreshToken", required = false) String refreshTokenCookie,
            HttpServletRequest request
    ) {
        String token = refreshTokenCookie;
        if (token == null && request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("refreshToken".equalsIgnoreCase(c.getName()) || "refresh_token".equalsIgnoreCase(c.getName())) {
                    token = c.getValue();
                    break;
                }
            }
        }

        if (token == null || token.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Refresh token cookie is missing");
        }

        AuthService.RefreshExecutionResult result = authService.refreshToken(token);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, result.refreshCookie().toString())
                .body(result.response());
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Revokes refresh token and clears session cookie")
    public ResponseEntity<Map<String, String>> logout(
            @CookieValue(name = "refreshToken", required = false) String refreshTokenCookie,
            HttpServletRequest request
    ) {
        String token = refreshTokenCookie;
        if (token == null && request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("refreshToken".equalsIgnoreCase(c.getName()) || "refresh_token".equalsIgnoreCase(c.getName())) {
                    token = c.getValue();
                    break;
                }
            }
        }

        ResponseCookie clearCookie = authService.logout(token);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .body(Map.of("message", "Logged out successfully"));
    }
}
