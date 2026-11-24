package com.thaparconnect.backend.safety;

import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SafetyService {

    private final ReportRepository reportRepository;
    private final BlockRepository blockRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReportDto createReport(ReportRequest request, UUID reporterId) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Reporter user not found"));

        Report report = Report.builder()
                .reporter(reporter)
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .reason(request.getReason())
                .details(request.getDetails())
                .status(ReportStatus.PENDING)
                .build();

        Report saved = reportRepository.save(report);
        log.info("Safety report created: id={}, targetType={}, targetId={}, reporter={}",
                saved.getId(), saved.getTargetType(), saved.getTargetId(), reporter.getEmail());
        return ReportDto.fromEntity(saved);
    }

    @Transactional
    public void blockUser(UUID blockerId, UUID blockedUserId) {
        if (blockerId.equals(blockedUserId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_BLOCK_SELF", "You cannot block yourself");
        }

        if (blockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedUserId)) {
            log.info("User {} is already blocked by {}", blockedUserId, blockerId);
            return;
        }

        User blocker = userRepository.findById(blockerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Blocker user not found"));
        User blocked = userRepository.findById(blockedUserId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Target user to block not found"));

        Block block = Block.builder()
                .blocker(blocker)
                .blocked(blocked)
                .build();

        blockRepository.save(block);
        log.info("User {} blocked user {}", blockerId, blockedUserId);
    }

    @Transactional
    public void unblockUser(UUID blockerId, UUID blockedUserId) {
        blockRepository.deleteByBlockerIdAndBlockedId(blockerId, blockedUserId);
        log.info("User {} unblocked user {}", blockerId, blockedUserId);
    }

    @Transactional(readOnly = true)
    public boolean isBlocked(UUID blockerId, UUID blockedId) {
        return blockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId);
    }

    @Transactional(readOnly = true)
    public boolean isBlockedBetween(UUID user1Id, UUID user2Id) {
        return blockRepository.existsByBlockerIdAndBlockedId(user1Id, user2Id)
                || blockRepository.existsByBlockerIdAndBlockedId(user2Id, user1Id);
    }

    @Transactional(readOnly = true)
    public List<BlockDto> getBlockedUsers(UUID blockerId) {
        return blockRepository.findByBlockerId(blockerId).stream()
                .map(BlockDto::fromEntity)
                .toList();
    }
}
