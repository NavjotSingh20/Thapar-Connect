package com.thaparconnect.backend.auth;

import com.thaparconnect.backend.auth.dto.AdminLoginRequest;
import com.thaparconnect.backend.auth.dto.AuthResponse;
import com.thaparconnect.backend.auth.dto.DevLoginRequest;
import com.thaparconnect.backend.auth.dto.GoogleLoginRequest;
import com.thaparconnect.backend.auth.dto.TokenRefreshResponse;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.security.JwtTokenProvider;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import com.thaparconnect.backend.users.dto.UserDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final RefreshTokenService refreshTokenService;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.admin.email:admin@thapar.edu}")
    private String adminEmail;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    public record AuthExecutionResult(AuthResponse authResponse, ResponseCookie refreshCookie) {}
    public record RefreshExecutionResult(TokenRefreshResponse response, ResponseCookie refreshCookie) {}

    @Transactional
    public AuthExecutionResult loginWithGoogle(GoogleLoginRequest request) {
        GoogleTokenVerifierService.GoogleUserInfo googleUser = googleTokenVerifierService.verify(request.getIdToken());

        String email = googleUser.email() != null ? googleUser.email().trim().toLowerCase() : null;
        validateDomain(email);

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> createNewUser(email, googleUser.name(), googleUser.pictureUrl(), Role.USER));

        if (user.isBanned()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "USER_BANNED", "User account is suspended");
        }

        String accessToken = jwtTokenProvider.generateToken(user);
        String rawRefreshToken = refreshTokenService.createRefreshToken(user);
        ResponseCookie cookie = refreshTokenService.buildRefreshTokenCookie(rawRefreshToken);

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(accessToken)
                .user(mapToUserDto(user))
                .build();

        return new AuthExecutionResult(authResponse, cookie);
    }

    @Transactional
    public AuthExecutionResult devLogin(DevLoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null;
        validateDomain(email);

        Role role = request.getRole() != null ? request.getRole() : Role.USER;
        String name = request.getName() != null && !request.getName().isBlank()
                ? request.getName().trim()
                : email.split("@")[0].replace('.', ' ');

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            boolean onboarded = false;
            String phone = null;
            String hostel = null;
            String branch = null;
            String roll = null;
            Integer year = null;

            if (role == Role.ADMIN || "admin@thapar.edu".equalsIgnoreCase(email)) {
                onboarded = true;
                phone = "9876543210";
                hostel = "Faculty Housing";
                branch = "Administration";
            } else if ("rohan.sharma@thapar.edu".equalsIgnoreCase(email)) {
                onboarded = true;
                phone = "9876500001";
                hostel = "Hostel J";
                branch = "Computer Engineering";
                roll = "102203001";
                year = 3;
            }

            User newUser = User.builder()
                    .email(email)
                    .fullName(name)
                    .profilePictureUrl(null)
                    .phoneNumber(phone)
                    .hostel(hostel)
                    .branch(branch)
                    .rollNumber(roll)
                    .year(year)
                    .role(role)
                    .isOnboarded(onboarded)
                    .isBanned(false)
                    .build();
            return userRepository.save(newUser);
        });

        // Ensure preloaded demo accounts are always onboarded with complete data
        if (role == Role.ADMIN || "admin@thapar.edu".equalsIgnoreCase(email)) {
            if (!user.isOnboarded() || user.getHostel() == null || user.getPhoneNumber() == null) {
                user.setOnboarded(true);
                if (user.getPhoneNumber() == null) user.setPhoneNumber("9876543210");
                if (user.getHostel() == null) user.setHostel("Faculty Housing");
                if (user.getBranch() == null) user.setBranch("Administration");
                user = userRepository.save(user);
            }
        } else if ("rohan.sharma@thapar.edu".equalsIgnoreCase(email)) {
            if (!user.isOnboarded() || user.getHostel() == null || user.getPhoneNumber() == null) {
                user.setOnboarded(true);
                user.setPhoneNumber("9876500001");
                user.setHostel("Hostel J");
                user.setBranch("Computer Engineering");
                user.setRollNumber("102203001");
                user.setYear(3);
                user = userRepository.save(user);
            }
        }

        if (user.isBanned()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "USER_BANNED", "User account is suspended");
        }

        String accessToken = jwtTokenProvider.generateToken(user);
        String rawRefreshToken = refreshTokenService.createRefreshToken(user);
        ResponseCookie cookie = refreshTokenService.buildRefreshTokenCookie(rawRefreshToken);

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(accessToken)
                .user(mapToUserDto(user))
                .build();

        return new AuthExecutionResult(authResponse, cookie);
    }

    @Transactional
    public AuthExecutionResult adminLogin(AdminLoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String password = request.getPassword() != null ? request.getPassword().trim() : "";

        if (!adminPassword.equals(password)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid admin credentials");
        }

        if (!email.equalsIgnoreCase(adminEmail) && !email.endsWith("@thapar.edu")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "INVALID_DOMAIN", "Admin email must be a valid institutional address");
        }

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .fullName(email.equalsIgnoreCase("admin@thapar.edu") ? "Campus Administrator" : email.split("@")[0].replace('.', ' '))
                    .profilePictureUrl(null)
                    .phoneNumber("9876543210")
                    .hostel("Faculty Housing")
                    .branch("Administration")
                    .role(Role.ADMIN)
                    .isOnboarded(true)
                    .isBanned(false)
                    .build();
            return userRepository.save(newUser);
        });

        if (user.getRole() != Role.ADMIN || !user.isOnboarded()) {
            user.setRole(Role.ADMIN);
            user.setOnboarded(true);
            if (user.getHostel() == null) user.setHostel("Faculty Housing");
            if (user.getPhoneNumber() == null) user.setPhoneNumber("9876543210");
            user = userRepository.save(user);
        }

        if (user.isBanned()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "USER_BANNED", "User account is suspended");
        }

        String accessToken = jwtTokenProvider.generateToken(user);
        String rawRefreshToken = refreshTokenService.createRefreshToken(user);
        ResponseCookie cookie = refreshTokenService.buildRefreshTokenCookie(rawRefreshToken);

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(accessToken)
                .user(mapToUserDto(user))
                .build();

        return new AuthExecutionResult(authResponse, cookie);
    }

    @Transactional
    public RefreshExecutionResult refreshToken(String rawRefreshToken) {
        RefreshTokenService.RefreshResult result = refreshTokenService.rotateRefreshToken(rawRefreshToken);
        String newAccessToken = jwtTokenProvider.generateToken(result.user());
        ResponseCookie newCookie = refreshTokenService.buildRefreshTokenCookie(result.newRawToken());

        TokenRefreshResponse response = TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .build();

        return new RefreshExecutionResult(response, newCookie);
    }

    @Transactional
    public ResponseCookie logout(String rawRefreshToken) {
        refreshTokenService.revokeRefreshToken(rawRefreshToken);
        return refreshTokenService.buildRefreshTokenCookie(null);
    }

    @Transactional
    public ResponseCookie logoutAll(java.util.UUID userId) {
        refreshTokenService.revokeAllForUser(userId);
        return refreshTokenService.buildRefreshTokenCookie(null);
    }

    public void validateDomain(String email) {
        if (email == null || !email.trim().toLowerCase().matches("^[a-z0-9._%+-]+@thapar\\.edu$")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "INVALID_DOMAIN", "Access restricted to @thapar.edu domain");
        }
    }

    private User createNewUser(String email, String name, String pictureUrl, Role role) {
        User user = User.builder()
                .email(email)
                .fullName(name)
                .profilePictureUrl(pictureUrl)
                .role(role)
                .isOnboarded(false)
                .isBanned(false)
                .build();
        return userRepository.save(user);
    }

    public static UserDto mapToUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .phoneNumber(user.getPhoneNumber())
                .hostel(user.getHostel())
                .rollNumber(user.getRollNumber())
                .branch(user.getBranch())
                .year(user.getYear())
                .role(user.getRole())
                .isOnboarded(user.isOnboarded())
                .isBanned(user.isBanned())
                .phoneVisibleConfirmedOnly(user.isPhoneVisibleConfirmedOnly())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
