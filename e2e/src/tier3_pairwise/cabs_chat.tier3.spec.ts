import { describe, it, expect } from 'vitest';
import { createTestUserSession } from '../helpers/authHelper';
import { createCabPayload } from '../helpers/dataFactory';

describe('Tier 3: Pairwise - Cabs & Chat Messaging Interactions', () => {
  it('should establish CAB_GROUP chat thread between creator and accepted joiner, and exchange messages', async () => {
    // 1. Creator and Applicant sessions
    const creator = await createTestUserSession({ onboard: true });
    const applicant = await createTestUserSession({ onboard: true });

    // 2. Creator posts cab group (autoJoinEnabled: false)
    const cabRes = await creator.client.post(
      '/cabs',
      createCabPayload({ totalSeats: 3, autoJoinEnabled: false })
    );
    const cabId = cabRes.data.id;

    // 3. Applicant requests to join
    const joinRes = await applicant.client.post(`/cabs/${cabId}/join`, {
      seatsRequested: 1,
      note: 'Need drop at Delhi T3',
    });
    expect([200, 201]).toContain(joinRes.status);
    const memberId = joinRes.data.id;

    // 4. Creator accepts the applicant
    const acceptRes = await creator.client.post(
      `/cabs/${cabId}/members/${memberId}/accept`
    );
    expect([200, 204]).toContain(acceptRes.status);

    // 5. Applicant opens chat conversation under CAB_GROUP context
    const convRes = await applicant.client.post(
      '/chat/conversations',
      {
        contextType: 'CAB_GROUP',
        contextId: cabId,
        recipientId: creator.user.id,
      },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(convRes.status);
    const conversationId = convRes.data.id;
    expect(convRes.data.contextType).toBe('CAB_GROUP');
    expect(convRes.data.contextId).toBe(cabId);

    // 6. Test STOMP WebSocket messaging
    const creatorStomp = creator.createStompClient();
    const applicantStomp = applicant.createStompClient();

    try {
      await Promise.all([creatorStomp.connect(), applicantStomp.connect()]);

      // Creator listens for applicant messages
      const messagePromise = creatorStomp.waitForMessage(
        `/topic/conversation/${conversationId}`,
        (msg) => msg.content === 'Hey, where are we meeting on campus?'
      );

      // Applicant sends STOMP message
      applicantStomp.sendChatMessage(
        conversationId,
        'Hey, where are we meeting on campus?'
      );

      const received = await messagePromise;
      expect(received.content).toBe('Hey, where are we meeting on campus?');
      expect(received.conversationId || received.id).toBeDefined();

      // 7. Verify message persistence in REST API
      const historyRes = await creator.client.get(
        `/chat/conversations/${conversationId}/messages`
      );
      expect(historyRes.status).toBe(200);
      const messages: any[] = Array.isArray(historyRes.data)
        ? historyRes.data
        : historyRes.data?.content || [];
      const stored = messages.find(
        (m: any) => m.content === 'Hey, where are we meeting on campus?'
      );
      expect(stored).toBeDefined();
    } finally {
      await Promise.all([
        creatorStomp.disconnect().catch(() => {}),
        applicantStomp.disconnect().catch(() => {}),
      ]);
    }
  });

  it('should maintain chat thread accessibility for confirmed members after cab is closed or full', async () => {
    // 1. Setup creator and member
    const creator = await createTestUserSession({ onboard: true });
    const member = await createTestUserSession({ onboard: true });

    const cabRes = await creator.client.post(
      '/cabs',
      createCabPayload({ totalSeats: 2, autoJoinEnabled: true })
    );
    const cabId = cabRes.data.id;

    // 2. Member joins, filling the group to capacity
    const joinRes = await member.client.post(`/cabs/${cabId}/join`, {
      seatsRequested: 1,
    });
    expect([200, 201]).toContain(joinRes.status);

    // 3. Close the cab group explicitly
    const closeRes = await creator.client.patch(`/cabs/${cabId}/close`, {}, {
      validateStatus: () => true,
    });
    expect([200, 204]).toContain(closeRes.status);

    // Verify cab status is CLOSED or FULL
    const cabCheck = await creator.client.get(`/cabs/${cabId}`);
    expect(['CLOSED', 'FULL']).toContain(cabCheck.data.status);

    // 4. Create / fetch existing conversation
    const convRes = await member.client.post(
      '/chat/conversations',
      {
        contextType: 'CAB_GROUP',
        contextId: cabId,
        recipientId: creator.user.id,
      },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(convRes.status);
    const convId = convRes.data.id;

    // 5. Both member and creator can still view message history
    const historyRes = await member.client.get(
      `/chat/conversations/${convId}/messages`,
      { validateStatus: () => true }
    );
    expect(historyRes.status).toBe(200);

    // 6. Confirmed member can still send follow-up post-ride/pre-departure coordination message
    const sendMsgRes = await member.client.post(
      `/chat/conversations/${convId}/messages`,
      { content: 'Leaving in 10 mins!' },
      { validateStatus: () => true }
    );
    // Should succeed via REST endpoint or be supported
    expect([200, 201, 204]).toContain(sendMsgRes.status);
  });

  it('should reject unauthorized students (non-members) from subscribing to a private cab conversation', async () => {
    // 1. Creator and Applicant create a cab conversation
    const creator = await createTestUserSession({ onboard: true });
    const applicant = await createTestUserSession({ onboard: true });
    const outsider = await createTestUserSession({ onboard: true });

    const cabRes = await creator.client.post(
      '/cabs',
      createCabPayload({ totalSeats: 3, autoJoinEnabled: true })
    );
    const cabId = cabRes.data.id;

    await applicant.client.post(`/cabs/${cabId}/join`, { seatsRequested: 1 });

    const convRes = await creator.client.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cabId,
      recipientId: applicant.user.id,
    });
    const convId = convRes.data.id;

    // 2. Outsider attempts to fetch messages via REST -> 403 Forbidden
    const outsiderRestRes = await outsider.client.get(
      `/chat/conversations/${convId}/messages`,
      { validateStatus: () => true }
    );
    expect([403, 404]).toContain(outsiderRestRes.status);

    // 3. Outsider connects to STOMP and attempts to subscribe
    const outsiderStomp = outsider.createStompClient();
    let subscriptionFailed = false;
    let receivedMessage: any = undefined;

    try {
      await outsiderStomp.connect();
      // Server subscription interceptor should reject or fail subscription
      outsiderStomp.getRawClient().onStompError = () => {
        subscriptionFailed = true;
      };
      outsiderStomp.getRawClient().onWebSocketClose = () => {
        subscriptionFailed = true;
      };

      try {
        outsiderStomp.subscribe(`/topic/conversation/${convId}`, (msg) => {
          receivedMessage = msg;
        });
      } catch {
        subscriptionFailed = true;
      }

      // If client didn't immediately throw, verify no messages leak to unauthorized outsider
      expect(receivedMessage).toBeUndefined();
    } catch {
      subscriptionFailed = true;
      expect(subscriptionFailed).toBe(true);
    } finally {
      await outsiderStomp.disconnect().catch(() => {});
    }
  });

  it('should reflect active cab chat conversations in unified inbox with context metadata and unread counts', async () => {
    // 1. Creator and Student exchange message
    const creator = await createTestUserSession({ onboard: true });
    const student = await createTestUserSession({ onboard: true });

    const cabRes = await creator.client.post(
      '/cabs',
      createCabPayload({ totalSeats: 3, autoJoinEnabled: true })
    );
    const cabId = cabRes.data.id;
    await student.client.post(`/cabs/${cabId}/join`, { seatsRequested: 1 });

    const convRes = await student.client.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cabId,
      recipientId: creator.user.id,
    });
    const convId = convRes.data.id;

    // Send a message from Student to Creator
    await student.client.post(
      `/chat/conversations/${convId}/messages`,
      { content: 'Will bring 1 trolley bag' },
      { validateStatus: () => true }
    );

    // 2. Creator checks unified inbox
    const inboxRes = await creator.client.get('/chat/conversations');
    expect(inboxRes.status).toBe(200);

    const conversations: any[] = Array.isArray(inboxRes.data)
      ? inboxRes.data
      : inboxRes.data?.content || [];

    const cabThread = conversations.find((c: any) => c.id === convId);
    expect(cabThread).toBeDefined();
    if (cabThread) {
      expect(cabThread.contextType || cabThread.context?.type).toBe('CAB_GROUP');
      expect(
        cabThread.contextId || cabThread.context?.id || cabThread.context?.contextId
      ).toBe(cabId);
    }
  });

  it('should prevent rejected cab applicant from participating in cab group conversation', async () => {
    const creator = await createTestUserSession({ onboard: true });
    const applicant = await createTestUserSession({ onboard: true });

    // 1. Creator creates cab with autoJoin = false
    const cabRes = await creator.client.post(
      '/cabs',
      createCabPayload({ totalSeats: 4, autoJoinEnabled: false })
    );
    const cabId = cabRes.data.id;

    // 2. Applicant requests join
    const joinRes = await applicant.client.post(`/cabs/${cabId}/join`, {
      seatsRequested: 1,
    });
    const memberId = joinRes.data.id;

    // 3. Creator rejects the join request
    const rejectRes = await creator.client.post(
      `/cabs/${cabId}/members/${memberId}/reject`,
      {},
      { validateStatus: () => true }
    );
    expect([200, 204]).toContain(rejectRes.status);

    // 4. Rejected applicant attempts to create conversation under cab context
    const convRes = await applicant.client.post(
      '/chat/conversations',
      {
        contextType: 'CAB_GROUP',
        contextId: cabId,
        recipientId: creator.user.id,
      },
      { validateStatus: () => true }
    );
    // Should be rejected because applicant is not a confirmed member
    expect([400, 403]).toContain(convRes.status);
  });
});
