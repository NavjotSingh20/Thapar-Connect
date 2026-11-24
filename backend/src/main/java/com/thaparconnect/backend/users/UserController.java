package com.thaparconnect.backend.users;

import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.security.UserPrincipal;
import com.thaparconnect.backend.users.dto.OnboardRequest;
import com.thaparconnect.backend.users.dto.UpdateUserRequest;
import com.thaparconnect.backend.users.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Endpoints for user profile retrieval, onboarding, and updates")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", description = "Retrieves profile of currently authenticated user")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        UserDto userDto = userService.getCurrentUser(principal.getId());
        return ResponseEntity.ok(userDto);
    }

    @PostMapping("/me/onboard")
    @Operation(summary = "Complete first-login onboarding", description = "Submits required phone number and hostel to unlock application features")
    public ResponseEntity<UserDto> onboardUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody OnboardRequest request
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        UserDto response = userService.onboardUser(principal.getId(), request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    @Operation(summary = "Update user profile", description = "Updates profile details such as phone, hostel, academic info")
    public ResponseEntity<UserDto> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        UserDto response = userService.updateProfile(principal.getId(), request);
        return ResponseEntity.ok(response);
    }
}
