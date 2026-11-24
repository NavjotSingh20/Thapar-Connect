package com.thaparconnect.backend.cabs;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.thaparconnect.backend.cabs.dto.*;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.GlobalExceptionHandler;
import com.thaparconnect.backend.security.UserPrincipal;
import com.thaparconnect.backend.users.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CabGroupControllerTest {

    @Mock
    private CabGroupService cabGroupService;

    @InjectMocks
    private CabGroupController cabGroupController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private final UUID testUserId = UUID.randomUUID();
    private UserPrincipal testPrincipal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(cabGroupController)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        testPrincipal = UserPrincipal.create(testUserId, "student@thapar.edu", Role.USER, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(testPrincipal, null, testPrincipal.getAuthorities())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createCabGroup_validRequest_returns201() throws Exception {
        UUID cabId = UUID.randomUUID();
        Instant future = Instant.now().plusSeconds(3600);

        CreateCabGroupRequest request = CreateCabGroupRequest.builder()
                .pickupPoint("Thapar University Campus, Patiala")
                .pickupLat(30.3533)
                .pickupLng(76.3686)
                .dropPoint("Chandigarh Airport")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(future)
                .totalSeats(4)
                .estimatedFare(BigDecimal.valueOf(500.00))
                .note("Luggage space needed")
                .autoJoinEnabled(true)
                .build();

        CabGroupDetailDto responseDto = CabGroupDetailDto.builder()
                .id(cabId)
                .pickupPoint(request.getPickupPoint())
                .pickupLat(request.getPickupLat())
                .pickupLng(request.getPickupLng())
                .dropPoint(request.getDropPoint())
                .dropLat(request.getDropLat())
                .dropLng(request.getDropLng())
                .departureTime(future)
                .totalSeats(4)
                .seatsTaken(1)
                .seatsAvailable(3)
                .estimatedFare(BigDecimal.valueOf(500.00))
                .note("Luggage space needed")
                .autoJoinEnabled(true)
                .status(CabGroupStatus.OPEN)
                .creator(UserSummaryDto.builder()
                        .id(testUserId)
                        .name("Thapar Student")
                        .hostel("Hostel J")
                        .phoneNumber("9876543210")
                        .phone("9876543210")
                        .build())
                .members(Collections.emptyList())
                .build();

        when(cabGroupService.createCabGroup(eq(testUserId), any(CreateCabGroupRequest.class))).thenReturn(responseDto);

        mockMvc.perform(post("/api/v1/cabs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(cabId.toString()))
                .andExpect(jsonPath("$.dropPoint").value("Chandigarh Airport"))
                .andExpect(jsonPath("$.totalSeats").value(4))
                .andExpect(jsonPath("$.seatsTaken").value(1))
                .andExpect(jsonPath("$.seatsAvailable").value(3))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.creator.name").value("Thapar Student"));

        verify(cabGroupService).createCabGroup(eq(testUserId), any(CreateCabGroupRequest.class));
    }

    @Test
    void createCabGroup_invalidSeats_returns400() throws Exception {
        Instant future = Instant.now().plusSeconds(3600);

        CreateCabGroupRequest request = CreateCabGroupRequest.builder()
                .dropPoint("Chandigarh Airport")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(future)
                .totalSeats(1) // Invalid: < 2
                .estimatedFare(BigDecimal.valueOf(500.00))
                .build();

        mockMvc.perform(post("/api/v1/cabs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
    }

    @Test
    void searchCabGroups_spatial_returns200AndList() throws Exception {
        UUID cabId = UUID.randomUUID();
        CabGroupSummaryDto summaryDto = CabGroupSummaryDto.builder()
                .id(cabId)
                .dropPoint("Chandigarh Airport")
                .dropLat(30.6735)
                .dropLng(76.7885)
                .departureTime(Instant.now().plusSeconds(7200))
                .totalSeats(4)
                .seatsTaken(1)
                .seatsAvailable(3)
                .estimatedFare(BigDecimal.valueOf(400))
                .status(CabGroupStatus.OPEN)
                .distanceKm(52.4)
                .creator(UserSummaryDto.builder().id(testUserId).name("Student").hostel("Hostel H").phone("9876543210").build())
                .build();

        when(cabGroupService.searchCabGroups(any(), eq(30.3547), eq(76.3697), any(), any(), any(), any(), any()))
                .thenReturn(List.of(summaryDto));

        mockMvc.perform(get("/api/v1/cabs")
                        .param("searchLat", "30.3547")
                        .param("searchLng", "76.3697"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(cabId.toString()))
                .andExpect(jsonPath("$[0].distanceKm").value(52.4))
                .andExpect(jsonPath("$[0].creator.hostel").value("Hostel H"));
    }

    @Test
    void getCabGroup_existingId_returns200() throws Exception {
        UUID cabId = UUID.randomUUID();
        CabGroupDetailDto detailDto = CabGroupDetailDto.builder()
                .id(cabId)
                .dropPoint("Delhi Airport")
                .dropLat(28.5562)
                .dropLng(77.1000)
                .departureTime(Instant.now().plusSeconds(3600))
                .totalSeats(4)
                .seatsTaken(2)
                .seatsAvailable(2)
                .estimatedFare(BigDecimal.valueOf(800))
                .status(CabGroupStatus.OPEN)
                .creator(UserSummaryDto.builder().id(testUserId).name("Host").hostel("Hostel J").phone("9876543210").build())
                .members(Collections.emptyList())
                .build();

        when(cabGroupService.getCabGroupDetail(cabId)).thenReturn(detailDto);

        mockMvc.perform(get("/api/v1/cabs/{id}", cabId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(cabId.toString()))
                .andExpect(jsonPath("$.dropPoint").value("Delhi Airport"));
    }

    @Test
    void joinCabGroup_valid_returns200() throws Exception {
        UUID cabId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        JoinCabRequest request = JoinCabRequest.builder()
                .seatsRequested(1)
                .note("Pickup near gate")
                .build();

        CabMemberDto memberDto = CabMemberDto.builder()
                .id(memberId)
                .cabGroupId(cabId)
                .userId(testUserId)
                .seatsRequested(1)
                .status(CabMemberStatus.PENDING)
                .note("Pickup near gate")
                .build();

        when(cabGroupService.requestJoin(eq(cabId), eq(testUserId), any(JoinCabRequest.class)))
                .thenReturn(memberDto);

        mockMvc.perform(post("/api/v1/cabs/{id}/join", cabId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(memberId.toString()))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void joinCabGroup_fullGroup_returns409Conflict() throws Exception {
        UUID cabId = UUID.randomUUID();
        JoinCabRequest request = JoinCabRequest.builder().seatsRequested(1).build();

        when(cabGroupService.requestJoin(eq(cabId), eq(testUserId), any(JoinCabRequest.class)))
                .thenThrow(new ApiException(HttpStatus.CONFLICT, "CAB_GROUP_FULL", "Cab group is already full"));

        mockMvc.perform(post("/api/v1/cabs/{id}/join", cabId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("CAB_GROUP_FULL"));
    }

    @Test
    void acceptMember_creator_returns200() throws Exception {
        UUID cabId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        CabMemberDto confirmedDto = CabMemberDto.builder()
                .id(memberId)
                .cabGroupId(cabId)
                .status(CabMemberStatus.CONFIRMED)
                .seatsRequested(1)
                .build();

        when(cabGroupService.acceptMemberRequest(cabId, memberId, testUserId))
                .thenReturn(confirmedDto);

        mockMvc.perform(post("/api/v1/cabs/{id}/members/{memberId}/accept", cabId, memberId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    void rejectMember_nonCreator_returns403() throws Exception {
        UUID cabId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        when(cabGroupService.rejectMemberRequest(cabId, memberId, testUserId))
                .thenThrow(new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only creator can reject"));

        mockMvc.perform(post("/api/v1/cabs/{id}/members/{memberId}/reject", cabId, memberId))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
    }

    @Test
    void closeCabGroup_creator_returns200() throws Exception {
        UUID cabId = UUID.randomUUID();
        CabGroupDetailDto closedDto = CabGroupDetailDto.builder()
                .id(cabId)
                .status(CabGroupStatus.CLOSED)
                .build();

        when(cabGroupService.closeCabGroup(cabId, testUserId)).thenReturn(closedDto);

        mockMvc.perform(patch("/api/v1/cabs/{id}/close", cabId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }
}
