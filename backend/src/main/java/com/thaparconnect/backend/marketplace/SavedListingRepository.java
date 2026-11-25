package com.thaparconnect.backend.marketplace;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavedListingRepository extends JpaRepository<SavedListing, UUID> {

    @Query("SELECT sl FROM SavedListing sl JOIN FETCH sl.listing l JOIN FETCH l.seller WHERE sl.user.id = :userId AND l.isDeleted = false ORDER BY sl.createdAt DESC")
    List<SavedListing> findActiveSavedByUserId(@Param("userId") UUID userId);

    @Query("SELECT sl.listing.id FROM SavedListing sl WHERE sl.user.id = :userId AND sl.listing.isDeleted = false")
    List<UUID> findSavedListingIdsByUserId(@Param("userId") UUID userId);

    Optional<SavedListing> findByUserIdAndListingId(UUID userId, UUID listingId);

    boolean existsByUserIdAndListingId(UUID userId, UUID listingId);

    void deleteByUserIdAndListingId(UUID userId, UUID listingId);
}
