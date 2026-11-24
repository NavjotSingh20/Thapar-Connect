package com.thaparconnect.backend.cabs.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thaparconnect.backend.cabs.CabGroupStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CabGroupSummaryDto {
    private UUID id;
    private String pickupPoint;
    private Double pickupLat;
    private Double pickupLng;
    private String dropPoint;
    private Double dropLat;
    private Double dropLng;
    private Instant departureTime;
    private Integer totalSeats;
    private Integer seatsTaken;
    private Integer seatsAvailable;
    private BigDecimal estimatedFare;
    private String note;
    private Boolean autoJoinEnabled;
    private CabGroupStatus status;
    private Double distanceKm;
    private UserSummaryDto creator;
    private Instant createdAt;
}
