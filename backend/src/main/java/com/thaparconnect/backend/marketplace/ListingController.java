package com.thaparconnect.backend.marketplace;

import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.marketplace.dto.*;
import com.thaparconnect.backend.security.UserPrincipal;
import com.thaparconnect.backend.users.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/marketplace/listings")
@RequiredArgsConstructor
@Tag(name = "Marketplace", description = "Endpoints for campus marketplace listings, search, and lifecycle")
public class ListingController {

    private final ListingService listingService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Create marketplace listing", description = "Creates a new listing with 1-5 validated and compressed photos")
    public ResponseEntity<ListingDetailDto> createListing(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @ModelAttribute ListingCreateRequest request,
            @RequestParam(value = "images", required = false) List<MultipartFile> images
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        ListingDetailDto response = listingService.createListing(principal.getId(), request, images);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Browse and search listings", description = "Multi-faceted search and filtering for available marketplace listings")
    public ResponseEntity<Page<ListingSummaryDto>> searchListings(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String hostel,
            @RequestParam(required = false) String condition,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sortBy
    ) {
        ListingCategory categoryEnum = null;
        if (StringUtils.hasText(category)) {
            categoryEnum = ListingCategory.fromString(category);
        }

        ListingCondition conditionEnum = null;
        if (StringUtils.hasText(condition)) {
            conditionEnum = ListingCondition.fromString(condition);
        }

        Pageable pageable = createPageable(page, size, sortBy);
        Page<ListingSummaryDto> results = listingService.searchListings(
                query,
                categoryEnum,
                hostel,
                conditionEnum,
                minPrice,
                maxPrice,
                pageable
        );
        return ResponseEntity.ok(results);
    }

    @GetMapping("/my-listings")
    @Operation(summary = "Get current user's listings", description = "Retrieves all listings created by the authenticated user including sold items")
    public ResponseEntity<Page<ListingSummaryDto>> getMyListings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ListingSummaryDto> results = listingService.getMyListings(principal.getId(), pageable);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get listing detail", description = "Retrieves full listing detail with photo gallery and seller info (phone strictly omitted)")
    public ResponseEntity<ListingDetailDto> getListingDetail(@PathVariable UUID id) {
        ListingDetailDto detail = listingService.getListingDetail(id);
        return ResponseEntity.ok(detail);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update listing", description = "Allows the seller to update listing details")
    public ResponseEntity<ListingDetailDto> updateListing(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody ListingUpdateRequest request
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        ListingDetailDto updated = listingService.updateListing(id, principal.getId(), request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/sold")
    @Operation(summary = "Mark listing as sold", description = "Marks listing status as SOLD (idempotent for seller)")
    public ResponseEntity<ListingDetailDto> markAsSold(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        ListingDetailDto result = listingService.markAsSold(id, principal.getId());
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete listing", description = "Soft deletes a listing (seller or admin only)")
    public ResponseEntity<Map<String, String>> deleteListing(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        boolean isAdmin = principal.getRole() == Role.ADMIN;
        listingService.deleteListing(id, principal.getId(), isAdmin);
        return ResponseEntity.ok(Map.of("message", "Listing deleted successfully"));
    }

    private Pageable createPageable(int page, int size, String sortBy) {
        int pageIndex = Math.max(0, page);
        int pageSize = Math.min(Math.max(1, size), 50);

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        if (StringUtils.hasText(sortBy)) {
            String[] parts = sortBy.split(",");
            String field = parts[0].trim();
            Sort.Direction direction = Sort.Direction.ASC;
            if (parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc")) {
                direction = Sort.Direction.DESC;
            }

            if ("price".equalsIgnoreCase(field)) {
                sort = Sort.by(direction, "price");
            } else if ("createdAt".equalsIgnoreCase(field) || "created_at".equalsIgnoreCase(field)) {
                sort = Sort.by(direction, "createdAt");
            }
        }

        return PageRequest.of(pageIndex, pageSize, sort);
    }
}
