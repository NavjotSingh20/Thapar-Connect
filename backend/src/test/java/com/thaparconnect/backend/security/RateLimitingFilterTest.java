package com.thaparconnect.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RateLimitingFilterTest {

    private RateLimitingFilter filter;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

    @BeforeEach
    void setUp() {
        filter = new RateLimitingFilter(objectMapper);
    }

    @Test
    void shouldAllowRequestsWithinLimit() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/dev-login");
        request.setRemoteAddr("192.168.1.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    void shouldEnforceRateLimitWhenLimitExceeded() throws Exception {
        String clientIp = "10.0.0.99";

        // Auth endpoint limit is 20 per minute
        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/dev-login");
            req.setRemoteAddr(clientIp);
            MockHttpServletResponse res = new MockHttpServletResponse();
            FilterChain chain = mock(FilterChain.class);
            filter.doFilterInternal(req, res, chain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // 21st request should be rejected with 429
        MockHttpServletRequest excessReq = new MockHttpServletRequest("POST", "/api/v1/auth/dev-login");
        excessReq.setRemoteAddr(clientIp);
        MockHttpServletResponse excessRes = new MockHttpServletResponse();
        FilterChain excessChain = mock(FilterChain.class);

        filter.doFilterInternal(excessReq, excessRes, excessChain);

        assertThat(excessRes.getStatus()).isEqualTo(429);
        assertThat(excessRes.getHeader("Retry-After")).isEqualTo("60");
        assertThat(excessRes.getContentAsString()).contains("RATE_LIMIT_EXCEEDED");
        verify(excessChain, never()).doFilter(any(), any());
    }
}
