package com.thaparconnect.backend.chat;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateConversationRequest {

    @NotNull(message = "contextType is required")
    private ContextType contextType;

    @NotNull(message = "contextId is required")
    private UUID contextId;

    private UUID recipientId;
}
