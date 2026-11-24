package com.thaparconnect.backend.safety;

import com.thaparconnect.backend.auth.AuthService;
import com.thaparconnect.backend.auth.RefreshTokenRepository;
import com.thaparconnect.backend.cabs.CabGroup;
import com.thaparconnect.backend.cabs.CabGroupRepository;
import com.thaparconnect.backend.cabs.CabGroupService;
import com.thaparconnect.backend.cabs.CabGroupStatus;
import com.thaparconnect.backend.cabs.dto.CabGroupDetailDto;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.ApiResponse;
import com.thaparconnect.backend.marketplace.Listing;
import com.thaparconnect.backend.marketplace.ListingRepository;
import com.thaparconnect.backend.marketplace.ListingService;
import com.thaparconnect.backend.marketplace.dto.ListingDetailDto;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import com.thaparconnect.backend.users.dto.UserDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final CabGroupRepository cabGroupRepository;
    private final CabGroupService cabGroupService;
    private final ListingRepository listingRepository;
    private final ListingService listingService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ReportRepository reportRepository;

    @GetMapping("/listings")
    public ResponseEntity<List<ListingDetailDto>> getListings() {
        List<Listing> listings = listingRepository.findAll();
        List<ListingDetailDto> dtos = listings.stream()
                .map(listingService::mapToDetailDto)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @DeleteMapping("/listings/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteListing(@PathVariable UUID id) {
        Listing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "LISTING_NOT_FOUND", "Listing not found"));
        listing.setDeleted(true);
        listingRepository.save(listing);
        log.info("Admin soft-deleted listing {}", id);
        return ResponseEntity.ok(ApiResponse.success("Listing deleted successfully", null));
    }

    @GetMapping("/cabs")
    public ResponseEntity<List<CabGroupDetailDto>> getCabs() {
        List<CabGroup> cabs = cabGroupRepository.findAll();
        List<CabGroupDetailDto> dtos = cabs.stream()
                .map(cab -> cabGroupService.toDetailDto(cab, cab.getMembers()))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @DeleteMapping("/cabs/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteCab(@PathVariable UUID id) {
        CabGroup cab = cabGroupRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CAB_NOT_FOUND", "Cab group not found"));
        cab.setStatus(CabGroupStatus.CLOSED);
        cabGroupRepository.save(cab);
        log.info("Admin closed cab group {}", id);
        return ResponseEntity.ok(ApiResponse.success("Cab group deleted successfully", null));
    }

    @PostMapping("/users/{id}/ban")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> banUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        user.setBanned(true);
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUserId(id);
        log.info("Admin banned user {}", id);
        return ResponseEntity.ok(ApiResponse.success("User banned successfully", null));
    }

    @PostMapping("/users/{id}/unban")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> unbanUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        user.setBanned(false);
        userRepository.save(user);
        log.info("Admin unbanned user {}", id);
        return ResponseEntity.ok(ApiResponse.success("User unbanned successfully", null));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getUsers() {
        List<User> users = userRepository.findAll();
        List<UserDto> dtos = users.stream()
                .map(AuthService::mapToUserDto)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/reports")
    public ResponseEntity<List<ReportDto>> getReports() {
        List<Report> reports = reportRepository.findAllByOrderByCreatedAtDesc();
        List<ReportDto> dtos = reports.stream()
                .map(ReportDto::fromEntity)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @PatchMapping("/reports/{id}")
    @Transactional
    public ResponseEntity<ReportDto> updateReportStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateReportStatusRequest request
    ) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "REPORT_NOT_FOUND", "Report not found"));
        report.setStatus(request.getStatus());
        Report saved = reportRepository.save(report);
        log.info("Admin updated report {} status to {}", id, request.getStatus());
        return ResponseEntity.ok(ReportDto.fromEntity(saved));
    }
}
