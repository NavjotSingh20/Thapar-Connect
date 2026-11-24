package com.thaparconnect.backend.cabs;

import com.thaparconnect.backend.cabs.dto.*;
import com.thaparconnect.backend.chat.ConversationDto;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cabs")
@RequiredArgsConstructor
@Tag(name = "Cab Pooling", description = "Endpoints for managing cab groups, joins, and spatial searches")
public class CabGroupController {

    private final CabGroupService cabGroupService;

    @PostMapping
    @Operation(summary = "Create cab group", description = "Creates a new cab pooling group with drop coordinates and departure time")
    public ResponseEntity<CabGroupDetailDto> createCabGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateCabGroupRequest request
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        CabGroupDetailDto response = cabGroupService.createCabGroup(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Search or browse cab groups", description = "Searches for open cab groups by spatial distance or browses upcoming groups")
    public ResponseEntity<List<CabGroupSummaryDto>> searchCabGroups(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Double searchLat,
            @RequestParam(required = false) Double searchLng,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String timeWindow,
            @RequestParam(required = false) Integer minSeats,
            @RequestParam(required = false) BigDecimal maxFare,
            @RequestParam(required = false) String sortBy
    ) {
        UUID currentUserId = principal != null ? principal.getId() : null;
        List<CabGroupSummaryDto> groups = cabGroupService.searchCabGroups(
                currentUserId,
                searchLat,
                searchLng,
                date,
                timeWindow,
                minSeats,
                maxFare,
                sortBy
        );
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get cab group detail", description = "Retrieves complete details of a cab group including members")
    public ResponseEntity<CabGroupDetailDto> getCabGroup(
            @PathVariable UUID id
    ) {
        CabGroupDetailDto detail = cabGroupService.getCabGroupDetail(id);
        return ResponseEntity.ok(detail);
    }

    @PostMapping("/{id}/join")
    @Operation(summary = "Request to join cab group", description = "Submits a request to join a cab pool, confirming immediately if auto-join is enabled")
    public ResponseEntity<CabMemberDto> joinCabGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) JoinCabRequest request
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        JoinCabRequest joinRequest = request != null ? request : new JoinCabRequest();
        CabMemberDto member = cabGroupService.requestJoin(id, principal.getId(), joinRequest);
        return ResponseEntity.ok(member);
    }

    @PostMapping("/{id}/members/{memberId}/accept")
    @Operation(summary = "Accept member join request", description = "Creator accepts a pending join request")
    public ResponseEntity<CabMemberDto> acceptMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID memberId
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        CabMemberDto member = cabGroupService.acceptMemberRequest(id, memberId, principal.getId());
        return ResponseEntity.ok(member);
    }

    @PostMapping("/{id}/members/{memberId}/reject")
    @Operation(summary = "Reject member join request", description = "Creator rejects a pending join request")
    public ResponseEntity<CabMemberDto> rejectMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID memberId
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        CabMemberDto member = cabGroupService.rejectMemberRequest(id, memberId, principal.getId());
        return ResponseEntity.ok(member);
    }

    @PatchMapping("/{id}/close")
    @Operation(summary = "Close cab group", description = "Creator closes a cab pool to further members")
    public ResponseEntity<CabGroupDetailDto> closeCabGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        CabGroupDetailDto closed = cabGroupService.closeCabGroup(id, principal.getId());
        return ResponseEntity.ok(closed);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete or close cab group", description = "Allows the creator or an admin to close/delete a cab pool")
    public ResponseEntity<Void> deleteCabGroup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        cabGroupService.deleteCabGroup(id, principal.getId(), isAdmin);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/group-chat")
    @Operation(summary = "Get ride group chat", description = "Retrieves the group chat conversation for this cab pool")
    public ResponseEntity<ConversationDto> getRideGroupChat(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        ConversationDto conv = cabGroupService.getRideGroupChat(id, principal.getId());
        return ResponseEntity.ok(conv);
    }
}
