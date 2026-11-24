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
    public Conversation getOrCreateCabGroupConversation(UUID cabGroupId) {
        CabGroup cabGroup = cabGroupRepository.findById(cabGroupId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CAB_NOT_FOUND", "Cab group not found"));

        List<Conversation> existing = conversationRepository
                .findGroupConversations(ContextType.CAB_GROUP, cabGroupId);

        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        Conversation groupConv = Conversation.builder()
                .contextType(ContextType.CAB_GROUP)
                .contextId(cabGroupId)
                .user1(cabGroup.getCreator())
                .user2(null)
                .isGroup(true)
                .title("Cab to " + cabGroup.getDropPoint())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Conversation saved = conversationRepository.saveAndFlush(groupConv);

        // System message marking pool creation
        Message initMsg = Message.builder()
                .conversation(saved)
                .sender(cabGroup.getCreator())
                .content("🚖 Cab pool created by " + cabGroup.getCreator().getFullName() + " to " + cabGroup.getDropPoint())
                .isSystem(true)
                .isRead(false)
                .createdAt(Instant.now())
                .build();
        messageRepository.saveAndFlush(initMsg);

        log.info("Initialized ride group chat thread {} for cab pool {}", saved.getId(), cabGroupId);
        return saved;
    }

    @Transactional
    public void addUserToCabGroupChat(CabGroup cabGroup, User user, int seats, boolean isInstant) {
        Conversation groupConv = getOrCreateCabGroupConversation(cabGroup.getId());

        String seatText = seats > 1 ? " (" + seats + " seats)" : "";
        String msgContent = "🎉 " + user.getFullName() + " joined the ride pool" + seatText + "!";

        Message joinMsg = Message.builder()
                .conversation(groupConv)
                .sender(user)
                .content(msgContent)
                .isSystem(true)
                .isRead(false)
                .createdAt(Instant.now())
                .build();

        Message savedMsg = messageRepository.save(joinMsg);
        groupConv.setUpdatedAt(Instant.now());
        conversationRepository.save(groupConv);

        MessageDto dto = MessageDto.fromEntity(savedMsg);
        messagingTemplate.convertAndSend("/topic/conversation/" + groupConv.getId(), dto);

        log.info("User {} added to cab group chat {} (instant={})", user.getEmail(), groupConv.getId(), isInstant);
    }

    @Transactional(readOnly = true)
    public List<CabGroupMemberSummaryDto> getRideGroupMembers(UUID cabGroupId) {
        CabGroup cabGroup = cabGroupRepository.findById(cabGroupId).orElse(null);
        if (cabGroup == null) return Collections.emptyList();

        List<CabGroupMemberSummaryDto> list = new ArrayList<>();
        // Host / Creator
        User creator = cabGroup.getCreator();
        if (creator != null) {
            list.add(CabGroupMemberSummaryDto.builder()
                    .id(creator.getId())
                    .name(creator.getFullName())
                    .hostel(creator.getHostel())
                    .phone(creator.getPhoneNumber())
                    .phoneNumber(creator.getPhoneNumber())
                    .profilePictureUrl(creator.getProfilePictureUrl())
                    .role("HOST")
                    .status(CabMemberStatus.CONFIRMED)
                    .seats(1)
                    .build());
        }

        // Confirmed Members
        List<CabMember> confirmedMembers = cabMemberRepository.findByCabGroupIdAndStatus(cabGroupId, CabMemberStatus.CONFIRMED);
        for (CabMember cm : confirmedMembers) {
            User u = cm.getUser();
            if (u != null && (creator == null || !u.getId().equals(creator.getId()))) {
                list.add(CabGroupMemberSummaryDto.builder()
                        .id(u.getId())
                        .name(u.getFullName())
                        .hostel(u.getHostel())
                        .phone(u.getPhoneNumber())
                        .phoneNumber(u.getPhoneNumber())
                        .profilePictureUrl(u.getProfilePictureUrl())
                        .role("RIDER")
                        .status(cm.getStatus())
                        .seats(cm.getSeatsRequested())
                        .build());
            }
        }
        return list;
    }

    @Transactional
    public ConversationDto getOrCreateConversation(
            ContextType contextType,
            UUID contextId,
            UUID recipientId,
            UUID currentUserId
    ) {
        // If cab group conversation, check if caller is host or confirmed rider -> return canonical group ride chat
        if (contextType == ContextType.CAB_GROUP && contextId != null) {
            boolean isHost = cabGroupRepository.findById(contextId)
                    .map(c -> c.getCreator().getId().equals(currentUserId))
                    .orElse(false);
            boolean isConfirmed = cabMemberRepository.existsByCabGroupIdAndUserIdAndStatus(
                    contextId, currentUserId, CabMemberStatus.CONFIRMED);

            if (recipientId == null || recipientId.equals(currentUserId) || isHost || isConfirmed) {
                Conversation groupConv = getOrCreateCabGroupConversation(contextId);
                ConversationDto dto = ConversationDto.fromEntity(groupConv);
                dto.setMembers(getRideGroupMembers(contextId));
                return dto;
            }
        }

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
            Optional<CabMember> memberOpt = cabMemberRepository.findByCabGroupIdAndUserId(contextId, currentUserId);
            if (memberOpt.isPresent() && memberOpt.get().getStatus() == CabMemberStatus.REJECTED) {
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
                .isGroup(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Conversation saved = conversationRepository.save(conv);
        log.info("Created new 1-on-1 conversation thread {} for contextType={}, contextId={}",
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

        User sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Sender user not found"));

        if (sender.isBanned()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "USER_BANNED", "Banned users cannot send messages");
        }

        // Participant check
        if (conv.isGroup() && conv.getContextType() == ContextType.CAB_GROUP) {
            boolean isHost = conv.getUser1().getId().equals(currentUserId);
            boolean isConfirmed = cabMemberRepository.existsByCabGroupIdAndUserIdAndStatus(
                    conv.getContextId(), currentUserId, CabMemberStatus.CONFIRMED);
            if (!isHost && !isConfirmed) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only confirmed riders can send messages in this cab group chat");
            }
        } else {
            boolean isUser1 = conv.getUser1().getId().equals(currentUserId);
            boolean isUser2 = conv.getUser2() != null && conv.getUser2().getId().equals(currentUserId);
            if (!isUser1 && !isUser2) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You are not a participant in this conversation");
            }

            User recipient = isUser1 ? conv.getUser2() : conv.getUser1();
            if (recipient != null) {
                if (safetyService.isBlocked(recipient.getId(), sender.getId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "USER_BLOCKED", "Recipient has blocked you from sending messages");
                }
                if (safetyService.isBlocked(sender.getId(), recipient.getId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "USER_BLOCKED", "You cannot send messages to a blocked user");
                }
            }
        }

        Message message = Message.builder()
                .conversation(conv)
                .sender(sender)
                .content(content)
                .isRead(false)
                .isSystem(false)
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

        verifyParticipantAccess(conv, currentUserId);

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

        verifyParticipantAccess(conv, currentUserId);

        messageRepository.markConversationAsRead(conversationId, currentUserId);
        log.debug("Marked messages read for conversation {} by user {}", conversationId, currentUserId);
    }

    @Transactional
    public List<ConversationSummaryDto> getUserInbox(UUID currentUserId) {
        List<ConversationSummaryDto> summaries = new ArrayList<>();
        Set<UUID> addedConversationIds = new HashSet<>();

        // 1. Group Conversations for cab pools where user is Host or Confirmed Member
        List<CabGroup> hostedCabs = cabGroupRepository.findByCreatorIdOrderByCreatedAtDesc(currentUserId);
        List<CabGroup> joinedCabs = cabGroupRepository.findByMemberUserIdAndStatus(currentUserId, CabMemberStatus.CONFIRMED);

        Map<UUID, CabGroup> allUserCabs = new LinkedHashMap<>();
        for (CabGroup c : hostedCabs) allUserCabs.put(c.getId(), c);
        for (CabGroup c : joinedCabs) allUserCabs.put(c.getId(), c);

        for (CabGroup cab : allUserCabs.values()) {
            Conversation groupConv = getOrCreateCabGroupConversation(cab.getId());

            if (addedConversationIds.add(groupConv.getId())) {
                Optional<Message> latest = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(groupConv.getId());
                long unread = messageRepository.countByConversationIdAndSenderIdNotAndIsReadFalse(groupConv.getId(), currentUserId);
                List<CabGroupMemberSummaryDto> members = getRideGroupMembers(cab.getId());

                String groupTitle = "Cab to " + cab.getDropPoint();
                ConversationSummaryDto summary = ConversationSummaryDto.builder()
                        .id(groupConv.getId())
                        .contextType(ContextType.CAB_GROUP)
                        .contextId(cab.getId())
                        .isGroup(true)
                        .groupName(groupTitle)
                        .memberCount(members.size())
                        .members(members)
                        .context(ConversationContextDto.builder()
                                .type(ContextType.CAB_GROUP.name())
                                .id(cab.getId())
                                .title(groupTitle)
                                .build())
                        .otherParticipant(OtherParticipantDto.builder()
                                .id(cab.getId())
                                .name(groupTitle)
                                .profilePictureUrl(null)
                                .isBanned(false)
                                .build())
                        .lastMessage(latest.map(Message::getContent).orElse("Ride group created"))
                        .lastMessageAt(latest.map(Message::getCreatedAt).orElse(groupConv.getCreatedAt()))
                        .unreadCount(unread)
                        .isBlocked(false)
                        .blockedByMe(false)
                        .updatedAt(groupConv.getUpdatedAt())
                        .build();

                summaries.add(summary);
            }
        }

        // 2. Direct 1-on-1 Conversations
        List<Conversation> directConversations = conversationRepository.findAllDirectForUser(currentUserId);
        for (Conversation conv : directConversations) {
            if (!addedConversationIds.add(conv.getId())) continue;

            User otherUser = conv.getUser1().getId().equals(currentUserId) ? conv.getUser2() : conv.getUser1();
            if (otherUser == null) continue;

            Optional<Message> latest = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conv.getId());
            long unread = messageRepository.countByConversationIdAndSenderIdNotAndIsReadFalse(conv.getId(), currentUserId);

            String contextTitle = resolveContextTitle(conv.getContextType(), conv.getContextId());
            boolean isBlocked = safetyService.isBlockedBetween(currentUserId, otherUser.getId());
            boolean blockedByMe = safetyService.isBlocked(currentUserId, otherUser.getId());

            ConversationSummaryDto summary = ConversationSummaryDto.builder()
                    .id(conv.getId())
                    .contextType(conv.getContextType())
                    .contextId(conv.getContextId())
                    .isGroup(false)
                    .groupName(null)
                    .memberCount(2)
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

        // Sort by most recent activity
        summaries.sort((a, b) -> {
            Instant tA = a.getLastMessageAt() != null ? a.getLastMessageAt() : a.getUpdatedAt();
            Instant tB = b.getLastMessageAt() != null ? b.getLastMessageAt() : b.getUpdatedAt();
            if (tA == null && tB == null) return 0;
            if (tA == null) return 1;
            if (tB == null) return -1;
            return tB.compareTo(tA);
        });

        return summaries;
    }

    @Transactional(readOnly = true)
    public ConversationDto getConversationById(UUID conversationId, UUID currentUserId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CONVERSATION_NOT_FOUND", "Conversation not found"));

        verifyParticipantAccess(conv, currentUserId);

        ConversationDto dto = ConversationDto.fromEntity(conv);
        if (conv.isGroup() && conv.getContextType() == ContextType.CAB_GROUP) {
            dto.setMembers(getRideGroupMembers(conv.getContextId()));
        }
        return dto;
    }

    private void verifyParticipantAccess(Conversation conv, UUID userId) {
        if (conv.isGroup() && conv.getContextType() == ContextType.CAB_GROUP) {
            boolean isHost = conv.getUser1().getId().equals(userId);
            boolean isConfirmed = cabMemberRepository.existsByCabGroupIdAndUserIdAndStatus(
                    conv.getContextId(), userId, CabMemberStatus.CONFIRMED);
            if (!isHost && !isConfirmed) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You are not a confirmed member of this cab pool");
            }
        } else {
            boolean isUser1 = conv.getUser1().getId().equals(userId);
            boolean isUser2 = conv.getUser2() != null && conv.getUser2().getId().equals(userId);
            if (!isUser1 && !isUser2) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You are not a participant in this conversation");
            }
        }
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
