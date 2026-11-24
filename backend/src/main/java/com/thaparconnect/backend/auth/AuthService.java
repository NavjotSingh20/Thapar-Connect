package com.thaparconnect.backend.auth;

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

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> createNewUser(email, name, null, role));

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
                .createdAt(user.getCreatedAt())
                .build();
    }
}
