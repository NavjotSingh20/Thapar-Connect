package com.thaparconnect.backend.marketplace;

import com.thaparconnect.backend.common.ResourceNotFoundException;
import com.thaparconnect.backend.marketplace.dto.ListingSummaryDto;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavedListingService {

    private final SavedListingRepository savedListingRepository;
    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final ListingService listingService;

    @Transactional(readOnly = true)
    public List<ListingSummaryDto> getSavedListings(UUID userId) {
        return savedListingRepository.findActiveSavedByUserId(userId)
                .stream()
                .map(sl -> listingService.mapToSummaryDto(sl.getListing()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UUID> getSavedListingIds(UUID userId) {
        return savedListingRepository.findSavedListingIdsByUserId(userId);
    }

    @Transactional
    public void saveListing(UUID userId, UUID listingId) {
        if (savedListingRepository.existsByUserIdAndListingId(userId, listingId)) {
            return;
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Listing listing = listingRepository.findByIdAndIsDeletedFalse(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Listing", "id", listingId));

        SavedListing saved = SavedListing.builder()
                .user(user)
                .listing(listing)
                .build();
        savedListingRepository.save(saved);
    }

    @Transactional
    public void unsaveListing(UUID userId, UUID listingId) {
        savedListingRepository.deleteByUserIdAndListingId(userId, listingId);
    }
}
