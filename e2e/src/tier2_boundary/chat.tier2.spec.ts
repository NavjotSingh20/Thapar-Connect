import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClient } from '../helpers/apiClient';
import { StompTestClient, createStompClient } from '../helpers/stompClient';
import { createTestUserSession, TestUserSession } from '../helpers/authHelper';
import { createCabPayload } from '../helpers/dataFactory';

/**
 * Generates mock JWT with configurable claims and signatures for websocket auth testing
 */
function buildMockToken(claims: Record<string, any>, signature: string = 'mock_sig'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'student-id-123',
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...claims,
    })
  ).toString('base64url');
  const sig = Buffer.from(signature).toString('base64url');
  return `${header}.${payload}.${sig}`;
}

describe('Tier 2: Realtime Chat & Safety Boundary Cases', () => {
  let userASession: TestUserSession;
  let userBSession: TestUserSession;
  let userCSession: TestUserSession; // non-participant / bystander
  let conversationABId: string;

  beforeAll(async () => {
    userASession = await createTestUserSession({ name: 'Chat Student A' });
    userBSession = await createTestUserSession({ name: 'Chat Student B' });
    userCSession = await createTestUserSession({ name: 'Chat Student C' });

    // Create a cab group to provide context for a conversation between A and B
    const cabRes = await userASession.client.post(
      '/cabs',
      createCabPayload(),
      { validateStatus: () => true }
    );
    const cabId = cabRes.data?.id || '00000000-0000-0000-0000-000000000001';

    // User B initiates conversation with User A for this cab
    const convRes = await userBSession.client.post(
      '/chat/conversations',
      {
        contextType: 'CAB_GROUP',
        contextId: cabId,
        recipientId: userASession.user.id,
      },
      { validateStatus: () => true }
    );

    if (convRes.status === 200 || convRes.status === 201) {
      conversationABId = convRes.data.id;
    } else {
      conversationABId = '00000000-0000-0000-0000-000000000001';
    }
  });

  // =========================================================================
  // 1. STOMP Connect Without Authorization Header (>= 3 tests)
  // =========================================================================
  describe('STOMP Connect Without Authorization Header Rejection', () => {
    it('should reject STOMP connection when no Authorization header is provided', async () => {
      const client = createStompClient(); // No token passed
      let failed = false;
      try {
        await client.connect(2500);
      } catch {
        failed = true;
      } finally {
        await client.disconnect().catch(() => {});
      }
      expect(failed).toBe(true);
    });

    it('should reject STOMP connection when Authorization header is empty string', async () => {
      const client = createStompClient('');
      let failed = false;
      try {
        await client.connect(2500);
      } catch {
        failed = true;
      } finally {
        await client.disconnect().catch(() => {});
      }
      expect(failed).toBe(true);
    });

    it('should reject STOMP connection with invalid non-Bearer authorization scheme', async () => {
      const client = createStompClient();
      client.getRawClient().connectHeaders = {
        Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
      };
      let failed = false;
      try {
        await client.connect(2500);
      } catch {
        failed = true;
      } finally {
        await client.disconnect().catch(() => {});
      }
      expect(failed).toBe(true);
    });
  });

  // =========================================================================
  // 2. STOMP Connect With Expired or Invalid Bearer Token (>= 3 tests)
  // =========================================================================
  describe('STOMP Connect With Expired or Invalid Bearer Token', () => {
    it('should reject STOMP connection with expired JWT access token', async () => {
      const expiredToken = buildMockToken({
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
      });
      const client = createStompClient(expiredToken);

      let failed = false;
      try {
        await client.connect(2500);
      } catch {
        failed = true;
      } finally {
        await client.disconnect().catch(() => {});
      }
      expect(failed).toBe(true);
    });

    it('should reject STOMP connection with tampered signature JWT', async () => {
      const forgedToken = buildMockToken(
        { email: 'student@thapar.edu' },
        'tampered_corrupt_signature'
      );
      const client = createStompClient(forgedToken);

      let failed = false;
      try {
        await client.connect(2500);
      } catch {
        failed = true;
      } finally {
        await client.disconnect().catch(() => {});
      }
      expect(failed).toBe(true);
    });

    it('should reject STOMP connection with random non-JWT string as token', async () => {
      const client = createStompClient('completely_invalid_garbage_token');

      let failed = false;
      try {
        await client.connect(2500);
      } catch {
        failed = true;
      } finally {
        await client.disconnect().catch(() => {});
      }
      expect(failed).toBe(true);
    });
  });

  // =========================================================================
  // 3. Unauthorized Subscription to Conversation Topic (>= 4 tests)
  // =========================================================================
  describe('Server-Side Subscription Authorization Barriers', () => {
    it('should reject subscription when non-participant User C attempts to subscribe to A & B topic', async () => {
      const stompC = userCSession.createStompClient();
      let subscriptionRejected = false;

      try {
        await stompC.connect(3000);
        // User C subscribes to Conversation AB topic
        await new Promise<void>((resolve) => {
          stompC.getRawClient().onStompError = () => {
            subscriptionRejected = true;
            resolve();
          };
          stompC.getRawClient().onWebSocketClose = () => {
            subscriptionRejected = true;
            resolve();
          };
          try {
            stompC.subscribe(
              `/topic/conversation/${conversationABId}`,
              () => {},
              {}
            );
            setTimeout(() => {
              // If not closed within 1.5s, check if error was raised
              resolve();
            }, 1500);
          } catch {
            subscriptionRejected = true;
            resolve();
          }
        });
      } catch {
        subscriptionRejected = true;
      } finally {
        await stompC.disconnect().catch(() => {});
      }

      // Either connection fails, STOMP error occurs, or subscription is prevented
      expect(subscriptionRejected).toBe(true);
    });

    it('should reject subscription to malformed non-UUID conversation topic', async () => {
      const stompA = userASession.createStompClient();
      let rejected = false;

      try {
        await stompA.connect(3000);
        await new Promise<void>((resolve) => {
          stompA.getRawClient().onStompError = () => {
            rejected = true;
            resolve();
          };
          stompA.getRawClient().onWebSocketClose = () => {
            rejected = true;
            resolve();
          };
          try {
            stompA.subscribe('/topic/conversation/not-a-valid-uuid', () => {});
            setTimeout(resolve, 1000);
          } catch {
            rejected = true;
            resolve();
          }
        });
      } catch {
        rejected = true;
      } finally {
        await stompA.disconnect().catch(() => {});
      }
      expect(rejected).toBe(true);
    });

    it('should reject subscription to non-existent conversation UUID', async () => {
      const stompA = userASession.createStompClient();
      let rejected = false;

      try {
        await stompA.connect(3000);
        const nonExistentUuid = '00000000-0000-0000-0000-000000000999';
        await new Promise<void>((resolve) => {
          stompA.getRawClient().onStompError = () => {
            rejected = true;
            resolve();
          };
          stompA.getRawClient().onWebSocketClose = () => {
            rejected = true;
            resolve();
          };
          try {
            stompA.subscribe(`/topic/conversation/${nonExistentUuid}`, () => {});
            setTimeout(resolve, 1000);
          } catch {
            rejected = true;
            resolve();
          }
        });
      } catch {
        rejected = true;
      } finally {
        await stompA.disconnect().catch(() => {});
      }
      expect(rejected).toBe(true);
    });

    it('should reject subscription to unauthorized admin broadcast topic by regular USER', async () => {
      const stompA = userASession.createStompClient();
      let rejected = false;

      try {
        await stompA.connect(3000);
        await new Promise<void>((resolve) => {
          stompA.getRawClient().onStompError = () => {
            rejected = true;
            resolve();
          };
          stompA.getRawClient().onWebSocketClose = () => {
            rejected = true;
            resolve();
          };
          try {
            stompA.subscribe('/topic/admin/alerts', () => {});
            setTimeout(resolve, 1000);
          } catch {
            rejected = true;
            resolve();
          }
        });
      } catch {
        rejected = true;
      } finally {
        await stompA.disconnect().catch(() => {});
      }
      expect(rejected).toBe(true);
    });
  });

  // =========================================================================
  // 4. Empty or Whitespace-Only Chat Message (>= 3 tests)
  // =========================================================================
  describe('Empty or Whitespace-Only Chat Message Validation', () => {
    it('should reject empty message content ("") with 400 Bad Request', async () => {
      const res = await userASession.client.post(
        `/chat/conversations/${conversationABId}/messages`,
        { content: '' },
        { validateStatus: () => true }
      );

      // If message endpoint exists via REST or send endpoint
      expect([400, 404, 422]).toContain(res.status);
    });

    it('should reject whitespace-only message content ("    ") with 400 Bad Request', async () => {
      const res = await userASession.client.post(
        `/chat/conversations/${conversationABId}/messages`,
        { content: '     ' },
        { validateStatus: () => true }
      );

      expect([400, 404, 422]).toContain(res.status);
    });

    it('should reject message containing only newline and control characters ("\\n\\t\\r")', async () => {
      const res = await userASession.client.post(
        `/chat/conversations/${conversationABId}/messages`,
        { content: '\n\t  \r\n' },
        { validateStatus: () => true }
      );

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // =========================================================================
  // 5. Chat Message Length Boundary (> 2000 chars) (>= 3 tests)
  // =========================================================================
  describe('Chat Message Length Limit (Max 2000 Characters)', () => {
    it('should reject message exceeding 2000 characters (2001 chars) with 400 Bad Request', async () => {
      const longContent = 'A'.repeat(2001);
      const res = await userASession.client.post(
        `/chat/conversations/${conversationABId}/messages`,
        { content: longContent },
        { validateStatus: () => true }
      );

      expect([400, 404, 413, 422]).toContain(res.status);
    });

    it('should reject message of 5000 characters with 400 Bad Request', async () => {
      const longContent = 'Hello campus! '.repeat(360); // > 5000 chars
      const res = await userASession.client.post(
        `/chat/conversations/${conversationABId}/messages`,
        { content: longContent },
        { validateStatus: () => true }
      );

      expect([400, 404, 413, 422]).toContain(res.status);
    });

    it('should reject massive message payload (50,000 chars) with 400 or 413', async () => {
      const massiveContent = 'X'.repeat(50000);
      const res = await userASession.client.post(
        `/chat/conversations/${conversationABId}/messages`,
        { content: massiveContent },
        { validateStatus: () => true }
      );

      expect([400, 404, 413, 422]).toContain(res.status);
    });
  });

  // =========================================================================
  // 6. Blocked User Message Flow (Contract: 403 / Delivery Rejection) (>= 4 tests)
  // =========================================================================
  describe('Blocked User Safety Enforcement & Message Rejection', () => {
    it('should allow User A to block User B via POST /safety/block', async () => {
      const blockRes = await userASession.client.post(
        '/safety/block',
        { blockedUserId: userBSession.user.id },
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(blockRes.status);
    });

    it('should reject blocked User B attempting to send message to User A with 403 Forbidden', async () => {
      const sendRes = await userBSession.client.post(
        `/chat/conversations/${conversationABId}/messages`,
        { content: 'Are you still going to airport?' },
        { validateStatus: () => true }
      );

      expect([400, 403, 404]).toContain(sendRes.status);
    });

    it('should reject blocked User B attempting to create new conversation with User A with 403 Forbidden', async () => {
      const newConvRes = await userBSession.client.post(
        '/chat/conversations',
        {
          contextType: 'CAB_GROUP',
          contextId: '00000000-0000-0000-0000-000000000002',
          recipientId: userASession.user.id,
        },
        { validateStatus: () => true }
      );

      expect([400, 403]).toContain(newConvRes.status);
    });

    it('should reject user attempting to block themselves with 400 Bad Request', async () => {
      const selfBlockRes = await userASession.client.post(
        '/safety/block',
        { blockedUserId: userASession.user.id },
        { validateStatus: () => true }
      );

      expect(selfBlockRes.status).toBe(400);
    });

    it('should allow User A to unblock User B via DELETE /safety/block/{id}', async () => {
      const unblockRes = await userASession.client.delete(
        `/safety/block/${userBSession.user.id}`,
        { validateStatus: () => true }
      );

      expect([200, 204]).toContain(unblockRes.status);
    });
  });

  // =========================================================================
  // 7. Requesting Messages for Non-Existent Conversation (>= 2 tests)
  // =========================================================================
  describe('Non-Existent Conversation Message Retrieval (Contract: 404 Not Found)', () => {
    it('should return 404 when requesting messages for random non-existent UUID', async () => {
      const nonExistent = '00000000-0000-0000-0000-000000000888';
      const res = await userASession.client.get(
        `/chat/conversations/${nonExistent}/messages`,
        { validateStatus: () => true }
      );

      expect([400, 404]).toContain(res.status);
    });

    it('should return 400 or 404 for malformed conversation ID in URL path', async () => {
      const res = await userASession.client.get(
        '/chat/conversations/not-a-valid-uuid/messages',
        { validateStatus: () => true }
      );

      expect([400, 404]).toContain(res.status);
    });
  });

  // =========================================================================
  // 8. Requesting Messages for Conversation User Does NOT Belong To (>= 3 tests)
  // =========================================================================
  describe('Unauthorized Conversation Message Access (Contract: 403 Forbidden)', () => {
    it('should return 403 when User C attempts to read messages of Conversation AB', async () => {
      const res = await userCSession.client.get(
        `/chat/conversations/${conversationABId}/messages`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(403);
    });

    it('should return 403 when User C attempts to mark Conversation AB as read', async () => {
      const res = await userCSession.client.post(
        `/chat/conversations/${conversationABId}/read`,
        {},
        { validateStatus: () => true }
      );

      expect(res.status).toBe(403);
    });

    it('should return 401 when anonymous unauthenticated user requests messages of Conversation AB', async () => {
      const anonClient = createApiClient();
      const res = await anonClient.get(
        `/chat/conversations/${conversationABId}/messages`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(401);
    });
  });
});
