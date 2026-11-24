package com.thaparconnect.backend.marketplace;

import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class ListingRepositoryTest {

    @Autowired
    private ListingRepository listingRepository;

    @Autowired
    private UserRepository userRepository;

    private User seller;

    @BeforeEach
    void setUp() {
        seller = User.builder()
                .email("seller@thapar.edu")
                .fullName("Hostel Seller")
                .phoneNumber("9876543210")
                .hostel("Hostel J")
                .role(Role.USER)
                .isOnboarded(true)
                .build();
        seller = userRepository.save(seller);
    }

    private Listing createListing(String title, ListingCategory category, String description,
                                  ListingCondition condition, BigDecimal price, String hostel,
                                  ListingStatus status, boolean isDeleted) {
        Listing listing = Listing.builder()
                .seller(seller)
                .title(title)
                .category(category)
                .description(description)
                .condition(condition)
                .price(price)
                .hostel(hostel)
                .status(status)
                .isDeleted(isDeleted)
                .images(new ArrayList<>())
                .build();
        return listingRepository.save(listing);
    }

    @Test
    void filterListings_excludesSoldAndDeletedByDefault() {
        Listing availableItem = createListing("Available Cycle", ListingCategory.CYCLE, "Good bike",
                ListingCondition.USED, new BigDecimal("2000"), "Hostel J", ListingStatus.AVAILABLE, false);

        Listing soldItem = createListing("Sold Cycle", ListingCategory.CYCLE, "Sold bike",
                ListingCondition.USED, new BigDecimal("2000"), "Hostel J", ListingStatus.SOLD, false);

        Listing deletedItem = createListing("Deleted Cycle", ListingCategory.CYCLE, "Deleted bike",
                ListingCondition.USED, new BigDecimal("2000"), "Hostel J", ListingStatus.AVAILABLE, true);

        Specification<Listing> spec = ListingSpecifications.filterListings(
                null, null, null, null, null, null, ListingStatus.AVAILABLE);

        Page<Listing> result = listingRepository.findAll(spec, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(availableItem.getId(), result.getContent().get(0).getId());
    }

    @Test
    void filterListings_byTextQuery_matchesTitleOrDescription() {
        createListing("Casio Calculator fx-991EX", ListingCategory.CALCULATOR, "Engineering tool",
                ListingCondition.NEW, new BigDecimal("900"), "Hostel J", ListingStatus.AVAILABLE, false);

        createListing("Engineering Textbook", ListingCategory.BOOKS, "Includes Casio formulas",
                ListingCondition.USED, new BigDecimal("400"), "Hostel M", ListingStatus.AVAILABLE, false);

        createListing("Table Lamp", ListingCategory.HOSTEL_ESSENTIALS, "Bright LED lamp",
                ListingCondition.NEW, new BigDecimal("350"), "Hostel J", ListingStatus.AVAILABLE, false);

        Specification<Listing> spec = ListingSpecifications.filterListings(
                "Casio", null, null, null, null, null, ListingStatus.AVAILABLE);

        Page<Listing> result = listingRepository.findAll(spec, PageRequest.of(0, 10));

        assertEquals(2, result.getTotalElements());
    }

    @Test
    void filterListings_byCategoryHostelConditionAndPriceRange() {
        createListing("Target Cycle", ListingCategory.CYCLE, "City bike",
                ListingCondition.LIKE_NEW, new BigDecimal("2500"), "Hostel J", ListingStatus.AVAILABLE, false);

        createListing("Expensive Cycle", ListingCategory.CYCLE, "Road bike",
                ListingCondition.LIKE_NEW, new BigDecimal("5000"), "Hostel J", ListingStatus.AVAILABLE, false);

        createListing("Different Hostel Cycle", ListingCategory.CYCLE, "City bike",
                ListingCondition.LIKE_NEW, new BigDecimal("2500"), "Hostel M", ListingStatus.AVAILABLE, false);

        createListing("Worn Cycle", ListingCategory.CYCLE, "City bike",
                ListingCondition.HEAVILY_USED, new BigDecimal("2500"), "Hostel J", ListingStatus.AVAILABLE, false);

        Specification<Listing> spec = ListingSpecifications.filterListings(
                null,
                ListingCategory.CYCLE,
                "hostel j", // case-insensitive
                ListingCondition.LIKE_NEW,
                new BigDecimal("2000"),
                new BigDecimal("3000"),
                ListingStatus.AVAILABLE
        );

        Page<Listing> result = listingRepository.findAll(spec, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("Target Cycle", result.getContent().get(0).getTitle());
    }

    @Test
    void findBySellerIdAndIsDeletedFalse_returnsSellerListingsIncludingSold() {
        createListing("Available 1", ListingCategory.BOOKS, "Desc", ListingCondition.NEW,
                new BigDecimal("100"), "Hostel J", ListingStatus.AVAILABLE, false);

        createListing("Sold 1", ListingCategory.BOOKS, "Desc", ListingCondition.NEW,
                new BigDecimal("200"), "Hostel J", ListingStatus.SOLD, false);

        createListing("Deleted 1", ListingCategory.BOOKS, "Desc", ListingCondition.NEW,
                new BigDecimal("300"), "Hostel J", ListingStatus.AVAILABLE, true);

        Page<Listing> sellerListings = listingRepository.findBySellerIdAndIsDeletedFalseOrderByCreatedAtDesc(
                seller.getId(), PageRequest.of(0, 10));

        assertEquals(2, sellerListings.getTotalElements());
    }
}
