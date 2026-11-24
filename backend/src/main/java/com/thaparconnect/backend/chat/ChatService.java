package com.thaparconnect.backend.chat;

import com.thaparconnect.backend.cabs.CabGroup;
import com.thaparconnect.backend.cabs.CabGroupRepository;
import com.thaparconnect.backend.cabs.CabMember;
import com.thaparconnect.backend.cabs.CabMemberRepository;
import com.thaparconnect.backend.cabs.CabMemberStatus;
import com.thaparconnect.backend.common.ApiException;
import com.thaparconnect.backend.marketplace.Listing;
import com.thaparconnect.backend.marketplace.ListingRepository;
import com.thaparconnect.backend.safety.SafetyService;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final CabGroupRepository cabGroupRepository;
    private final ListingRepository listingRepository;
    private final CabMemberRepository cabMemberRepository;
    private final SafetyService safetyService;
    private final SimpMessagingTemplate messagingTemplate;

    // Rate limiter: max 30 messages per 60 seconds per user
    private final Map<UUID, Deque<Long>> rateLimitTracker = new ConcurrentHashMap<>();
    private static final int MAX_MESSAGES_PER_WINDOW = 30;
    private static final long WINDOW_MS = 60_000L;

    @Transactional
    public ConversationDto getOrCreateConversation(
            ContextType contextType,
            UUID contextId,
            UUID recipientId,
            UUID currentUserId
    ) {
        if (currentUserId.equals(recipientId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SELF_CHAT_NOT_ALLOWED", "Cannot start a conversation with yourself");
        }

        if (safetyService.isBlocked(currentUserId, recipientId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "USER_BLOCKED", "Cannot start conversation with a user you have blocked");
        }
        if (safetyService.isBlocked(recipientId, currentUserId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "USER_BLOCKED", "Cannot start conversation with this user");
        }

        if (contextType == ContextType.CAB_GROUP && contextId != null) {
            List<CabMember> userMembers = cabMemberRepository.findByCabGroupIdAndUserId(contextId, currentUserId);
            if (!userMembers.isEmpty() && userMembers.stream().noneMatch(m -> m.getStatus() == CabMemberStatus.CONFIRMED || m.getStatus() == CabMemberStatus.PENDING)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "CAB_MEMBER_REJECTED", "Rejected applicants cannot participate in cab group conversations");
            }
        }

        // Canonical participant ordering to uphold unique constraint deterministically
        UUID u1Id = currentUserId.compareTo(recipientId) < 0 ? currentUserId : recipientId;
        UUID u2Id = currentUserId.compareTo(recipientId) < 0 ? recipientId : currentUserId;

        Optional<Conversation> existing = conversationRepository
                .findByContextTypeAndContextIdAndUser1IdAndUser2Id(contextType, contextId, u1Id, u2Id);

        if (existing.isPresent()) {
            return ConversationDto.fromEntity(existing.get());
        }

        User u1 = userRepository.findById(u1Id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Participant user not found"));
        User u2 = userRepository.findById(u2Id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Participant user not found"));

        Conversation conv = Conversation.builder()
                .contextType(contextType)
                .contextId(contextId)
                .user1(u1)
                .user2(u2)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Conversation saved = conversationRepository.save(conv);
        log.info("Created new conversation thread {} for contextType={}, contextId={}",
                saved.getId(), contextType, contextId);
        return ConversationDto.fromEntity(saved);
    }

    @Transactional
    public MessageDto sendMessage(UUID conversationId, String content, UUID currentUserId) {
        if (content == null || content.trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_MESSAGE", "Message content cannot be empty");
        }
        if (content.length() > 2000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MESSAGE_TOO_LONG", "Message content cannot exceed 2000 characters");
        }

        // Rate limit check
        checkRateLimit(currentUserId);

        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Conversation not found"));

        boolean isUser1 = conv.getUser1().getId().equals(currentUserId);
        boolean isUser2 = conv.getUser2().getId().equals(currentUserId);
        if (!isUser1 && !isUser2) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You are not a participant in this conversation");
        }

        User sender = isUser1 ? conv.getUser1() : conv.getUser2();
        User recipient = isUser1 ? conv.getUser2() : conv.getUser1();

        if (sender.isBanned()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "USER_BANNED", "Banned users cannot send messages");
        }

        if (safetyService.isBlocked(recipient.getId(), sender.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "USER_BLOCKED", "Recipient has blocked you from sending messages");
        }
        if (safetyService.isBlocked(sender.getId(), recipient.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "USER_BLOCKED", "You cannot send messages to a blocked user");
        }

        Message message = Message.builder()
                .conversation(conv)
                .sender(sender)
                .content(content)
                .isRead(false)
                .createdAt(Instant.now())
                .build();

        Message saved = messageRepository.save(message);
        conv.setUpdatedAt(Instant.now());
        conversationRepository.save(conv);

        MessageDto dto = MessageDto.fromEntity(saved);

        // Real-time broadcast to STOMP destination
        messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, dto);
        log.debug("Broadcasted message {} to /topic/conversation/{}", saved.getId(), conversationId);

        return dto;
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getConversationMessages(UUID conversationId, UUID currentUserId, Pageable pageable) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Conversation not found"));

        if (!conv.getUser1().getId().equals(currentUserId) && !conv.getUser2().getId().equals(currentUserId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You are not a participant in this conversation");
        }

        List<Message> messages;
        if (pageable != null) {
            messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId, pageable);
        } else {
            messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        }

        return messages.stream()
                .map(MessageDto::fromEntity)
                .toList();
    }

    @Transactional
    public void markConversationRead(UUID conversationId, UUID currentUserId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Conversation not found"));

        if (!conv.getUser1().getId().equals(currentUserId) && !conv.getUser2().getId().equals(currentUserId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You are not a participant in this conversation");
        }

        messageRepository.markConversationAsRead(conversationId, currentUserId);
        log.debug("Marked messages read for conversation {} by user {}", conversationId, currentUserId);
    }

    @Transactional(readOnly = true)
    public List<ConversationSummaryDto> getUserInbox(UUID currentUserId) {
        List<Conversation> conversations = conversationRepository.findAllForUser(currentUserId);
        List<ConversationSummaryDto> summaries = new ArrayList<>();

        for (Conversation conv : conversations) {
            User otherUser = conv.getUser1().getId().equals(currentUserId) ? conv.getUser2() : conv.getUser1();
            Optional<Message> latest = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conv.getId());
            long unread = messageRepository.countByConversationIdAndSenderIdNotAndIsReadFalse(conv.getId(), currentUserId);

            String contextTitle = resolveContextTitle(conv.getContextType(), conv.getContextId());
            boolean isBlocked = safetyService.isBlockedBetween(currentUserId, otherUser.getId());
            boolean blockedByMe = safetyService.isBlocked(currentUserId, otherUser.getId());

            ConversationSummaryDto summary = ConversationSummaryDto.builder()
                    .id(conv.getId())
                    .contextType(conv.getContextType())
                    .contextId(conv.getContextId())
                    .context(ConversationContextDto.builder()
                            .type(conv.getContextType().name())
                            .id(conv.getContextId())
                            .title(contextTitle)
                            .build())
                    .otherParticipant(OtherParticipantDto.builder()
                            .id(otherUser.getId())
                            .name(otherUser.getFullName())
                            .profilePictureUrl(otherUser.getProfilePictureUrl())
                            .isBanned(otherUser.isBanned())
                            .build())
                    .lastMessage(latest.map(Message::getContent).orElse(null))
                    .lastMessageAt(latest.map(Message::getCreatedAt).orElse(conv.getCreatedAt()))
                    .unreadCount(unread)
                    .isBlocked(isBlocked)
                    .blockedByMe(blockedByMe)
                    .updatedAt(conv.getUpdatedAt())
                    .build();

            summaries.add(summary);
        }

        return summaries;
    }

    @Transactional(readOnly = true)
    public ConversationDto getConversationById(UUID conversationId, UUID currentUserId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Conversation not found"));

        if (!conv.getUser1().getId().equals(currentUserId) && !conv.getUser2().getId().equals(currentUserId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You are not a participant in this conversation");
        }

        return ConversationDto.fromEntity(conv);
    }

    private String resolveContextTitle(ContextType type, UUID id) {
        if (type == ContextType.CAB_GROUP) {
            Optional<CabGroup> cab = cabGroupRepository.findById(id);
            return cab.map(c -> "Cab to " + c.getDropPoint()).orElse("Cab Pool");
        } else if (type == ContextType.LISTING) {
            Optional<Listing> listing = listingRepository.findById(id);
            return listing.map(Listing::getTitle).orElse("Marketplace Item");
        }
        return "Chat";
    }

    private void checkRateLimit(UUID userId) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = rateLimitTracker.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && (now - timestamps.peekFirst()) > WINDOW_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= MAX_MESSAGES_PER_WINDOW) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED", "Chat rate limit exceeded. Please wait a moment.");
            }
            timestamps.addLast(now);
        }
    }
}
