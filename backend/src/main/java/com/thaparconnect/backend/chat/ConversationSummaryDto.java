package com.thaparconnect.backend.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationSummaryDto {

    private UUID id;
    private ContextType contextType;
    private UUID contextId;
    private Boolean isGroup;
    private String groupName;
    private Integer memberCount;
    private List<CabGroupMemberSummaryDto> members;
    private ConversationContextDto context;
    private OtherParticipantDto otherParticipant;
    private String lastMessage;
    private Instant lastMessageAt;
    private long unreadCount;
    private Boolean isBlocked;
    private Boolean blockedByMe;
    private Instant updatedAt;
}
