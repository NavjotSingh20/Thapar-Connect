package com.thaparconnect.backend.marketplace.dto;

import com.thaparconnect.backend.marketplace.ListingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Detailed listing information.
 * CRITICAL PRIVACY MANDATE: Must strictly omit any phone number attributes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListingDetailDto {
    private UUID id;
    private String title;
    private String category;
    private String description;
    private String condition;
    private BigDecimal price;
    private String hostel;
    private ListingStatus status;
    private List<ListingImageDto> images;
    private ListingSellerDto seller;
    private String offlinePaymentDisclaimer;
    private Instant createdAt;
    private Instant updatedAt;
}
