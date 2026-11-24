package com.thaparconnect.backend.chat;

import com.thaparconnect.backend.cabs.CabGroup;
import com.thaparconnect.backend.cabs.CabGroupRepository;
import com.thaparconnect.backend.cabs.CabMemberRepository;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.marketplace.Listing;
import com.thaparconnect.backend.marketplace.ListingRepository;
import com.thaparconnect.backend.safety.SafetyService;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CabGroupRepository cabGroupRepository;

    @Mock
    private ListingRepository listingRepository;

    @Mock
    private CabMemberRepository cabMemberRepository;

    @Mock
    private SafetyService safetyService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ChatService chatService;

    private User userA;
    private User userB;
    private UUID userAId;
    private UUID userBId;
    private UUID cabId;
    private UUID listingId;

    @BeforeEach
    void setUp() {
        // Ensure userAId < userBId for clear determinism
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        if (id1.compareTo(id2) < 0) {
            userAId = id1;
            userBId = id2;
        } else {
            userAId = id2;
            userBId = id1;
        }

        userA = User.builder().id(userAId).email("usera@thapar.edu").fullName("User Alpha").role(Role.USER).build();
        userB = User.builder().id(userBId).email("userb@thapar.edu").fullName("User Beta").role(Role.USER).build();

        cabId = UUID.randomUUID();
        listingId = UUID.randomUUID();
    }

    @Test
    void getOrCreateConversation_createsCanonicalThread_regardlessOfInitiator() {
        when(safetyService.isBlocked(any(), any())).thenReturn(false);
        when(conversationRepository.findByContextTypeAndContextIdAndUser1IdAndUser2Id(eq(ContextType.CAB_GROUP), eq(cabId), eq(userAId), eq(userBId)))
                .thenReturn(Optional.empty());
        when(userRepository.findById(userAId)).thenReturn(Optional.of(userA));
        when(userRepository.findById(userBId)).thenReturn(Optional.of(userB));
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(i -> {
            Conversation c = i.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        // Initiator is userB (larger UUID)
        ConversationDto result = chatService.getOrCreateConversation(ContextType.CAB_GROUP, cabId, userAId, userBId);

        assertThat(result).isNotNull();
        assertThat(result.getParticipant1Id()).isEqualTo(userAId);
        assertThat(result.getParticipant2Id()).isEqualTo(userBId);
        assertThat(result.getContextType()).isEqualTo(ContextType.CAB_GROUP);
        assertThat(result.getContextId()).isEqualTo(cabId);
    }

    @Test
    void getOrCreateConversation_returnsExistingConversation() {
        UUID convId = UUID.randomUUID();
        Conversation existing = Conversation.builder()
                .id(convId)
                .contextType(ContextType.CAB_GROUP)
                .contextId(cabId)
                .user1(userA)
                .user2(userB)
                .createdAt(Instant.now())
                .build();

        when(safetyService.isBlocked(any(), any())).thenReturn(false);
        when(conversationRepository.findByContextTypeAndContextIdAndUser1IdAndUser2Id(ContextType.CAB_GROUP, cabId, userAId, userBId))
                .thenReturn(Optional.of(existing));

        ConversationDto result = chatService.getOrCreateConversation(ContextType.CAB_GROUP, cabId, userBId, userAId);

        assertThat(result.getId()).isEqualTo(convId);
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void getOrCreateConversation_selfChat_throwsBadRequest() {
        assertThatThrownBy(() -> chatService.getOrCreateConversation(ContextType.CAB_GROUP, cabId, userAId, userAId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void getOrCreateConversation_blockedUser_throwsForbidden() {
        when(safetyService.isBlocked(userAId, userBId)).thenReturn(true);

        assertThatThrownBy(() -> chatService.getOrCreateConversation(ContextType.CAB_GROUP, cabId, userBId, userAId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void sendMessage_validMessage_persistsAndBroadcasts() {
        UUID convId = UUID.randomUUID();
        Conversation conv = Conversation.builder()
                .id(convId)
                .contextType(ContextType.CAB_GROUP)
                .contextId(cabId)
                .user1(userA)
                .user2(userB)
                .build();

        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));
        when(safetyService.isBlocked(any(), any())).thenReturn(false);
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> {
            Message m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        MessageDto result = chatService.sendMessage(convId, "Hello Beta!", userAId);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEqualTo("Hello Beta!");
        assertThat(result.getSenderId()).isEqualTo(userAId);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversation/" + convId), any(MessageDto.class));
    }

    @Test
    void sendMessage_emptyContent_throwsBadRequest() {
        UUID convId = UUID.randomUUID();
        assertThatThrownBy(() -> chatService.sendMessage(convId, "   ", userAId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void sendMessage_exceeds2000Chars_throwsBadRequest() {
        UUID convId = UUID.randomUUID();
        String oversized = "A".repeat(2001);

        assertThatThrownBy(() -> chatService.sendMessage(convId, oversized, userAId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void sendMessage_nonParticipant_throwsForbidden() {
        UUID convId = UUID.randomUUID();
        Conversation conv = Conversation.builder()
                .id(convId)
                .contextType(ContextType.CAB_GROUP)
                .contextId(cabId)
                .user1(userA)
                .user2(userB)
                .build();

        UUID outsiderId = UUID.randomUUID();
        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));

        assertThatThrownBy(() -> chatService.sendMessage(convId, "Sneaky outsider", outsiderId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void sendMessage_recipientBlockedSender_throwsForbidden() {
        UUID convId = UUID.randomUUID();
        Conversation conv = Conversation.builder()
                .id(convId)
                .contextType(ContextType.CAB_GROUP)
                .contextId(cabId)
                .user1(userA)
                .user2(userB)
                .build();

        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));
        // Recipient (userB) blocked sender (userA)
        when(safetyService.isBlocked(userBId, userAId)).thenReturn(true);

        assertThatThrownBy(() -> chatService.sendMessage(convId, "Please reply", userAId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void markConversationRead_asParticipant_marksRead() {
        UUID convId = UUID.randomUUID();
        Conversation conv = Conversation.builder()
                .id(convId)
                .contextType(ContextType.CAB_GROUP)
                .contextId(cabId)
                .user1(userA)
                .user2(userB)
                .build();

        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));

        chatService.markConversationRead(convId, userBId);

        verify(messageRepository).markConversationAsRead(convId, userBId);
    }
}
