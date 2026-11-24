package com.thaparconnect.backend.payments;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentInitiateRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.00", message = "Amount cannot be negative")
    private BigDecimal amount;

    @NotBlank(message = "Currency is required")
    @Builder.Default
    private String currency = "INR";

    private UUID userId;
    private String contextType; // e.g. "CAB_GROUP", "LISTING"
    private UUID contextId;
    private String notes;
}
