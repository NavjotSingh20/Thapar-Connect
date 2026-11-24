package com.thaparconnect.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thaparconnect.backend.common.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OnboardingEnforcementFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    private static final List<String> PERMITTED_PATTERNS = List.of(
            "/api/v1/auth/**",
            "/api/v1/users/me",
            "/api/v1/users/me/onboard",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/actuator/**",
            "/api/v1/payments/**",
            "/api/v1/storage/**",
            "/ws/**",
            "/ws",
            "/error"
    );

    private static final List<String> GATED_FEATURE_PATTERNS = List.of(
            "/api/v1/cabs/**",
            "/api/v1/cabs",
            "/api/v1/marketplace/**",
            "/api/v1/marketplace",
            "/api/v1/chat/**",
            "/api/v1/chat",
            "/api/v1/safety/**",
            "/api/v1/safety"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String requestUri = request.getRequestURI();

        // Check if path is explicitly permitted
        for (String pattern : PERMITTED_PATTERNS) {
            if (pathMatcher.match(pattern, requestUri)) {
                filterChain.doFilter(request, response);
                return;
            }
        }

        // Check if path is gated
        boolean isGated = false;
        for (String pattern : GATED_FEATURE_PATTERNS) {
            if (pathMatcher.match(pattern, requestUri)) {
                isGated = true;
                break;
            }
        }

        // If not explicitly gated and not permitted, check authentication anyway
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (isGated && authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof UserPrincipal principal) {

            if (!principal.isOnboarded()) {
                log.warn("Onboarding required for user {} trying to access {}", principal.getEmail(), requestUri);
                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);

                ErrorResponse errorResponse = ErrorResponse.builder()
                        .success(false)
                        .status(HttpStatus.FORBIDDEN.value())
                        .error("ONBOARDING_REQUIRED")
                        .message("User onboarding is required before accessing application features")
                        .path(requestUri)
                        .timestamp(Instant.now())
                        .build();

                objectMapper.writeValue(response.getOutputStream(), errorResponse);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
