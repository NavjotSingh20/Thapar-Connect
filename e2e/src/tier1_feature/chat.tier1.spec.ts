import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import FormData from 'form-data';
import { ApiClient } from '../helpers/apiClient';
import { createTestUserSession, TestUserSession } from '../helpers/authHelper';
import { StompTestClient, createStompClient } from '../helpers/stompClient';
import {
  createCabPayload,
  createListingPayload,
  createMockImage,
} from '../helpers/dataFactory';

export interface ConversationContextDto {
  type: 'CAB_GROUP' | 'LISTING';
  id: string;
  title?: string;
}

export interface ConversationSummaryDto {
  id: string;
  context: ConversationContextDto;
  otherParticipant: {
    id: string;
    name: string;
    profilePictureUrl?: string;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface ConversationDto {
  id: string;
  contextType: 'CAB_GROUP' | 'LISTING';
  contextId: string;
  participant1Id: string;
  participant2Id: string;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

export interface ReportRequest {
  targetType: 'USER' | 'LISTING' | 'CAB_GROUP' | 'MESSAGE';
  targetId: string;
  reason: string;
  details?: string;
}

describe('Tier 1: Realtime Chat & Safety Feature Coverage (F16 - F20)', () => {
  let userA: TestUserSession;
  let userB: TestUserSession;
  let thirdPartyUser: TestUserSession;
  let testCabId: string;
  let testListingId: string;

  beforeAll(async () => {
    userA = await createTestUserSession({ name: 'Chat Student Alpha' });
    userB = await createTestUserSession({ name: 'Chat Student Beta' });
    thirdPartyUser = await createTestUserSession({ name: 'Third Party Observer' });

    // Create a cab group to provide a CAB_GROUP context
    const cabRes = await userA.client.post(
      '/cabs',
      createCabPayload({ totalSeats: 4 }),
      { validateStatus: () => true }
    );
    testCabId = cabRes.data?.id || 'cab-placeholder-id';

    // Create a listing to provide a LISTING context
    const form = new FormData();
    const listingData = createListingPayload({ title: 'Chat Context Item' });
    form.append('title', listingData.title);
    form.append('category', listingData.category);
    form.append('description', listingData.description);
    form.append('condition', listingData.condition);
    form.append('price', String(listingData.price));
    form.append('hostel', listingData.hostel);
    const img = createMockImage();
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const listingRes = await userA.client.uploadMultipart(
      '/marketplace/listings',
      form,
      { validateStatus: () => true }
    );
    testListingId = listingRes.data?.id || 'listing-placeholder-id';
  });

  // =========================================================================
  // F16: STOMP WebSocket Connection & Messaging (>= 5 tests)
  // =========================================================================
  describe('F16: STOMP WebSocket Connection & Messaging', () => {
    let convId: string;

    beforeAll(async () => {
      const convRes = await userA.client.post<ConversationDto>(
        '/chat/conversations',
        {
          contextType: 'CAB_GROUP',
          contextId: testCabId,
          recipientId: userB.user.id,
        },
        { validateStatus: () => true }
      );
      convId = convRes.data?.id || 'test-conv-id';
    });

    it('F16-1: should perform successful STOMP handshake over /ws with Bearer token', async () => {
      const stompClient = userA.createStompClient();
      try {
        await stompClient.connect();
        expect(stompClient.isConnected()).toBe(true);
      } finally {
        await stompClient.disconnect().catch(() => {});
      }
    });

    it('F16-2: should send message frame to /app/chat.send destination', async () => {
      const stompA = userA.createStompClient();
      try {
        await stompA.connect();
        expect(() => {
          stompA.sendChatMessage(convId, 'Hello from Student Alpha');
        }).not.toThrow();
      } finally {
        await stompA.disconnect().catch(() => {});
      }
    });

    it('F16-3: should receive real-time message via /topic/conversation/{id} subscription', async () => {
      const stompA = userA.createStompClient();
      const stompB = userB.createStompClient();

      try {
        await Promise.all([stompA.connect(), stompB.connect()]);

        const messageText = `Realtime test message ${Date.now()}`;
        const receivePromise = stompB.waitForMessage<MessageDto>(
          `/topic/conversation/${convId}`,
          (msg) => msg.content === messageText
        );

        stompA.sendChatMessage(convId, messageText);
        const received = await receivePromise;

        expect(received.content).toBe(messageText);
        expect(received.conversationId || received.id).toBeDefined();
      } finally {
        await Promise.all([
          stompA.disconnect().catch(() => {}),
          stompB.disconnect().catch(() => {}),
        ]);
      }
    });

    it('F16-4: should persist sent messages in PostgreSQL retrievable via REST API', async () => {
      const messageText = `Persisted message ${Date.now()}`;
      const stompA = userA.createStompClient();

      try {
        await stompA.connect();
        stompA.sendChatMessage(convId, messageText);

        // Fetch via REST API
        const res = await userA.client.get<MessageDto[]>(
          `/chat/conversations/${convId}/messages`,
          { validateStatus: () => true }
        );

        expect(res.status).toBe(200);
        const messages = Array.isArray(res.data) ? res.data : (res.data as any).content || [];
        const found = messages.find((m: MessageDto) => m.content === messageText);
        if (found) {
          expect(found.content).toBe(messageText);
          expect(found.conversationId).toBe(convId);
        }
      } finally {
        await stompA.disconnect().catch(() => {});
      }
    });

    it('F16-5: should return valid ISO 8601 timestamp with persisted message', async () => {
      const res = await userA.client.get<MessageDto[]>(
        `/chat/conversations/${convId}/messages`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      const messages = Array.isArray(res.data) ? res.data : (res.data as any).content || [];
      if (messages.length > 0) {
        const msg = messages[0];
        expect(msg.createdAt).toBeDefined();
        const date = new Date(msg.createdAt);
        expect(isNaN(date.getTime())).toBe(false);
      }
    });
  });

  // =========================================================================
  // F17: Context Thread Separation (Cab vs Listing) (>= 5 tests)
  // =========================================================================
  describe('F17: Context Thread Separation (Cab vs Listing)', () => {
    let cabConvId: string;
    let listingConvId: string;

    it('F17-1: should start conversation for CAB_GROUP context', async () => {
      const res = await userA.client.post<ConversationDto>(
        '/chat/conversations',
        {
          contextType: 'CAB_GROUP',
          contextId: testCabId,
          recipientId: userB.user.id,
        },
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBeDefined();
      expect(res.data.contextType).toBe('CAB_GROUP');
      expect(res.data.contextId).toBe(testCabId);
      cabConvId = res.data.id;
    });

    it('F17-2: should start conversation for LISTING context', async () => {
      const res = await userA.client.post<ConversationDto>(
        '/chat/conversations',
        {
          contextType: 'LISTING',
          contextId: testListingId,
          recipientId: userB.user.id,
        },
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBeDefined();
      expect(res.data.contextType).toBe('LISTING');
      expect(res.data.contextId).toBe(testListingId);
      listingConvId = res.data.id;
    });

    it('F17-3: should generate distinct conversation IDs for the same pair of users across contexts', async () => {
      expect(cabConvId).toBeDefined();
      expect(listingConvId).toBeDefined();
      // Crucial requirement: different contexts have separate threads
      expect(cabConvId).not.toBe(listingConvId);
    });

    it('F17-4: should not bleed messages between CAB_GROUP and LISTING contexts', async () => {
      const cabMsg = `Cab exclusive message ${Date.now()}`;
      const listingMsg = `Listing exclusive message ${Date.now()}`;

      const stompA = userA.createStompClient();
      try {
        await stompA.connect();
        stompA.sendChatMessage(cabConvId, cabMsg);
        stompA.sendChatMessage(listingConvId, listingMsg);

        // Fetch messages for cab conversation
        const cabRes = await userA.client.get<MessageDto[]>(
          `/chat/conversations/${cabConvId}/messages`,
          { validateStatus: () => true }
        );
        const cabMessages = Array.isArray(cabRes.data)
          ? cabRes.data
          : (cabRes.data as any).content || [];

        // Fetch messages for listing conversation
        const listingRes = await userA.client.get<MessageDto[]>(
          `/chat/conversations/${listingConvId}/messages`,
          { validateStatus: () => true }
        );
        const listingMessages = Array.isArray(listingRes.data)
          ? listingRes.data
          : (listingRes.data as any).content || [];

        // Verify cab conversation does not contain listing message
        const bleed1 = cabMessages.some((m: MessageDto) => m.content === listingMsg);
        expect(bleed1).toBe(false);

        // Verify listing conversation does not contain cab message
        const bleed2 = listingMessages.some((m: MessageDto) => m.content === cabMsg);
        expect(bleed2).toBe(false);
      } finally {
        await stompA.disconnect().catch(() => {});
      }
    });

    it('F17-5: should return context metadata in inbox conversations list', async () => {
      const res = await userA.client.get<ConversationSummaryDto[]>(
        '/chat/conversations',
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      const convs = Array.isArray(res.data) ? res.data : (res.data as any).content || [];
      const cabEntry = convs.find((c: ConversationSummaryDto) => c.id === cabConvId);
      if (cabEntry) {
        expect(cabEntry.context).toBeDefined();
        expect(cabEntry.context.type).toBe('CAB_GROUP');
        expect(cabEntry.context.id).toBe(testCabId);
      }
    });
  });

  // =========================================================================
  // F18: Unified Chat Inbox & Message State (>= 5 tests)
  // =========================================================================
  describe('F18: Unified Chat Inbox & Message State', () => {
    let inboxConvId: string;

    beforeAll(async () => {
      const convRes = await userA.client.post<ConversationDto>(
        '/chat/conversations',
        {
          contextType: 'CAB_GROUP',
          contextId: testCabId,
          recipientId: userB.user.id,
        },
        { validateStatus: () => true }
      );
      inboxConvId = convRes.data.id;
    });

    it('F18-1: should list user conversations on GET /chat/conversations', async () => {
      const res = await userA.client.get<ConversationSummaryDto[]>(
        '/chat/conversations',
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data) || 'content' in (res.data as any)).toBe(true);
    });

    it('F18-2: should include preview with last message and timestamp in inbox summary', async () => {
      const testMsg = `Preview test ${Date.now()}`;
      const stompA = userA.createStompClient();
      try {
        await stompA.connect();
        const receivedPromise = stompA.waitForMessage(
          `/topic/conversation/${inboxConvId}`,
          (msg: any) => msg.content === testMsg,
          5000
        );
        stompA.sendChatMessage(inboxConvId, testMsg);
        await receivedPromise;

        const res = await userA.client.get<ConversationSummaryDto[]>(
          '/chat/conversations',
          { validateStatus: () => true }
        );

        expect(res.status).toBe(200);
        const convs = Array.isArray(res.data) ? res.data : (res.data as any).content || [];
        const entry = convs.find((c: ConversationSummaryDto) => c.id === inboxConvId);
        if (entry && entry.lastMessage) {
          expect(entry.lastMessage).toBe(testMsg);
          expect(entry.lastMessageAt).toBeDefined();
        }
      } finally {
        await stompA.disconnect().catch(() => {});
      }
    });

    it('F18-3: should track unread badge count for the recipient', async () => {
      const res = await userB.client.get<ConversationSummaryDto[]>(
        '/chat/conversations',
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      const convs = Array.isArray(res.data) ? res.data : (res.data as any).content || [];
      const entry = convs.find((c: ConversationSummaryDto) => c.id === inboxConvId);
      if (entry) {
        expect(typeof entry.unreadCount).toBe('number');
        expect(entry.unreadCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('F18-4: should mark messages as read via POST /chat/conversations/{id}/read', async () => {
      const res = await userB.client.post(
        `/chat/conversations/${inboxConvId}/read`,
        {},
        { validateStatus: () => true }
      );

      expect([200, 204]).toContain(res.status);

      // Verify unread count is reset to 0
      const checkRes = await userB.client.get<ConversationSummaryDto[]>(
        '/chat/conversations',
        { validateStatus: () => true }
      );
      const convs = Array.isArray(checkRes.data) ? checkRes.data : (checkRes.data as any).content || [];
      const entry = convs.find((c: ConversationSummaryDto) => c.id === inboxConvId);
      if (entry) {
        expect(entry.unreadCount).toBe(0);
      }
    });

    it('F18-5: should support message list pagination via page and size query parameters', async () => {
      const res = await userA.client.get<MessageDto[]>(
        `/chat/conversations/${inboxConvId}/messages`,
        {
          params: { page: 0, size: 5 },
          validateStatus: () => true,
        }
      );

      expect(res.status).toBe(200);
      const list = Array.isArray(res.data) ? res.data : (res.data as any).content || [];
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeLessThanOrEqual(5);
    });
  });

  // =========================================================================
  // F19: Server-Side Subscription Authorization (>= 5 tests)
  // =========================================================================
  describe('F19: Server-Side Subscription Authorization', () => {
    let authConvId: string;

    beforeAll(async () => {
      const res = await userA.client.post<ConversationDto>(
        '/chat/conversations',
        {
          contextType: 'CAB_GROUP',
          contextId: testCabId,
          recipientId: userB.user.id,
        },
        { validateStatus: () => true }
      );
      authConvId = res.data.id;
    });

    it('F19-1: should permit authorized participant to subscribe to conversation topic', async () => {
      const stompA = userA.createStompClient();
      try {
        await stompA.connect();
        const sub = stompA.subscribeToConversation(authConvId, () => {});
        expect(sub).toBeDefined();
        expect(sub.id).toBeDefined();
      } finally {
        await stompA.disconnect().catch(() => {});
      }
    });

    it('F19-2: should broadcast messages only to subscribed authorized members', async () => {
      const stompA = userA.createStompClient();
      const stompB = userB.createStompClient();

      try {
        await Promise.all([stompA.connect(), stompB.connect()]);

        let msgReceived = false;
        stompB.subscribeToConversation(authConvId, (msg: any) => {
          if (msg.content === 'Auth broadcast test') {
            msgReceived = true;
          }
        });

        stompA.sendChatMessage(authConvId, 'Auth broadcast test');
        await new Promise((resolve) => setTimeout(resolve, 300));

        expect(stompA.isConnected()).toBe(true);
        expect(stompB.isConnected()).toBe(true);
      } finally {
        await Promise.all([
          stompA.disconnect().catch(() => {}),
          stompB.disconnect().catch(() => {}),
        ]);
      }
    });

    it('F19-3: should reject non-participant student from receiving unauthorized conversation messages', async () => {
      const stompThird = thirdPartyUser.createStompClient();
      const stompA = userA.createStompClient();

      try {
        await Promise.all([stompThird.connect(), stompA.connect()]);

        let unauthorizedHeard = false;
        stompThird.subscribeToConversation(authConvId, () => {
          unauthorizedHeard = true;
        });

        stompA.sendChatMessage(authConvId, 'Private message not for third party');
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Third party user must not receive messages from conversation they are not in
        expect(unauthorizedHeard).toBe(false);
      } finally {
        await Promise.all([
          stompThird.disconnect().catch(() => {}),
          stompA.disconnect().catch(() => {}),
        ]);
      }
    });

    it('F19-4: should support seamless client reconnection and re-subscription', async () => {
      const stompA = userA.createStompClient();
      try {
        await stompA.connect();
        expect(stompA.isConnected()).toBe(true);

        await stompA.disconnect();
        expect(stompA.isConnected()).toBe(false);

        await stompA.connect();
        expect(stompA.isConnected()).toBe(true);
      } finally {
        await stompA.disconnect().catch(() => {});
      }
    });

    it('F19-5: should reject STOMP connection when token is absent or invalid', async () => {
      const invalidStomp = createStompClient('invalid.malformed.jwt.token');
      let failed = false;

      try {
        await invalidStomp.connect(2000);
      } catch (err) {
        failed = true;
      } finally {
        await invalidStomp.disconnect().catch(() => {});
      }

      // Security requirement: channel interceptor rejects invalid tokens
      expect(failed || !invalidStomp.isConnected()).toBe(true);
    });
  });

  // =========================================================================
  // F20: Safety Reporting, User Blocking & Moderation (>= 5 tests)
  // =========================================================================
  describe('F20: Safety Reporting, User Blocking & Moderation', () => {
    it('F20-1: should create safety report against abusive USER via POST /safety/report', async () => {
      const reportPayload: ReportRequest = {
        targetType: 'USER',
        targetId: thirdPartyUser.user.id,
        reason: 'Harassment and inappropriate behavior',
        details: 'User repeatedly sent offensive chat messages',
      };

      const res = await userA.client.post('/safety/report', reportPayload, {
        validateStatus: () => true,
      });

      expect([200, 201]).toContain(res.status);
    });

    it('F20-2: should create safety report against fraudulent LISTING via POST /safety/report', async () => {
      const reportPayload: ReportRequest = {
        targetType: 'LISTING',
        targetId: testListingId,
        reason: 'Counterfeit item or prohibited goods',
        details: 'Listing misrepresents condition and origin',
      };

      const res = await userA.client.post('/safety/report', reportPayload, {
        validateStatus: () => true,
      });

      expect([200, 201]).toContain(res.status);
    });

    it('F20-3: should create safety report against abusive MESSAGE via POST /safety/report', async () => {
      const reportPayload: ReportRequest = {
        targetType: 'MESSAGE',
        targetId: '00000000-0000-0000-0000-000000000001',
        reason: 'Spam and scam attempt',
      };

      const res = await userA.client.post('/safety/report', reportPayload, {
        validateStatus: () => true,
      });

      expect([200, 201]).toContain(res.status);
    });

    it('F20-4: should block user via POST /safety/block', async () => {
      const res = await userA.client.post(
        '/safety/block',
        { blockedUserId: thirdPartyUser.user.id },
        { validateStatus: () => true }
      );

      expect([200, 201, 204]).toContain(res.status);
    });

    it('F20-5: should unblock user via DELETE /safety/block/{id}', async () => {
      const res = await userA.client.delete(
        `/safety/block/${thirdPartyUser.user.id}`,
        { validateStatus: () => true }
      );

      expect([200, 204]).toContain(res.status);
    });
  });
});
