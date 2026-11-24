package com.thaparconnect.backend.safety;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {

    @NotNull(message = "targetType is required")
    private TargetType targetType;

    @NotNull(message = "targetId is required")
    private UUID targetId;

    @NotBlank(message = "reason is required")
    private String reason;

    private String details;
}
