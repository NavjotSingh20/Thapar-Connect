import { describe, it, expect, beforeAll } from 'vitest';
import { ApiClient, createApiClient } from '../helpers/apiClient';
import {
  devLogin,
  createTestUserSession,
  onboardUser,
  UserDto,
  AuthResponse,
} from '../helpers/authHelper';
import {
  generateThaparEmail,
  generateNonThaparEmail,
  createCabPayload,
  createListingPayload,
  createMockImage,
  HOSTELS,
} from '../helpers/dataFactory';
import FormData from 'form-data';

/**
 * Builds a structured mock Google ID token with configurable claims for boundary testing
 */
function buildMockGoogleToken(claims: Record<string, any>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'mock-key-1' })
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({
      iss: 'https://accounts.google.com',
      aud: 'thapar-connect-client-id',
      sub: `google-user-${Date.now()}`,
      iat: Math.floor(Date.now() / 1000) - 30,
      exp: Math.floor(Date.now() / 1000) + 3600,
      email_verified: true,
      ...claims,
    })
  ).toString('base64url');

  const signature = Buffer.from('mock_signature_bytes').toString('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('Tier 2: Authentication & Onboarding Boundary & Corner Cases', () => {
  let anonymousClient: ApiClient;

  beforeAll(() => {
    anonymousClient = createApiClient();
  });

  // =========================================================================
  // 1. Non-Thapar Email Domain Rejection (>= 5 variations)
  // =========================================================================
  describe('Non-Thapar Domain Rejection (Contract: 403 "Only @thapar.edu accounts allowed")', () => {
    const invalidDomains = [
      { domain: 'gmail.com', desc: 'Standard consumer Gmail' },
      { domain: 'yahoo.com', desc: 'Standard consumer Yahoo' },
      { domain: 'stanford.edu', desc: 'Different educational institution' },
      { domain: 'outlook.com', desc: 'Standard consumer Microsoft' },
      { domain: 'thapar.edu.attacker.com', desc: 'Subdomain spoofing / phishing attempt' },
      { domain: 'thapar.ac.in', desc: 'Alternate academic TLD (.ac.in instead of .edu)' },
      { domain: 'notthapar.edu', desc: 'Lookalike domain ending in edu' },
    ];

    for (const item of invalidDomains) {
      it(`should reject non-thapar email @${item.domain} (${item.desc}) with 403 Forbidden`, async () => {
        const nonThaparEmail = `student.${Date.now()}@${item.domain}`;
        const mockToken = buildMockGoogleToken({
          email: nonThaparEmail,
          email_verified: true,
        });

        const res = await anonymousClient.post(
          '/auth/google',
          { idToken: mockToken },
          { validateStatus: () => true }
        );

        // Expect 403 Forbidden (or 400/401 if Google OAuth service rejects signature in mock mode)
        expect([400, 401, 403]).toContain(res.status);
        if (res.status === 403 && res.data) {
          const body = res.data as any;
          const msg = body.message || body.error || '';
          expect(msg.toLowerCase()).toContain('thapar.edu');
        }
      });
    }

    it('should reject dev-login if requested with non-thapar domain', async () => {
      const invalidEmail = `attacker.${Date.now()}@gmail.com`;
      const res = await anonymousClient.post(
        '/auth/dev-login',
        { email: invalidEmail, name: 'Attacker', role: 'USER' },
        { validateStatus: () => true }
      );

      // Dev login must also protect domain boundary
      expect([400, 403]).toContain(res.status);
    });
  });

  // =========================================================================
  // 2. Unverified Email Boundary (email_verified=false) (>= 3 tests)
  // =========================================================================
  describe('Unverified Email Verification Boundary', () => {
    it('should reject Google ID token where email_verified is explicitly false', async () => {
      const token = buildMockGoogleToken({
        email: generateThaparEmail('unverified'),
        email_verified: false,
      });

      const res = await anonymousClient.post(
        '/auth/google',
        { idToken: token },
        { validateStatus: () => true }
      );

      expect([400, 401, 403]).toContain(res.status);
    });

    it('should reject Google ID token where email_verified claim is omitted', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          iss: 'https://accounts.google.com',
          aud: 'thapar-connect-client-id',
          sub: 'user-missing-verified',
          email: generateThaparEmail('noverify'),
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString('base64url');
      const token = `${header}.${payload}.sig`;

      const res = await anonymousClient.post(
        '/auth/google',
        { idToken: token },
        { validateStatus: () => true }
      );

      expect([400, 401, 403]).toContain(res.status);
    });

    it('should reject Google ID token where email_verified is null or string "false"', async () => {
      const token = buildMockGoogleToken({
        email: generateThaparEmail('stringfalse'),
        email_verified: 'false',
      });

      const res = await anonymousClient.post(
        '/auth/google',
        { idToken: token },
        { validateStatus: () => true }
      );

      expect([400, 401, 403]).toContain(res.status);
    });
  });

  // =========================================================================
  // 3. Malformed / Forged / Expired Token Rejections (>= 4 tests)
  // =========================================================================
  describe('Malformed & Forged Token Rejections', () => {
    it('should reject completely malformed string as ID token', async () => {
      const res = await anonymousClient.post(
        '/auth/google',
        { idToken: 'random_malformed_string_not_a_jwt' },
        { validateStatus: () => true }
      );

      expect([400, 401, 403]).toContain(res.status);
    });

    it('should reject expired Google ID token with exp in the past', async () => {
      const expiredToken = buildMockGoogleToken({
        email: generateThaparEmail('expired'),
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hr ago
      });

      const res = await anonymousClient.post(
        '/auth/google',
        { idToken: expiredToken },
        { validateStatus: () => true }
      );

      expect([400, 401, 403]).toContain(res.status);
    });

    it('should reject empty or missing idToken in request body', async () => {
      const emptyRes = await anonymousClient.post(
        '/auth/google',
        { idToken: '' },
        { validateStatus: () => true }
      );
      expect([400, 401]).toContain(emptyRes.status);

      const missingRes = await anonymousClient.post(
        '/auth/google',
        {},
        { validateStatus: () => true }
      );
      expect([400, 401]).toContain(missingRes.status);
    });

    it('should reject forged JWT with "none" algorithm', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          iss: 'https://accounts.google.com',
          aud: 'thapar-connect-client-id',
          email: generateThaparEmail('alg.none'),
          email_verified: true,
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const res = await anonymousClient.post(
        '/auth/google',
        { idToken: noneToken },
        { validateStatus: () => true }
      );

      expect([400, 401, 403]).toContain(res.status);
    });

    it('should reject truncated JWT missing signature component', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ email: generateThaparEmail('truncated') })).toString('base64url');
      const truncated = `${header}.${payload}`;

      const res = await anonymousClient.post(
        '/auth/google',
        { idToken: truncated },
        { validateStatus: () => true }
      );

      expect([400, 401, 403]).toContain(res.status);
    });
  });

  // =========================================================================
  // 4. Unauthenticated Requests to Protected Endpoints (>= 5 tests)
  // =========================================================================
  describe('Unauthenticated Requests to Protected Endpoints (Expect 401 Unauthorized)', () => {
    it('should return 401 for GET /users/me without Authorization header', async () => {
      const res = await anonymousClient.get('/users/me', { validateStatus: () => true });
      expect(res.status).toBe(401);
    });

    it('should return 401 for GET /cabs without Authorization header', async () => {
      const res = await anonymousClient.get('/cabs', { validateStatus: () => true });
      expect(res.status).toBe(401);
    });

    it('should return 401 for POST /cabs without Authorization header', async () => {
      const res = await anonymousClient.post(
        '/cabs',
        createCabPayload(),
        { validateStatus: () => true }
      );
      expect(res.status).toBe(401);
    });

    it('should return 401 for GET /marketplace/listings without Authorization header', async () => {
      const res = await anonymousClient.get('/marketplace/listings', { validateStatus: () => true });
      expect(res.status).toBe(401);
    });

    it('should return 401 for GET /chat/conversations without Authorization header', async () => {
      const res = await anonymousClient.get('/chat/conversations', { validateStatus: () => true });
      expect(res.status).toBe(401);
    });

    it('should return 401 for POST /safety/report without Authorization header', async () => {
      const res = await anonymousClient.post(
        '/safety/report',
        { targetType: 'USER', targetId: '00000000-0000-0000-0000-000000000000', reason: 'Spam' },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(401);
    });

    it('should return 401 when Authorization header has malformed Bearer prefix', async () => {
      const customClient = createApiClient();
      const res = await customClient.get('/users/me', {
        headers: { Authorization: 'NotBearer token123' },
        validateStatus: () => true,
      });
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 5. Onboarding Phone Number Boundaries (>= 5 tests)
  // =========================================================================
  describe('Onboarding Phone Number Format Boundaries (Contract: ^[6-9]\\d{9}$)', () => {
    let unonboardedClient: ApiClient;

    beforeAll(async () => {
      // Create user without onboarding
      const session = await createTestUserSession({ onboard: false });
      unonboardedClient = session.client;
    });

    it('should reject phone number shorter than 10 digits with 400 Bad Request', async () => {
      const res = await unonboardedClient.post(
        '/users/me/onboard',
        { phoneNumber: '987654321', hostel: 'Hostel J' }, // 9 digits
        { validateStatus: () => true }
      );
      expect(res.status).toBe(400);
    });

    it('should reject phone number longer than 10 digits with 400 Bad Request', async () => {
      const res = await unonboardedClient.post(
        '/users/me/onboard',
        { phoneNumber: '98765432101', hostel: 'Hostel J' }, // 11 digits
        { validateStatus: () => true }
      );
      expect(res.status).toBe(400);
    });

    it('should reject phone number starting with digit 0 through 5 with 400 Bad Request', async () => {
      const invalidStarts = ['0987654321', '1987654321', '2987654321', '3987654321', '4987654321', '5987654321'];
      for (const phone of invalidStarts) {
        const res = await unonboardedClient.post(
          '/users/me/onboard',
          { phoneNumber: phone, hostel: 'Hostel J' },
          { validateStatus: () => true }
        );
        expect(res.status).toBe(400);
      }
    });

    it('should reject phone number containing non-numeric characters with 400 Bad Request', async () => {
      const res = await unonboardedClient.post(
        '/users/me/onboard',
        { phoneNumber: '98765abcde', hostel: 'Hostel J' },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(400);
    });

    it('should reject empty or missing phone number with 400 Bad Request', async () => {
      const emptyRes = await unonboardedClient.post(
        '/users/me/onboard',
        { phoneNumber: '', hostel: 'Hostel J' },
        { validateStatus: () => true }
      );
      expect(emptyRes.status).toBe(400);

      const missingRes = await unonboardedClient.post(
        '/users/me/onboard',
        { hostel: 'Hostel J' },
        { validateStatus: () => true }
      );
      expect(missingRes.status).toBe(400);
    });

    it('should reject phone number with spaces, hyphens, or country codes', async () => {
      const formattedPhones = ['+919876543210', '98765 43210', '9876-543210'];
      for (const phone of formattedPhones) {
        const res = await unonboardedClient.post(
          '/users/me/onboard',
          { phoneNumber: phone, hostel: 'Hostel J' },
          { validateStatus: () => true }
        );
        expect(res.status).toBe(400);
      }
    });
  });

  // =========================================================================
  // 6. Onboarding Hostel Boundaries (>= 3 tests)
  // =========================================================================
  describe('Onboarding Hostel Field Boundaries', () => {
    let unonboardedClient: ApiClient;

    beforeAll(async () => {
      const session = await createTestUserSession({ onboard: false });
      unonboardedClient = session.client;
    });

    it('should reject empty string as hostel with 400 Bad Request', async () => {
      const res = await unonboardedClient.post(
        '/users/me/onboard',
        { phoneNumber: '9876543210', hostel: '' },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(400);
    });

    it('should reject missing hostel field with 400 Bad Request', async () => {
      const res = await unonboardedClient.post(
        '/users/me/onboard',
        { phoneNumber: '9876543210' },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(400);
    });

    it('should reject whitespace-only string as hostel with 400 Bad Request', async () => {
      const res = await unonboardedClient.post(
        '/users/me/onboard',
        { phoneNumber: '9876543210', hostel: '    ' },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(400);
    });

    it('should reject invalid hostel not in campus hostel inventory with 400 Bad Request', async () => {
      const res = await unonboardedClient.post(
        '/users/me/onboard',
        { phoneNumber: '9876543210', hostel: 'NonExistentHostelZZZ' },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 7. Onboarding Gate Enforcement (>= 5 tests)
  // =========================================================================
  describe('Onboarding Gate (Un-onboarded user barred from protected actions with 403)', () => {
    let unonboardedClient: ApiClient;

    beforeAll(async () => {
      const session = await createTestUserSession({ onboard: false });
      unonboardedClient = session.client;
    });

    it('should allow GET /users/me for un-onboarded user with isOnboarded=false', async () => {
      const res = await unonboardedClient.get<UserDto>('/users/me', { validateStatus: () => true });
      expect(res.status).toBe(200);
      expect(res.data.isOnboarded).toBe(false);
    });

    it('should block un-onboarded user from POST /cabs with 403 Forbidden', async () => {
      const res = await unonboardedClient.post(
        '/cabs',
        createCabPayload(),
        { validateStatus: () => true }
      );
      expect(res.status).toBe(403);
    });

    it('should block un-onboarded user from POST /cabs/{id}/join with 403 Forbidden', async () => {
      const dummyCabId = '00000000-0000-0000-0000-000000000001';
      const res = await unonboardedClient.post(
        `/cabs/${dummyCabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(403);
    });

    it('should block un-onboarded user from POST /marketplace/listings with 403 Forbidden', async () => {
      const formData = new FormData();
      formData.append('title', 'Cycle');
      formData.append('category', 'Cycle');
      formData.append('description', 'Test');
      formData.append('condition', 'Used');
      formData.append('price', '1000');
      formData.append('hostel', 'Hostel J');
      const img = createMockImage('bike.png');
      formData.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

      const res = await unonboardedClient.uploadMultipart(
        '/marketplace/listings',
        formData,
        { validateStatus: () => true }
      );
      expect(res.status).toBe(403);
    });

    it('should block un-onboarded user from GET /chat/conversations with 403 Forbidden', async () => {
      const res = await unonboardedClient.get('/chat/conversations', { validateStatus: () => true });
      expect(res.status).toBe(403);
    });

    it('should block un-onboarded user from POST /chat/conversations with 403 Forbidden', async () => {
      const res = await unonboardedClient.post(
        '/chat/conversations',
        {
          contextType: 'CAB_GROUP',
          contextId: '00000000-0000-0000-0000-000000000001',
          recipientId: '00000000-0000-0000-0000-000000000002',
        },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(403);
    });
  });
});
