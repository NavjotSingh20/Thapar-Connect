package com.thaparconnect.backend.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.thaparconnect.backend.common.GlobalExceptionHandler;
import com.thaparconnect.backend.security.UserPrincipal;
import com.thaparconnect.backend.users.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private ChatService chatService;

    @InjectMocks
    private ChatController chatController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private final UUID testUserId = UUID.randomUUID();
    private UserPrincipal testPrincipal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(chatController)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        testPrincipal = UserPrincipal.create(testUserId, "student@thapar.edu", Role.USER, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(testPrincipal, null, testPrincipal.getAuthorities())
        );
    }

    @Test
    void createOrGetConversation_returns201() throws Exception {
        UUID convId = UUID.randomUUID();
        UUID contextId = UUID.randomUUID();
        UUID recipientId = UUID.randomUUID();

        ConversationDto convDto = ConversationDto.builder()
                .id(convId)
                .contextType(ContextType.CAB_GROUP)
                .contextId(contextId)
                .participant1Id(testUserId)
                .participant2Id(recipientId)
                .createdAt(Instant.now())
                .build();

        when(chatService.getOrCreateConversation(eq(ContextType.CAB_GROUP), eq(contextId), eq(recipientId), eq(testUserId)))
                .thenReturn(convDto);

        CreateConversationRequest request = CreateConversationRequest.builder()
                .contextType(ContextType.CAB_GROUP)
                .contextId(contextId)
                .recipientId(recipientId)
                .build();

        mockMvc.perform(post("/api/v1/chat/conversations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(convId.toString()))
                .andExpect(jsonPath("$.contextType").value("CAB_GROUP"));
    }

    @Test
    void getInbox_returns200() throws Exception {
        UUID convId = UUID.randomUUID();
        ConversationSummaryDto summary = ConversationSummaryDto.builder()
                .id(convId)
                .contextType(ContextType.CAB_GROUP)
                .contextId(UUID.randomUUID())
                .context(ConversationContextDto.builder().type("CAB_GROUP").id(UUID.randomUUID()).title("Cab to Delhi").build())
                .otherParticipant(OtherParticipantDto.builder().id(UUID.randomUUID()).name("Partner").build())
                .lastMessage("See you tomorrow")
                .unreadCount(2)
                .build();

        when(chatService.getUserInbox(testUserId)).thenReturn(List.of(summary));

        mockMvc.perform(get("/api/v1/chat/conversations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(convId.toString()))
                .andExpect(jsonPath("$[0].unreadCount").value(2));
    }

    @Test
    void getMessages_returns200() throws Exception {
        UUID convId = UUID.randomUUID();
        MessageDto msg = MessageDto.builder()
                .id(UUID.randomUUID())
                .conversationId(convId)
                .senderId(testUserId)
                .content("Hello")
                .isRead(true)
                .createdAt(Instant.now())
                .build();

        when(chatService.getConversationMessages(eq(convId), eq(testUserId), any()))
                .thenReturn(List.of(msg));

        mockMvc.perform(get("/api/v1/chat/conversations/{id}/messages", convId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Hello"));
    }

    @Test
    void sendHttpMessage_returns201() throws Exception {
        UUID convId = UUID.randomUUID();
        MessageDto msg = MessageDto.builder()
                .id(UUID.randomUUID())
                .conversationId(convId)
                .senderId(testUserId)
                .content("HTTP message")
                .isRead(false)
                .createdAt(Instant.now())
                .build();

        when(chatService.sendMessage(eq(convId), eq("HTTP message"), eq(testUserId)))
                .thenReturn(msg);

        SendMessageRequest request = new SendMessageRequest("HTTP message");

        mockMvc.perform(post("/api/v1/chat/conversations/{id}/messages", convId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("HTTP message"));
    }

    @Test
    void markRead_returns200() throws Exception {
        UUID convId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/chat/conversations/{id}/read", convId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(chatService).markConversationRead(convId, testUserId);
    }
}
