package com.thaparconnect.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thaparconnect.backend.users.Role;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class OnboardingEnforcementFilterTest {

    private OnboardingEnforcementFilter filter;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

    @BeforeEach
    void setUp() {
        filter = new OnboardingEnforcementFilter(objectMapper);
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldBlockUnonboardedUserFromGatedFeaturesWith403() throws Exception {
        UserPrincipal unonboardedPrincipal = UserPrincipal.create(UUID.randomUUID(), "student@thapar.edu", Role.USER, false);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(unonboardedPrincipal, null, unonboardedPrincipal.getAuthorities())
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/cabs");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("ONBOARDING_REQUIRED");
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    void shouldAllowOnboardedUserToAccessGatedFeatures() throws Exception {
        UserPrincipal onboardedPrincipal = UserPrincipal.create(UUID.randomUUID(), "student@thapar.edu", Role.USER, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(onboardedPrincipal, null, onboardedPrincipal.getAuthorities())
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/cabs");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    void shouldAllowUnonboardedUserToAccessExemptEndpoints() throws Exception {
        UserPrincipal unonboardedPrincipal = UserPrincipal.create(UUID.randomUUID(), "student@thapar.edu", Role.USER, false);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(unonboardedPrincipal, null, unonboardedPrincipal.getAuthorities())
        );

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/users/me/onboard");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    void shouldAllowUnauthenticatedRequestToProceedToSecurityChain() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/cabs");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
    }
}
