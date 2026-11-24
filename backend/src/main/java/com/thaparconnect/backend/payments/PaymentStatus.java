package com.thaparconnect.backend.payments;

public enum PaymentStatus {
    INITIATED,
    RECORDED_OFFLINE,
    NO_OP_COMPLETED,
    SUCCESS,
    FAILED,
    CANCELLED
}
