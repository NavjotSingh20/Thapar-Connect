package com.thaparconnect.backend.auth;

import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    private User testUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refreshTokenService, "refreshTokenExpirationMs", 604800000L);
        ReflectionTestUtils.setField(refreshTokenService, "cookieSecure", false);

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("student@thapar.edu")
                .fullName("Test Student")
                .role(Role.USER)
                .isOnboarded(true)
                .isBanned(false)
                .build();
    }

    @Test
    void shouldCreateRefreshTokenSuccessfully() {
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));

        String rawToken = refreshTokenService.createRefreshToken(testUser);

        assertThat(rawToken).isNotNull().contains("-");
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());

        RefreshToken saved = captor.getValue();
        assertThat(saved.getUser()).isEqualTo(testUser);
        assertThat(saved.getTokenHash()).isNotBlank();
        assertThat(saved.isRevoked()).isFalse();
    }

    @Test
    void shouldRotateValidRefreshToken() {
        String rawToken = "sample-raw-token-123";
        RefreshToken existingToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .tokenHash("some-hash")
                .expiresAt(Instant.now().plusSeconds(3600))
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(existingToken));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));

        RefreshTokenService.RefreshResult result = refreshTokenService.rotateRefreshToken(rawToken);

        assertThat(result.user()).isEqualTo(testUser);
        assertThat(result.newRawToken()).isNotNull().isNotEqualTo(rawToken);
        assertThat(existingToken.isRevoked()).isTrue();
    }

    @Test
    void shouldDetectTokenReuseAndRevokeAllUserTokens() {
        String rawToken = "reused-raw-token";
        RefreshToken reusedToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .tokenHash("reused-hash")
                .expiresAt(Instant.now().plusSeconds(3600))
                .revoked(true) // Already revoked!
                .build();

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(reusedToken));

        assertThatThrownBy(() -> refreshTokenService.rotateRefreshToken(rawToken))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                });

        verify(refreshTokenRepository).revokeAllByUserId(testUser.getId());
    }

    @Test
    void shouldBuildStrictHttpOnlyRefreshTokenCookie() {
        org.springframework.http.ResponseCookie cookie = refreshTokenService.buildRefreshTokenCookie("test-token");
        assertThat(cookie.getName()).isEqualTo("refreshToken");
        assertThat(cookie.getValue()).isEqualTo("test-token");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
        assertThat(cookie.getPath()).isEqualTo("/");
    }
}
