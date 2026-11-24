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
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    private static final int AUTH_LIMIT_PER_MINUTE = 20;
    private static final int WRITE_LIMIT_PER_MINUTE = 60;

    private final Map<String, TokenBucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, TokenBucket> writeBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        String path = request.getRequestURI();
        String method = request.getMethod();

        boolean isAuth = path.startsWith("/api/v1/auth");
        boolean isWrite = "POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method);

        if (isAuth) {
            TokenBucket bucket = authBuckets.computeIfAbsent(clientIp, k -> new TokenBucket(AUTH_LIMIT_PER_MINUTE));
            if (!bucket.tryConsume()) {
                sendRateLimitError(request, response);
                return;
            }
        } else if (isWrite) {
            TokenBucket bucket = writeBuckets.computeIfAbsent(clientIp, k -> new TokenBucket(WRITE_LIMIT_PER_MINUTE));
            if (!bucket.tryConsume()) {
                sendRateLimitError(request, response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private void sendRateLimitError(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", "60");

        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .error("RATE_LIMIT_EXCEEDED")
                .message("Rate limit exceeded. Please try again later.")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();

        objectMapper.writeValue(response.getOutputStream(), errorResponse);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private static class TokenBucket {
        private final int capacity;
        private double tokens;
        private long lastRefillTime;

        public TokenBucket(int capacity) {
            this.capacity = capacity;
            this.tokens = capacity;
            this.lastRefillTime = System.currentTimeMillis();
        }

        public synchronized boolean tryConsume() {
            refill();
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.currentTimeMillis();
            long timeElapsed = now - lastRefillTime;
            if (timeElapsed > 0) {
                // capacity tokens per 60,000 ms
                double refillTokens = (double) timeElapsed * capacity / 60000.0;
                tokens = Math.min(capacity, tokens + refillTokens);
                lastRefillTime = now;
            }
        }
    }
}
