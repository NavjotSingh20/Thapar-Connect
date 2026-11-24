package com.thaparconnect.backend.users;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.GlobalExceptionHandler;
import com.thaparconnect.backend.security.UserPrincipal;
import com.thaparconnect.backend.users.dto.OnboardRequest;
import com.thaparconnect.backend.users.dto.UpdateUserRequest;
import com.thaparconnect.backend.users.dto.UserDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final UUID testUserId = UUID.randomUUID();
    private UserPrincipal testPrincipal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        testPrincipal = UserPrincipal.create(testUserId, "student@thapar.edu", Role.USER, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(testPrincipal, null, testPrincipal.getAuthorities())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCurrentUser_authenticated_returns200AndUserDto() throws Exception {
        UserDto userDto = UserDto.builder()
                .id(testUserId)
                .email("student@thapar.edu")
                .fullName("Thapar Student")
                .phoneNumber("9876543210")
                .hostel("Hostel J")
                .role(Role.USER)
                .isOnboarded(true)
                .createdAt(Instant.now())
                .build();

        when(userService.getCurrentUser(testUserId)).thenReturn(userDto);

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testUserId.toString()))
                .andExpect(jsonPath("$.email").value("student@thapar.edu"))
                .andExpect(jsonPath("$.hostel").value("Hostel J"))
                .andExpect(jsonPath("$.isOnboarded").value(true));

        verify(userService).getCurrentUser(testUserId);
    }

    @Test
    void getCurrentUser_unauthenticated_returns401() throws Exception {
        SecurityContextHolder.clearContext();

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void onboardUser_validRequest_returns200AndUpdatedUserDto() throws Exception {
        OnboardRequest request = OnboardRequest.builder()
                .phoneNumber("9876543210")
                .hostel("Hostel J")
                .rollNumber("102003001")
                .branch("Computer Engineering")
                .year(3)
                .build();

        UserDto updatedDto = UserDto.builder()
                .id(testUserId)
                .email("student@thapar.edu")
                .fullName("Thapar Student")
                .phoneNumber("9876543210")
                .hostel("Hostel J")
                .rollNumber("102003001")
                .branch("Computer Engineering")
                .year(3)
                .role(Role.USER)
                .isOnboarded(true)
                .accessToken("newly-minted-token")
                .build();

        when(userService.onboardUser(eq(testUserId), any(OnboardRequest.class))).thenReturn(updatedDto);

        mockMvc.perform(post("/api/v1/users/me/onboard")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isOnboarded").value(true))
                .andExpect(jsonPath("$.phoneNumber").value("9876543210"))
                .andExpect(jsonPath("$.hostel").value("Hostel J"))
                .andExpect(jsonPath("$.accessToken").value("newly-minted-token"));

        verify(userService).onboardUser(eq(testUserId), any(OnboardRequest.class));
    }

    @Test
    void onboardUser_invalidPhoneNumber_returns400ValidationFailed() throws Exception {
        OnboardRequest request = OnboardRequest.builder()
                .phoneNumber("12345") // Invalid Indian phone number
                .hostel("Hostel J")
                .build();

        mockMvc.perform(post("/api/v1/users/me/onboard")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    void onboardUser_invalidHostelFromService_returns400InvalidHostel() throws Exception {
        OnboardRequest request = OnboardRequest.builder()
                .phoneNumber("9876543210")
                .hostel("InvalidHostelXYZ")
                .build();

        when(userService.onboardUser(eq(testUserId), any(OnboardRequest.class)))
                .thenThrow(new ApiException(HttpStatus.BAD_REQUEST, "INVALID_HOSTEL", "A valid TIET hostel is required"));

        mockMvc.perform(post("/api/v1/users/me/onboard")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_HOSTEL"));
    }

    @Test
    void onboardUser_unauthenticated_returns401() throws Exception {
        SecurityContextHolder.clearContext();

        OnboardRequest request = OnboardRequest.builder()
                .phoneNumber("9876543210")
                .hostel("Hostel J")
                .build();

        mockMvc.perform(post("/api/v1/users/me/onboard")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void updateProfile_validRequest_returns200() throws Exception {
        UpdateUserRequest request = UpdateUserRequest.builder()
                .phoneNumber("9876543211")
                .hostel("Hostel B")
                .year(4)
                .build();

        UserDto updatedDto = UserDto.builder()
                .id(testUserId)
                .email("student@thapar.edu")
                .phoneNumber("9876543211")
                .hostel("Hostel B")
                .year(4)
                .role(Role.USER)
                .isOnboarded(true)
                .build();

        when(userService.updateProfile(eq(testUserId), any(UpdateUserRequest.class))).thenReturn(updatedDto);

        mockMvc.perform(put("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneNumber").value("9876543211"))
                .andExpect(jsonPath("$.hostel").value("Hostel B"))
                .andExpect(jsonPath("$.year").value(4));

        verify(userService).updateProfile(eq(testUserId), any(UpdateUserRequest.class));
    }

    @Test
    void updateProfile_unauthenticated_returns401() throws Exception {
        SecurityContextHolder.clearContext();

        UpdateUserRequest request = UpdateUserRequest.builder()
                .hostel("Hostel B")
                .build();

        mockMvc.perform(put("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }
}
