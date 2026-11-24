package com.thaparconnect.backend.cabs;

import com.thaparconnect.backend.cabs.dto.CreateCabGroupRequest;
import com.thaparconnect.backend.cabs.dto.JoinCabRequest;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class CabConcurrencyIntegrationTest {

    @Autowired
    private CabGroupService cabGroupService;

    @Autowired
    private CabGroupRepository cabGroupRepository;

    @Autowired
    private UserRepository userRepository;

    private User host;
    private final List<User> passengers = new ArrayList<>();

    @BeforeEach
    void setUp() {
        host = userRepository.save(User.builder()
                .email("host_conc_" + UUID.randomUUID() + "@thapar.edu")
                .fullName("Host Student")
                .phoneNumber("9876543210")
                .hostel("Hostel J")
                .role(Role.USER)
                .isOnboarded(true)
                .build());

        passengers.clear();
        for (int i = 1; i <= 10; i++) {
            passengers.add(userRepository.save(User.builder()
                    .email("passenger_" + i + "_" + UUID.randomUUID() + "@thapar.edu")
                    .fullName("Passenger " + i)
                    .phoneNumber("987654321" + (i % 10))
                    .hostel("Hostel H")
                    .role(Role.USER)
                    .isOnboarded(true)
                    .build()));
        }
    }

    @Test
    void concurrentJoins_enforcesPessimisticLocking_preventsOverbooking() throws Exception {
        // Create cab with 3 total seats (1 taken by host, 2 available)
        CreateCabGroupRequest createReq = CreateCabGroupRequest.builder()
                .dropPoint("Chandigarh Shatabdi")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(Instant.now().plusSeconds(86400))
                .totalSeats(3)
                .estimatedFare(BigDecimal.valueOf(400.00))
                .autoJoinEnabled(true)
                .build();

        UUID cabId = cabGroupService.createCabGroup(host.getId(), createReq).getId();

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final User passenger = passengers.get(i);
            executor.submit(() -> {
                try {
                    startLatch.await(); // Synchronize all threads to fire simultaneously
                    cabGroupService.requestJoin(cabId, passenger.getId(), JoinCabRequest.builder().seatsRequested(1).build());
                    successCount.incrementAndGet();
                } catch (ApiException e) {
                    if (e.getStatus().value() == 409) {
                        conflictCount.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Fire all threads together
        startLatch.countDown();
        boolean completed = finishLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All concurrent requests should finish within 10 seconds");

        // In a 3-seat cab with 1 seat for host, exactly 2 remaining seats can be taken
        assertEquals(2, successCount.get(), "Exactly 2 concurrent joiners must succeed");
        assertEquals(8, conflictCount.get(), "Remaining 8 concurrent joiners must receive 409 Conflict");

        // Verify database state: seats_taken MUST be 3 and status MUST be FULL
        CabGroup finalGroup = cabGroupRepository.findById(cabId).orElseThrow();
        assertEquals(3, finalGroup.getSeatsTaken());
        assertEquals(3, finalGroup.getTotalSeats());
        assertEquals(0, finalGroup.getSeatsAvailable());
        assertEquals(CabGroupStatus.FULL, finalGroup.getStatus());
    }
}
