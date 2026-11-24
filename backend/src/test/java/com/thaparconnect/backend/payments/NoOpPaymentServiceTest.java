package com.thaparconnect.backend.payments;

import com.thaparconnect.backend.payments.impl.NoOpPaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NoOpPaymentServiceTest {

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    private NoOpPaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new NoOpPaymentService(paymentTransactionRepository);
    }

    @Test
    void initiatePayment_ShouldPersistAndReturnNoOpResponse() {
        PaymentInitiateRequest request = PaymentInitiateRequest.builder()
                .amount(new BigDecimal("150.00"))
                .currency("INR")
                .userId(UUID.randomUUID())
                .contextType("CAB_GROUP")
                .notes("Cab fare share")
                .build();

        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentResponse response = paymentService.initiatePayment(request);

        assertNotNull(response);
        assertNotNull(response.getTransactionRef());
        assertTrue(response.getTransactionRef().startsWith("TXN-NOOP-"));
        assertEquals(new BigDecimal("150.00"), response.getAmount());
        assertEquals("INR", response.getCurrency());
        assertEquals(PaymentStatus.NO_OP_COMPLETED, response.getStatus());
        assertEquals("NO_OP", response.getProvider());
        verify(paymentTransactionRepository, times(1)).save(any(PaymentTransaction.class));
    }

    @Test
    void getPaymentStatus_ShouldReturnTransaction() {
        String ref = "TXN-NOOP-TEST1234";
        PaymentTransaction txn = PaymentTransaction.builder()
                .id(UUID.randomUUID())
                .transactionRef(ref)
                .amount(new BigDecimal("200.00"))
                .currency("INR")
                .provider("NO_OP")
                .status(PaymentStatus.NO_OP_COMPLETED)
                .build();

        when(paymentTransactionRepository.findByTransactionRef(ref)).thenReturn(Optional.of(txn));

        PaymentResponse response = paymentService.getPaymentStatus(ref);

        assertNotNull(response);
        assertEquals(ref, response.getTransactionRef());
        assertEquals(new BigDecimal("200.00"), response.getAmount());
    }

    @Test
    void getProviderName_ShouldContainOfflineNotice() {
        String provider = paymentService.getProviderName();
        assertTrue(provider.contains("NO_OP"));
    }
}
