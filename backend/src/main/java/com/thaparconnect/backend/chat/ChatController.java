package com.thaparconnect.backend.chat;

import com.thaparconnect.backend.common.ApiResponse;
import com.thaparconnect.backend.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/conversations")
    public ResponseEntity<ConversationDto> createOrGetConversation(
            @Valid @RequestBody CreateConversationRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ConversationDto conv = chatService.getOrCreateConversation(
                request.getContextType(),
                request.getContextId(),
                request.getRecipientId(),
                principal.getId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(conv);
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationSummaryDto>> getInbox(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<ConversationSummaryDto> inbox = chatService.getUserInbox(principal.getId());
        return ResponseEntity.ok(inbox);
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<ConversationDto> getConversation(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ConversationDto conv = chatService.getConversationById(id, principal.getId());
        return ResponseEntity.ok(conv);
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(
            @PathVariable UUID id,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Pageable pageable = null;
        if (page != null && size != null) {
            pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        } else if (size != null) {
            pageable = PageRequest.of(0, Math.max(1, size));
        }
        List<MessageDto> messages = chatService.getConversationMessages(id, principal.getId(), pageable);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<MessageDto> sendHttpMessage(
            @PathVariable UUID id,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        MessageDto message = chatService.sendMessage(id, request.getContent(), principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    @PostMapping("/conversations/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        chatService.markConversationRead(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Conversation marked as read", null));
    }

    @MessageMapping("/chat.send")
    public void handleStompMessage(@Payload ChatMessagePayload payload, Principal principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            chatService.sendMessage(payload.getConversationId(), payload.getContent(), userPrincipal.getId());
        } else {
            log.warn("Unauthenticated STOMP send attempt rejected");
        }
    }
}
