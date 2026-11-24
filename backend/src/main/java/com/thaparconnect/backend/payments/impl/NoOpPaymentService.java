package com.thaparconnect.backend.payments.impl;

import com.thaparconnect.backend.common.ResourceNotFoundException;
import com.thaparconnect.backend.payments.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@Primary
@RequiredArgsConstructor
@Slf4j
public class NoOpPaymentService implements PaymentService {

    private final PaymentTransactionRepository paymentTransactionRepository;

    @Override
    @Transactional
    public PaymentResponse initiatePayment(PaymentInitiateRequest request) {
        String ref = "TXN-NOOP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("Initiating offline/NoOp payment transaction: ref={}, amount={} {}", ref, request.getAmount(), request.getCurrency());

        PaymentTransaction txn = PaymentTransaction.builder()
                .transactionRef(ref)
                .userId(request.getUserId())
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                .provider("NO_OP")
                .status(PaymentStatus.NO_OP_COMPLETED)
                .payload("Context: " + request.getContextType() + ", ContextId: " + request.getContextId() + ", Notes: " + request.getNotes())
                .createdAt(Instant.now())
                .build();

        paymentTransactionRepository.save(txn);

        return PaymentResponse.builder()
                .transactionRef(ref)
                .amount(txn.getAmount())
                .currency(txn.getCurrency())
                .provider(txn.getProvider())
                .status(txn.getStatus())
                .message("Offline settlement in v1: payments are settled directly between users.")
                .timestamp(txn.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse verifyPayment(String transactionRef, Map<String, String> payload) {
        return getPaymentStatus(transactionRef);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentStatus(String transactionRef) {
        PaymentTransaction txn = paymentTransactionRepository.findByTransactionRef(transactionRef)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", "transactionRef", transactionRef));

        return PaymentResponse.builder()
                .transactionRef(txn.getTransactionRef())
                .amount(txn.getAmount())
                .currency(txn.getCurrency())
                .provider(txn.getProvider())
                .status(txn.getStatus())
                .message("Status retrieved successfully.")
                .timestamp(txn.getCreatedAt())
                .build();
    }

    @Override
    public String getProviderName() {
        return "NO_OP (Offline Campus Settlement)";
    }
}
