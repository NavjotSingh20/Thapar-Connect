package com.thaparconnect.backend.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDto {

    private UUID id;
    private ContextType contextType;
    private UUID contextId;
    private UUID participant1Id;
    private UUID participant2Id;
    private Instant createdAt;

    public static ConversationDto fromEntity(Conversation conv) {
        return ConversationDto.builder()
                .id(conv.getId())
                .contextType(conv.getContextType())
                .contextId(conv.getContextId())
                .participant1Id(conv.getUser1().getId())
                .participant2Id(conv.getUser2().getId())
                .createdAt(conv.getCreatedAt())
                .build();
    }
}
