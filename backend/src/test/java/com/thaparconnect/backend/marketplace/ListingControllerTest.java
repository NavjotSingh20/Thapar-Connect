package com.thaparconnect.backend.marketplace;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.GlobalExceptionHandler;
import com.thaparconnect.backend.marketplace.dto.*;
import com.thaparconnect.backend.security.UserPrincipal;
import com.thaparconnect.backend.users.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.support.DefaultFormattingConversionService;
import org.springframework.format.support.FormattingConversionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
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
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ListingControllerTest {

    @Mock
    private ListingService listingService;

    @InjectMocks
    private ListingController listingController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private final UUID testUserId = UUID.randomUUID();
    private final UUID testListingId = UUID.randomUUID();
    private UserPrincipal testPrincipal;

    @BeforeEach
    void setUp() {
        FormattingConversionService conversionService = new DefaultFormattingConversionService();
        conversionService.addConverter(new StringToListingCategoryConverter());
        conversionService.addConverter(new StringToListingConditionConverter());

        mockMvc = MockMvcBuilders.standaloneSetup(listingController)
                .setConversionService(conversionService)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        testPrincipal = UserPrincipal.create(testUserId, "student@thapar.edu", Role.USER, true);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                testPrincipal, null, testPrincipal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createListing_authenticatedUser_returns201() throws Exception {
        ListingDetailDto detailDto = ListingDetailDto.builder()
                .id(testListingId)
                .title("Scientific Calculator")
                .category("Calculator")
                .description("Casio scientific calculator")
                .condition("Like new")
                .price(new BigDecimal("800.00"))
                .hostel("Hostel J")
                .status(ListingStatus.AVAILABLE)
                .images(List.of(ListingImageDto.builder().id(UUID.randomUUID()).imageUrl("/api/v1/storage/marketplace/img.png").orderIndex(0).build()))
                .seller(ListingSellerDto.builder().id(testUserId).name("Test Student").hostel("Hostel J").build())
                .offlinePaymentDisclaimer("Payments in v1 are settled directly offline between users.")
                .createdAt(Instant.now())
                .build();

        when(listingService.createListing(eq(testUserId), any(), any())).thenReturn(detailDto);

        MockMultipartFile imageFile = new MockMultipartFile(
                "images",
                "calculator.png",
                "image/png",
                "dummy image content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/marketplace/listings")
                        .file(imageFile)
                        .param("title", "Scientific Calculator")
                        .param("category", "Calculator")
                        .param("description", "Casio scientific calculator")
                        .param("condition", "Like new")
                        .param("price", "800.00")
                        .param("hostel", "Hostel J"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(testListingId.toString()))
                .andExpect(jsonPath("$.title").value("Scientific Calculator"))
                .andExpect(jsonPath("$.seller.phoneNumber").doesNotExist());
    }

    @Test
    void searchListings_returns200WithPageContent() throws Exception {
        ListingSummaryDto summary = ListingSummaryDto.builder()
                .id(testListingId)
                .title("Mountain Bike")
                .category("Cycle")
                .price(new BigDecimal("2500"))
                .condition("Used")
                .hostel("Hostel J")
                .primaryImageUrl("/api/v1/storage/marketplace/bike.png")
                .status(ListingStatus.AVAILABLE)
                .createdAt(Instant.now())
                .build();

        PageImpl<ListingSummaryDto> pageResult = new PageImpl<>(List.of(summary), PageRequest.of(0, 10), 1);
        when(listingService.searchListings(any(), any(), any(), any(), any(), any(), any())).thenReturn(pageResult);

        mockMvc.perform(get("/api/v1/marketplace/listings")
                        .param("query", "Bike")
                        .param("category", "Cycle")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Mountain Bike"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void getListingDetail_validId_returns200() throws Exception {
        ListingDetailDto detail = ListingDetailDto.builder()
                .id(testListingId)
                .title("Engineering Book")
                .category("Books")
                .description("Data structures and algorithms")
                .condition("Used")
                .price(new BigDecimal("450"))
                .hostel("Hostel M")
                .status(ListingStatus.AVAILABLE)
                .images(Collections.emptyList())
                .seller(ListingSellerDto.builder().id(testUserId).name("Book Seller").hostel("Hostel M").build())
                .offlinePaymentDisclaimer("Payments in v1 are settled directly offline between users.")
                .createdAt(Instant.now())
                .build();

        when(listingService.getListingDetail(testListingId)).thenReturn(detail);

        mockMvc.perform(get("/api/v1/marketplace/listings/" + testListingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testListingId.toString()))
                .andExpect(jsonPath("$.title").value("Engineering Book"))
                .andExpect(jsonPath("$.offlinePaymentDisclaimer").exists());
    }

    @Test
    void updateListing_bySeller_returns200() throws Exception {
        ListingUpdateRequest updateReq = ListingUpdateRequest.builder()
                .title("Updated Calculator")
                .category(ListingCategory.CALCULATOR)
                .description("Updated condition description")
                .condition(ListingCondition.USED)
                .price(new BigDecimal("750.00"))
                .hostel("Hostel J")
                .build();

        ListingDetailDto updatedDetail = ListingDetailDto.builder()
                .id(testListingId)
                .title("Updated Calculator")
                .category("Calculator")
                .description("Updated condition description")
                .condition("Used")
                .price(new BigDecimal("750.00"))
                .hostel("Hostel J")
                .status(ListingStatus.AVAILABLE)
                .images(Collections.emptyList())
                .seller(ListingSellerDto.builder().id(testUserId).name("Test Student").hostel("Hostel J").build())
                .offlinePaymentDisclaimer("Payments in v1 are settled directly offline between users.")
                .createdAt(Instant.now())
                .build();

        when(listingService.updateListing(eq(testListingId), eq(testUserId), any())).thenReturn(updatedDetail);

        mockMvc.perform(put("/api/v1/marketplace/listings/" + testListingId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Calculator"))
                .andExpect(jsonPath("$.price").value(750.00));
    }

    @Test
    void markAsSold_bySeller_returns200() throws Exception {
        ListingDetailDto soldDetail = ListingDetailDto.builder()
                .id(testListingId)
                .title("Sold Item")
                .category("Cycle")
                .status(ListingStatus.SOLD)
                .build();

        when(listingService.markAsSold(testListingId, testUserId)).thenReturn(soldDetail);

        mockMvc.perform(patch("/api/v1/marketplace/listings/" + testListingId + "/sold"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SOLD"));
    }

    @Test
    void deleteListing_bySeller_returns200() throws Exception {
        doNothing().when(listingService).deleteListing(testListingId, testUserId, false);

        mockMvc.perform(delete("/api/v1/marketplace/listings/" + testListingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Listing deleted successfully"));
    }

    @Test
    void getMyListings_returns200WithSellerListings() throws Exception {
        ListingSummaryDto summary = ListingSummaryDto.builder()
                .id(testListingId)
                .title("My Listing")
                .category("Electronics")
                .price(new BigDecimal("1500"))
                .status(ListingStatus.AVAILABLE)
                .build();

        PageImpl<ListingSummaryDto> page = new PageImpl<>(List.of(summary), PageRequest.of(0, 20), 1);
        when(listingService.getMyListings(eq(testUserId), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/marketplace/listings/my-listings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("My Listing"));
    }

    @Test
    void unauthenticatedRequest_returns401() throws Exception {
        SecurityContextHolder.clearContext();

        mockMvc.perform(patch("/api/v1/marketplace/listings/" + testListingId + "/sold"))
                .andExpect(status().isUnauthorized());
    }
}
