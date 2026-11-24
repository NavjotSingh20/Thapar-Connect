package com.thaparconnect.backend.payments;

import com.thaparconnect.backend.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Extensibility skeleton for offline settlement audit and future payment gateway integration")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/initiate")
    @Operation(summary = "Initiate offline payment audit", description = "Records offline settlement intent in audit log")
    public ResponseEntity<ApiResponse<PaymentResponse>> initiatePayment(@Valid @RequestBody PaymentInitiateRequest request) {
        PaymentResponse response = paymentService.initiatePayment(request);
        return new ResponseEntity<>(ApiResponse.success("Payment recorded", response), HttpStatus.CREATED);
    }

    @GetMapping("/{transactionRef}")
    @Operation(summary = "Get payment audit details", description = "Retrieves payment transaction status by reference")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentStatus(@PathVariable String transactionRef) {
        PaymentResponse response = paymentService.getPaymentStatus(transactionRef);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/provider")
    @Operation(summary = "Get active payment provider", description = "Returns active payment provider information")
    public ResponseEntity<ApiResponse<Map<String, String>>> getProvider() {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "provider", paymentService.getProviderName(),
                "notice", "Thapar Connect v1 uses direct offline student-to-student payments."
        )));
    }
}
