package com.thaparconnect.backend.security;

import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationMs", 900000L);
        tokenProvider.init();
    }

    @Test
    void shouldGenerateAndValidateTokenSuccessfully() {
        UUID userId = UUID.randomUUID();
        String email = "student@thapar.edu";
        User user = User.builder()
                .id(userId)
                .email(email)
                .fullName("Student Name")
                .role(Role.USER)
                .isOnboarded(false)
                .build();

        String token = tokenProvider.generateToken(user);

        assertThat(token).isNotNull().isNotBlank();
        assertThat(tokenProvider.validateToken(token)).isTrue();
        assertThat(tokenProvider.getUserIdFromToken(token)).isEqualTo(userId);
        assertThat(tokenProvider.getEmailFromToken(token)).isEqualTo(email);
        assertThat(tokenProvider.getRoleFromToken(token)).isEqualTo(Role.USER);
        assertThat(tokenProvider.isOnboardedFromToken(token)).isFalse();
    }

    @Test
    void shouldReflectOnboardedStatusInClaims() {
        UUID userId = UUID.randomUUID();
        String token = tokenProvider.generateToken(userId, "student@thapar.edu", Role.USER, true);

        assertThat(tokenProvider.validateToken(token)).isTrue();
        assertThat(tokenProvider.isOnboardedFromToken(token)).isTrue();
    }

    @Test
    void shouldRejectInvalidToken() {
        assertThat(tokenProvider.validateToken("invalid.token.structure")).isFalse();
        assertThat(tokenProvider.validateToken("")).isFalse();
    }
}
