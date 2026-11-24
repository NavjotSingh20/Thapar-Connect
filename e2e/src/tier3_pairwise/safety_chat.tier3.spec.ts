import { describe, it, expect } from 'vitest';
import { createTestUserSession } from '../helpers/authHelper';
import { createCabPayload } from '../helpers/dataFactory';

describe('Tier 3: Pairwise - Safety Controls & Chat Interactions', () => {
  it('should execute full safety workflow: report unwanted user -> block user -> message delivery blocked -> unblock -> messaging resumes', async () => {
    // 1. Setup Student A (Victim) and Student B (Sender)
    const studentA = await createTestUserSession({ onboard: true });
    const studentB = await createTestUserSession({ onboard: true });

    // 2. Cab pool setup for conversation context
    const cab = await studentA.client.post(
      '/cabs',
      createCabPayload({ totalSeats: 3, autoJoinEnabled: true })
    );
    await studentB.client.post(`/cabs/${cab.data.id}/join`, { seatsRequested: 1 });

    const convRes = await studentA.client.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cab.data.id,
      recipientId: studentB.user.id,
    });
    const convId = convRes.data.id;

    // 3. Student B sends an inappropriate message
    await studentB.client.post(`/chat/conversations/${convId}/messages`, {
      content: 'Unsolicited and inappropriate message text',
    });

    // 4. Student A files a safety report against Student B
    const reportRes = await studentA.client.post(
      '/safety/report',
      {
        targetType: 'USER',
        targetId: studentB.user.id,
        reason: 'Harassment & Inappropriate Behavior',
        details: 'Sent harassing messages in cab chat',
      },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(reportRes.status);

    // 5. Student A blocks Student B
    const blockRes = await studentA.client.post(
      '/safety/block',
      { blockedUserId: studentB.user.id },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(blockRes.status);

    // 6. Student B attempts to send another message to Student A -> Must fail or be blocked
    const blockedMessageAttempt = await studentB.client.post(
      `/chat/conversations/${convId}/messages`,
      { content: 'Are you ignoring me?' },
      { validateStatus: () => true }
    );
    expect([400, 403]).toContain(blockedMessageAttempt.status);

    // 7. Student A unblocks Student B
    const unblockRes = await studentA.client.delete(
      `/safety/block/${studentB.user.id}`,
      { validateStatus: () => true }
    );
    expect([200, 204]).toContain(unblockRes.status);

    // 8. Subsequent message send succeeds cleanly
    const postUnblockMessage = await studentB.client.post(
      `/chat/conversations/${convId}/messages`,
      { content: 'Apologies, I will keep conversation strictly to travel.' },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(postUnblockMessage.status);
  });

  it('should prevent blocked user from initiating any new conversation with the blocker (403 Forbidden)', async () => {
    const blocker = await createTestUserSession({ onboard: true });
    const blockedUser = await createTestUserSession({ onboard: true });

    // 1. Blocker blocks target user
    const blockRes = await blocker.client.post('/safety/block', {
      blockedUserId: blockedUser.user.id,
    });
    expect([200, 201]).toContain(blockRes.status);

    // 2. Blocked user creates a cab and tries to chat with blocker
    const cab = await blockedUser.client.post('/cabs', createCabPayload());
    const convAttempt = await blockedUser.client.post(
      '/chat/conversations',
      {
        contextType: 'CAB_GROUP',
        contextId: cab.data.id,
        recipientId: blocker.user.id,
      },
      { validateStatus: () => true }
    );
    expect([400, 403]).toContain(convAttempt.status);
  });

  it('should allow reporting a fraudulent listing with targetType LISTING and valid reason', async () => {
    const reporter = await createTestUserSession({ onboard: true });
    const dummyListingId = 'a0000000-0000-0000-0000-000000000001';

    const reportRes = await reporter.client.post(
      '/safety/report',
      {
        targetType: 'LISTING',
        targetId: dummyListingId,
        reason: 'Prohibited Item / Counterfeit Goods',
        details: 'Listing claims to sell prohibited campus exam materials',
      },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(reportRes.status);
  });

  it('should prevent self-blocking: user cannot block themselves (400 Bad Request)', async () => {
    const user = await createTestUserSession({ onboard: true });

    const selfBlockRes = await user.client.post(
      '/safety/block',
      { blockedUserId: user.user.id },
      { validateStatus: () => true }
    );
    expect([400, 422]).toContain(selfBlockRes.status);
  });

  it('should enforce message length limits (rejecting messages > 2000 characters)', async () => {
    const user1 = await createTestUserSession({ onboard: true });
    const user2 = await createTestUserSession({ onboard: true });

    const cab = await user1.client.post('/cabs', createCabPayload({ totalSeats: 3, autoJoinEnabled: true }));
    await user2.client.post(`/cabs/${cab.data.id}/join`, { seatsRequested: 1 });

    const conv = await user1.client.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cab.data.id,
      recipientId: user2.user.id,
    });

    // Generate oversized message (> 2000 characters)
    const longMessage = 'A'.repeat(2500);
    const oversizedRes = await user1.client.post(
      `/chat/conversations/${conv.data.id}/messages`,
      { content: longMessage },
      { validateStatus: () => true }
    );
    expect([400, 422]).toContain(oversizedRes.status);
  });

  it('should handle idempotent unblocking gracefully when target is not currently blocked', async () => {
    const userA = await createTestUserSession({ onboard: true });
    const userB = await createTestUserSession({ onboard: true });

    // Attempt to unblock user who was never blocked
    const unblockRes = await userA.client.delete(
      `/safety/block/${userB.user.id}`,
      { validateStatus: () => true }
    );
    // Should return 200, 204 or 404 (handled gracefully without 500)
    expect([200, 204, 404]).toContain(unblockRes.status);
  });
});
