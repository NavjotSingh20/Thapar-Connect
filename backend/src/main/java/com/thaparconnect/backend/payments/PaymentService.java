package com.thaparconnect.backend.payments;

import java.util.Map;

public interface PaymentService {
    PaymentResponse initiatePayment(PaymentInitiateRequest request);
    PaymentResponse verifyPayment(String transactionRef, Map<String, String> payload);
    PaymentResponse getPaymentStatus(String transactionRef);
    String getProviderName();
}
