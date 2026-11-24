package com.thaparconnect.backend.safety;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.thaparconnect.backend.auth.RefreshTokenRepository;
import com.thaparconnect.backend.cabs.CabGroup;
import com.thaparconnect.backend.cabs.CabGroupRepository;
import com.thaparconnect.backend.cabs.CabGroupService;
import com.thaparconnect.backend.cabs.CabGroupStatus;
import com.thaparconnect.backend.cabs.dto.CabGroupDetailDto;
import com.thaparconnect.backend.common.GlobalExceptionHandler;
import com.thaparconnect.backend.marketplace.Listing;
import com.thaparconnect.backend.marketplace.ListingRepository;
import com.thaparconnect.backend.marketplace.ListingService;
import com.thaparconnect.backend.marketplace.dto.ListingDetailDto;
import com.thaparconnect.backend.security.UserPrincipal;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminControllerTest {

    @Mock
    private CabGroupRepository cabGroupRepository;

    @Mock
    private CabGroupService cabGroupService;

    @Mock
    private ListingRepository listingRepository;

    @Mock
    private ListingService listingService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private ReportRepository reportRepository;

    @InjectMocks
    private AdminController adminController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private final UUID adminId = UUID.randomUUID();
    private UserPrincipal adminPrincipal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminController)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        adminPrincipal = UserPrincipal.create(adminId, "admin@thapar.edu", Role.ADMIN, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(adminPrincipal, null, adminPrincipal.getAuthorities())
        );
    }

    @Test
    void getListings_returns200() throws Exception {
        UUID listingId = UUID.randomUUID();
        Listing listing = Listing.builder().id(listingId).title("Test Item").build();
        ListingDetailDto dto = ListingDetailDto.builder().id(listingId).title("Test Item").build();

        when(listingRepository.findAll()).thenReturn(List.of(listing));
        when(listingService.mapToDetailDto(listing)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/listings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(listingId.toString()));
    }

    @Test
    void deleteListing_softDeletesListing() throws Exception {
        UUID listingId = UUID.randomUUID();
        Listing listing = Listing.builder().id(listingId).title("Test Item").isDeleted(false).build();

        when(listingRepository.findById(listingId)).thenReturn(Optional.of(listing));

        mockMvc.perform(delete("/api/v1/admin/listings/{id}", listingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(listing.isDeleted()).isTrue();
        verify(listingRepository).save(listing);
    }

    @Test
    void getCabs_returns200() throws Exception {
        UUID cabId = UUID.randomUUID();
        CabGroup cab = CabGroup.builder().id(cabId).dropPoint("Airport").build();
        CabGroupDetailDto dto = CabGroupDetailDto.builder().id(cabId).dropPoint("Airport").build();

        when(cabGroupRepository.findAll()).thenReturn(List.of(cab));
        when(cabGroupService.toDetailDto(eq(cab), any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/cabs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(cabId.toString()));
    }

    @Test
    void deleteCab_marksClosed() throws Exception {
        UUID cabId = UUID.randomUUID();
        CabGroup cab = CabGroup.builder().id(cabId).status(CabGroupStatus.OPEN).build();

        when(cabGroupRepository.findById(cabId)).thenReturn(Optional.of(cab));

        mockMvc.perform(delete("/api/v1/admin/cabs/{id}", cabId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(cab.getStatus()).isEqualTo(CabGroupStatus.CLOSED);
        verify(cabGroupRepository).save(cab);
    }

    @Test
    void banUser_setsBannedAndRevokesTokens() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).email("student@thapar.edu").isBanned(false).build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/v1/admin/users/{id}/ban", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(user.isBanned()).isTrue();
        verify(userRepository).save(user);
        verify(refreshTokenRepository).revokeAllByUserId(userId);
    }

    @Test
    void unbanUser_restoresAccess() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).email("student@thapar.edu").isBanned(true).build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/v1/admin/users/{id}/unban", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(user.isBanned()).isFalse();
        verify(userRepository).save(user);
    }

    @Test
    void getReports_returns200() throws Exception {
        UUID reportId = UUID.randomUUID();
        User reporter = User.builder().id(UUID.randomUUID()).fullName("Reporter").build();
        Report report = Report.builder()
                .id(reportId)
                .reporter(reporter)
                .targetType(TargetType.USER)
                .targetId(UUID.randomUUID())
                .reason("Spam")
                .status(ReportStatus.PENDING)
                .createdAt(Instant.now())
                .build();

        when(reportRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(report));

        mockMvc.perform(get("/api/v1/admin/reports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(reportId.toString()))
                .andExpect(jsonPath("$[0].reason").value("Spam"));
    }

    @Test
    void updateReportStatus_updatesStatus() throws Exception {
        UUID reportId = UUID.randomUUID();
        User reporter = User.builder().id(UUID.randomUUID()).fullName("Reporter").build();
        Report report = Report.builder()
                .id(reportId)
                .reporter(reporter)
                .targetType(TargetType.USER)
                .targetId(UUID.randomUUID())
                .reason("Spam")
                .status(ReportStatus.PENDING)
                .createdAt(Instant.now())
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArgument(0));

        UpdateReportStatusRequest request = new UpdateReportStatusRequest(ReportStatus.RESOLVED);

        mockMvc.perform(patch("/api/v1/admin/reports/{id}", reportId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        assertThat(report.getStatus()).isEqualTo(ReportStatus.RESOLVED);
    }
}
