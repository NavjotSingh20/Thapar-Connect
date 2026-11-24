package com.thaparconnect.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.thaparconnect.backend.common.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GoogleTokenVerifierServiceTest {

    private GoogleTokenVerifierService verifierService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        verifierService = new GoogleTokenVerifierService(objectMapper);
        verifierService.init();
    }

    @Test
    void shouldAcceptMockTokenWithThaparDomain() {
        String token = "mock-token-for-student@thapar.edu";
        GoogleTokenVerifierService.GoogleUserInfo info = verifierService.verify(token);

        assertThat(info.email()).isEqualTo("student@thapar.edu");
        assertThat(info.name()).isNotNull();
    }

    @Test
    void shouldRejectMockTokenWhenDisabledInProduction() {
        verifierService.setGoogleClientId("dummy-client-id.apps.googleusercontent.com");
        verifierService.setAllowMockTokens(false);

        String token = "mock-token-for-student@thapar.edu";

        assertThatThrownBy(() -> verifierService.verify(token))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_TOKEN");
                });
    }

    @Test
    void shouldRejectMockTokenWithNonThaparDomainWith403() {
        String token = "mock-token-for-intruder@gmail.com";

        assertThatThrownBy(() -> verifierService.verify(token))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_DOMAIN");
                });
    }

    @Test
    void shouldRejectMockTokenWithEmptyLocalPartWith403() {
        String token = "mock-token-for-@thapar.edu";

        assertThatThrownBy(() -> verifierService.verify(token))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_DOMAIN");
                });
    }

    @Test
    void shouldRejectForgedTokenWithAlgNoneWith401() {
        String header = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"none\"}".getBytes(StandardCharsets.UTF_8));
        String payloadJson = "{\"email\":\"student@thapar.edu\",\"email_verified\":true,\"name\":\"Student\"}";
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        String token = header + "." + payload + ".fakesig";

        assertThatThrownBy(() -> verifierService.verify(token))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_TOKEN");
                });
    }

    @Test
    void shouldRejectForgedTokenWithInvalidSignatureWith401() {
        String header = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"RS256\",\"kid\":\"dummy-key\"}".getBytes(StandardCharsets.UTF_8));
        String payloadJson = "{\"email\":\"student@thapar.edu\",\"email_verified\":true,\"name\":\"Student\"}";
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        String token = header + "." + payload + ".invalid_signature_bytes";

        assertThatThrownBy(() -> verifierService.verify(token))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_TOKEN");
                });
    }

    @Test
    void shouldRejectUnsignedTokenWith401() {
        String header = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"RS256\"}".getBytes(StandardCharsets.UTF_8));
        String payloadJson = "{\"email\":\"student@thapar.edu\",\"email_verified\":true,\"name\":\"Student\"}";
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        String token = header + "." + payload + ".";

        assertThatThrownBy(() -> verifierService.verify(token))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_TOKEN");
                });
    }

    @Test
    void shouldRejectEmptyOrNullTokenWith401() {
        assertThatThrownBy(() -> verifierService.verify(null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_TOKEN");
                });

        assertThatThrownBy(() -> verifierService.verify("   "))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_TOKEN");
                });
    }

    @Test
    void shouldRejectWhenGoogleVerifierReturnsNull() throws Exception {
        GoogleIdTokenVerifier mockVerifier = mock(GoogleIdTokenVerifier.class);
        when(mockVerifier.verify(anyString())).thenReturn(null);
        verifierService.setVerifier(mockVerifier);

        assertThatThrownBy(() -> verifierService.verify("header.payload.signature"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_TOKEN");
                });
    }

    @Test
    void shouldRejectWhenGoogleVerifierThrowsSecurityException() throws Exception {
        GoogleIdTokenVerifier mockVerifier = mock(GoogleIdTokenVerifier.class);
        when(mockVerifier.verify(anyString())).thenThrow(new GeneralSecurityException("Invalid signature bytes"));
        verifierService.setVerifier(mockVerifier);

        assertThatThrownBy(() -> verifierService.verify("header.payload.signature"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiEx.getError()).isEqualTo("INVALID_TOKEN");
                });
    }

    @Test
    void shouldRejectWhenGoogleVerifierReturnsUnverifiedEmail() throws Exception {
        GoogleIdTokenVerifier mockVerifier = mock(GoogleIdTokenVerifier.class);
        GoogleIdToken mockToken = mock(GoogleIdToken.class);
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("student@thapar.edu");
        payload.setEmailVerified(false);

        when(mockToken.getPayload()).thenReturn(payload);
        when(mockVerifier.verify(anyString())).thenReturn(mockToken);
        verifierService.setVerifier(mockVerifier);

        assertThatThrownBy(() -> verifierService.verify("header.payload.signature"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(apiEx.getError()).isEqualTo("EMAIL_NOT_VERIFIED");
                });
    }

    @Test
    void shouldAcceptValidTokenFromGoogleVerifier() throws Exception {
        GoogleIdTokenVerifier mockVerifier = mock(GoogleIdTokenVerifier.class);
        GoogleIdToken mockToken = mock(GoogleIdToken.class);
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("student@thapar.edu");
        payload.setEmailVerified(true);
        payload.set("name", "Student Name");
        payload.set("picture", "https://photo.url");

        when(mockToken.getPayload()).thenReturn(payload);
        when(mockVerifier.verify(anyString())).thenReturn(mockToken);
        verifierService.setVerifier(mockVerifier);

        GoogleTokenVerifierService.GoogleUserInfo info = verifierService.verify("header.payload.signature");
        assertThat(info.email()).isEqualTo("student@thapar.edu");
        assertThat(info.name()).isEqualTo("Student Name");
        assertThat(info.pictureUrl()).isEqualTo("https://photo.url");
    }
}
