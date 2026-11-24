package com.thaparconnect.backend.cabs;

import com.thaparconnect.backend.users.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "cab_groups")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CabGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @Column(name = "pickup_point", nullable = false)
    private String pickupPoint;

    @Column(name = "pickup_lat")
    private Double pickupLat;

    @Column(name = "pickup_lng")
    private Double pickupLng;

    @Column(name = "drop_point", nullable = false)
    private String dropPoint;

    @Column(name = "drop_lat", nullable = false)
    private Double dropLat;

    @Column(name = "drop_lng", nullable = false)
    private Double dropLng;

    @Column(name = "departure_time", nullable = false)
    private Instant departureTime;

    @Column(name = "total_seats", nullable = false)
    private Integer totalSeats;

    @Column(name = "seats_taken", nullable = false)
    @Builder.Default
    private Integer seatsTaken = 1;

    @Column(name = "estimated_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal estimatedFare;

    @Column(name = "note")
    private String note;

    @Column(name = "auto_join_enabled", nullable = false)
    @Builder.Default
    private boolean autoJoinEnabled = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private CabGroupStatus status = CabGroupStatus.OPEN;

    @OneToMany(mappedBy = "cabGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CabMember> members = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    public int getSeatsAvailable() {
        if (totalSeats == null || seatsTaken == null) {
            return 0;
        }
        return Math.max(0, totalSeats - seatsTaken);
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
        if (seatsTaken == null) {
            seatsTaken = 1;
        }
        if (status == null) {
            status = CabGroupStatus.OPEN;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
