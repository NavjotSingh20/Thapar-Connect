package com.thaparconnect.backend.marketplace;

import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.ResourceNotFoundException;
import com.thaparconnect.backend.marketplace.dto.*;
import com.thaparconnect.backend.storage.StorageService;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ListingService {

    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;

    private static final BigDecimal MAX_PRICE = new BigDecimal("1000000.00");
    private static final String OFFLINE_PAYMENT_DISCLAIMER = "Payments in v1 are settled directly offline between users.";

    @Transactional
    public ListingDetailDto createListing(UUID sellerId, ListingCreateRequest request, List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMAGES", "At least 1 image is required (1 to 5 images)");
        }
        if (images.size() > 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TOO_MANY_IMAGES", "A maximum of 5 images can be uploaded");
        }
        for (MultipartFile file : images) {
            if (file == null || file.isEmpty() || file.getSize() == 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMAGES", "Image files cannot be empty");
            }
        }

        validatePrice(request.getPrice());

        String rawTitle = request.getTitle();
        if (!StringUtils.hasText(rawTitle)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TITLE", "Title is required");
        }
        if (rawTitle.trim().length() > 255) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TITLE", "Title cannot exceed 255 characters");
        }

        String rawDesc = request.getDescription();
        if (!StringUtils.hasText(rawDesc)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DESCRIPTION", "Description is required");
        }

        String cleanTitle = sanitizeInput(rawTitle);
        if (!StringUtils.hasText(cleanTitle)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TITLE", "Title contains invalid characters or markup");
        }

        String cleanDesc = sanitizeInput(rawDesc);
        if (!StringUtils.hasText(cleanDesc)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DESCRIPTION", "Description contains invalid characters or markup");
        }

        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", sellerId));

        String hostel = request.getHostel();
        if (!StringUtils.hasText(hostel)) {
            hostel = seller.getHostel();
        }
        if (!StringUtils.hasText(hostel)) {
            hostel = "Hostel A";
        }

        Listing listing = Listing.builder()
                .seller(seller)
                .title(cleanTitle)
                .category(request.getCategory())
                .description(cleanDesc)
                .condition(request.getCondition())
                .price(request.getPrice())
                .hostel(hostel.trim())
                .status(ListingStatus.AVAILABLE)
                .isDeleted(false)
                .images(new ArrayList<>())
                .build();

        for (int i = 0; i < images.size(); i++) {
            MultipartFile file = images.get(i);
            String imageUrl = storageService.store(file, "marketplace");
            ListingImage listingImage = ListingImage.builder()
                    .listing(listing)
                    .imageUrl(imageUrl)
                    .displayOrder(i)
                    .build();
            listing.getImages().add(listingImage);
        }

        Listing saved = listingRepository.save(listing);
        log.info("Created listing {} by seller {}", saved.getId(), seller.getId());
        return mapToDetailDto(saved);
    }

    @Transactional(readOnly = true)
    public Page<ListingSummaryDto> searchListings(
            String query,
            ListingCategory category,
            String hostel,
            ListingCondition condition,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Pageable pageable
    ) {
        Specification<Listing> spec = ListingSpecifications.filterListings(
                query,
                category,
                hostel,
                condition,
                minPrice,
                maxPrice,
                ListingStatus.AVAILABLE
        );

        Page<Listing> page = listingRepository.findAll(spec, pageable);
        return page.map(this::mapToSummaryDto);
    }

    @Transactional(readOnly = true)
    public ListingDetailDto getListingDetail(UUID id) {
        Listing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Listing", "id", id));

        if (listing.isDeleted()) {
            throw new ResourceNotFoundException("Listing", "id", id);
        }

        return mapToDetailDto(listing);
    }

    @Transactional
    public ListingDetailDto updateListing(UUID id, UUID currentUserId, ListingUpdateRequest request) {
        Listing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Listing", "id", id));

        if (listing.isDeleted()) {
            throw new ResourceNotFoundException("Listing", "id", id);
        }

        if (!listing.getSeller().getId().equals(currentUserId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only the seller can update this listing");
        }

        validatePrice(request.getPrice());

        String rawTitle = request.getTitle();
        if (!StringUtils.hasText(rawTitle)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TITLE", "Title is required");
        }
        if (rawTitle.trim().length() > 255) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TITLE", "Title cannot exceed 255 characters");
        }

        String rawDesc = request.getDescription();
        if (!StringUtils.hasText(rawDesc)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DESCRIPTION", "Description is required");
        }

        String cleanTitle = sanitizeInput(rawTitle);
        String cleanDesc = sanitizeInput(rawDesc);

        listing.setTitle(cleanTitle);
        listing.setCategory(request.getCategory());
        listing.setDescription(cleanDesc);
        listing.setCondition(request.getCondition());
        listing.setPrice(request.getPrice());
        if (StringUtils.hasText(request.getHostel())) {
            listing.setHostel(request.getHostel().trim());
        }

        Listing updated = listingRepository.save(listing);
        log.info("Updated listing {} by seller {}", id, currentUserId);
        return mapToDetailDto(updated);
    }

    @Transactional
    public ListingDetailDto markAsSold(UUID id, UUID currentUserId) {
        Listing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Listing", "id", id));

        if (listing.isDeleted()) {
            throw new ResourceNotFoundException("Listing", "id", id);
        }

        if (!listing.getSeller().getId().equals(currentUserId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only the seller can mark this listing as sold");
        }

        listing.setStatus(ListingStatus.SOLD);
        Listing saved = listingRepository.save(listing);
        log.info("Marked listing {} as SOLD by seller {}", id, currentUserId);
        return mapToDetailDto(saved);
    }

    @Transactional
    public void deleteListing(UUID id, UUID currentUserId, boolean isAdmin) {
        Listing listing = listingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Listing", "id", id));

        if (listing.isDeleted()) {
            throw new ResourceNotFoundException("Listing", "id", id);
        }

        boolean isSeller = listing.getSeller().getId().equals(currentUserId);
        if (!isSeller && !isAdmin) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only the seller or an administrator can delete this listing");
        }

        listing.setDeleted(true);
        listingRepository.save(listing);
        log.info("Soft deleted listing {} by user {} (admin: {})", id, currentUserId, isAdmin);
    }

    @Transactional(readOnly = true)
    public Page<ListingSummaryDto> getMyListings(UUID sellerId, Pageable pageable) {
        Page<Listing> page = listingRepository.findBySellerIdAndIsDeletedFalseOrderByCreatedAtDesc(sellerId, pageable);
        return page.map(this::mapToSummaryDto);
    }

    private void validatePrice(BigDecimal price) {
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PRICE", "Price must be greater than zero");
        }
        if (price.compareTo(MAX_PRICE) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PRICE", "Price cannot exceed 1,000,000 INR");
        }
    }

    private String sanitizeInput(String input) {
        if (input == null) {
            return "";
        }
        // Remove HTML tags, script elements, iframe, event handlers
        return input.replaceAll("<[^>]*>", "").replaceAll("[<>]", "").trim();
    }

    public ListingDetailDto mapToDetailDto(Listing listing) {
        User seller = listing.getSeller();
        ListingSellerDto sellerDto = ListingSellerDto.builder()
                .id(seller.getId())
                .name(seller.getFullName())
                .hostel(seller.getHostel())
                .profilePictureUrl(seller.getProfilePictureUrl())
                .build();

        List<ListingImageDto> imageDtos = listing.getImages().stream()
                .map(img -> ListingImageDto.builder()
                        .id(img.getId())
                        .imageUrl(img.getImageUrl())
                        .orderIndex(img.getDisplayOrder())
                        .build())
                .toList();

        return ListingDetailDto.builder()
                .id(listing.getId())
                .title(listing.getTitle())
                .category(listing.getCategory() != null ? listing.getCategory().getDisplayName() : null)
                .description(listing.getDescription())
                .condition(listing.getCondition() != null ? listing.getCondition().getDisplayName() : null)
                .price(listing.getPrice())
                .hostel(listing.getHostel())
                .status(listing.getStatus())
                .images(imageDtos)
                .seller(sellerDto)
                .offlinePaymentDisclaimer(OFFLINE_PAYMENT_DISCLAIMER)
                .createdAt(listing.getCreatedAt())
                .updatedAt(listing.getUpdatedAt())
                .build();
    }

    public ListingSummaryDto mapToSummaryDto(Listing listing) {
        String primaryImageUrl = null;
        if (listing.getImages() != null && !listing.getImages().isEmpty()) {
            primaryImageUrl = listing.getImages().get(0).getImageUrl();
        }

        User seller = listing.getSeller();
        ListingSellerDto sellerDto = null;
        if (seller != null) {
            sellerDto = ListingSellerDto.builder()
                    .id(seller.getId())
                    .name(seller.getFullName())
                    .hostel(seller.getHostel())
                    .profilePictureUrl(seller.getProfilePictureUrl())
                    .build();
        }

        return ListingSummaryDto.builder()
                .id(listing.getId())
                .title(listing.getTitle())
                .category(listing.getCategory() != null ? listing.getCategory().getDisplayName() : null)
                .price(listing.getPrice())
                .condition(listing.getCondition() != null ? listing.getCondition().getDisplayName() : null)
                .hostel(listing.getHostel())
                .primaryImageUrl(primaryImageUrl)
                .status(listing.getStatus())
                .seller(sellerDto)
                .createdAt(listing.getCreatedAt())
                .build();
    }
}
