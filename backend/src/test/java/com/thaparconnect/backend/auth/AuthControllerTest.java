package com.thaparconnect.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thaparconnect.backend.auth.dto.AuthResponse;
import com.thaparconnect.backend.auth.dto.DevLoginRequest;
import com.thaparconnect.backend.auth.dto.GoogleLoginRequest;
import com.thaparconnect.backend.auth.dto.TokenRefreshResponse;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.GlobalExceptionHandler;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.dto.UserDto;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void loginWithGoogle_validRequest_returns200AndSetCookie() throws Exception {
        UserDto userDto = UserDto.builder()
                .id(UUID.randomUUID())
                .email("student@thapar.edu")
                .fullName("Thapar Student")
                .role(Role.USER)
                .isOnboarded(false)
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mock-jwt-access-token")
                .user(userDto)
                .build();

        ResponseCookie cookie = ResponseCookie.from("refreshToken", "mock-refresh-token")
                .httpOnly(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(604800)
                .build();

        when(authService.loginWithGoogle(any(GoogleLoginRequest.class)))
                .thenReturn(new AuthService.AuthExecutionResult(authResponse, cookie));

        GoogleLoginRequest request = GoogleLoginRequest.builder()
                .idToken("valid-google-id-token")
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=mock-refresh-token")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Strict")))
                .andExpect(jsonPath("$.accessToken").value("mock-jwt-access-token"))
                .andExpect(jsonPath("$.user.email").value("student@thapar.edu"));
    }

    @Test
    void loginWithGoogle_blankIdToken_returns400ValidationFailed() throws Exception {
        GoogleLoginRequest request = GoogleLoginRequest.builder()
                .idToken("")
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    void loginWithGoogle_nonThaparDomain_returns403() throws Exception {
        when(authService.loginWithGoogle(any(GoogleLoginRequest.class)))
                .thenThrow(new ApiException(HttpStatus.FORBIDDEN, "INVALID_DOMAIN", "Access restricted to @thapar.edu domain"));

        GoogleLoginRequest request = GoogleLoginRequest.builder()
                .idToken("mock-token-for-outsider@gmail.com")
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("INVALID_DOMAIN"));
    }

    @Test
    void loginWithGoogle_invalidSignature_returns401() throws Exception {
        when(authService.loginWithGoogle(any(GoogleLoginRequest.class)))
                .thenThrow(new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Invalid Google ID token"));

        GoogleLoginRequest request = GoogleLoginRequest.builder()
                .idToken("forged-id-token")
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("INVALID_TOKEN"));
    }

    @Test
    void devLogin_validRequest_returns200AndSetCookie() throws Exception {
        UserDto userDto = UserDto.builder()
                .id(UUID.randomUUID())
                .email("student@thapar.edu")
                .fullName("Student Name")
                .role(Role.USER)
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mock-jwt-access-token")
                .user(userDto)
                .build();

        ResponseCookie cookie = ResponseCookie.from("refreshToken", "mock-refresh-token")
                .httpOnly(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(604800)
                .build();

        when(authService.devLogin(any(DevLoginRequest.class)))
                .thenReturn(new AuthService.AuthExecutionResult(authResponse, cookie));

        DevLoginRequest request = DevLoginRequest.builder()
                .email("student@thapar.edu")
                .name("Student Name")
                .role(Role.USER)
                .build();

        mockMvc.perform(post("/api/v1/auth/dev-login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=mock-refresh-token")))
                .andExpect(jsonPath("$.accessToken").value("mock-jwt-access-token"))
                .andExpect(jsonPath("$.user.email").value("student@thapar.edu"));
    }

    @Test
    void devLogin_invalidEmailFormat_returns400ValidationFailed() throws Exception {
        DevLoginRequest request = DevLoginRequest.builder()
                .email("not-an-email")
                .build();

        mockMvc.perform(post("/api/v1/auth/dev-login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    void devLogin_nonThaparDomain_returns403() throws Exception {
        when(authService.devLogin(any(DevLoginRequest.class)))
                .thenThrow(new ApiException(HttpStatus.FORBIDDEN, "INVALID_DOMAIN", "Access restricted to @thapar.edu domain"));

        DevLoginRequest request = DevLoginRequest.builder()
                .email("outsider@gmail.com")
                .build();

        mockMvc.perform(post("/api/v1/auth/dev-login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("INVALID_DOMAIN"));
    }

    @Test
    void refreshToken_withValidCookie_returns200AndRotatedCookie() throws Exception {
        TokenRefreshResponse refreshResponse = TokenRefreshResponse.builder()
                .accessToken("new-jwt-access-token")
                .build();

        ResponseCookie newCookie = ResponseCookie.from("refreshToken", "new-raw-refresh-token")
                .httpOnly(true)
                .sameSite("Strict")
                .path("/")
                .maxAge(604800)
                .build();

        when(authService.refreshToken("old-raw-token"))
                .thenReturn(new AuthService.RefreshExecutionResult(refreshResponse, newCookie));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("refreshToken", "old-raw-token")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refreshToken=new-raw-refresh-token")))
                .andExpect(jsonPath("$.accessToken").value("new-jwt-access-token"));
    }

    @Test
    void refreshToken_missingCookie_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value(containsString("Refresh token cookie is missing")));
    }

    @Test
    void logout_withCookie_returns200AndClearsCookie() throws Exception {
        ResponseCookie clearCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .build();

        when(authService.logout("active-refresh-token")).thenReturn(clearCookie);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new Cookie("refreshToken", "active-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")))
                .andExpect(jsonPath("$.message").value("Logged out successfully"));

        verify(authService).logout("active-refresh-token");
    }
}
