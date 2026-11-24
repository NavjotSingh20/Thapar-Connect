package com.thaparconnect.backend.cabs;

import com.thaparconnect.backend.cabs.dto.*;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.ResourceNotFoundException;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import com.thaparconnect.backend.cabs.projection.CabGroupSummaryProjection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CabGroupServiceTest {

    @Mock
    private CabGroupRepository cabGroupRepository;

    @Mock
    private CabMemberRepository cabMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GeocodingService geocodingService;

    @InjectMocks
    private CabGroupService cabGroupService;

    private User creator;
    private User rider;
    private UUID creatorId;
    private UUID riderId;

    @BeforeEach
    void setUp() {
        creatorId = UUID.randomUUID();
        riderId = UUID.randomUUID();

        creator = User.builder()
                .id(creatorId)
                .email("creator@thapar.edu")
                .fullName("Creator Student")
                .hostel("Hostel J")
                .phoneNumber("9876543210")
                .role(Role.USER)
                .isOnboarded(true)
                .build();

        rider = User.builder()
                .id(riderId)
                .email("rider@thapar.edu")
                .fullName("Rider Student")
                .hostel("Hostel B")
                .phoneNumber("9876543211")
                .role(Role.USER)
                .isOnboarded(true)
                .build();
    }

    @Test
    void createCabGroup_valid_success() {
        CreateCabGroupRequest request = CreateCabGroupRequest.builder()
                .dropPoint("Chandigarh Airport")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(Instant.now().plusSeconds(7200))
                .totalSeats(4)
                .estimatedFare(BigDecimal.valueOf(500))
                .build();

        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(cabGroupRepository.save(any(CabGroup.class))).thenAnswer(inv -> {
            CabGroup cg = inv.getArgument(0);
            cg.setId(UUID.randomUUID());
            return cg;
        });

        CabGroupDetailDto result = cabGroupService.createCabGroup(creatorId, request);

        assertNotNull(result);
        assertEquals(4, result.getTotalSeats());
        assertEquals(1, result.getSeatsTaken());
        assertEquals(3, result.getSeatsAvailable());
        assertEquals(CabGroupStatus.OPEN, result.getStatus());
        assertEquals("Thapar University Campus, Patiala", result.getPickupPoint());
    }

    @Test
    void createCabGroup_pastDeparture_throwsBadRequest() {
        CreateCabGroupRequest request = CreateCabGroupRequest.builder()
                .dropPoint("Chandigarh Airport")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(Instant.now().minusSeconds(3600))
                .totalSeats(4)
                .estimatedFare(BigDecimal.valueOf(500))
                .build();

        ApiException ex = assertThrows(ApiException.class, () -> cabGroupService.createCabGroup(creatorId, request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_DEPARTURE_TIME", ex.getError());
    }

    @Test
    void requestJoin_autoJoinEnabled_confirmsImmediately() {
        UUID cabId = UUID.randomUUID();
        CabGroup group = CabGroup.builder()
                .id(cabId)
                .creator(creator)
                .dropPoint("Chandigarh Airport")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(Instant.now().plusSeconds(3600))
                .totalSeats(4)
                .seatsTaken(1)
                .estimatedFare(BigDecimal.valueOf(500))
                .autoJoinEnabled(true)
                .status(CabGroupStatus.OPEN)
                .build();

        when(cabGroupRepository.findByIdForUpdate(cabId)).thenReturn(Optional.of(group));
        when(cabMemberRepository.findByCabGroupIdAndUserId(cabId, riderId)).thenReturn(Optional.empty());
        when(userRepository.findById(riderId)).thenReturn(Optional.of(rider));
        when(cabMemberRepository.save(any(CabMember.class))).thenAnswer(inv -> inv.getArgument(0));

        JoinCabRequest request = JoinCabRequest.builder().seatsRequested(1).build();
        CabMemberDto result = cabGroupService.requestJoin(cabId, riderId, request);

        assertNotNull(result);
        assertEquals(CabMemberStatus.CONFIRMED, result.getStatus());
        assertEquals(2, group.getSeatsTaken());
        verify(cabGroupRepository).save(group);
    }

    @Test
    void requestJoin_lastSeat_transitionsToFull() {
        UUID cabId = UUID.randomUUID();
        CabGroup group = CabGroup.builder()
                .id(cabId)
                .creator(creator)
                .dropPoint("Chandigarh Airport")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(Instant.now().plusSeconds(3600))
                .totalSeats(2)
                .seatsTaken(1)
                .estimatedFare(BigDecimal.valueOf(500))
                .autoJoinEnabled(true)
                .status(CabGroupStatus.OPEN)
                .build();

        when(cabGroupRepository.findByIdForUpdate(cabId)).thenReturn(Optional.of(group));
        when(cabMemberRepository.findByCabGroupIdAndUserId(cabId, riderId)).thenReturn(Optional.empty());
        when(userRepository.findById(riderId)).thenReturn(Optional.of(rider));
        when(cabMemberRepository.save(any(CabMember.class))).thenAnswer(inv -> inv.getArgument(0));

        JoinCabRequest request = JoinCabRequest.builder().seatsRequested(1).build();
        CabMemberDto result = cabGroupService.requestJoin(cabId, riderId, request);

        assertEquals(CabMemberStatus.CONFIRMED, result.getStatus());
        assertEquals(2, group.getSeatsTaken());
        assertEquals(CabGroupStatus.FULL, group.getStatus());
    }

    @Test
    void requestJoin_creatorSelfJoin_throwsBadRequest() {
        UUID cabId = UUID.randomUUID();
        CabGroup group = CabGroup.builder()
                .id(cabId)
                .creator(creator)
                .departureTime(Instant.now().plusSeconds(3600))
                .totalSeats(4)
                .seatsTaken(1)
                .status(CabGroupStatus.OPEN)
                .build();

        when(cabGroupRepository.findByIdForUpdate(cabId)).thenReturn(Optional.of(group));

        JoinCabRequest request = JoinCabRequest.builder().seatsRequested(1).build();
        ApiException ex = assertThrows(ApiException.class, () -> cabGroupService.requestJoin(cabId, creatorId, request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("CREATOR_CANNOT_JOIN", ex.getError());
    }

    @Test
    void requestJoin_duplicateActiveJoin_throwsConflict() {
        UUID cabId = UUID.randomUUID();
        CabGroup group = CabGroup.builder()
                .id(cabId)
                .creator(creator)
                .departureTime(Instant.now().plusSeconds(3600))
                .totalSeats(4)
                .seatsTaken(1)
                .status(CabGroupStatus.OPEN)
                .build();

        CabMember activeMember = CabMember.builder()
                .id(UUID.randomUUID())
                .cabGroup(group)
                .user(rider)
                .status(CabMemberStatus.PENDING)
                .build();

        when(cabGroupRepository.findByIdForUpdate(cabId)).thenReturn(Optional.of(group));
        when(cabMemberRepository.findByCabGroupIdAndUserId(cabId, riderId)).thenReturn(Optional.of(activeMember));

        JoinCabRequest request = JoinCabRequest.builder().seatsRequested(1).build();
        ApiException ex = assertThrows(ApiException.class, () -> cabGroupService.requestJoin(cabId, riderId, request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("ALREADY_JOINED", ex.getError());
    }

    @Test
    void acceptMemberRequest_nonCreator_throwsForbidden() {
        UUID cabId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        CabGroup group = CabGroup.builder()
                .id(cabId)
                .creator(creator)
                .build();

        when(cabGroupRepository.findByIdForUpdate(cabId)).thenReturn(Optional.of(group));

        ApiException ex = assertThrows(ApiException.class, () -> cabGroupService.acceptMemberRequest(cabId, memberId, riderId));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void closeCabGroup_creator_success() {
        UUID cabId = UUID.randomUUID();
        CabGroup group = CabGroup.builder()
                .id(cabId)
                .creator(creator)
                .status(CabGroupStatus.OPEN)
                .build();

        when(cabGroupRepository.findById(cabId)).thenReturn(Optional.of(group));
        when(cabGroupRepository.save(any(CabGroup.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cabMemberRepository.findByCabGroupIdOrderByCreatedAtAsc(cabId)).thenReturn(Collections.emptyList());

        CabGroupDetailDto result = cabGroupService.closeCabGroup(cabId, creatorId);
        assertNotNull(result);
        assertEquals(CabGroupStatus.CLOSED, result.getStatus());
    }

    @Test
    void searchCabGroups_withCoordinates_callsSearchByCoordinatesAndMapsDto() {
        UUID cabId = UUID.randomUUID();
        OffsetDateTime futureOffset = OffsetDateTime.now(ZoneOffset.UTC).plusHours(3);

        CabGroupSummaryProjection projection = mock(CabGroupSummaryProjection.class);
        when(projection.getId()).thenReturn(cabId.toString());
        when(projection.getCreatorId()).thenReturn(creatorId);
        when(projection.getDepartureTime()).thenReturn(futureOffset);
        when(projection.getCreatedAt()).thenReturn(Instant.now());
        when(projection.getPickupPoint()).thenReturn("Thapar Campus");
        when(projection.getPickupLat()).thenReturn(30.3547);
        when(projection.getPickupLng()).thenReturn(76.3697);
        when(projection.getDropPoint()).thenReturn("Chandigarh Airport");
        when(projection.getDropLat()).thenReturn(30.6735);
        when(projection.getDropLng()).thenReturn(76.7885);
        when(projection.getTotalSeats()).thenReturn(4);
        when(projection.getSeatsTaken()).thenReturn(1);
        when(projection.getEstimatedFare()).thenReturn(BigDecimal.valueOf(450.0));
        when(projection.getNote()).thenReturn("Luggage space needed");
        when(projection.getAutoJoinEnabled()).thenReturn(true);
        when(projection.getStatus()).thenReturn("OPEN");
        when(projection.getCreatorName()).thenReturn("Creator Student");
        when(projection.getCreatorHostel()).thenReturn("Hostel J");
        when(projection.getCreatorPhone()).thenReturn("9876543210");
        when(projection.getDistanceKm()).thenReturn(52.5);

        when(cabGroupRepository.searchByCoordinates(eq(30.3547), eq(76.3697), any(Instant.class), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(projection));

        List<CabGroupSummaryDto> results = cabGroupService.searchCabGroups(30.3547, 76.3697, null, null, null, null, null);

        assertNotNull(results);
        assertEquals(1, results.size());
        CabGroupSummaryDto dto = results.get(0);
        assertEquals(cabId, dto.getId());
        assertEquals(creatorId, dto.getCreator().getId());
        assertEquals("Creator Student", dto.getCreator().getName());
        assertEquals(52.5, dto.getDistanceKm());
        assertEquals(3, dto.getSeatsAvailable());
        assertEquals(CabGroupStatus.OPEN, dto.getStatus());
        assertEquals(futureOffset.toInstant(), dto.getDepartureTime());
        assertNotNull(dto.getCreatedAt());
    }

    @Test
    void searchCabGroups_withoutCoordinates_callsBrowseUpcomingAndMapsDto() {
        UUID cabId = UUID.randomUUID();
        byte[] cabIdBytes = new byte[16];
        ByteBuffer bb = ByteBuffer.wrap(cabIdBytes);
        bb.putLong(cabId.getMostSignificantBits());
        bb.putLong(cabId.getLeastSignificantBits());

        Instant futureInstant = Instant.now().plusSeconds(3600);

        CabGroupSummaryProjection projection = mock(CabGroupSummaryProjection.class);
        when(projection.getId()).thenReturn(cabIdBytes);
        when(projection.getCreatorId()).thenReturn(creatorId.toString());
        when(projection.getDepartureTime()).thenReturn(java.sql.Timestamp.from(futureInstant));
        when(projection.getCreatedAt()).thenReturn(Instant.now());
        when(projection.getPickupPoint()).thenReturn("Thapar Campus");
        when(projection.getDropPoint()).thenReturn("Rajpura");
        when(projection.getTotalSeats()).thenReturn(3);
        when(projection.getSeatsTaken()).thenReturn(1);
        when(projection.getEstimatedFare()).thenReturn(BigDecimal.valueOf(200.0));
        when(projection.getStatus()).thenReturn("OPEN");
        when(projection.getCreatorName()).thenReturn("Host");
        when(projection.getDistanceKm()).thenReturn(null);

        when(cabGroupRepository.browseUpcoming(any(Instant.class), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(projection));

        List<CabGroupSummaryDto> results = cabGroupService.searchCabGroups(null, null, null, null, null, null, null);

        assertNotNull(results);
        assertEquals(1, results.size());
        CabGroupSummaryDto dto = results.get(0);
        assertEquals(cabId, dto.getId());
        assertEquals(creatorId, dto.getCreator().getId());
        assertNull(dto.getDistanceKm());
        assertEquals(2, dto.getSeatsAvailable());
        assertNotNull(dto.getDepartureTime());
    }

    @Test
    void searchCabGroups_withSorting_sortsResults() {
        CabGroupSummaryProjection p1 = mock(CabGroupSummaryProjection.class);
        when(p1.getId()).thenReturn(UUID.randomUUID());
        when(p1.getCreatorId()).thenReturn(creatorId);
        when(p1.getDepartureTime()).thenReturn(Instant.now().plusSeconds(7200));
        when(p1.getEstimatedFare()).thenReturn(BigDecimal.valueOf(600.0));
        when(p1.getDistanceKm()).thenReturn(80.0);
        when(p1.getStatus()).thenReturn("OPEN");

        CabGroupSummaryProjection p2 = mock(CabGroupSummaryProjection.class);
        when(p2.getId()).thenReturn(UUID.randomUUID());
        when(p2.getCreatorId()).thenReturn(creatorId);
        when(p2.getDepartureTime()).thenReturn(Instant.now().plusSeconds(3600));
        when(p2.getEstimatedFare()).thenReturn(BigDecimal.valueOf(300.0));
        when(p2.getDistanceKm()).thenReturn(40.0);
        when(p2.getStatus()).thenReturn("OPEN");

        when(cabGroupRepository.browseUpcoming(any(Instant.class), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of(p1, p2));

        // Sort by fare
        List<CabGroupSummaryDto> fareSorted = cabGroupService.searchCabGroups(null, null, null, null, null, null, "fare");
        assertEquals(BigDecimal.valueOf(300.0), fareSorted.get(0).getEstimatedFare());
        assertEquals(BigDecimal.valueOf(600.0), fareSorted.get(1).getEstimatedFare());

        // Sort by departure time
        List<CabGroupSummaryDto> timeSorted = cabGroupService.searchCabGroups(null, null, null, null, null, null, "departuretime");
        assertTrue(timeSorted.get(0).getDepartureTime().isBefore(timeSorted.get(1).getDepartureTime()));
    }

    @Test
    void toUuid_handlesAllSupportedTypes() {
        assertNull(CabGroupService.toUuid(null));

        UUID expected = UUID.randomUUID();
        // 1. UUID instance
        assertEquals(expected, CabGroupService.toUuid(expected));

        // 2. byte[16]
        byte[] bytes16 = new byte[16];
        ByteBuffer.wrap(bytes16).putLong(expected.getMostSignificantBits()).putLong(expected.getLeastSignificantBits());
        assertEquals(expected, CabGroupService.toUuid(bytes16));

        // 3. byte[] string
        byte[] strBytes = expected.toString().getBytes(StandardCharsets.UTF_8);
        assertEquals(expected, CabGroupService.toUuid(strBytes));

        // 4. String
        assertEquals(expected, CabGroupService.toUuid(expected.toString()));
        assertEquals(expected, CabGroupService.toUuid("  " + expected + "  "));
    }

    @Test
    void toInstant_handlesAllSupportedTypes() {
        assertNull(CabGroupService.toInstant(null));

        Instant now = Instant.now();
        // 1. Instant
        assertEquals(now, CabGroupService.toInstant(now));

        // 2. OffsetDateTime
        OffsetDateTime odt = now.atOffset(ZoneOffset.ofHours(5));
        assertEquals(now, CabGroupService.toInstant(odt));

        // 3. ZonedDateTime
        ZonedDateTime zdt = now.atZone(ZoneId.of("Asia/Kolkata"));
        assertEquals(now, CabGroupService.toInstant(zdt));

        // 4. java.sql.Timestamp
        java.sql.Timestamp ts = java.sql.Timestamp.from(now);
        assertEquals(now, CabGroupService.toInstant(ts));

        // 5. java.util.Date
        java.util.Date date = java.util.Date.from(now);
        assertEquals(now.toEpochMilli(), CabGroupService.toInstant(date).toEpochMilli());

        // 6. LocalDateTime
        LocalDateTime ldt = LocalDateTime.of(2026, 11, 23, 12, 0, 0);
        assertEquals(ldt.toInstant(ZoneOffset.UTC), CabGroupService.toInstant(ldt));

        // 7. String formats
        assertEquals(now, CabGroupService.toInstant(now.toString()));
        assertEquals(odt.toInstant(), CabGroupService.toInstant(odt.toString()));
    }
}
