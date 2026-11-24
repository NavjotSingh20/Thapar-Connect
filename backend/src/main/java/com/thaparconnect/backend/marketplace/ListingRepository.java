package com.thaparconnect.backend.marketplace;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ListingRepository extends JpaRepository<Listing, UUID>, JpaSpecificationExecutor<Listing> {

    Page<Listing> findBySellerIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID sellerId, Pageable pageable);

    List<Listing> findBySellerIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID sellerId);

    Optional<Listing> findByIdAndIsDeletedFalse(UUID id);
}
