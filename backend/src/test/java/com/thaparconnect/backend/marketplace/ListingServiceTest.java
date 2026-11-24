package com.thaparconnect.backend.marketplace;

import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.ResourceNotFoundException;
import com.thaparconnect.backend.marketplace.dto.ListingCreateRequest;
import com.thaparconnect.backend.marketplace.dto.ListingDetailDto;
import com.thaparconnect.backend.marketplace.dto.ListingSummaryDto;
import com.thaparconnect.backend.marketplace.dto.ListingUpdateRequest;
import com.thaparconnect.backend.storage.StorageService;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListingServiceTest {

    @Mock
    private ListingRepository listingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private ListingService listingService;

    private User seller;
    private User otherUser;
    private final UUID sellerId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();
    private final UUID listingId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        seller = User.builder()
                .id(sellerId)
                .email("seller@thapar.edu")
                .fullName("Seller Student")
                .hostel("Hostel J")
                .phoneNumber("9876543210")
                .role(Role.USER)
                .isOnboarded(true)
                .build();

        otherUser = User.builder()
                .id(otherUserId)
                .email("buyer@thapar.edu")
                .fullName("Buyer Student")
                .hostel("Hostel M")
                .phoneNumber("9123456789")
                .role(Role.USER)
                .isOnboarded(true)
                .build();
    }

    private List<MultipartFile> createMockImages(int count) {
        List<MultipartFile> list = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            list.add(new MockMultipartFile(
                    "images",
                    "photo" + (i + 1) + ".png",
                    "image/png",
                    ("dummy-image-bytes-" + i).getBytes()
            ));
        }
        return list;
    }

    @Test
    void createListing_valid1Image_createsSuccessfully() {
        ListingCreateRequest request = ListingCreateRequest.builder()
                .title("Hero Mountain Cycle")
                .category(ListingCategory.CYCLE)
                .description("Good running condition cycle")
                .condition(ListingCondition.USED)
                .price(new BigDecimal("2500.00"))
                .hostel("Hostel J")
                .build();

        when(userRepository.findById(sellerId)).thenReturn(Optional.of(seller));
        when(storageService.store(any(), eq("marketplace"))).thenReturn("/api/v1/storage/marketplace/uuid-1.png");
        when(listingRepository.save(any(Listing.class))).thenAnswer(invocation -> {
            Listing l = invocation.getArgument(0);
            l.setId(listingId);
            return l;
        });

        ListingDetailDto result = listingService.createListing(sellerId, request, createMockImages(1));

        assertNotNull(result);
        assertEquals(listingId, result.getId());
        assertEquals("Hero Mountain Cycle", result.getTitle());
        assertEquals(ListingStatus.AVAILABLE, result.getStatus());
        assertEquals(1, result.getImages().size());
        assertEquals("/api/v1/storage/marketplace/uuid-1.png", result.getImages().get(0).getImageUrl());
        assertNotNull(result.getOfflinePaymentDisclaimer());
        assertTrue(result.getOfflinePaymentDisclaimer().toLowerCase().contains("offline"));
    }

    @Test
    void createListing_valid5Images_createsSuccessfully() {
        ListingCreateRequest request = ListingCreateRequest.builder()
                .title("Complete Semester Book Set")
                .category(ListingCategory.BOOKS)
                .description("All 5 semester textbooks")
                .condition(ListingCondition.LIKE_NEW)
                .price(new BigDecimal("1200.00"))
                .hostel("Hostel J")
                .build();

        when(userRepository.findById(sellerId)).thenReturn(Optional.of(seller));
        when(storageService.store(any(), eq("marketplace"))).thenReturn("/api/v1/storage/marketplace/uuid.png");
        when(listingRepository.save(any(Listing.class))).thenAnswer(inv -> {
            Listing l = inv.getArgument(0);
            l.setId(listingId);
            return l;
        });

        ListingDetailDto result = listingService.createListing(sellerId, request, createMockImages(5));

        assertNotNull(result);
        assertEquals(5, result.getImages().size());
    }

    @Test
    void createListing_0Images_throwsBadRequest() {
        ListingCreateRequest request = ListingCreateRequest.builder()
                .title("Cycle")
                .category(ListingCategory.CYCLE)
                .description("Test")
                .condition(ListingCondition.NEW)
                .price(new BigDecimal("1000"))
                .build();

        ApiException ex = assertThrows(ApiException.class, () ->
                listingService.createListing(sellerId, request, Collections.emptyList()));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_IMAGES", ex.getError());
    }

    @Test
    void createListing_exceeding5Images_throwsBadRequest() {
        ListingCreateRequest request = ListingCreateRequest.builder()
                .title("Cycle")
                .category(ListingCategory.CYCLE)
                .description("Test")
                .condition(ListingCondition.NEW)
                .price(new BigDecimal("1000"))
                .build();

        ApiException ex = assertThrows(ApiException.class, () ->
                listingService.createListing(sellerId, request, createMockImages(6)));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("TOO_MANY_IMAGES", ex.getError());
    }

    @Test
    void createListing_negativeOrZeroOrExcessivePrice_throwsBadRequest() {
        // Negative price
        ListingCreateRequest negReq = ListingCreateRequest.builder()
                .title("Cycle")
                .category(ListingCategory.CYCLE)
                .description("Test")
                .condition(ListingCondition.NEW)
                .price(new BigDecimal("-10.00"))
                .build();

        ApiException exNeg = assertThrows(ApiException.class, () ->
                listingService.createListing(sellerId, negReq, createMockImages(1)));
        assertEquals(HttpStatus.BAD_REQUEST, exNeg.getStatus());

        // Zero price
        ListingCreateRequest zeroReq = ListingCreateRequest.builder()
                .title("Cycle")
                .category(ListingCategory.CYCLE)
                .description("Test")
                .condition(ListingCondition.NEW)
                .price(BigDecimal.ZERO)
                .build();

        ApiException exZero = assertThrows(ApiException.class, () ->
                listingService.createListing(sellerId, zeroReq, createMockImages(1)));
        assertEquals(HttpStatus.BAD_REQUEST, exZero.getStatus());

        // Excessive price (> 1,000,000 INR)
        ListingCreateRequest excessReq = ListingCreateRequest.builder()
                .title("Cycle")
                .category(ListingCategory.CYCLE)
                .description("Test")
                .condition(ListingCondition.NEW)
                .price(new BigDecimal("1000001.00"))
                .build();

        ApiException exExcess = assertThrows(ApiException.class, () ->
                listingService.createListing(sellerId, excessReq, createMockImages(1)));
        assertEquals(HttpStatus.BAD_REQUEST, exExcess.getStatus());
    }

    @Test
    void createListing_defaultsHostelToSellerHostel() {
        ListingCreateRequest request = ListingCreateRequest.builder()
                .title("Default Hostel Cycle")
                .category(ListingCategory.CYCLE)
                .description("Cycle with no hostel specified")
                .condition(ListingCondition.USED)
                .price(new BigDecimal("1500.00"))
                .hostel(null)
                .build();

        when(userRepository.findById(sellerId)).thenReturn(Optional.of(seller));
        when(storageService.store(any(), eq("marketplace"))).thenReturn("/api/v1/storage/marketplace/uuid.png");
        when(listingRepository.save(any(Listing.class))).thenAnswer(inv -> {
            Listing l = inv.getArgument(0);
            l.setId(listingId);
            return l;
        });

        ListingDetailDto result = listingService.createListing(sellerId, request, createMockImages(1));

        assertEquals("Hostel J", result.getHostel());
    }

    @Test
    void sellerPrivacy_noPhoneNumberInDetailOrSummaryDtos() {
        // Reflection check that ListingSellerDto, ListingSummaryDto, and ListingDetailDto strictly omit phone/phoneNumber
        for (Class<?> clazz : List.of(
                com.thaparconnect.backend.marketplace.dto.ListingSellerDto.class,
                ListingSummaryDto.class,
                ListingDetailDto.class
        )) {
            for (Field field : clazz.getDeclaredFields()) {
                assertNotEquals("phone", field.getName().toLowerCase());
                assertNotEquals("phonenumber", field.getName().toLowerCase());
            }
        }
    }

    @Test
    void updateListing_bySeller_updatesSuccessfully() {
        Listing existing = Listing.builder()
                .id(listingId)
                .seller(seller)
                .title("Old Title")
                .description("Old Desc")
                .category(ListingCategory.CYCLE)
                .condition(ListingCondition.USED)
                .price(new BigDecimal("1000"))
                .hostel("Hostel J")
                .status(ListingStatus.AVAILABLE)
                .isDeleted(false)
                .images(new ArrayList<>())
                .build();

        when(listingRepository.findById(listingId)).thenReturn(Optional.of(existing));
        when(listingRepository.save(any(Listing.class))).thenAnswer(inv -> inv.getArgument(0));

        ListingUpdateRequest updateReq = ListingUpdateRequest.builder()
                .title("Updated Title")
                .description("Updated Desc")
                .category(ListingCategory.CYCLE)
                .condition(ListingCondition.LIKE_NEW)
                .price(new BigDecimal("1200"))
                .hostel("Hostel J")
                .build();

        ListingDetailDto updated = listingService.updateListing(listingId, sellerId, updateReq);

        assertEquals("Updated Title", updated.getTitle());
        assertEquals(new BigDecimal("1200"), updated.getPrice());
        assertEquals("Like new", updated.getCondition());
    }

    @Test
    void updateListing_byNonSeller_throwsForbidden() {
        Listing existing = Listing.builder()
                .id(listingId)
                .seller(seller)
                .isDeleted(false)
                .build();

        when(listingRepository.findById(listingId)).thenReturn(Optional.of(existing));

        ListingUpdateRequest updateReq = ListingUpdateRequest.builder()
                .title("Hacked Title")
                .description("Hacked Desc")
                .category(ListingCategory.CYCLE)
                .condition(ListingCondition.LIKE_NEW)
                .price(new BigDecimal("100"))
                .build();

        ApiException ex = assertThrows(ApiException.class, () ->
                listingService.updateListing(listingId, otherUserId, updateReq));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void markAsSold_bySeller_updatesStatusAndIsIdempotent() {
        Listing existing = Listing.builder()
                .id(listingId)
                .seller(seller)
                .title("Item to Sell")
                .status(ListingStatus.AVAILABLE)
                .isDeleted(false)
                .images(new ArrayList<>())
                .build();

        when(listingRepository.findById(listingId)).thenReturn(Optional.of(existing));
        when(listingRepository.save(any(Listing.class))).thenAnswer(inv -> inv.getArgument(0));

        // First call
        ListingDetailDto res1 = listingService.markAsSold(listingId, sellerId);
        assertEquals(ListingStatus.SOLD, res1.getStatus());

        // Second call (idempotent)
        ListingDetailDto res2 = listingService.markAsSold(listingId, sellerId);
        assertEquals(ListingStatus.SOLD, res2.getStatus());
    }

    @Test
    void markAsSold_byNonSeller_throwsForbidden() {
        Listing existing = Listing.builder()
                .id(listingId)
                .seller(seller)
                .status(ListingStatus.AVAILABLE)
                .isDeleted(false)
                .build();

        when(listingRepository.findById(listingId)).thenReturn(Optional.of(existing));

        ApiException ex = assertThrows(ApiException.class, () ->
                listingService.markAsSold(listingId, otherUserId));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void deleteListing_bySellerOrAdmin_softDeletes() {
        Listing existing = Listing.builder()
                .id(listingId)
                .seller(seller)
                .isDeleted(false)
                .build();

        when(listingRepository.findById(listingId)).thenReturn(Optional.of(existing));

        // Seller delete
        listingService.deleteListing(listingId, sellerId, false);
        assertTrue(existing.isDeleted());

        // Admin delete
        existing.setDeleted(false);
        listingService.deleteListing(listingId, otherUserId, true);
        assertTrue(existing.isDeleted());
    }

    @Test
    void deleteListing_byNonSellerNonAdmin_throwsForbidden() {
        Listing existing = Listing.builder()
                .id(listingId)
                .seller(seller)
                .isDeleted(false)
                .build();

        when(listingRepository.findById(listingId)).thenReturn(Optional.of(existing));

        ApiException ex = assertThrows(ApiException.class, () ->
                listingService.deleteListing(listingId, otherUserId, false));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    void getListingDetail_deletedListing_throwsNotFound() {
        Listing existing = Listing.builder()
                .id(listingId)
                .seller(seller)
                .isDeleted(true)
                .build();

        when(listingRepository.findById(listingId)).thenReturn(Optional.of(existing));

        assertThrows(ResourceNotFoundException.class, () -> listingService.getListingDetail(listingId));
    }
}
