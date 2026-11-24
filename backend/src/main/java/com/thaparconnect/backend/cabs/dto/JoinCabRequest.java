package com.thaparconnect.backend.cabs.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinCabRequest {

    @NotNull(message = "seatsRequested is required")
    @Min(value = 1, message = "seatsRequested must be at least 1")
    @Max(value = 8, message = "seatsRequested must be at most 8")
    @Builder.Default
    private Integer seatsRequested = 1;

    private String note;
}
