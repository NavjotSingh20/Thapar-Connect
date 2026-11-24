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
public class MessageDto {

    private UUID id;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;
    private String senderHostel;
    private String senderProfilePictureUrl;
    private String content;
    private boolean isRead;
    private boolean isSystem;
    private Instant createdAt;

    public static MessageDto fromEntity(Message msg) {
        return MessageDto.builder()
                .id(msg.getId())
                .conversationId(msg.getConversation().getId())
                .senderId(msg.getSender().getId())
                .senderName(msg.getSender().getFullName())
                .senderHostel(msg.getSender().getHostel())
                .senderProfilePictureUrl(msg.getSender().getProfilePictureUrl())
                .content(msg.getContent())
                .isRead(msg.isRead())
                .isSystem(msg.isSystem())
                .createdAt(msg.getCreatedAt())
                .build();
    }
}
