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
public class PaymentInitiateResponse {
    private String transactionRef;
    private BigDecimal amount;
    private String currency;
    private String provider;
    private PaymentStatus status;
    private String message;
    private Instant timestamp;

    public static PaymentInitiateResponse from(PaymentResponse response) {
        return PaymentInitiateResponse.builder()
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
