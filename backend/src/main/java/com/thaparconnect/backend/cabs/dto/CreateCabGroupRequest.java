package com.thaparconnect.backend.cabs.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCabGroupRequest {

    private String pickupPoint;

    private Double pickupLat;

    private Double pickupLng;

    @NotBlank(message = "dropPoint cannot be blank")
    private String dropPoint;

    @NotNull(message = "dropLat is required")
    @DecimalMin(value = "-90.0", message = "dropLat must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "dropLat must be between -90 and 90")
    private Double dropLat;

    @NotNull(message = "dropLng is required")
    @DecimalMin(value = "-180.0", message = "dropLng must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "dropLng must be between -180 and 180")
    private Double dropLng;

    @NotNull(message = "departureTime is required")
    private Instant departureTime;

    @NotNull(message = "totalSeats is required")
    @Min(value = 2, message = "totalSeats must be at least 2")
    @Max(value = 8, message = "totalSeats must be at most 8")
    private Integer totalSeats;

    @NotNull(message = "estimatedFare is required")
    @DecimalMin(value = "0.01", message = "estimatedFare must be greater than 0")
    private BigDecimal estimatedFare;

    private String note;

    @Builder.Default
    private Boolean autoJoinEnabled = false;
}
