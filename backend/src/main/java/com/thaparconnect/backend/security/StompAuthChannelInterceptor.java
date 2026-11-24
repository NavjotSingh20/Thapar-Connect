package com.thaparconnect.backend.security;

import com.thaparconnect.backend.cabs.CabMemberRepository;
import com.thaparconnect.backend.cabs.CabMemberStatus;
import com.thaparconnect.backend.chat.ContextType;
import com.thaparconnect.backend.chat.Conversation;
import com.thaparconnect.backend.chat.ConversationRepository;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final CabMemberRepository cabMemberRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            handleConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            handleSubscribe(accessor);
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("STOMP CONNECT rejected: missing or invalid Authorization header");
            throw new MessageDeliveryException("Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7);
        if (!tokenProvider.validateToken(token)) {
            log.warn("STOMP CONNECT rejected: invalid or expired JWT token");
            throw new MessageDeliveryException("Invalid or expired JWT token");
        }

        UUID userId = tokenProvider.getUserIdFromToken(token);
        if (userId == null) {
            throw new MessageDeliveryException("Invalid token user");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new MessageDeliveryException("User not found"));

        if (user.isBanned()) {
            log.warn("STOMP CONNECT rejected: user account {} is banned", user.getEmail());
            throw new MessageDeliveryException("User account is banned");
        }

        UserPrincipal principal = UserPrincipal.create(user);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        accessor.setUser(auth);
        log.info("STOMP client authenticated: user={}", user.getEmail());
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        Principal userPrincipal = accessor.getUser();
        if (!(userPrincipal instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal principal)) {
            log.warn("STOMP SUBSCRIBE rejected: unauthenticated subscription to {}", destination);
            throw new AccessDeniedException("Unauthenticated subscription attempt");
        }

        if (destination.startsWith("/topic/conversation/")) {
            String convIdStr = destination.substring("/topic/conversation/".length());
            UUID convId;
            try {
                convId = UUID.fromString(convIdStr);
            } catch (IllegalArgumentException e) {
                log.warn("STOMP SUBSCRIBE rejected: malformed conversation UUID '{}'", convIdStr);
                throw new MessageDeliveryException("Invalid conversation ID format");
            }

            Conversation conv = conversationRepository.findById(convId)
                    .orElseThrow(() -> new MessageDeliveryException("Conversation not found"));

            boolean isParticipant;
            if (conv.isGroup() && conv.getContextType() == ContextType.CAB_GROUP) {
                isParticipant = conv.getUser1().getId().equals(principal.getId())
                        || cabMemberRepository.existsByCabGroupIdAndUserIdAndStatus(
                                conv.getContextId(), principal.getId(), CabMemberStatus.CONFIRMED);
            } else {
                isParticipant = conv.getUser1().getId().equals(principal.getId())
                        || (conv.getUser2() != null && conv.getUser2().getId().equals(principal.getId()));
            }

            if (!isParticipant) {
                log.warn("STOMP SUBSCRIBE rejected: user {} is not a participant in conversation {}",
                        principal.getEmail(), convId);
                throw new AccessDeniedException("User is not authorized to subscribe to this conversation");
            }

            log.info("STOMP subscription authorized for conversation {} by user {}", convId, principal.getEmail());
        } else if (destination.startsWith("/topic/admin/")) {
            boolean isAdmin = principal.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                log.warn("STOMP SUBSCRIBE rejected: regular user {} attempted admin subscription to {}",
                        principal.getEmail(), destination);
                throw new AccessDeniedException("Admin role required for topic " + destination);
            }
        }
    }
}
