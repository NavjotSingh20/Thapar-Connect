package com.thaparconnect.backend.cabs;

import com.thaparconnect.backend.cabs.projection.CabGroupSummaryProjection;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CabGroupRepository extends JpaRepository<CabGroup, UUID> {

    @Query(value = "SELECT * FROM cab_groups WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<CabGroup> findByIdForUpdate(@Param("id") UUID id);

    @Query(value = """
            SELECT cg.id AS id,
                   cg.pickup_point AS pickupPoint,
                   cg.pickup_lat AS pickupLat,
                   cg.pickup_lng AS pickupLng,
                   cg.drop_point AS dropPoint,
                   cg.drop_lat AS dropLat,
                   cg.drop_lng AS dropLng,
                   cg.departure_time AS departureTime,
                   cg.total_seats AS totalSeats,
                   cg.seats_taken AS seatsTaken,
                   cg.estimated_fare AS estimatedFare,
                   cg.note AS note,
                   cg.auto_join_enabled AS autoJoinEnabled,
                   cg.status AS status,
                   cg.created_at AS createdAt,
                   u.id AS creatorId,
                   u.full_name AS creatorName,
                   u.hostel AS creatorHostel,
                   u.phone_number AS creatorPhone,
                   (6371.0 * acos(least(1.0, greatest(-1.0, cos(radians(:lat)) * cos(radians(cg.drop_lat)) * cos(radians(cg.drop_lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(cg.drop_lat)))))) AS distanceKm
            FROM cab_groups cg
            JOIN users u ON u.id = cg.creator_id
            WHERE cg.status = 'OPEN'
              AND cg.departure_time > :now
              AND (CAST(:minSeats AS integer) IS NULL OR (cg.total_seats - cg.seats_taken) >= CAST(:minSeats AS integer))
              AND (CAST(:maxFare AS numeric) IS NULL OR cg.estimated_fare <= CAST(:maxFare AS numeric))
              AND (CAST(:startTime AS TIMESTAMP WITH TIME ZONE) IS NULL OR cg.departure_time >= CAST(:startTime AS TIMESTAMP WITH TIME ZONE))
              AND (CAST(:endTime AS TIMESTAMP WITH TIME ZONE) IS NULL OR cg.departure_time <= CAST(:endTime AS TIMESTAMP WITH TIME ZONE))
            ORDER BY distanceKm ASC
            """, nativeQuery = true)
    List<CabGroupSummaryProjection> searchByCoordinates(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("now") Instant now,
            @Param("minSeats") Integer minSeats,
            @Param("maxFare") BigDecimal maxFare,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime
    );

    @Query(value = """
            SELECT cg.id AS id,
                   cg.pickup_point AS pickupPoint,
                   cg.pickup_lat AS pickupLat,
                   cg.pickup_lng AS pickupLng,
                   cg.drop_point AS dropPoint,
                   cg.drop_lat AS dropLat,
                   cg.drop_lng AS dropLng,
                   cg.departure_time AS departureTime,
                   cg.total_seats AS totalSeats,
                   cg.seats_taken AS seatsTaken,
                   cg.estimated_fare AS estimatedFare,
                   cg.note AS note,
                   cg.auto_join_enabled AS autoJoinEnabled,
                   cg.status AS status,
                   cg.created_at AS createdAt,
                   u.id AS creatorId,
                   u.full_name AS creatorName,
                   u.hostel AS creatorHostel,
                   u.phone_number AS creatorPhone,
                   CAST(NULL AS double precision) AS distanceKm
            FROM cab_groups cg
            JOIN users u ON u.id = cg.creator_id
            WHERE cg.status = 'OPEN'
              AND cg.departure_time > :now
              AND (CAST(:minSeats AS integer) IS NULL OR (cg.total_seats - cg.seats_taken) >= CAST(:minSeats AS integer))
              AND (CAST(:maxFare AS numeric) IS NULL OR cg.estimated_fare <= CAST(:maxFare AS numeric))
              AND (CAST(:startTime AS TIMESTAMP WITH TIME ZONE) IS NULL OR cg.departure_time >= CAST(:startTime AS TIMESTAMP WITH TIME ZONE))
              AND (CAST(:endTime AS TIMESTAMP WITH TIME ZONE) IS NULL OR cg.departure_time <= CAST(:endTime AS TIMESTAMP WITH TIME ZONE))
            ORDER BY cg.departure_time ASC
            """, nativeQuery = true)
    List<CabGroupSummaryProjection> browseUpcoming(
            @Param("now") Instant now,
            @Param("minSeats") Integer minSeats,
            @Param("maxFare") BigDecimal maxFare,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime
    );

    @Modifying
    @Query("UPDATE CabGroup cg SET cg.status = com.thaparconnect.backend.cabs.CabGroupStatus.EXPIRED, cg.updatedAt = :now WHERE cg.departureTime < :now AND cg.status IN (com.thaparconnect.backend.cabs.CabGroupStatus.OPEN, com.thaparconnect.backend.cabs.CabGroupStatus.FULL)")
    int expirePastCabGroups(@Param("now") Instant now);

    List<CabGroup> findByCreatorIdOrderByCreatedAtDesc(UUID creatorId);
}
