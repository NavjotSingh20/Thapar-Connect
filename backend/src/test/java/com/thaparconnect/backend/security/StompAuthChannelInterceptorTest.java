package com.thaparconnect.backend.security;

import com.thaparconnect.backend.chat.ContextType;
import com.thaparconnect.backend.chat.Conversation;
import com.thaparconnect.backend.chat.ConversationRepository;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import com.thaparconnect.backend.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StompAuthChannelInterceptorTest {

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageChannel messageChannel;

    @InjectMocks
    private StompAuthChannelInterceptor interceptor;

    private User user1;
    private User user2;
    private User bannedUser;
    private UUID user1Id;
    private UUID user2Id;
    private UUID bannedUserId;

    @BeforeEach
    void setUp() {
        user1Id = UUID.randomUUID();
        user2Id = UUID.randomUUID();
        bannedUserId = UUID.randomUUID();

        user1 = User.builder().id(user1Id).email("student1@thapar.edu").fullName("Student One").role(Role.USER).isBanned(false).build();
        user2 = User.builder().id(user2Id).email("student2@thapar.edu").fullName("Student Two").role(Role.USER).isBanned(false).build();
        bannedUser = User.builder().id(bannedUserId).email("banned@thapar.edu").fullName("Banned User").role(Role.USER).isBanned(true).build();
    }

    @Test
    void handleConnect_withValidToken_setsUserPrincipal() {
        String token = "valid.jwt.token";
        when(tokenProvider.validateToken(token)).thenReturn(true);
        when(tokenProvider.getUserIdFromToken(token)).thenReturn(user1Id);
        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);

        StompHeaderAccessor resAccessor = StompHeaderAccessor.wrap(result);
        assertThat(resAccessor.getUser()).isNotNull();
        assertThat(((UserPrincipal) ((UsernamePasswordAuthenticationToken) resAccessor.getUser()).getPrincipal()).getId()).isEqualTo(user1Id);
    }

    @Test
    void handleConnect_missingAuthHeader_throwsMessageDeliveryException() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Missing or invalid Authorization header");
    }

    @Test
    void handleConnect_invalidToken_throwsMessageDeliveryException() {
        String token = "invalid.token";
        when(tokenProvider.validateToken(token)).thenReturn(false);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Invalid or expired JWT token");
    }

    @Test
    void handleConnect_bannedUser_throwsMessageDeliveryException() {
        String token = "banned.user.token";
        when(tokenProvider.validateToken(token)).thenReturn(true);
        when(tokenProvider.getUserIdFromToken(token)).thenReturn(bannedUserId);
        when(userRepository.findById(bannedUserId)).thenReturn(Optional.of(bannedUser));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.setNativeHeader("Authorization", "Bearer " + token);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("User account is banned");
    }

    @Test
    void handleSubscribe_conversationAsParticipant_succeeds() {
        UUID convId = UUID.randomUUID();
        Conversation conv = Conversation.builder()
                .id(convId)
                .contextType(ContextType.CAB_GROUP)
                .contextId(UUID.randomUUID())
                .user1(user1)
                .user2(user2)
                .build();

        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));

        UserPrincipal principal = UserPrincipal.create(user1);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/conversation/" + convId);
        accessor.setUser(auth);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);
        assertThat(result).isNotNull();
    }

    @Test
    void handleSubscribe_conversationAsNonParticipant_throwsAccessDeniedException() {
        UUID convId = UUID.randomUUID();
        User thirdParty = User.builder().id(UUID.randomUUID()).email("other@thapar.edu").fullName("Other").role(Role.USER).build();
        Conversation conv = Conversation.builder()
                .id(convId)
                .contextType(ContextType.CAB_GROUP)
                .contextId(UUID.randomUUID())
                .user1(user1)
                .user2(user2)
                .build();

        when(conversationRepository.findById(convId)).thenReturn(Optional.of(conv));

        UserPrincipal principal = UserPrincipal.create(thirdParty);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/conversation/" + convId);
        accessor.setUser(auth);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("User is not authorized to subscribe to this conversation");
    }

    @Test
    void handleSubscribe_malformedConversationUuid_throwsMessageDeliveryException() {
        UserPrincipal principal = UserPrincipal.create(user1);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/conversation/not-a-valid-uuid");
        accessor.setUser(auth);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Invalid conversation ID format");
    }

    @Test
    void handleSubscribe_adminTopicAsRegularUser_throwsAccessDeniedException() {
        UserPrincipal regularPrincipal = UserPrincipal.create(user1);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(regularPrincipal, null, regularPrincipal.getAuthorities());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/admin/alerts");
        accessor.setUser(auth);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, messageChannel))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Admin role required");
    }

    @Test
    void handleSubscribe_adminTopicAsAdmin_succeeds() {
        User adminUser = User.builder().id(UUID.randomUUID()).email("admin@thapar.edu").fullName("Admin").role(Role.ADMIN).build();
        UserPrincipal adminPrincipal = UserPrincipal.create(adminUser);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(adminPrincipal, null, adminPrincipal.getAuthorities());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/admin/alerts");
        accessor.setUser(auth);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);
        assertThat(result).isNotNull();
    }
}
