import { describe, it, expect } from 'vitest';
import FormData from 'form-data';
import { createTestUserSession } from '../helpers/authHelper';
import {
  createListingPayload,
  createMockImage,
  createCabPayload,
} from '../helpers/dataFactory';

describe('Tier 4: Scenario 4 - Harassment & Safety Flow (S4)', () => {
  it('should execute end-to-end harassment response: chat abuse -> report -> block -> message cutoff -> admin report audit -> user ban', async () => {
    // 1. Setup Victim (Student A), Rogue User (Student B), and Campus Admin
    const victim = await createTestUserSession({
      onboard: true,
      name: 'Priya Sharma',
      hostel: 'Hostel PG',
    });

    const rogueUser = await createTestUserSession({
      onboard: true,
      name: 'Rogue Student',
      hostel: 'Hostel J',
    });

    const admin = await createTestUserSession({
      role: 'ADMIN',
      onboard: true,
      name: 'Thapar Safety Officer',
    });

    // 2. Victim posts a listing for a scientific calculator
    const form = new FormData();
    const payload = createListingPayload({
      title: 'Casio Scientific Calculator FX-991EX',
      category: 'Calculator',
      price: 1200,
      hostel: 'Hostel PG',
    });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
    const img = createMockImage('calc.png');
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const listingRes = await victim.client.uploadMultipart(
      '/marketplace/listings',
      form
    );
    const listingId = listingRes.data.id;

    // 3. Rogue user initiates conversation and sends abusive messages
    const convRes = await rogueUser.client.post('/chat/conversations', {
      contextType: 'LISTING',
      contextId: listingId,
      recipientId: victim.user.id,
    });
    expect([200, 201]).toContain(convRes.status);
    const convId = convRes.data.id;

    const abusiveMsg = await rogueUser.client.post(
      `/chat/conversations/${convId}/messages`,
      { content: 'Give me this calculator for free right now or I will cause trouble at your hostel!' }
    );
    expect([200, 201]).toContain(abusiveMsg.status);

    // 4. Victim files formal safety report against Rogue User
    const reportRes = await victim.client.post(
      '/safety/report',
      {
        targetType: 'USER',
        targetId: rogueUser.user.id,
        reason: 'Harassment & Threatening Behavior',
        details: 'Sent threatening extortion message over marketplace chat.',
      },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(reportRes.status);

    // 5. Victim immediately blocks Rogue User
    const blockRes = await victim.client.post(
      '/safety/block',
      { blockedUserId: rogueUser.user.id },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(blockRes.status);

    // 6. Rogue user attempts to send follow-up message -> Must fail / be rejected
    const blockedMsgRes = await rogueUser.client.post(
      `/chat/conversations/${convId}/messages`,
      { content: 'Why did you stop replying?' },
      { validateStatus: () => true }
    );
    expect([400, 403]).toContain(blockedMsgRes.status);

    // 7. Admin reviews report queue and verifies reported harassment details
    const adminReportsRes = await admin.client.get('/admin/reports', {
      validateStatus: () => true,
    });
    expect(adminReportsRes.status).toBe(200);

    const reportList: any[] = Array.isArray(adminReportsRes.data)
      ? adminReportsRes.data
      : adminReportsRes.data?.content || [];

    const foundReport = reportList.find(
      (r: any) =>
        (r.targetId === rogueUser.user.id || r.target_id === rogueUser.user.id) &&
        (r.reporterId === victim.user.id || r.reporter_id === victim.user.id)
    );
    expect(foundReport).toBeDefined();

    // 8. Admin issues account ban against Rogue User
    const banRes = await admin.client.post(
      `/admin/users/${rogueUser.user.id}/ban`,
      {},
      { validateStatus: () => true }
    );
    expect([200, 204]).toContain(banRes.status);

    // 9. Rogue user is locked out: all protected calls return 401 or 403
    const lockedOutUserMe = await rogueUser.client.get('/users/me', {
      validateStatus: () => true,
    });
    expect([401, 403]).toContain(lockedOutUserMe.status);

    const lockedOutCabs = await rogueUser.client.get('/cabs', {
      validateStatus: () => true,
    });
    expect([401, 403]).toContain(lockedOutCabs.status);
  });

  it('should drop STOMP message delivery in real-time when recipient has blocked sender', async () => {
    const studentA = await createTestUserSession({ onboard: true });
    const studentB = await createTestUserSession({ onboard: true });

    // 1. Setup genuine context and conversation between studentA and studentB
    const cabRes = await studentA.client.post(
      '/cabs',
      createCabPayload({ totalSeats: 4, autoJoinEnabled: true })
    );
    const cabId = cabRes.data.id;

    const convRes = await studentA.client.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cabId,
      recipientId: studentB.user.id,
    });
    const convId = convRes.data.id;

    // 2. Connect studentA to STOMP and subscribe to the genuine conversation
    const studentAStomp = studentA.createStompClient();
    const studentBStomp = studentB.createStompClient();
    let receivedByA: any = null;

    try {
      await studentAStomp.connect();
      studentAStomp.subscribe(`/topic/conversation/${convId}`, (msg: any) => {
        receivedByA = msg;
      });

      // 3. StudentA blocks StudentB
      const blockRes = await studentA.client.post(
        '/safety/block',
        {
          blockedUserId: studentB.user.id,
        },
        { validateStatus: () => true }
      );
      expect([200, 201]).toContain(blockRes.status);

      // 4. StudentB connects to STOMP and sends message to the conversation
      await studentBStomp.connect();
      studentBStomp.sendChatMessage(
        convId,
        'Harassing message sent after being blocked'
      );

      // 5. Wait timeout and assert StudentA did not receive the message
      await new Promise((resolve) => setTimeout(resolve, 1500));

      expect(receivedByA).toBeNull();
    } finally {
      await Promise.allSettled([
        studentAStomp.disconnect().catch(() => {}),
        studentBStomp.disconnect().catch(() => {}),
      ]);
    }
  });
});
