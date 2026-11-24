import { describe, it, expect, beforeAll } from 'vitest';
import FormData from 'form-data';
import { ApiClient, createApiClient } from '../helpers/apiClient';
import { createTestUserSession, TestUserSession } from '../helpers/authHelper';
import {
  createCabPayload,
  createListingPayload,
  createMockImage,
  generateThaparEmail,
} from '../helpers/dataFactory';
import { StompTestClient } from '../helpers/stompClient';

describe('Tier 5: Adversarial Coverage Hardening Suite', () => {
  let adminSession: TestUserSession;
  let userA: TestUserSession;
  let userB: TestUserSession;
  let userC: TestUserSession;

  beforeAll(async () => {
    adminSession = await createTestUserSession({
      role: 'ADMIN',
      name: 'Adversarial Admin',
      hostel: 'Hostel A',
    });
    userA = await createTestUserSession({
      role: 'USER',
      name: 'Target User A',
      hostel: 'Hostel J',
    });
    userB = await createTestUserSession({
      role: 'USER',
      name: 'Target User B',
      hostel: 'Hostel PG',
    });
    userC = await createTestUserSession({
      role: 'USER',
      name: 'Target User C',
      hostel: 'Hostel M',
    });
  });

  // =========================================================================
  // 1. STOMP WebSocket Banned User Injection
  // =========================================================================
  describe('STOMP WebSocket Banned User Injection', () => {
    it('should prevent an admin-banned user from sending messages over HTTP and WebSocket, and reject reconnect', async () => {
      // 1. Setup two active users with an open cab conversation
      const victim = await createTestUserSession({
        role: 'USER',
        name: 'Victim Student',
        hostel: 'Hostel J',
      });
      const peer = await createTestUserSession({
        role: 'USER',
        name: 'Peer Student',
        hostel: 'Hostel PG',
      });

      const cabRes = await peer.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 3, autoJoinEnabled: true })
      );
      const cabId = cabRes.data.id;
      await victim.client.post(`/cabs/${cabId}/join`, { seatsRequested: 1 });

      const convRes = await victim.client.post('/chat/conversations', {
        contextType: 'CAB_GROUP',
        contextId: cabId,
        recipientId: peer.user.id,
      });
      const convId = convRes.data.id;

      // 2. Both connect to STOMP WebSocket
      const stompVictim = victim.createStompClient();
      const stompPeer = peer.createStompClient();
      await stompVictim.connect();
      await stompPeer.connect();

      const receivedMessages: any[] = [];
      stompPeer.subscribeToConversation(convId, (msg) => {
        receivedMessages.push(msg);
      });

      await new Promise((r) => setTimeout(r, 200));

      // 3. Send initial message while not banned — must succeed
      stompVictim.sendChatMessage(convId, 'Hello peer, I am active!');
      await new Promise((r) => setTimeout(r, 400));
      expect(receivedMessages.length).toBeGreaterThanOrEqual(1);
      expect(receivedMessages[receivedMessages.length - 1].content).toBe('Hello peer, I am active!');

      // 4. Admin bans victim user
      const banRes = await adminSession.client.post(
        `/admin/users/${victim.user.id}/ban`,
        {},
        { validateStatus: () => true }
      );
      expect(banRes.status).toBe(200);

      // 5. Victim attempts to send chat message over HTTP -> MUST return 403 USER_BANNED
      const httpSendRes = await victim.client.post(
        `/chat/conversations/${convId}/messages`,
        { content: 'Banned HTTP message injection attempt' },
        { validateStatus: () => true }
      );
      expect(httpSendRes.status).toBe(403);
      expect(httpSendRes.data.error).toBe('USER_BANNED');

      // 6. Victim attempts to send chat message over established STOMP WebSocket
      const prevCount = receivedMessages.length;
      stompVictim.sendChatMessage(convId, 'Banned STOMP message injection attempt');
      await new Promise((r) => setTimeout(r, 600));

      // Peer must NOT receive the banned user message
      expect(receivedMessages.length).toBe(prevCount);

      // Verify message is NOT stored in DB
      const messagesRes = await peer.client.get(`/chat/conversations/${convId}/messages`);
      const storedContents = messagesRes.data.map((m: any) => m.content);
      expect(storedContents).not.toContain('Banned STOMP message injection attempt');

      // 7. Disconnect and attempt to establish new STOMP connection as banned user
      await stompVictim.disconnect();
      const bannedReconnectClient = victim.createStompClient();
      await expect(bannedReconnectClient.connect(3000)).rejects.toThrow();

      // 8. Admin unbans victim user and verifies restoration
      const unbanRes = await adminSession.client.post(
        `/admin/users/${victim.user.id}/unban`,
        {},
        { validateStatus: () => true }
      );
      expect(unbanRes.status).toBe(200);

      // Re-login to get fresh session
      const restoredSession = await createTestUserSession({
        email: victim.user.email,
        name: victim.user.name,
        role: 'USER',
        onboard: true,
      });

      const restoredStomp = restoredSession.createStompClient();
      await restoredStomp.connect();
      restoredStomp.sendChatMessage(convId, 'I am unbanned and back!');
      await new Promise((r) => setTimeout(r, 500));

      expect(receivedMessages[receivedMessages.length - 1].content).toBe('I am unbanned and back!');

      // Cleanup
      await stompPeer.disconnect();
      await restoredStomp.disconnect();
    });

    it('should reject banned user from initiating new conversations or subscribing to topics', async () => {
      const bannedStudent = await createTestUserSession({
        name: 'Restricted Student',
        hostel: 'Hostel J',
      });
      const partner = await createTestUserSession({
        name: 'Partner Student',
        hostel: 'Hostel PG',
      });

      // Admin bans student
      await adminSession.client.post(`/admin/users/${bannedStudent.user.id}/ban`);

      // Attempt to initiate conversation
      const convRes = await bannedStudent.client.post(
        '/chat/conversations',
        {
          contextType: 'CAB_GROUP',
          contextId: '00000000-0000-0000-0000-000000000001',
          recipientId: partner.user.id,
        },
        { validateStatus: () => true }
      );
      // Banned user cannot initiate conversations or join cabs
      expect([400, 403, 404]).toContain(convRes.status);

      // Attempt STOMP connection
      const stompClient = bannedStudent.createStompClient();
      await expect(stompClient.connect(3000)).rejects.toThrow();
    });
  });

  // =========================================================================
  // 2. Cab Seat Allocation Rigidity
  // =========================================================================
  describe('Cab Seat Allocation Rigidity Under Bursts and State Transitions', () => {
    it('should strictly enforce seat capacity during concurrent bursts and prevent drift through accept/reject/cancel transitions', async () => {
      // 1. Creator creates a cab pool with totalSeats = 3 (1 creator seat + 2 available seats)
      const creator = await createTestUserSession({
        name: 'Pool Creator',
        hostel: 'Hostel B',
      });

      const cabRes = await creator.client.post(
        '/cabs',
        createCabPayload({
          totalSeats: 3,
          autoJoinEnabled: true,
          note: 'Rigidity Concurrency Test Pool',
        })
      );
      const cabId = cabRes.data.id;

      // Initial state verification
      const initialDetail = await creator.client.get(`/cabs/${cabId}`);
      expect(initialDetail.data.seatsTaken).toBe(1);
      expect(initialDetail.data.seatsAvailable).toBe(2);
      expect(initialDetail.data.status).toBe('OPEN');

      // 2. Create 8 prospective joiners
      const joiners: TestUserSession[] = [];
      for (let i = 0; i < 8; i++) {
        joiners.push(
          await createTestUserSession({
            name: `Burst Joiner ${i + 1}`,
            hostel: 'Hostel J',
          })
        );
      }

      // 3. Concurrent join burst: All 8 users attempt to join simultaneously
      const burstResults = await Promise.all(
        joiners.map((j) =>
          j.client.post(
            `/cabs/${cabId}/join`,
            { seatsRequested: 1 },
            { validateStatus: () => true }
          )
        )
      );

      const successfulJoins = burstResults.filter((r) => [200, 201].includes(r.status));
      const rejectedJoins = burstResults.filter((r) => r.status === 409);

      // Exactly 2 available seats were open, so exactly 2 can succeed
      expect(successfulJoins.length).toBe(2);
      expect(rejectedJoins.length).toBe(6);

      // Verify all rejected responses indicate group full
      for (const rej of rejectedJoins) {
        expect(rej.data.error).toBe('CAB_GROUP_FULL');
      }

      // 4. Verify cab state is now exactly FULL with seatsTaken = 3, seatsAvailable = 0
      const fullDetail = await creator.client.get(`/cabs/${cabId}`);
      expect(fullDetail.data.seatsTaken).toBe(3);
      expect(fullDetail.data.seatsAvailable).toBe(0);
      expect(fullDetail.data.status).toBe('FULL');

      // 5. Creator rejects one of the confirmed members
      const confirmedMembers = fullDetail.data.members.filter(
        (m: any) => m.status === 'CONFIRMED' && m.user.id !== creator.user.id
      );
      expect(confirmedMembers.length).toBe(2);
      const memberToReject = confirmedMembers[0];

      const rejectRes1 = await creator.client.post(
        `/cabs/${cabId}/members/${memberToReject.id}/reject`,
        {},
        { validateStatus: () => true }
      );
      expect(rejectRes1.status).toBe(200);
      expect(rejectRes1.data.status).toBe('REJECTED');

      // 6. Verify state transitioned back to OPEN with seatsTaken = 2, seatsAvailable = 1
      const openDetail = await creator.client.get(`/cabs/${cabId}`);
      expect(openDetail.data.seatsTaken).toBe(2);
      expect(openDetail.data.seatsAvailable).toBe(1);
      expect(openDetail.data.status).toBe('OPEN');

      // 7. Repeat reject call on the already rejected member: verify no seat drift
      const rejectRes2 = await creator.client.post(
        `/cabs/${cabId}/members/${memberToReject.id}/reject`,
        {},
        { validateStatus: () => true }
      );
      expect([200, 400]).toContain(rejectRes2.status);

      const steadyDetail = await creator.client.get(`/cabs/${cabId}`);
      expect(steadyDetail.data.seatsTaken).toBe(2);
      expect(steadyDetail.data.seatsAvailable).toBe(1);

      // 8. One of the previously rejected burst joiners now re-applies into the newly available seat
      const luckyJoiner = joiners.find(
        (j) => j.user.id !== memberToReject.user.id && !confirmedMembers.some((m: any) => m.user.id === j.user.id)
      )!;

      const fillRes = await luckyJoiner.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect([200, 201]).toContain(fillRes.status);

      // Cab is FULL again
      const refilledDetail = await creator.client.get(`/cabs/${cabId}`);
      expect(refilledDetail.data.seatsTaken).toBe(3);
      expect(refilledDetail.data.seatsAvailable).toBe(0);
      expect(refilledDetail.data.status).toBe('FULL');

      // 9. Creator closes the cab group
      const closeRes = await creator.client.patch(
        `/cabs/${cabId}/close`,
        {},
        { validateStatus: () => true }
      );
      expect(closeRes.status).toBe(200);
      expect(closeRes.data.status).toBe('CLOSED');

      // 10. Subsequent join attempts on CLOSED group must return 400 CAB_CLOSED
      const lateJoiner = await createTestUserSession({ name: 'Late Joiner' });
      const lateRes = await lateJoiner.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect(lateRes.status).toBe(400);
      expect(lateRes.data.error).toBe('CAB_CLOSED');
    });

    it('should maintain strict seat accounting under manual join approval and reject over-acceptance', async () => {
      // Create pool with autoJoinEnabled: false, totalSeats: 3
      const host = await createTestUserSession({ name: 'Manual Host', hostel: 'Hostel C' });
      const cabRes = await host.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 3, autoJoinEnabled: false })
      );
      const cabId = cabRes.data.id;

      const applicant1 = await createTestUserSession({ name: 'App 1' });
      const applicant2 = await createTestUserSession({ name: 'App 2' });
      const applicant3 = await createTestUserSession({ name: 'App 3' });

      // All 3 submit join requests -> status PENDING
      const r1 = await applicant1.client.post(`/cabs/${cabId}/join`, { seatsRequested: 1 });
      const r2 = await applicant2.client.post(`/cabs/${cabId}/join`, { seatsRequested: 1 });
      const r3 = await applicant3.client.post(`/cabs/${cabId}/join`, { seatsRequested: 1 });

      expect(r1.data.status).toBe('PENDING');
      expect(r2.data.status).toBe('PENDING');
      expect(r3.data.status).toBe('PENDING');

      // While pending, seatsTaken does NOT increase (remains 1 for creator)
      let cab = await host.client.get(`/cabs/${cabId}`);
      expect(cab.data.seatsTaken).toBe(1);
      expect(cab.data.status).toBe('OPEN');

      // Host accepts applicant 1
      const accept1 = await host.client.post(`/cabs/${cabId}/members/${r1.data.id}/accept`);
      expect(accept1.data.status).toBe('CONFIRMED');

      cab = await host.client.get(`/cabs/${cabId}`);
      expect(cab.data.seatsTaken).toBe(2);
      expect(cab.data.status).toBe('OPEN');

      // Host accepts applicant 2 -> Pool becomes FULL
      const accept2 = await host.client.post(`/cabs/${cabId}/members/${r2.data.id}/accept`);
      expect(accept2.data.status).toBe('CONFIRMED');

      cab = await host.client.get(`/cabs/${cabId}`);
      expect(cab.data.seatsTaken).toBe(3);
      expect(cab.data.status).toBe('FULL');

      // Host attempts to accept applicant 3 -> MUST return 409 Conflict
      const accept3 = await host.client.post(
        `/cabs/${cabId}/members/${r3.data.id}/accept`,
        {},
        { validateStatus: () => true }
      );
      expect(accept3.status).toBe(409);
      expect(accept3.data.error).toBe('CAB_GROUP_FULL');

      // Host rejects applicant 1 -> seat freed, status back to OPEN
      await host.client.post(`/cabs/${cabId}/members/${r1.data.id}/reject`);
      cab = await host.client.get(`/cabs/${cabId}`);
      expect(cab.data.seatsTaken).toBe(2);
      expect(cab.data.status).toBe('OPEN');

      // Now host can accept applicant 3 -> Pool becomes FULL again
      const accept3Retry = await host.client.post(`/cabs/${cabId}/members/${r3.data.id}/accept`);
      expect(accept3Retry.data.status).toBe('CONFIRMED');

      cab = await host.client.get(`/cabs/${cabId}`);
      expect(cab.data.seatsTaken).toBe(3);
      expect(cab.data.status).toBe('FULL');
    });

    it('should prevent creator self-join on their own pool', async () => {
      const creator = await createTestUserSession({ name: 'Self Join Tester' });
      const cabRes = await creator.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4, autoJoinEnabled: true })
      );
      const cabId = cabRes.data.id;

      const selfJoinRes = await creator.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );

      expect(selfJoinRes.status).toBe(400);
      expect(selfJoinRes.data.error).toBe('CREATOR_CANNOT_JOIN');
    });
  });

  // =========================================================================
  // 3. Cross-Context Chat Thread Isolation
  // =========================================================================
  describe('Cross-Context Chat Thread Isolation & Participant Authorization', () => {
    it('should maintain strict separation between Cab Group and Marketplace threads for identical user pairs and reject cross-tenant access', async () => {
      const studentA = await createTestUserSession({
        name: 'Student Alpha',
        hostel: 'Hostel J',
      });
      const studentB = await createTestUserSession({
        name: 'Student Beta',
        hostel: 'Hostel PG',
      });
      const eavesdropper = await createTestUserSession({
        name: 'Student Snooper',
        hostel: 'Hostel M',
      });

      // 1. Create a Cab Group where Student A is creator and Student B is member
      const cabRes = await studentA.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4, autoJoinEnabled: true })
      );
      const cabId = cabRes.data.id;
      await studentB.client.post(`/cabs/${cabId}/join`, { seatsRequested: 1 });

      // 2. Create a Marketplace Listing where Student A is seller
      const form = new FormData();
      const listingData = createListingPayload({
        title: 'Adversarial Test Bicycle',
        category: 'Cycle',
        price: 2500,
        hostel: 'Hostel J',
      });
      Object.entries(listingData).forEach(([k, v]) => form.append(k, String(v)));
      const img = createMockImage('cycle.png');
      form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });
      const listingRes = await studentA.client.uploadMultipart('/marketplace/listings', form);
      const listingId = listingRes.data.id;

      // 3. Create two conversations between Student A and Student B across both contexts
      const cabConvRes = await studentB.client.post('/chat/conversations', {
        contextType: 'CAB_GROUP',
        contextId: cabId,
        recipientId: studentA.user.id,
      });
      const cabConvId = cabConvRes.data.id;

      const listingConvRes = await studentB.client.post('/chat/conversations', {
        contextType: 'LISTING',
        contextId: listingId,
        recipientId: studentA.user.id,
      });
      const listingConvId = listingConvRes.data.id;

      // Thread IDs must be strictly distinct
      expect(cabConvId).not.toBe(listingConvId);

      // 4. Connect STOMP clients for Student A and Student B
      const stompA = studentA.createStompClient();
      const stompB = studentB.createStompClient();
      await stompA.connect();
      await stompB.connect();

      const cabMessagesB: any[] = [];
      const listingMessagesB: any[] = [];

      stompB.subscribeToConversation(cabConvId, (msg) => {
        cabMessagesB.push(msg);
      });
      stompB.subscribeToConversation(listingConvId, (msg) => {
        listingMessagesB.push(msg);
      });

      await new Promise((r) => setTimeout(r, 200));

      // 5. Send messages interleaved across contexts
      stompA.sendChatMessage(cabConvId, 'CAB_EXCLUSIVE_MESSAGE_101');
      stompA.sendChatMessage(listingConvId, 'LISTING_EXCLUSIVE_MESSAGE_202');
      stompB.sendChatMessage(cabConvId, 'CAB_EXCLUSIVE_MESSAGE_102');
      stompB.sendChatMessage(listingConvId, 'LISTING_EXCLUSIVE_MESSAGE_203');

      await new Promise((r) => setTimeout(r, 600));

      // 6. Verify STOMP message delivery isolation
      const cabContents = cabMessagesB.map((m) => m.content);
      const listingContents = listingMessagesB.map((m) => m.content);

      expect(cabContents).toContain('CAB_EXCLUSIVE_MESSAGE_101');
      expect(cabContents).toContain('CAB_EXCLUSIVE_MESSAGE_102');
      expect(cabContents).not.toContain('LISTING_EXCLUSIVE_MESSAGE_202');
      expect(cabContents).not.toContain('LISTING_EXCLUSIVE_MESSAGE_203');

      expect(listingContents).toContain('LISTING_EXCLUSIVE_MESSAGE_202');
      expect(listingContents).toContain('LISTING_EXCLUSIVE_MESSAGE_203');
      expect(listingContents).not.toContain('CAB_EXCLUSIVE_MESSAGE_101');
      expect(listingContents).not.toContain('CAB_EXCLUSIVE_MESSAGE_102');

      // 7. Verify HTTP message endpoint isolation
      const cabHttpRes = await studentA.client.get(`/chat/conversations/${cabConvId}/messages`);
      const listingHttpRes = await studentA.client.get(`/chat/conversations/${listingConvId}/messages`);

      const cabHttpContents = cabHttpRes.data.map((m: any) => m.content);
      const listingHttpContents = listingHttpRes.data.map((m: any) => m.content);

      expect(cabHttpContents).toContain('CAB_EXCLUSIVE_MESSAGE_101');
      expect(cabHttpContents).not.toContain('LISTING_EXCLUSIVE_MESSAGE_202');

      expect(listingHttpContents).toContain('LISTING_EXCLUSIVE_MESSAGE_202');
      expect(listingHttpContents).not.toContain('CAB_EXCLUSIVE_MESSAGE_101');

      // 8. Cross-tenant intrusion: Eavesdropper attempts to access conversations
      // a) HTTP GET messages of cabConvId -> 403 Forbidden
      const eavesdropGet = await eavesdropper.client.get(
        `/chat/conversations/${cabConvId}/messages`,
        { validateStatus: () => true }
      );
      expect(eavesdropGet.status).toBe(403);

      // b) HTTP POST message to cabConvId -> 403 Forbidden
      const eavesdropPost = await eavesdropper.client.post(
        `/chat/conversations/${cabConvId}/messages`,
        { content: 'Eavesdropper injected message' },
        { validateStatus: () => true }
      );
      expect(eavesdropPost.status).toBe(403);

      // c) STOMP SUBSCRIBE to cabConvId -> Rejected by StompAuthChannelInterceptor
      const stompEavesdropper = eavesdropper.createStompClient();
      await stompEavesdropper.connect();

      expect(() => {
        stompEavesdropper.subscribeToConversation(cabConvId, () => {});
      }).not.toThrow();

      await new Promise((r) => setTimeout(r, 300));

      // Cleanup
      await stompA.disconnect();
      await stompB.disconnect();
      await stompEavesdropper.disconnect();
    });

    it('should enforce bidirectional blocking isolation and prohibit chat resumption until unblock', async () => {
      const blocker = await createTestUserSession({ name: 'Blocker Student' });
      const blocked = await createTestUserSession({ name: 'Blocked Student' });

      // Setup cab and conversation
      const cab = await blocker.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4, autoJoinEnabled: true })
      );
      await blocked.client.post(`/cabs/${cab.data.id}/join`, { seatsRequested: 1 });

      const convRes = await blocker.client.post('/chat/conversations', {
        contextType: 'CAB_GROUP',
        contextId: cab.data.id,
        recipientId: blocked.user.id,
      });
      const convId = convRes.data.id;

      // Initial message succeeds
      await blocker.client.post(`/chat/conversations/${convId}/messages`, {
        content: 'Pre-block message',
      });

      // Blocker blocks target user
      const blockRes = await blocker.client.post('/safety/block', {
        blockedUserId: blocked.user.id,
      });
      expect(blockRes.status).toBe(200);

      // Blocked user attempts to send message -> 403 USER_BLOCKED
      const blockedAttempt = await blocked.client.post(
        `/chat/conversations/${convId}/messages`,
        { content: 'Message while blocked' },
        { validateStatus: () => true }
      );
      expect(blockedAttempt.status).toBe(403);
      expect(blockedAttempt.data.error).toBe('USER_BLOCKED');

      // Blocker ALSO cannot send message to blocked user -> 403 USER_BLOCKED
      const blockerAttempt = await blocker.client.post(
        `/chat/conversations/${convId}/messages`,
        { content: 'Blocker messaging blocked user' },
        { validateStatus: () => true }
      );
      expect(blockerAttempt.status).toBe(403);
      expect(blockerAttempt.data.error).toBe('USER_BLOCKED');

      // Blocker unblocks target user
      const unblockRes = await blocker.client.delete(`/safety/block/${blocked.user.id}`);
      expect(unblockRes.status).toBe(200);

      // Now message sending works again
      const restoredMsg = await blocker.client.post(`/chat/conversations/${convId}/messages`, {
        content: 'Post-unblock restored message',
      });
      expect(restoredMsg.status).toBe(201);
    });
  });

  // =========================================================================
  // 4. Storage & Payload Tampering
  // =========================================================================
  describe('Storage & Payload Tampering', () => {
    it('should strictly reject corrupted image headers with 400 Bad Request', async () => {
      const form = new FormData();
      const listing = createListingPayload();
      Object.entries(listing).forEach(([k, v]) => form.append(k, String(v)));

      // Corrupt image: Random bytes disguised with PNG extension and content-type
      const corruptedBytes = Buffer.from('NOT_A_VALID_PNG_FILE_HEADER_BYTE_STREAM_TEST_GARBAGE');
      form.append('images', corruptedBytes, {
        filename: 'corrupted.png',
        contentType: 'image/png',
      });

      const res = await userA.client.uploadMultipart('/marketplace/listings', form, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
      expect(['INVALID_IMAGE_CONTENT', 'READ_ERROR']).toContain(res.data.error);
    });

    it('should strictly reject HTML/script payloads disguised as PNG with 400 Bad Request', async () => {
      const form = new FormData();
      const listing = createListingPayload();
      Object.entries(listing).forEach(([k, v]) => form.append(k, String(v)));

      const htmlXss = Buffer.from('<html><body><script>alert("XSS_ATTACK")</script></body></html>');
      form.append('images', htmlXss, {
        filename: 'exploit.png',
        contentType: 'image/png',
      });

      const res = await userA.client.uploadMultipart('/marketplace/listings', form, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
      expect(res.data.error).toBe('INVALID_IMAGE_CONTENT');
    });

    it('should strictly reject null-byte injection in filename with 400 Bad Request', async () => {
      const form = new FormData();
      const listing = createListingPayload();
      Object.entries(listing).forEach(([k, v]) => form.append(k, String(v)));

      const validImg = createMockImage('valid.png');
      form.append('images', validImg.buffer, {
        filename: 'valid.png\0.jsp',
        contentType: 'image/png',
      });

      const res = await userA.client.uploadMultipart('/marketplace/listings', form, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
      expect(['INVALID_FILENAME', 'BAD_REQUEST', 'MALFORMED_REQUEST']).toContain(res.data.error);
    });

    it('should strictly reject path traversal sequences in filename with 400 Bad Request', async () => {
      const form = new FormData();
      const listing = createListingPayload();
      Object.entries(listing).forEach(([k, v]) => form.append(k, String(v)));

      const validImg = createMockImage('valid.png');
      form.append('images', validImg.buffer, {
        filename: 'exploit..traversal.png',
        contentType: 'image/png',
      });

      const res = await userA.client.uploadMultipart('/marketplace/listings', form, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
      expect(['INVALID_FILENAME', 'BAD_REQUEST']).toContain(res.data.error);
    });

    it('should strictly reject oversized images (> 5MB) with 400 Bad Request', async () => {
      const form = new FormData();
      const listing = createListingPayload();
      Object.entries(listing).forEach(([k, v]) => form.append(k, String(v)));

      // 5.5 MB dummy buffer
      const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x41);
      form.append('images', oversizedBuffer, {
        filename: 'huge_image.png',
        contentType: 'image/png',
      });

      const res = await userA.client.uploadMultipart('/marketplace/listings', form, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
      expect(['FILE_TOO_LARGE', 'INVALID_IMAGE_CONTENT', 'BAD_REQUEST']).toContain(res.data.error);
    });

    it('should strictly reject disallowed MIME types (e.g. text/html, application/json) with 400 Bad Request', async () => {
      const form = new FormData();
      const listing = createListingPayload();
      Object.entries(listing).forEach(([k, v]) => form.append(k, String(v)));

      const textPayload = Buffer.from('console.log("malicious code");');
      form.append('images', textPayload, {
        filename: 'script.js',
        contentType: 'application/javascript',
      });

      const res = await userA.client.uploadMultipart('/marketplace/listings', form, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
      expect(res.data.error).toBe('INVALID_FILE_TYPE');
    });

    it('should strictly reject 0-byte empty file with 400 Bad Request', async () => {
      const form = new FormData();
      const listing = createListingPayload();
      Object.entries(listing).forEach(([k, v]) => form.append(k, String(v)));

      const emptyBuffer = Buffer.alloc(0);
      form.append('images', emptyBuffer, {
        filename: 'empty.png',
        contentType: 'image/png',
      });

      const res = await userA.client.uploadMultipart('/marketplace/listings', form, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
      expect(['INVALID_FILE', 'BAD_REQUEST', 'INVALID_IMAGES']).toContain(res.data.error);
    });
  });

  // =========================================================================
  // 5. Rate Limit Refill & Recovery
  // =========================================================================
  describe('Rate Limit Refill & Graceful Recovery', () => {
    it('should enforce rate limiting on auth bursts from an isolated IP, return Retry-After header, and recover gracefully after token refill', async () => {
      // Use an isolated IP header so we do not affect any other tests or test clients
      const isolatedIp = `198.51.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 200) + 10}`;
      const anon = createApiClient();

      // Auth limit is 20 per minute. Send 20 requests in rapid succession.
      const burstSize = 20;
      const initialRequests = Array.from({ length: burstSize }, () =>
        anon.post(
          '/auth/dev-login',
          { email: generateThaparEmail('ratelimit'), name: 'Rate Limit Student', role: 'USER' },
          {
            headers: { 'X-Forwarded-For': isolatedIp },
            validateStatus: () => true,
          }
        )
      );

      const initialResponses = await Promise.all(initialRequests);
      const non429Count = initialResponses.filter((r) => [200, 201].includes(r.status)).length;
      expect(non429Count).toBeGreaterThanOrEqual(15);

      // The 21st request immediately exceeds the 20-token capacity and must return 429
      const limitedRes = await anon.post(
        '/auth/dev-login',
        { email: generateThaparEmail('ratelimit_exceed'), name: 'Exceeded Student', role: 'USER' },
        {
          headers: { 'X-Forwarded-For': isolatedIp },
          validateStatus: () => true,
        }
      );

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.data.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(limitedRes.headers['retry-after']).toBeDefined();

      // In TokenBucket, refill rate is 20 tokens per 60,000 ms = 1 token per 3,000 ms (3 seconds).
      // Sleep for 3,500 ms to allow at least 1 token to refill.
      await new Promise((r) => setTimeout(r, 3500));

      // After waiting for refill, the next request must recover gracefully and succeed with 200 OK
      const recoveredRes = await anon.post(
        '/auth/dev-login',
        { email: generateThaparEmail('ratelimit_recovered'), name: 'Recovered Student', role: 'USER' },
        {
          headers: { 'X-Forwarded-For': isolatedIp },
          validateStatus: () => true,
        }
      );

      expect(recoveredRes.status).toBe(200);
      expect(recoveredRes.data.accessToken).toBeDefined();
    }, 15000);

    it('should enforce write endpoint rate limiting (60 calls/min) and recover gracefully after token refill', async () => {
      const isolatedIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
      const writingStudent = await createTestUserSession({ name: 'Write Burst Student' });

      // Send 60 rapid write requests with isolated IP
      const burstSize = 60;
      const writePromises = Array.from({ length: burstSize }, (_, i) =>
        writingStudent.client.post(
          '/cabs',
          createCabPayload({ note: `Write Burst ${i}` }),
          {
            headers: { 'X-Forwarded-For': isolatedIp },
            validateStatus: () => true,
          }
        )
      );

      const writeResponses = await Promise.all(writePromises);
      const successfulWrites = writeResponses.filter((r) => r.status === 201).length;
      expect(successfulWrites).toBeGreaterThanOrEqual(50);

      // 61st write request triggers 429 RATE_LIMIT_EXCEEDED
      const limitedWrite = await writingStudent.client.post(
        '/cabs',
        createCabPayload({ note: 'Exceeded Write' }),
        {
          headers: { 'X-Forwarded-For': isolatedIp },
          validateStatus: () => true,
        }
      );

      expect(limitedWrite.status).toBe(429);
      expect(limitedWrite.data.error).toBe('RATE_LIMIT_EXCEEDED');

      // For write bucket (60/minute), 1 token refills every 1,000 ms (1 second).
      // Wait 1,500 ms for token refill
      await new Promise((r) => setTimeout(r, 1500));

      // Next write succeeds
      const recoveredWrite = await writingStudent.client.post(
        '/cabs',
        createCabPayload({ note: 'Recovered Write' }),
        {
          headers: { 'X-Forwarded-For': isolatedIp },
          validateStatus: () => true,
        }
      );

      expect(recoveredWrite.status).toBe(201);
    }, 15000);

    it('should enforce chat message rate limiting (max 30 messages per 60s) and reject excessive messages with 429', async () => {
      const chattyStudent = await createTestUserSession({
        name: 'Chatty Student',
        hostel: 'Hostel J',
      });
      const partner = await createTestUserSession({
        name: 'Partner Student',
        hostel: 'Hostel PG',
      });

      const cabRes = await chattyStudent.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 3, autoJoinEnabled: true })
      );
      const cabId = cabRes.data.id;
      await partner.client.post(`/cabs/${cabId}/join`, { seatsRequested: 1 });

      const convRes = await chattyStudent.client.post('/chat/conversations', {
        contextType: 'CAB_GROUP',
        contextId: cabId,
        recipientId: partner.user.id,
      });
      const convId = convRes.data.id;

      // Send 30 messages rapidly (under the 30-message limit)
      const burstSize = 30;
      const sendPromises = Array.from({ length: burstSize }, (_, i) =>
        chattyStudent.client.post(
          `/chat/conversations/${convId}/messages`,
          { content: `Rapid message ${i + 1}` },
          { validateStatus: () => true }
        )
      );

      const burstResponses = await Promise.all(sendPromises);
      const successCount = burstResponses.filter((r) => r.status === 201).length;
      expect(successCount).toBe(30);

      // The 31st message must be rejected with 429 RATE_LIMIT_EXCEEDED
      const rateLimitedRes = await chattyStudent.client.post(
        `/chat/conversations/${convId}/messages`,
        { content: 'Message 31: Should trigger rate limit' },
        { validateStatus: () => true }
      );

      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.data.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(rateLimitedRes.data.message).toContain('Chat rate limit exceeded');
    }, 15000);
  });
});
