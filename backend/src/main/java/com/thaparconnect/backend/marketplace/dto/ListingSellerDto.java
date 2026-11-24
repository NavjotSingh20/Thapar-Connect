package com.thaparconnect.backend.marketplace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Seller information for marketplace listings.
 * CRITICAL PRIVACY MANDATE: This DTO must strictly omit phone/phoneNumber fields
 * to protect student seller privacy as mandated by R3.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListingSellerDto {
    private UUID id;
    private String name;
    private String hostel;
    private String profilePictureUrl;
}
