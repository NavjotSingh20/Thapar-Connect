package com.thaparconnect.backend.safety;

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
public class BlockDto {

    private UUID id;
    private UUID blockerId;
    private UUID blockedUserId;
    private String blockedUserName;
    private Instant createdAt;

    public static BlockDto fromEntity(Block block) {
        return BlockDto.builder()
                .id(block.getId())
                .blockerId(block.getBlocker().getId())
                .blockedUserId(block.getBlocked().getId())
                .blockedUserName(block.getBlocked().getFullName())
                .createdAt(block.getCreatedAt())
                .build();
    }
}
