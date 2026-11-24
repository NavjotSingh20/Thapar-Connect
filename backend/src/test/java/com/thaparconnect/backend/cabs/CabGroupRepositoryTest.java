package com.thaparconnect.backend.cabs;

import com.thaparconnect.backend.cabs.projection.CabGroupSummaryProjection;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class CabGroupRepositoryTest {

    @Autowired
    private CabGroupRepository cabGroupRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("host@thapar.edu")
                .fullName("Host Student")
                .phoneNumber("9876543210")
                .hostel("Hostel J")
                .role(Role.USER)
                .isOnboarded(true)
                .build();
        testUser = userRepository.save(testUser);
    }

    @Test
    void searchByCoordinates_calculatesHaversineAndSortsAscending() {
        Instant future1 = Instant.now().plusSeconds(3600);
        Instant future2 = Instant.now().plusSeconds(7200);

        // Cab to Delhi Airport (~212 km from Patiala)
        CabGroup delhiCab = CabGroup.builder()
                .creator(testUser)
                .pickupPoint("Thapar Campus")
                .pickupLat(30.3547)
                .pickupLng(76.3697)
                .dropPoint("Delhi Airport IGI")
                .dropLat(28.5562)
                .dropLng(77.1000)
                .departureTime(future1)
                .totalSeats(4)
                .seatsTaken(1)
                .estimatedFare(BigDecimal.valueOf(1000.00))
                .status(CabGroupStatus.OPEN)
                .build();
        cabGroupRepository.save(delhiCab);

        // Cab to Chandigarh Airport (~52 km from Patiala)
        CabGroup chdCab = CabGroup.builder()
                .creator(testUser)
                .pickupPoint("Thapar Campus")
                .pickupLat(30.3547)
                .pickupLng(76.3697)
                .dropPoint("Chandigarh Airport")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(future2)
                .totalSeats(4)
                .seatsTaken(1)
                .estimatedFare(BigDecimal.valueOf(400.00))
                .status(CabGroupStatus.OPEN)
                .build();
        cabGroupRepository.save(chdCab);

        // Search coordinates from Patiala Main Gate
        List<CabGroupSummaryProjection> results = cabGroupRepository.searchByCoordinates(
                30.3547,
                76.3697,
                Instant.now(),
                null,
                null,
                null,
                null
        );

        assertNotNull(results);
        assertTrue(results.size() >= 2);

        // Chandigarh Airport must be closer than Delhi Airport
        CabGroupSummaryProjection first = results.get(0);
        CabGroupSummaryProjection second = results.get(1);

        assertEquals("Chandigarh Airport", first.getDropPoint());
        assertEquals("Delhi Airport IGI", second.getDropPoint());

        assertNotNull(first.getDistanceKm());
        assertNotNull(second.getDistanceKm());
        assertTrue(first.getDistanceKm() < second.getDistanceKm());

        // Approx 50-55 km for Chandigarh, ~212 km for Delhi
        assertTrue(first.getDistanceKm() > 40 && first.getDistanceKm() < 60);
        assertTrue(second.getDistanceKm() > 200 && second.getDistanceKm() < 230);

        // Verify projection types and mapping
        assertNotNull(first.getId());
        assertNotNull(first.getCreatorId());
        assertNotNull(first.getDepartureTime());
        assertNotNull(first.getCreatedAt());

        assertEquals(chdCab.getId(), CabGroupService.toUuid(first.getId()));
        assertEquals(testUser.getId(), CabGroupService.toUuid(first.getCreatorId()));
        assertNotNull(CabGroupService.toInstant(first.getDepartureTime()));
        assertNotNull(CabGroupService.toInstant(first.getCreatedAt()));
    }

    @Test
    void searchByCoordinates_filtersMinSeatsAndMaxFare() {
        Instant future = Instant.now().plusSeconds(3600);

        CabGroup cab1 = CabGroup.builder()
                .creator(testUser)
                .pickupPoint("Thapar Campus")
                .pickupLat(30.3547)
                .pickupLng(76.3697)
                .dropPoint("Ambala Cantt")
                .dropLat(30.3312)
                .dropLng(76.8406)
                .departureTime(future)
                .totalSeats(4)
                .seatsTaken(1) // 3 seats available
                .estimatedFare(BigDecimal.valueOf(300.00))
                .status(CabGroupStatus.OPEN)
                .build();
        cabGroupRepository.save(cab1);

        CabGroup cab2 = CabGroup.builder()
                .creator(testUser)
                .pickupPoint("Thapar Campus")
                .pickupLat(30.3547)
                .pickupLng(76.3697)
                .dropPoint("Ambala City")
                .dropLat(30.3312)
                .dropLng(76.8406)
                .departureTime(future)
                .totalSeats(4)
                .seatsTaken(3) // 1 seat available
                .estimatedFare(BigDecimal.valueOf(800.00))
                .status(CabGroupStatus.OPEN)
                .build();
        cabGroupRepository.save(cab2);

        // Search requiring at least 2 seats and max fare 500
        List<CabGroupSummaryProjection> filtered = cabGroupRepository.searchByCoordinates(
                30.3547,
                76.3697,
                Instant.now(),
                2,
                BigDecimal.valueOf(500.00),
                null,
                null
        );

        assertEquals(1, filtered.size());
        assertEquals("Ambala Cantt", filtered.get(0).getDropPoint());
    }

    @Test
    void findByIdForUpdate_acquiresLock() {
        CabGroup cab = CabGroup.builder()
                .creator(testUser)
                .pickupPoint("Thapar Campus")
                .dropPoint("Chandigarh")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(Instant.now().plusSeconds(3600))
                .totalSeats(4)
                .seatsTaken(1)
                .estimatedFare(BigDecimal.valueOf(400))
                .status(CabGroupStatus.OPEN)
                .build();
        cab = cabGroupRepository.save(cab);

        Optional<CabGroup> locked = cabGroupRepository.findByIdForUpdate(cab.getId());
        assertTrue(locked.isPresent());
        assertEquals(cab.getId(), locked.get().getId());
    }

    @Test
    void browseUpcoming_returnsOpenGroupsOrderedByDepartureTime() {
        Instant future1 = Instant.now().plusSeconds(1800);
        Instant future2 = Instant.now().plusSeconds(7200);

        CabGroup soonerCab = CabGroup.builder()
                .creator(testUser)
                .pickupPoint("Thapar Campus")
                .pickupLat(30.3547)
                .pickupLng(76.3697)
                .dropPoint("Patiala Railway Station")
                .dropLat(30.3398)
                .dropLng(76.3869)
                .departureTime(future1)
                .totalSeats(4)
                .seatsTaken(1)
                .estimatedFare(BigDecimal.valueOf(150.00))
                .status(CabGroupStatus.OPEN)
                .build();
        cabGroupRepository.save(soonerCab);

        CabGroup laterCab = CabGroup.builder()
                .creator(testUser)
                .pickupPoint("Thapar Campus")
                .pickupLat(30.3547)
                .pickupLng(76.3697)
                .dropPoint("Delhi Airport IGI")
                .dropLat(28.5562)
                .dropLng(77.1000)
                .departureTime(future2)
                .totalSeats(4)
                .seatsTaken(1)
                .estimatedFare(BigDecimal.valueOf(1000.00))
                .status(CabGroupStatus.OPEN)
                .build();
        cabGroupRepository.save(laterCab);

        List<CabGroupSummaryProjection> results = cabGroupRepository.browseUpcoming(
                Instant.now(),
                null,
                null,
                null,
                null
        );

        assertNotNull(results);
        assertTrue(results.size() >= 2);

        CabGroupSummaryProjection first = results.get(0);
        assertNotNull(first.getId());
        assertNotNull(first.getCreatorId());
        assertNotNull(first.getDepartureTime());
        assertNotNull(first.getCreatedAt());
        assertNull(first.getDistanceKm(), "Distance should be null for non-coordinate browse");

        assertEquals(soonerCab.getId(), CabGroupService.toUuid(first.getId()));
        assertEquals(testUser.getId(), CabGroupService.toUuid(first.getCreatorId()));
        assertNotNull(CabGroupService.toInstant(first.getDepartureTime()));
        assertNotNull(CabGroupService.toInstant(first.getCreatedAt()));
    }
}
