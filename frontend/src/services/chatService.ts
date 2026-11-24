import { api, unwrapData } from './api';
import {
  ChatContextType,
  ConversationDto,
  ConversationSummaryDto,
  CreateConversationRequest,
  MessageDto,
  SendMessageRequest,
} from '@/types';

export const chatService = {
  async getConversations(): Promise<ConversationSummaryDto[]> {
    const res = await api.get('/chat/conversations');
    const data = unwrapData<any>(res);
    return Array.isArray(data) ? data : data?.content || [];
  },

  async getOrCreateConversation(
    contextType: ChatContextType,
    contextId: string,
    recipientId: string
  ): Promise<ConversationDto> {
    const payload: CreateConversationRequest = {
      contextType,
      contextId,
      recipientId,
    };
    const res = await api.post('/chat/conversations', payload);
    return unwrapData<ConversationDto>(res);
  },

  async getConversationById(id: string): Promise<ConversationDto> {
    const res = await api.get(`/chat/conversations/${id}`);
    return unwrapData<ConversationDto>(res);
  },

  async getMessages(
    conversationId: string,
    page?: number,
    size?: number
  ): Promise<MessageDto[]> {
    const params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (size !== undefined) params.size = size;

    const res = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
    const data = unwrapData<any>(res);
    return Array.isArray(data) ? data : data?.content || [];
  },

  async markAsRead(conversationId: string): Promise<void> {
    await api.post(`/chat/conversations/${conversationId}/read`, {});
  },

  async sendHttpMessage(conversationId: string, content: string): Promise<MessageDto> {
    const payload: SendMessageRequest = { content };
    const res = await api.post(`/chat/conversations/${conversationId}/messages`, payload);
    return unwrapData<MessageDto>(res);
  },
};
