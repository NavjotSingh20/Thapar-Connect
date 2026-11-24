package com.thaparconnect.backend.marketplace;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ListingSpecifications {

    public static Specification<Listing> filterListings(
            String query,
            ListingCategory category,
            String hostel,
            ListingCondition condition,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            ListingStatus status
    ) {
        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Always exclude soft-deleted listings
            predicates.add(cb.isFalse(root.get("isDeleted")));

            // Filter by status (defaults to AVAILABLE for browse, excluding SOLD)
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            } else {
                predicates.add(cb.equal(root.get("status"), ListingStatus.AVAILABLE));
            }

            // Text search query across title and description
            if (StringUtils.hasText(query)) {
                String pattern = "%" + query.trim().toLowerCase() + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), pattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), pattern);
                predicates.add(cb.or(titleMatch, descMatch));
            }

            // Category filter
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }

            // Hostel filter (case-insensitive)
            if (StringUtils.hasText(hostel)) {
                predicates.add(cb.equal(cb.lower(root.get("hostel")), hostel.trim().toLowerCase()));
            }

            // Condition filter
            if (condition != null) {
                predicates.add(cb.equal(root.get("condition"), condition));
            }

            // Price range filters
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
