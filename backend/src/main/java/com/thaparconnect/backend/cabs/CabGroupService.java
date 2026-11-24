package com.thaparconnect.backend.cabs;

import com.thaparconnect.backend.cabs.dto.*;
import com.thaparconnect.backend.cabs.projection.CabGroupSummaryProjection;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.common.ResourceNotFoundException;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CabGroupService {

    private static final String DEFAULT_PICKUP_POINT = "Thapar University Campus, Patiala";
    private static final double DEFAULT_PICKUP_LAT = 30.3533;
    private static final double DEFAULT_PICKUP_LNG = 76.3686;

    private final CabGroupRepository cabGroupRepository;
    private final CabMemberRepository cabMemberRepository;
    private final UserRepository userRepository;
    private final GeocodingService geocodingService;

    @Transactional
    public CabGroupDetailDto createCabGroup(UUID creatorId, CreateCabGroupRequest request) {
        Instant now = Instant.now();
        if (request.getDepartureTime() == null || request.getDepartureTime().isBefore(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DEPARTURE_TIME", "Departure time must be in the future");
        }

        if (request.getTotalSeats() == null || request.getTotalSeats() < 2 || request.getTotalSeats() > 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOTAL_SEATS", "Total seats must be between 2 and 8");
        }

        if (request.getEstimatedFare() == null || request.getEstimatedFare().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ESTIMATED_FARE", "Estimated fare must be greater than zero");
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", creatorId));

        String pickupPoint = request.getPickupPoint();
        if (pickupPoint == null || pickupPoint.trim().isEmpty()) {
            pickupPoint = DEFAULT_PICKUP_POINT;
        }

        Double pickupLat = request.getPickupLat();
        Double pickupLng = request.getPickupLng();
        if (pickupLat == null || pickupLng == null) {
            GeocodingService.Coordinates coords = geocodingService.geocode(pickupPoint);
            pickupLat = coords != null ? coords.latitude() : DEFAULT_PICKUP_LAT;
            pickupLng = coords != null ? coords.longitude() : DEFAULT_PICKUP_LNG;
        }

        Double dropLat = request.getDropLat();
        Double dropLng = request.getDropLng();
        if (dropLat == null || dropLng == null) {
            GeocodingService.Coordinates coords = geocodingService.geocode(request.getDropPoint());
            dropLat = coords != null ? coords.latitude() : 0.0;
            dropLng = coords != null ? coords.longitude() : 0.0;
        }

        String sanitizedNote = sanitizeInput(request.getNote());

        CabGroup cabGroup = CabGroup.builder()
                .creator(creator)
                .pickupPoint(pickupPoint)
                .pickupLat(pickupLat)
                .pickupLng(pickupLng)
                .dropPoint(request.getDropPoint())
                .dropLat(dropLat)
                .dropLng(dropLng)
                .departureTime(request.getDepartureTime())
                .totalSeats(request.getTotalSeats())
                .seatsTaken(1) // Creator counts as 1 seat taken
                .estimatedFare(request.getEstimatedFare())
                .note(sanitizedNote)
                .autoJoinEnabled(Boolean.TRUE.equals(request.getAutoJoinEnabled()))
                .status(CabGroupStatus.OPEN)
                .build();

        CabGroup savedGroup = cabGroupRepository.save(cabGroup);
        return toDetailDto(savedGroup, Collections.emptyList());
    }

    @Transactional(readOnly = true)
    public List<CabGroupSummaryDto> searchCabGroups(
            Double searchLat,
            Double searchLng,
            String date,
            String timeWindow,
            Integer minSeats,
            BigDecimal maxFare,
            String sortBy
    ) {
        Instant now = Instant.now();
        Instant startTime = null;
        Instant endTime = null;

        if (date != null && !date.trim().isEmpty()) {
            try {
                LocalDate localDate = LocalDate.parse(date.trim());
                startTime = localDate.atStartOfDay(ZoneOffset.UTC).toInstant();
                endTime = localDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).minusNanos(1).toInstant();
            } catch (Exception e) {
                log.warn("Invalid date format supplied for cab search: {}", date);
            }
        }

        List<CabGroupSummaryProjection> projections;
        if (searchLat != null && searchLng != null) {
            projections = cabGroupRepository.searchByCoordinates(
                    searchLat,
                    searchLng,
                    now,
                    minSeats,
                    maxFare,
                    startTime,
                    endTime
            );
        } else {
            projections = cabGroupRepository.browseUpcoming(
                    now,
                    minSeats,
                    maxFare,
                    startTime,
                    endTime
            );
        }

        List<CabGroupSummaryDto> dtos = projections.stream()
                .map(this::toSummaryDto)
                .collect(Collectors.toList());

        if (sortBy != null && !sortBy.trim().isEmpty()) {
            String cleanSort = sortBy.trim().toLowerCase(Locale.ROOT);
            if (cleanSort.startsWith("estimatedfare") || cleanSort.startsWith("fare")) {
                dtos.sort(Comparator.comparing(CabGroupSummaryDto::getEstimatedFare, Comparator.nullsLast(BigDecimal::compareTo)));
            } else if (cleanSort.startsWith("departuretime") || cleanSort.startsWith("date")) {
                dtos.sort(Comparator.comparing(CabGroupSummaryDto::getDepartureTime, Comparator.nullsLast(Instant::compareTo)));
            } else if (cleanSort.startsWith("distance")) {
                dtos.sort(Comparator.comparing(CabGroupSummaryDto::getDistanceKm, Comparator.nullsLast(Double::compareTo)));
            }
        }

        return dtos;
    }

    @Transactional
    public CabGroupDetailDto getCabGroupDetail(UUID id) {
        CabGroup cabGroup = cabGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CabGroup", "id", id));

        // Self-heal expiration if past departure time
        if (cabGroup.getDepartureTime().isBefore(Instant.now())
                && (cabGroup.getStatus() == CabGroupStatus.OPEN || cabGroup.getStatus() == CabGroupStatus.FULL)) {
            cabGroup.setStatus(CabGroupStatus.EXPIRED);
            cabGroup = cabGroupRepository.save(cabGroup);
        }

        List<CabMember> members = cabMemberRepository.findByCabGroupIdOrderByCreatedAtAsc(id);
        return toDetailDto(cabGroup, members);
    }

    @Transactional
    public CabMemberDto requestJoin(UUID cabGroupId, UUID userId, JoinCabRequest request) {
        // Pessimistic write lock to serialize concurrent joins
        CabGroup cabGroup = cabGroupRepository.findByIdForUpdate(cabGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("CabGroup", "id", cabGroupId));

        // 1. Expiration check
        if (cabGroup.getStatus() == CabGroupStatus.EXPIRED || cabGroup.getDepartureTime().isBefore(Instant.now())) {
            cabGroup.setStatus(CabGroupStatus.EXPIRED);
            cabGroupRepository.save(cabGroup);
            throw new ApiException(HttpStatus.BAD_REQUEST, "CAB_EXPIRED", "Cab group has already expired");
        }

        // 2. Closed check
        if (cabGroup.getStatus() == CabGroupStatus.CLOSED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CAB_CLOSED", "Cab group is closed");
        }

        // 3. Full check
        if (cabGroup.getStatus() == CabGroupStatus.FULL || cabGroup.getSeatsAvailable() <= 0) {
            throw new ApiException(HttpStatus.CONFLICT, "CAB_GROUP_FULL", "Cab group is already full");
        }

        // 4. Creator self-join check
        if (cabGroup.getCreator().getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CREATOR_CANNOT_JOIN", "Creator cannot join their own cab group as they already occupy a seat");
        }

        // 5. Seats requested validation
        int seatsRequested = request != null && request.getSeatsRequested() != null ? request.getSeatsRequested() : 1;
        if (seatsRequested <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SEATS", "Seats requested must be greater than 0");
        }

        int availableSeats = cabGroup.getSeatsAvailable();
        if (seatsRequested > availableSeats) {
            throw new ApiException(HttpStatus.CONFLICT, "CAB_GROUP_FULL", "Not enough available seats in cab group. Requested: " + seatsRequested + ", Available: " + availableSeats);
        }

        CabMemberStatus targetStatus = cabGroup.isAutoJoinEnabled()
                ? CabMemberStatus.CONFIRMED
                : CabMemberStatus.PENDING;

        if (targetStatus == CabMemberStatus.CONFIRMED) {
            cabGroup.setSeatsTaken(cabGroup.getSeatsTaken() + seatsRequested);
            if (cabGroup.getSeatsTaken() >= cabGroup.getTotalSeats()) {
                cabGroup.setStatus(CabGroupStatus.FULL);
            }
            cabGroupRepository.save(cabGroup);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        String note = request != null ? request.getNote() : null;
        CabMember member = CabMember.builder()
                .cabGroup(cabGroup)
                .user(user)
                .seatsRequested(seatsRequested)
                .status(targetStatus)
                .note(note)
                .build();

        CabMember savedMember = cabMemberRepository.save(member);
        return toMemberDto(savedMember);
    }

    @Transactional
    public CabMemberDto acceptMemberRequest(UUID cabGroupId, UUID memberId, UUID callerId) {
        CabGroup cabGroup = cabGroupRepository.findByIdForUpdate(cabGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("CabGroup", "id", cabGroupId));

        if (!cabGroup.getCreator().getId().equals(callerId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only the cab group creator can accept join requests");
        }

        CabMember member = cabMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("CabMember", "id", memberId));

        if (!member.getCabGroup().getId().equals(cabGroupId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MEMBER", "Member does not belong to this cab group");
        }

        if (member.getStatus() == CabMemberStatus.CONFIRMED) {
            return toMemberDto(member);
        }

        if (member.getStatus() != CabMemberStatus.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MEMBER_STATUS", "Only pending requests can be accepted");
        }

        int requested = member.getSeatsRequested();
        int available = cabGroup.getSeatsAvailable();
        if (requested > available) {
            throw new ApiException(HttpStatus.CONFLICT, "CAB_GROUP_FULL", "Cannot accept request: not enough seats available");
        }

        member.setStatus(CabMemberStatus.CONFIRMED);
        cabGroup.setSeatsTaken(cabGroup.getSeatsTaken() + requested);
        if (cabGroup.getSeatsTaken() >= cabGroup.getTotalSeats()) {
            cabGroup.setStatus(CabGroupStatus.FULL);
        }

        cabGroupRepository.save(cabGroup);
        CabMember savedMember = cabMemberRepository.save(member);
        return toMemberDto(savedMember);
    }

    @Transactional
    public CabMemberDto rejectMemberRequest(UUID cabGroupId, UUID memberId, UUID callerId) {
        CabGroup cabGroup = cabGroupRepository.findById(cabGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("CabGroup", "id", cabGroupId));

        if (!cabGroup.getCreator().getId().equals(callerId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only the cab group creator can reject join requests");
        }

        CabMember member = cabMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("CabMember", "id", memberId));

        if (!member.getCabGroup().getId().equals(cabGroupId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MEMBER", "Member does not belong to this cab group");
        }

        if (member.getStatus() == CabMemberStatus.CONFIRMED) {
            cabGroup.setSeatsTaken(cabGroup.getSeatsTaken() - member.getSeatsRequested());
            if (cabGroup.getStatus() == CabGroupStatus.FULL) {
                cabGroup.setStatus(CabGroupStatus.OPEN);
            }
            cabGroupRepository.save(cabGroup);
        }

        member.setStatus(CabMemberStatus.REJECTED);
        CabMember savedMember = cabMemberRepository.save(member);
        return toMemberDto(savedMember);
    }

    @Transactional
    public CabGroupDetailDto closeCabGroup(UUID cabGroupId, UUID callerId) {
        CabGroup cabGroup = cabGroupRepository.findById(cabGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("CabGroup", "id", cabGroupId));

        if (!cabGroup.getCreator().getId().equals(callerId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only the cab group creator can close this pool");
        }

        cabGroup.setStatus(CabGroupStatus.CLOSED);
        CabGroup saved = cabGroupRepository.save(cabGroup);
        List<CabMember> members = cabMemberRepository.findByCabGroupIdOrderByCreatedAtAsc(cabGroupId);
        return toDetailDto(saved, members);
    }

    // --- Helper Mapping Methods ---

    public UserSummaryDto toUserSummary(User user) {
        if (user == null) {
            return null;
        }
        return UserSummaryDto.builder()
                .id(user.getId())
                .name(user.getFullName())
                .hostel(user.getHostel())
                .phoneNumber(user.getPhoneNumber())
                .phone(user.getPhoneNumber())
                .build();
    }

    public CabMemberDto toMemberDto(CabMember member) {
        if (member == null) {
            return null;
        }
        return CabMemberDto.builder()
                .id(member.getId())
                .userId(member.getUser() != null ? member.getUser().getId() : null)
                .cabGroupId(member.getCabGroup() != null ? member.getCabGroup().getId() : null)
                .seatsRequested(member.getSeatsRequested())
                .status(member.getStatus())
                .note(member.getNote())
                .user(toUserSummary(member.getUser()))
                .createdAt(member.getCreatedAt())
                .build();
    }

    public static UUID toUuid(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof UUID uuid) {
            return uuid;
        }
        if (obj instanceof byte[] bytes) {
            if (bytes.length == 16) {
                ByteBuffer bb = ByteBuffer.wrap(bytes);
                long mostSigBits = bb.getLong();
                long leastSigBits = bb.getLong();
                return new UUID(mostSigBits, leastSigBits);
            }
            return UUID.fromString(new String(bytes, StandardCharsets.UTF_8).trim());
        }
        if (obj instanceof String str) {
            return UUID.fromString(str.trim());
        }
        return UUID.fromString(obj.toString().trim());
    }

    public static Instant toInstant(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof Instant instant) {
            return instant;
        }
        if (obj instanceof OffsetDateTime odt) {
            return odt.toInstant();
        }
        if (obj instanceof ZonedDateTime zdt) {
            return zdt.toInstant();
        }
        if (obj instanceof java.sql.Timestamp ts) {
            return ts.toInstant();
        }
        if (obj instanceof java.util.Date d) {
            return d.toInstant();
        }
        if (obj instanceof LocalDateTime ldt) {
            return ldt.toInstant(ZoneOffset.UTC);
        }
        String str = obj.toString().trim();
        try {
            return Instant.parse(str);
        } catch (Exception e1) {
            try {
                return OffsetDateTime.parse(str).toInstant();
            } catch (Exception e2) {
                return LocalDateTime.parse(str).toInstant(ZoneOffset.UTC);
            }
        }
    }

    public CabGroupSummaryDto toSummaryDto(CabGroupSummaryProjection p) {
        int totalSeats = p.getTotalSeats() != null ? p.getTotalSeats() : 0;
        int seatsTaken = p.getSeatsTaken() != null ? p.getSeatsTaken() : 1;
        int available = Math.max(0, totalSeats - seatsTaken);

        CabGroupStatus status;
        try {
            status = p.getStatus() != null ? CabGroupStatus.valueOf(p.getStatus()) : CabGroupStatus.OPEN;
        } catch (Exception e) {
            status = CabGroupStatus.OPEN;
        }

        UserSummaryDto creator = UserSummaryDto.builder()
                .id(toUuid(p.getCreatorId()))
                .name(p.getCreatorName())
                .hostel(p.getCreatorHostel())
                .phoneNumber(p.getCreatorPhone())
                .phone(p.getCreatorPhone())
                .build();

        return CabGroupSummaryDto.builder()
                .id(toUuid(p.getId()))
                .pickupPoint(p.getPickupPoint())
                .pickupLat(p.getPickupLat())
                .pickupLng(p.getPickupLng())
                .dropPoint(p.getDropPoint())
                .dropLat(p.getDropLat())
                .dropLng(p.getDropLng())
                .departureTime(toInstant(p.getDepartureTime()))
                .totalSeats(totalSeats)
                .seatsTaken(seatsTaken)
                .seatsAvailable(available)
                .estimatedFare(p.getEstimatedFare())
                .note(p.getNote())
                .autoJoinEnabled(Boolean.TRUE.equals(p.getAutoJoinEnabled()))
                .status(status)
                .distanceKm(p.getDistanceKm())
                .creator(creator)
                .createdAt(toInstant(p.getCreatedAt()))
                .build();
    }

    public CabGroupDetailDto toDetailDto(CabGroup group, List<CabMember> members) {
        if (group == null) {
            return null;
        }

        List<CabMemberDto> memberDtos = members != null
                ? members.stream().map(this::toMemberDto).collect(Collectors.toList())
                : Collections.emptyList();

        return CabGroupDetailDto.builder()
                .id(group.getId())
                .pickupPoint(group.getPickupPoint())
                .pickupLat(group.getPickupLat())
                .pickupLng(group.getPickupLng())
                .dropPoint(group.getDropPoint())
                .dropLat(group.getDropLat())
                .dropLng(group.getDropLng())
                .departureTime(group.getDepartureTime())
                .totalSeats(group.getTotalSeats())
                .seatsTaken(group.getSeatsTaken())
                .seatsAvailable(group.getSeatsAvailable())
                .estimatedFare(group.getEstimatedFare())
                .note(group.getNote())
                .autoJoinEnabled(group.isAutoJoinEnabled())
                .status(group.getStatus())
                .distanceKm(null)
                .creator(toUserSummary(group.getCreator()))
                .createdAt(group.getCreatedAt())
                .members(memberDtos)
                .build();
    }

    @Transactional
    public void deleteCabGroup(UUID id, UUID currentUserId, boolean isAdmin) {
        CabGroup cabGroup = cabGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CabGroup", "id", id));

        if (!isAdmin && !cabGroup.getCreator().getId().equals(currentUserId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only the creator or an admin can delete this cab group");
        }

        cabGroup.setStatus(CabGroupStatus.CLOSED);
        cabGroupRepository.save(cabGroup);
    }

    private String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        return input.replaceAll("<[^>]*>", "").replaceAll("[<>]", "").trim();
    }
}
