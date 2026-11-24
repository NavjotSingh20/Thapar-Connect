package com.thaparconnect.backend.config;

import com.thaparconnect.backend.cabs.CabGroup;
import com.thaparconnect.backend.cabs.CabGroupRepository;
import com.thaparconnect.backend.cabs.CabGroupStatus;
import com.thaparconnect.backend.marketplace.*;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CabGroupRepository cabGroupRepository;
    private final ListingRepository listingRepository;

    @Override
    public void run(String... args) {
        log.info("Checking initial sample data for Thapar Connect...");

        // 1. Seed or update core personas
        User admin = userRepository.findByEmail("admin@thapar.edu").orElseGet(() ->
                userRepository.save(User.builder()
                        .email("admin@thapar.edu")
                        .fullName("Prof. H.S. Bawa")
                        .phoneNumber("9876543210")
                        .hostel("Faculty Housing")
                        .branch("Administration")
                        .role(Role.ADMIN)
                        .isOnboarded(true)
                        .isBanned(false)
                        .build())
        );
        if (!admin.isOnboarded()) {
            admin.setOnboarded(true);
            admin.setPhoneNumber("9876543210");
            admin.setHostel("Faculty Housing");
            userRepository.save(admin);
        }

        User rohan = userRepository.findByEmail("rohan.sharma@thapar.edu").orElseGet(() ->
                userRepository.save(User.builder()
                        .email("rohan.sharma@thapar.edu")
                        .fullName("Rohan Sharma")
                        .phoneNumber("9876500001")
                        .hostel("Hostel J")
                        .branch("Computer Engineering")
                        .rollNumber("102203001")
                        .year(3)
                        .role(Role.USER)
                        .isOnboarded(true)
                        .isBanned(false)
                        .build())
        );
        if (!rohan.isOnboarded()) {
            rohan.setOnboarded(true);
            rohan.setPhoneNumber("9876500001");
            rohan.setHostel("Hostel J");
            rohan.setRollNumber("102203001");
            rohan.setBranch("Computer Engineering");
            rohan.setYear(3);
            userRepository.save(rohan);
        }

        User priya = userRepository.findByEmail("priya.singh@thapar.edu").orElseGet(() ->
                userRepository.save(User.builder()
                        .email("priya.singh@thapar.edu")
                        .fullName("Priya Singh")
                        .phoneNumber("9876500002")
                        .hostel("Hostel N")
                        .branch("Electronics & Communication")
                        .rollNumber("102204052")
                        .year(2)
                        .role(Role.USER)
                        .isOnboarded(true)
                        .isBanned(false)
                        .build())
        );

        User aarav = userRepository.findByEmail("aarav.mehta@thapar.edu").orElseGet(() ->
                userRepository.save(User.builder()
                        .email("aarav.mehta@thapar.edu")
                        .fullName("Aarav Mehta")
                        .phoneNumber("9876500003")
                        .hostel("Hostel C")
                        .branch("Mechanical Engineering")
                        .rollNumber("102102015")
                        .year(4)
                        .role(Role.USER)
                        .isOnboarded(true)
                        .isBanned(false)
                        .build())
        );

        // 2. Seed initial Cab Groups if none exist
        if (cabGroupRepository.count() == 0) {
            log.info("Preloading realistic cab pooling sample data...");

            CabGroup cab1 = CabGroup.builder()
                    .creator(rohan)
                    .pickupPoint("Thapar Campus Main Gate")
                    .pickupLat(30.3547)
                    .pickupLng(76.3688)
                    .dropPoint("Chandigarh International Airport (IXC)")
                    .dropLat(30.6735)
                    .dropLng(76.7885)
                    .departureTime(Instant.now().plus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS))
                    .totalSeats(4)
                    .seatsTaken(2)
                    .estimatedFare(BigDecimal.valueOf(450.00))
                    .note("Leaving sharp at 6:30 AM from Main Gate. AC sedan booked with Gozo.")
                    .autoJoinEnabled(false)
                    .status(CabGroupStatus.OPEN)
                    .build();

            CabGroup cab2 = CabGroup.builder()
                    .creator(priya)
                    .pickupPoint("Thapar Campus Gate 2")
                    .pickupLat(30.3555)
                    .pickupLng(76.3700)
                    .dropPoint("Indira Gandhi International Airport (IGI T3), Delhi")
                    .dropLat(28.5562)
                    .dropLng(77.1000)
                    .departureTime(Instant.now().plus(3, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS))
                    .totalSeats(4)
                    .seatsTaken(1)
                    .estimatedFare(BigDecimal.valueOf(850.00))
                    .note("Innova via NH44. Plenty of trunk space for large suitcases.")
                    .autoJoinEnabled(true)
                    .status(CabGroupStatus.OPEN)
                    .build();

            CabGroup cab3 = CabGroup.builder()
                    .creator(aarav)
                    .pickupPoint("Hostel J Parking")
                    .pickupLat(30.3530)
                    .pickupLng(76.3670)
                    .dropPoint("Patiala Railway Station")
                    .dropLat(30.3418)
                    .dropLng(76.3980)
                    .departureTime(Instant.now().plus(1, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS))
                    .totalSeats(3)
                    .seatsTaken(1)
                    .estimatedFare(BigDecimal.valueOf(120.00))
                    .note("Sharing cab for Shatabdi Express. Quick drop.")
                    .autoJoinEnabled(true)
                    .status(CabGroupStatus.OPEN)
                    .build();

            CabGroup cab4 = CabGroup.builder()
                    .creator(rohan)
                    .pickupPoint("Thapar Campus Main Gate")
                    .pickupLat(30.3547)
                    .pickupLng(76.3688)
                    .dropPoint("Elante Mall, Chandigarh")
                    .dropLat(30.7055)
                    .dropLng(76.8013)
                    .departureTime(Instant.now().plus(4, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS))
                    .totalSeats(4)
                    .seatsTaken(3)
                    .estimatedFare(BigDecimal.valueOf(350.00))
                    .note("Weekend shopping & movie trip. Only 1 seat left!")
                    .autoJoinEnabled(false)
                    .status(CabGroupStatus.OPEN)
                    .build();

            cabGroupRepository.saveAll(List.of(cab1, cab2, cab3, cab4));
        }

        // 3. Seed initial Marketplace Listings if none exist
        if (listingRepository.count() == 0) {
            log.info("Preloading realistic campus marketplace sample data...");

            Listing item1 = Listing.builder()
                    .seller(rohan)
                    .title("Hero Sprint Pro 21-Speed Gear Cycle")
                    .category(ListingCategory.CYCLE)
                    .condition(ListingCondition.LIKE_NEW)
                    .price(BigDecimal.valueOf(3800.00))
                    .hostel("Hostel J")
                    .description("Purchased 6 months ago, rarely used. Gear shifting is buttery smooth. Dual disc brakes and includes free combination lock.")
                    .status(ListingStatus.AVAILABLE)
                    .isDeleted(false)
                    .build();

            Listing item2 = Listing.builder()
                    .seller(aarav)
                    .title("Casio fx-991EX ClassWiz Scientific Calculator")
                    .category(ListingCategory.CALCULATOR)
                    .condition(ListingCondition.USED)
                    .price(BigDecimal.valueOf(850.00))
                    .hostel("Hostel C")
                    .description("Allowed in ES101 and semester exams. Solar + battery, high-resolution natural display. Original slipcase included.")
                    .status(ListingStatus.AVAILABLE)
                    .isDeleted(false)
                    .build();

            Listing item3 = Listing.builder()
                    .seller(priya)
                    .title("Operating System Concepts (Galvin) 10th Edition")
                    .category(ListingCategory.BOOKS)
                    .condition(ListingCondition.LIKE_NEW)
                    .price(BigDecimal.valueOf(450.00))
                    .hostel("Hostel N")
                    .description("Standard textbook for 3rd semester OS course. Clean pages, no pen markings or highlights. Highly recommended for mid-sems.")
                    .status(ListingStatus.AVAILABLE)
                    .isDeleted(false)
                    .build();

            Listing item4 = Listing.builder()
                    .seller(rohan)
                    .title("Bajaj Mini Room Air Cooler with Stand")
                    .category(ListingCategory.HOSTEL_ESSENTIALS)
                    .condition(ListingCondition.USED)
                    .price(BigDecimal.valueOf(2200.00))
                    .hostel("Hostel J")
                    .description("Essential for Patiala summers! High air throw, low power draw, honeycomb pads cleaned and ready to plug in.")
                    .status(ListingStatus.AVAILABLE)
                    .isDeleted(false)
                    .build();

            Listing item5 = Listing.builder()
                    .seller(priya)
                    .title("Study Table LED Lamp with 3 Brightness Modes")
                    .category(ListingCategory.ELECTRONICS)
                    .condition(ListingCondition.LIKE_NEW)
                    .price(BigDecimal.valueOf(350.00))
                    .hostel("Hostel N")
                    .description("Warm, natural, and cool white modes. Flexible gooseneck and touch-sensitive dimming. Perfect for night study sessions.")
                    .status(ListingStatus.AVAILABLE)
                    .isDeleted(false)
                    .build();

            listingRepository.saveAll(List.of(item1, item2, item3, item4, item5));
        }

        log.info("Thapar Connect sample data check complete.");
    }
}
