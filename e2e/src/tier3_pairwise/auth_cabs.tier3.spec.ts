import { describe, it, expect } from 'vitest';
import { createApiClient } from '../helpers/apiClient';
import {
  createTestUserSession,
  devLogin,
  onboardUser,
} from '../helpers/authHelper';
import {
  createCabPayload,
  generateThaparEmail,
  randomValidPhone,
} from '../helpers/dataFactory';

describe('Tier 3: Pairwise - Auth & Cab Pooling Interactions', () => {
  it('should block un-onboarded user from creating a cab group (403), then allow creation after onboarding', async () => {
    // 1. Create a user without onboarding
    const session = await createTestUserSession({ onboard: false });
    expect(session.user.isOnboarded).toBe(false);

    // 2. Attempt cab creation while un-onboarded
    const cabData = createCabPayload();
    const blockedRes = await session.client.post('/cabs', cabData, {
      validateStatus: () => true,
    });

    expect(blockedRes.status).toBe(403);
    expect(
      blockedRes.data.message || blockedRes.data.error || JSON.stringify(blockedRes.data)
    ).toMatch(/onboard/i);

    // 3. User completes onboarding profile
    const onboardedUser = await onboardUser(session.client, {
      phoneNumber: randomValidPhone(),
      hostel: 'Hostel J',
      rollNumber: '102103456',
      branch: 'COE',
      year: 3,
    });
    expect(onboardedUser.isOnboarded).toBe(true);

    // 4. Retry cab group creation -> must succeed
    const successRes = await session.client.post('/cabs', cabData, {
      validateStatus: () => true,
    });
    expect([200, 201]).toContain(successRes.status);
    expect(successRes.data).toBeDefined();
    expect(successRes.data.id).toBeDefined();
    expect(successRes.data.pickupPoint).toBe(cabData.pickupPoint);
    expect(successRes.data.status).toBe('OPEN');
  });

  it('should block un-onboarded user from joining an open cab group (403), then allow join after onboarding', async () => {
    // 1. Host creates open cab group
    const hostSession = await createTestUserSession({ onboard: true });
    const cabRes = await hostSession.client.post('/cabs', createCabPayload({ totalSeats: 4 }));
    const cabId = cabRes.data.id;

    // 2. Applicant logs in without onboarding
    const applicantSession = await createTestUserSession({ onboard: false });
    const joinResBlocked = await applicantSession.client.post(
      `/cabs/${cabId}/join`,
      { seatsRequested: 1, note: 'Need a ride' },
      { validateStatus: () => true }
    );
    expect(joinResBlocked.status).toBe(403);

    // 3. Applicant completes onboarding
    await onboardUser(applicantSession.client, {
      phoneNumber: randomValidPhone(),
      hostel: 'Hostel M',
      rollNumber: '102103789',
      branch: 'ECE',
      year: 2,
    });

    // 4. Retry join request -> must succeed
    const joinResAllowed = await applicantSession.client.post(
      `/cabs/${cabId}/join`,
      { seatsRequested: 1, note: 'Need a ride' },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(joinResAllowed.status);
    expect(joinResAllowed.data).toBeDefined();
    expect(['PENDING', 'CONFIRMED']).toContain(joinResAllowed.data.status);
  });

  it('should reject non-owner student attempting to delete another cab group (403), but permit ADMIN deletion', async () => {
    // 1. Student A creates a cab group
    const studentA = await createTestUserSession({ onboard: true });
    const studentB = await createTestUserSession({ onboard: true });
    const admin = await createTestUserSession({ role: 'ADMIN', onboard: true });

    const cabRes = await studentA.client.post('/cabs', createCabPayload());
    const cabId = cabRes.data.id;

    // 2. Student B attempts to delete Student A's cab group
    const deleteByB = await studentB.client.delete(`/cabs/${cabId}`, {
      validateStatus: () => true,
    });
    expect([403, 401]).toContain(deleteByB.status);

    // Verify cab group is still active and retrievable
    const checkCab = await studentA.client.get(`/cabs/${cabId}`);
    expect(checkCab.status).toBe(200);
    expect(checkCab.data.status).toBe('OPEN');

    // 3. Admin deletes the cab group via admin moderation endpoint or regular endpoint
    const deleteByAdmin = await admin.client.delete(`/admin/cabs/${cabId}`, {
      validateStatus: () => true,
    });
    expect([200, 204]).toContain(deleteByAdmin.status);

    // Verify cab group is either removed from browse or marked CLOSED/DELETED
    const browseRes = await studentA.client.get('/cabs', {
      validateStatus: () => true,
    });
    const cabList: any[] = Array.isArray(browseRes.data)
      ? browseRes.data
      : browseRes.data?.content || [];
    const found = cabList.find((c: any) => c.id === cabId);
    expect(found === undefined || found.status === 'CLOSED').toBe(true);
  });

  it('should maintain seamless session state across token refresh during cab browsing and join workflow', async () => {
    // 1. Creator creates a cab
    const creator = await createTestUserSession({ onboard: true });
    const cab = await creator.client.post('/cabs', createCabPayload({ totalSeats: 3 }));

    // 2. Student logs in
    const client = createApiClient();
    const email = generateThaparEmail('traveller');
    const authData = await devLogin({ email, name: 'Traveler Student', role: 'USER' }, client);

    await onboardUser(client, {
      phoneNumber: randomValidPhone(),
      hostel: 'Hostel PG',
    });

    // 3. User browses cabs with initial access token
    const initialBrowse = await client.get('/cabs');
    expect(initialBrowse.status).toBe(200);

    // 4. Refresh token via POST /auth/refresh
    const refreshRes = await client.post('/auth/refresh', {}, {
      validateStatus: () => true,
    });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.data.accessToken).toBeDefined();

    // Update client with newly issued token
    client.setAuthToken(refreshRes.data.accessToken);

    // 5. Execute cab join with refreshed token -> seamless continuation
    const joinRes = await client.post(
      `/cabs/${cab.data.id}/join`,
      { seatsRequested: 1 },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(joinRes.status);
  });

  it('should reject cab operations after user logs out (401 Unauthorized)', async () => {
    const session = await createTestUserSession({ onboard: true });

    // Verify user can browse
    const browseBefore = await session.client.get('/cabs');
    expect(browseBefore.status).toBe(200);

    // Logout
    const logoutRes = await session.client.post('/auth/logout', {}, {
      validateStatus: () => true,
    });
    expect([200, 204]).toContain(logoutRes.status);

    // Clear local auth token on client to simulate post-logout state
    session.client.setAuthToken(null);

    // Attempting cab creation must fail with 401
    const createRes = await session.client.post('/cabs', createCabPayload(), {
      validateStatus: () => true,
    });
    expect(createRes.status).toBe(401);
  });

  it('should block banned user from creating cab groups and joining existing cab groups', async () => {
    const admin = await createTestUserSession({ role: 'ADMIN', onboard: true });
    const student = await createTestUserSession({ onboard: true });
    const host = await createTestUserSession({ onboard: true });

    // Host creates cab
    const cab = await host.client.post('/cabs', createCabPayload());

    // Admin bans student
    const banRes = await admin.client.post(`/admin/users/${student.user.id}/ban`, {}, {
      validateStatus: () => true,
    });
    expect([200, 204]).toContain(banRes.status);

    // Student attempts to create cab -> 401 or 403
    const cabAttempt = await student.client.post('/cabs', createCabPayload(), {
      validateStatus: () => true,
    });
    expect([401, 403]).toContain(cabAttempt.status);

    // Student attempts to join host cab -> 401 or 403
    const joinAttempt = await student.client.post(
      `/cabs/${cab.data.id}/join`,
      { seatsRequested: 1 },
      { validateStatus: () => true }
    );
    expect([401, 403]).toContain(joinAttempt.status);
  });
});
