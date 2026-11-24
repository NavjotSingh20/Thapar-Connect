import { describe, it, expect } from 'vitest';
import FormData from 'form-data';
import { createTestUserSession } from '../helpers/authHelper';
import {
  createCabPayload,
  createListingPayload,
  createMockImage,
} from '../helpers/dataFactory';

describe('Tier 4: Scenario 7 - Dual Context Chat Thread Isolation (S7)', () => {
  it('should maintain strict message isolation between two concurrent conversations for the same pair of students under different contexts', async () => {
    // 1. Setup Student 1 (Aman) and Student 2 (Bhavna)
    const aman = await createTestUserSession({
      onboard: true,
      name: 'Aman Deep',
      hostel: 'Hostel J',
    });

    const bhavna = await createTestUserSession({
      onboard: true,
      name: 'Bhavna Sharma',
      hostel: 'Hostel PG',
    });

    // 2. Aman posts a Cab Group to Chandigarh Airport
    const cabRes = await aman.client.post(
      '/cabs',
      createCabPayload({
        totalSeats: 3,
        autoJoinEnabled: true,
        note: 'Weekend ride to Chandigarh',
      })
    );
    const cabId = cabRes.data.id;
    await bhavna.client.post(`/cabs/${cabId}/join`, { seatsRequested: 1 });

    // 3. Aman also posts a Marketplace Listing for a scientific calculator
    const form = new FormData();
    const payload = createListingPayload({
      title: 'Casio FX-991EX ClassWiz Calculator',
      category: 'Calculator',
      price: 1500,
      hostel: 'Hostel J',
    });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
    const img = createMockImage('casio.png');
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const listingRes = await aman.client.uploadMultipart('/marketplace/listings', form);
    const listingId = listingRes.data.id;

    // 4. Bhavna initiates Conversation 1 under CAB_GROUP context
    const cabConvRes = await bhavna.client.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cabId,
      recipientId: aman.user.id,
    });
    expect([200, 201]).toContain(cabConvRes.status);
    const cabConvId = cabConvRes.data.id;

    // 5. Bhavna initiates Conversation 2 under LISTING context with the same user (Aman)
    const listingConvRes = await bhavna.client.post('/chat/conversations', {
      contextType: 'LISTING',
      contextId: listingId,
      recipientId: aman.user.id,
    });
    expect([200, 201]).toContain(listingConvRes.status);
    const listingConvId = listingConvRes.data.id;

    // Invariant: Two completely distinct conversation IDs for the same pair of users
    expect(cabConvId).not.toBe(listingConvId);

    // 6. Aman sends a message in the CAB thread
    const cabMsgText = 'Leaving Patiala at sharp 3:00 PM tomorrow. Please be at Gate 1.';
    const cabMsgRes = await aman.client.post(
      `/chat/conversations/${cabConvId}/messages`,
      { content: cabMsgText }
    );
    expect([200, 201]).toContain(cabMsgRes.status);

    // 7. Bhavna sends a message in the LISTING thread
    const listingMsgText = 'Does the calculator include the original protective hard cover?';
    const listingMsgRes = await bhavna.client.post(
      `/chat/conversations/${listingConvId}/messages`,
      { content: listingMsgText }
    );
    expect([200, 201]).toContain(listingMsgRes.status);

    // 8. Invariant Check: Verify CAB thread messages contain ONLY cab messages
    const cabMessagesRes = await bhavna.client.get(
      `/chat/conversations/${cabConvId}/messages`
    );
    expect(cabMessagesRes.status).toBe(200);
    const cabMsgs: any[] = Array.isArray(cabMessagesRes.data)
      ? cabMessagesRes.data
      : cabMessagesRes.data?.content || [];

    expect(cabMsgs.some((m: any) => m.content === cabMsgText)).toBe(true);
    expect(cabMsgs.some((m: any) => m.content === listingMsgText)).toBe(false);

    // 9. Invariant Check: Verify LISTING thread messages contain ONLY listing messages
    const listingMessagesRes = await aman.client.get(
      `/chat/conversations/${listingConvId}/messages`
    );
    expect(listingMessagesRes.status).toBe(200);
    const listingMsgs: any[] = Array.isArray(listingMessagesRes.data)
      ? listingMessagesRes.data
      : listingMessagesRes.data?.content || [];

    expect(listingMsgs.some((m: any) => m.content === listingMsgText)).toBe(true);
    expect(listingMsgs.some((m: any) => m.content === cabMsgText)).toBe(false);

    // 10. Invariant Check: Unified Inbox shows BOTH conversations as distinct entries
    const inboxRes = await bhavna.client.get('/chat/conversations');
    expect(inboxRes.status).toBe(200);
    const inboxThreads: any[] = Array.isArray(inboxRes.data)
      ? inboxRes.data
      : inboxRes.data?.content || [];

    const foundCabThread = inboxThreads.find((t: any) => t.id === cabConvId);
    const foundListingThread = inboxThreads.find((t: any) => t.id === listingConvId);

    expect(foundCabThread).toBeDefined();
    expect(foundListingThread).toBeDefined();

    // Verify respective context types are correctly annotated in inbox
    expect(
      foundCabThread.contextType || foundCabThread.context?.type
    ).toBe('CAB_GROUP');
    expect(
      foundListingThread.contextType || foundListingThread.context?.type
    ).toBe('LISTING');
  });

  it('should verify STOMP real-time message delivery does not bleed across topic subscriptions', async () => {
    const userA = await createTestUserSession({ onboard: true });
    const userB = await createTestUserSession({ onboard: true });

    // Create 2 cab groups to obtain 2 distinct conversation threads
    const cab1 = await userA.client.post('/cabs', createCabPayload({ autoJoinEnabled: true }));
    const cab2 = await userA.client.post('/cabs', createCabPayload({ autoJoinEnabled: true }));

    await userB.client.post(`/cabs/${cab1.data.id}/join`, { seatsRequested: 1 });
    await userB.client.post(`/cabs/${cab2.data.id}/join`, { seatsRequested: 1 });

    const conv1 = await userB.client.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cab1.data.id,
      recipientId: userA.user.id,
    });
    const conv2 = await userB.client.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cab2.data.id,
      recipientId: userA.user.id,
    });

    const stompA = userA.createStompClient();
    const stompB = userB.createStompClient();

    try {
      await Promise.all([stompA.connect(), stompB.connect()]);

      let conv2ReceivedBleed = false;

      // Subscribe to conv2
      stompA.subscribe(`/topic/conversation/${conv2.data.id}`, (msg: any) => {
        if (msg.content === 'Message strictly for Conv 1') {
          conv2ReceivedBleed = true;
        }
      });

      // Send to conv1
      stompB.sendChatMessage(conv1.data.id, 'Message strictly for Conv 1');

      // Wait brief window to verify no bleed
      await new Promise((r) => setTimeout(r, 500));
      expect(conv2ReceivedBleed).toBe(false);
    } finally {
      await Promise.all([
        stompA.disconnect().catch(() => {}),
        stompB.disconnect().catch(() => {}),
      ]);
    }
  });
});
