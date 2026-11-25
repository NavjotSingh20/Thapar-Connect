package com.thaparconnect.backend.marketplace;

import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.ApiResponse;
import com.thaparconnect.backend.marketplace.dto.ListingSummaryDto;
import com.thaparconnect.backend.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/marketplace/saved")
@RequiredArgsConstructor
@Tag(name = "Saved Marketplace Items", description = "Endpoints for managing a user's saved marketplace watchlist")
public class SavedListingController {

    private final SavedListingService savedListingService;

    @GetMapping
    @Operation(summary = "Get saved listings", description = "Retrieves all active marketplace items saved by the authenticated user")
    public ResponseEntity<List<ListingSummaryDto>> getSavedListings(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        return ResponseEntity.ok(savedListingService.getSavedListings(principal.getId()));
    }

    @GetMapping("/ids")
    @Operation(summary = "Get saved listing IDs", description = "Retrieves the UUIDs of marketplace items saved by the authenticated user")
    public ResponseEntity<List<UUID>> getSavedListingIds(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        return ResponseEntity.ok(savedListingService.getSavedListingIds(principal.getId()));
    }

    @PostMapping("/{listingId}")
    @Operation(summary = "Save listing to watchlist", description = "Bookmarks a marketplace listing for the authenticated user")
    public ResponseEntity<ApiResponse<Void>> saveListing(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        savedListingService.saveListing(principal.getId(), listingId);
        return ResponseEntity.ok(ApiResponse.success("Listing saved to watchlist", null));
    }

    @DeleteMapping("/{listingId}")
    @Operation(summary = "Remove listing from watchlist", description = "Removes a marketplace listing bookmark for the authenticated user")
    public ResponseEntity<ApiResponse<Void>> unsaveListing(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "User is not authenticated");
        }
        savedListingService.unsaveListing(principal.getId(), listingId);
        return ResponseEntity.ok(ApiResponse.success("Listing removed from watchlist", null));
    }
}
