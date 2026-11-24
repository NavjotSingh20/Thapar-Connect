package com.thaparconnect.backend.users;

import com.thaparconnect.backend.auth.AuthService;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.security.JwtTokenProvider;
import com.thaparconnect.backend.users.dto.OnboardRequest;
import com.thaparconnect.backend.users.dto.UpdateUserRequest;
import com.thaparconnect.backend.users.dto.UserDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    private static final Pattern INDIAN_PHONE_PATTERN = Pattern.compile("^[6-9]\\d{9}$");

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(UUID userId) {
        User user = getUserOrThrow(userId);
        return AuthService.mapToUserDto(user);
    }

    @Transactional
    public UserDto onboardUser(UUID userId, OnboardRequest request) {
        User user = getUserOrThrow(userId);

        if (user.isOnboarded()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ALREADY_ONBOARDED", "User profile is already onboarded");
        }

        String phone = request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : "";
        if (!INDIAN_PHONE_PATTERN.matcher(phone).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PHONE", "Phone number must be a valid 10-digit Indian mobile number");
        }

        String rawHostel = request.getHostel() != null ? request.getHostel().trim() : "";
        if (rawHostel.isEmpty() || !TietHostel.isValidHostel(rawHostel)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_HOSTEL", "A valid TIET hostel is required");
        }

        user.setPhoneNumber(phone);
        user.setHostel(TietHostel.normalizeHostel(rawHostel));
        if (request.getRollNumber() != null && !request.getRollNumber().isBlank()) {
            user.setRollNumber(sanitizeInput(request.getRollNumber()));
        }
        if (request.getBranch() != null && !request.getBranch().isBlank()) {
            user.setBranch(sanitizeInput(request.getBranch()));
        }
        if (request.getYear() != null) {
            user.setYear(request.getYear());
        }

        user.setOnboarded(true);
        User savedUser = userRepository.save(user);

        // Generate newly refreshed token with isOnboarded = true
        String newAccessToken = jwtTokenProvider.generateToken(savedUser);

        UserDto userDto = AuthService.mapToUserDto(savedUser);
        userDto.setAccessToken(newAccessToken);

        return userDto;
    }

    @Transactional
    public UserDto updateProfile(UUID userId, UpdateUserRequest request) {
        User user = getUserOrThrow(userId);

        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            String phone = request.getPhoneNumber().trim();
            if (!INDIAN_PHONE_PATTERN.matcher(phone).matches()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PHONE", "Phone number must be a valid 10-digit Indian mobile number");
            }
            user.setPhoneNumber(phone);
        }

        if (request.getHostel() != null && !request.getHostel().isBlank()) {
            String rawHostel = request.getHostel().trim();
            if (!TietHostel.isValidHostel(rawHostel)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_HOSTEL", "A valid TIET hostel is required");
            }
            user.setHostel(TietHostel.normalizeHostel(rawHostel));
        }

        if (request.getRollNumber() != null) {
            user.setRollNumber(sanitizeInput(request.getRollNumber()));
        }

        if (request.getBranch() != null) {
            user.setBranch(sanitizeInput(request.getBranch()));
        }

        if (request.getYear() != null) {
            user.setYear(request.getYear());
        }

        User savedUser = userRepository.save(user);
        return AuthService.mapToUserDto(savedUser);
    }

    private String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        return input.replaceAll("<[^>]*>", "").replaceAll("[<>]", "").trim();
    }

    private User getUserOrThrow(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
    }
}
