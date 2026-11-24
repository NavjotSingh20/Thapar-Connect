package com.thaparconnect.backend.cabs.projection;

import java.math.BigDecimal;

public interface CabGroupSummaryProjection {
    Object getId();
    String getPickupPoint();
    Double getPickupLat();
    Double getPickupLng();
    String getDropPoint();
    Double getDropLat();
    Double getDropLng();
    Object getDepartureTime();
    Integer getTotalSeats();
    Integer getSeatsTaken();
    BigDecimal getEstimatedFare();
    String getNote();
    Boolean getAutoJoinEnabled();
    String getStatus();
    Object getCreatedAt();
    Object getCreatorId();
    String getCreatorName();
    String getCreatorHostel();
    String getCreatorPhone();
    Double getDistanceKm();
}
