package com.thaparconnect.backend.marketplace.dto;

import com.thaparconnect.backend.marketplace.ListingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Summary DTO for browse and search results.
 * CRITICAL PRIVACY MANDATE: Must strictly omit any phone number attributes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListingSummaryDto {
    private UUID id;
    private String title;
    private String category;
    private BigDecimal price;
    private String condition;
    private String hostel;
    private String primaryImageUrl;
    private ListingStatus status;
    private ListingSellerDto seller;
    private Instant createdAt;
}
