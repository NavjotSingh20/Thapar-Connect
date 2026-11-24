package com.thaparconnect.backend.safety;

import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SafetyServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private BlockRepository blockRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SafetyService safetyService;

    private User user1;
    private User user2;
    private UUID user1Id;
    private UUID user2Id;

    @BeforeEach
    void setUp() {
        user1Id = UUID.randomUUID();
        user2Id = UUID.randomUUID();

        user1 = User.builder().id(user1Id).email("user1@thapar.edu").fullName("User One").role(Role.USER).build();
        user2 = User.builder().id(user2Id).email("user2@thapar.edu").fullName("User Two").role(Role.USER).build();
    }

    @Test
    void createReport_createsPendingReport() {
        ReportRequest request = ReportRequest.builder()
                .targetType(TargetType.USER)
                .targetId(user2Id)
                .reason("Harassment")
                .details("Inappropriate messages")
                .build();

        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> {
            Report r = i.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        ReportDto result = safetyService.createReport(request, user1Id);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(ReportStatus.PENDING);
        assertThat(result.getTargetType()).isEqualTo(TargetType.USER);
        assertThat(result.getTargetId()).isEqualTo(user2Id);
        assertThat(result.getReporterId()).isEqualTo(user1Id);
    }

    @Test
    void blockUser_savesBlock() {
        when(blockRepository.existsByBlockerIdAndBlockedId(user1Id, user2Id)).thenReturn(false);
        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));
        when(userRepository.findById(user2Id)).thenReturn(Optional.of(user2));

        safetyService.blockUser(user1Id, user2Id);

        verify(blockRepository).save(any(Block.class));
    }

    @Test
    void blockUser_selfBlock_throwsBadRequest() {
        assertThatThrownBy(() -> safetyService.blockUser(user1Id, user1Id))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void blockUser_alreadyBlocked_isIdempotent() {
        when(blockRepository.existsByBlockerIdAndBlockedId(user1Id, user2Id)).thenReturn(true);

        safetyService.blockUser(user1Id, user2Id);

        verify(blockRepository, never()).save(any(Block.class));
    }

    @Test
    void unblockUser_deletesBlock() {
        safetyService.unblockUser(user1Id, user2Id);

        verify(blockRepository).deleteByBlockerIdAndBlockedId(user1Id, user2Id);
    }

    @Test
    void isBlockedBetween_returnsTrueIfEitherBlocked() {
        when(blockRepository.existsByBlockerIdAndBlockedId(user1Id, user2Id)).thenReturn(false);
        when(blockRepository.existsByBlockerIdAndBlockedId(user2Id, user1Id)).thenReturn(true);

        assertThat(safetyService.isBlockedBetween(user1Id, user2Id)).isTrue();
    }
}
