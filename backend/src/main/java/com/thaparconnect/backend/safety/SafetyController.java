package com.thaparconnect.backend.safety;

import com.thaparconnect.backend.common.ApiResponse;
import com.thaparconnect.backend.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/safety")
@RequiredArgsConstructor
public class SafetyController {

    private final SafetyService safetyService;

    @PostMapping("/report")
    public ResponseEntity<ReportDto> createReport(
            @Valid @RequestBody ReportRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ReportDto report = safetyService.createReport(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }

    @PostMapping("/block")
    public ResponseEntity<ApiResponse<Void>> blockUser(
            @Valid @RequestBody BlockRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        safetyService.blockUser(principal.getId(), request.getBlockedUserId());
        return ResponseEntity.ok(ApiResponse.success("User blocked successfully", null));
    }

    @DeleteMapping("/block/{userId}")
    public ResponseEntity<ApiResponse<Void>> unblockUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        safetyService.unblockUser(principal.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success("User unblocked successfully", null));
    }

    @GetMapping("/blocked")
    public ResponseEntity<List<BlockDto>> getBlockedUsers(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<BlockDto> blockedUsers = safetyService.getBlockedUsers(principal.getId());
        return ResponseEntity.ok(blockedUsers);
    }
}
