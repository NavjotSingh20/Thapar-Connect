package com.thaparconnect.backend.payments;

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
public class PaymentStatusResponse {
    private String transactionRef;
    private BigDecimal amount;
    private String currency;
    private String provider;
    private PaymentStatus status;
    private String message;
    private Instant timestamp;

    public static PaymentStatusResponse from(PaymentResponse response) {
        return PaymentStatusResponse.builder()
                .transactionRef(response.getTransactionRef())
                .amount(response.getAmount())
                .currency(response.getCurrency())
                .provider(response.getProvider())
                .status(response.getStatus())
                .message(response.getMessage())
                .timestamp(response.getTimestamp())
                .build();
    }
}
