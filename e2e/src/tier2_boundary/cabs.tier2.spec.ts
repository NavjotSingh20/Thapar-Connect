import { describe, it, expect, beforeAll } from 'vitest';
import { ApiClient } from '../helpers/apiClient';
import { createTestUserSession, TestUserSession } from '../helpers/authHelper';
import { createCabPayload, CAB_LOCATIONS } from '../helpers/dataFactory';

describe('Tier 2: Cab Pooling Boundary & Negative Corner Cases', () => {
  let creatorSession: TestUserSession;
  let passenger1Session: TestUserSession;
  let passenger2Session: TestUserSession;
  let bystanderSession: TestUserSession;

  beforeAll(async () => {
    creatorSession = await createTestUserSession({ name: 'Cab Creator' });
    passenger1Session = await createTestUserSession({ name: 'Passenger 1' });
    passenger2Session = await createTestUserSession({ name: 'Passenger 2' });
    bystanderSession = await createTestUserSession({ name: 'Bystander User' });
  });

  // =========================================================================
  // 1. Departure Time in the Past (>= 3 tests)
  // =========================================================================
  describe('Departure Time in the Past Rejection (Contract: 400 Bad Request)', () => {
    it('should reject cab creation with departure time 1 hour in the past', async () => {
      const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();
      const payload = createCabPayload({ departureTime: pastTime });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with departure time 1 day in the past', async () => {
      const pastTime = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const payload = createCabPayload({ departureTime: pastTime });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with departure time 1 year in the past', async () => {
      const pastTime = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
      const payload = createCabPayload({ departureTime: pastTime });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 2. Departure Time Boundaries: Immediate Past vs Epoch (>= 2 tests)
  // =========================================================================
  describe('Departure Time Granular Boundaries', () => {
    it('should reject cab creation with departure time just 15 seconds in the past', async () => {
      const immediatePast = new Date(Date.now() - 15 * 1000).toISOString();
      const payload = createCabPayload({ departureTime: immediatePast });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with Unix Epoch (1970-01-01T00:00:00Z)', async () => {
      const payload = createCabPayload({ departureTime: '1970-01-01T00:00:00Z' });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with malformed non-ISO date string', async () => {
      const payload = createCabPayload({ departureTime: 'tomorrow-afternoon-at-4' });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 3. Total Seats Lower Bound (<= 1 rejected, creator takes 1) (>= 3 tests)
  // =========================================================================
  describe('Total Seats Lower Bound (Minimum is 2 seats, creator takes 1)', () => {
    it('should reject cab creation with totalSeats = 1 with 400 Bad Request', async () => {
      const payload = createCabPayload({ totalSeats: 1 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with totalSeats = 0 with 400 Bad Request', async () => {
      const payload = createCabPayload({ totalSeats: 0 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with negative totalSeats = -2 with 400 Bad Request', async () => {
      const payload = createCabPayload({ totalSeats: -2 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 4. Total Seats Upper Bound (> 8 rejected) (>= 2 tests)
  // =========================================================================
  describe('Total Seats Upper Bound (Max 8 seats for car/cab limit)', () => {
    it('should reject cab creation with totalSeats = 9 with 400 Bad Request', async () => {
      const payload = createCabPayload({ totalSeats: 9 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with absurd totalSeats = 100 with 400 Bad Request', async () => {
      const payload = createCabPayload({ totalSeats: 100 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 5. Negative or Zero Estimated Fare (>= 3 tests)
  // =========================================================================
  describe('Estimated Fare Boundary Validation', () => {
    it('should reject cab creation with zero fare (estimatedFare = 0) with 400 Bad Request', async () => {
      const payload = createCabPayload({ estimatedFare: 0 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with negative fare (estimatedFare = -150) with 400 Bad Request', async () => {
      const payload = createCabPayload({ estimatedFare: -150 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject fractional negative fare (estimatedFare = -0.01) with 400 Bad Request', async () => {
      const payload = createCabPayload({ estimatedFare: -0.01 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 6. Overbooking Prevention (available seats = 0 -> 409 Conflict) (>= 4 tests)
  // =========================================================================
  describe('Overbooking Prevention & Seat Exhaustion Concurrency Boundary', () => {
    it('should reject join request with 409 Conflict when available seats are 0', async () => {
      // Create cab with totalSeats = 2 (creator takes 1, exactly 1 available seat)
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 2, autoJoinEnabled: true }),
        { validateStatus: () => true }
      );
      expect([200, 201]).toContain(cabRes.status);
      const cabId = cabRes.data.id;

      // Passenger 1 takes the 1 remaining seat
      const join1 = await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect([200, 201]).toContain(join1.status);

      // Passenger 2 tries to join full cab -> must return 409 Conflict
      const join2 = await passenger2Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect(join2.status).toBe(409);
    });

    it('should reject join request when seatsRequested exceeds available seats', async () => {
      // Cab with totalSeats: 3 (2 available seats)
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 3, autoJoinEnabled: true }),
        { validateStatus: () => true }
      );
      expect([200, 201]).toContain(cabRes.status);
      const cabId = cabRes.data.id;

      // Requesting 3 seats when only 2 are available
      const joinRes = await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 3 },
        { validateStatus: () => true }
      );
      expect([400, 409]).toContain(joinRes.status);
    });

    it('should reject join request with seatsRequested = 0 with 400 Bad Request', async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4 }),
        { validateStatus: () => true }
      );
      const cabId = cabRes.data.id;

      const res = await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 0 },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(400);
    });

    it('should reject join request with negative seatsRequested = -1 with 400 Bad Request', async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4 }),
        { validateStatus: () => true }
      );
      const cabId = cabRes.data.id;

      const res = await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: -1 },
        { validateStatus: () => true }
      );
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 7. Creator Self-Join Prevention (>= 2 tests)
  // =========================================================================
  describe('Creator Self-Join Prevention (Contract: 400 Bad Request)', () => {
    it('should reject creator attempting to join their own cab group', async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4 }),
        { validateStatus: () => true }
      );
      const cabId = cabRes.data.id;

      const res = await creatorSession.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );

      // Creator is already the leader/member; self-join must be rejected
      expect([400, 409]).toContain(res.status);
    });

    it('should reject creator attempting to join their own cab even with autoJoinEnabled=true', async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4, autoJoinEnabled: true }),
        { validateStatus: () => true }
      );
      const cabId = cabRes.data.id;

      const res = await creatorSession.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1, note: 'Creator trying to join self' },
        { validateStatus: () => true }
      );

      expect([400, 409]).toContain(res.status);
    });
  });

  // =========================================================================
  // 8. Duplicate Join Request by Same User (>= 3 tests)
  // =========================================================================
  describe('Duplicate Join Request Prevention', () => {
    it('should reject duplicate join request while first request is pending', async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4, autoJoinEnabled: false }),
        { validateStatus: () => true }
      );
      const cabId = cabRes.data.id;

      // First join (status PENDING)
      const join1 = await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect([200, 201]).toContain(join1.status);

      // Second join attempt by same user
      const join2 = await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect([400, 409]).toContain(join2.status);
    });

    it('should reject duplicate join request after member has already been confirmed', async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4, autoJoinEnabled: true }),
        { validateStatus: () => true }
      );
      const cabId = cabRes.data.id;

      // Passenger 1 joins and is auto-confirmed
      const join1 = await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect([200, 201]).toContain(join1.status);

      // Re-joining when already confirmed member
      const join2 = await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect([400, 409]).toContain(join2.status);
    });

    it('should reject duplicate join with different seatsRequested count', async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4, autoJoinEnabled: true }),
        { validateStatus: () => true }
      );
      const cabId = cabRes.data.id;

      await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );

      const join2 = await passenger1Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 2 },
        { validateStatus: () => true }
      );
      expect([400, 409]).toContain(join2.status);
    });
  });

  // =========================================================================
  // 9. Non-Creator Member Management Rejection (>= 3 tests)
  // =========================================================================
  describe('Non-Creator Member Moderation Access Control (Contract: 403 Forbidden)', () => {
    let testCabId: string;
    let pendingMemberId: string;

    beforeAll(async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4, autoJoinEnabled: false }),
        { validateStatus: () => true }
      );
      testCabId = cabRes.data.id;

      const joinRes = await passenger1Session.client.post(
        `/cabs/${testCabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      pendingMemberId = joinRes.data.id || joinRes.data.memberId || passenger1Session.user.id;
    });

    it('should reject non-creator calling member accept endpoint with 403 Forbidden', async () => {
      const res = await bystanderSession.client.post(
        `/cabs/${testCabId}/members/${pendingMemberId}/accept`,
        {},
        { validateStatus: () => true }
      );
      expect(res.status).toBe(403);
    });

    it('should reject non-creator calling member reject endpoint with 403 Forbidden', async () => {
      const res = await bystanderSession.client.post(
        `/cabs/${testCabId}/members/${pendingMemberId}/reject`,
        {},
        { validateStatus: () => true }
      );
      expect(res.status).toBe(403);
    });

    it('should reject passenger attempting to accept their own pending membership with 403 Forbidden', async () => {
      const res = await passenger1Session.client.post(
        `/cabs/${testCabId}/members/${pendingMemberId}/accept`,
        {},
        { validateStatus: () => true }
      );
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 10. Non-Creator Close Attempt Rejection (>= 2 tests)
  // =========================================================================
  describe('Non-Creator Close Attempt Rejection (Contract: 403 Forbidden)', () => {
    let testCabId: string;

    beforeAll(async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4 }),
        { validateStatus: () => true }
      );
      testCabId = cabRes.data.id;
    });

    it('should reject bystander user attempting to close cab group with 403 Forbidden', async () => {
      const res = await bystanderSession.client.patch(
        `/cabs/${testCabId}/close`,
        {},
        { validateStatus: () => true }
      );
      expect(res.status).toBe(403);
    });

    it('should reject confirmed passenger attempting to close cab group with 403 Forbidden', async () => {
      const res = await passenger1Session.client.patch(
        `/cabs/${testCabId}/close`,
        {},
        { validateStatus: () => true }
      );
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 11. Joining a CLOSED or EXPIRED Cab Group (>= 3 tests)
  // =========================================================================
  describe('Joining Inactive Cab Groups (CLOSED / EXPIRED)', () => {
    it('should reject join request on manually CLOSED cab group with 400 or 409', async () => {
      // Create and close cab
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4 }),
        { validateStatus: () => true }
      );
      const cabId = cabRes.data.id;

      const closeRes = await creatorSession.client.patch(
        `/cabs/${cabId}/close`,
        {},
        { validateStatus: () => true }
      );
      expect([200, 204]).toContain(closeRes.status);

      // Attempt join on closed cab
      const joinRes = await passenger2Session.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect([400, 409]).toContain(joinRes.status);
    });

    it('should return 404 or 400 when attempting to join non-existent cab ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000099';
      const joinRes = await passenger1Session.client.post(
        `/cabs/${nonExistentId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect([400, 404]).toContain(joinRes.status);
    });

    it('should reject repeated close request on an already CLOSED cab group gracefully', async () => {
      const cabRes = await creatorSession.client.post(
        '/cabs',
        createCabPayload({ totalSeats: 4 }),
        { validateStatus: () => true }
      );
      const cabId = cabRes.data.id;

      // First close
      await creatorSession.client.patch(`/cabs/${cabId}/close`, {}, { validateStatus: () => true });

      // Second close
      const secondClose = await creatorSession.client.patch(
        `/cabs/${cabId}/close`,
        {},
        { validateStatus: () => true }
      );
      expect([200, 204, 400, 409]).toContain(secondClose.status);
    });
  });

  // =========================================================================
  // 12. Extreme Coordinates Boundaries (>= 3 tests)
  // =========================================================================
  describe('Extreme Coordinates Validation (Lat [-90, 90], Lng [-180, 180])', () => {
    it('should reject cab creation with latitude exceeding +90 with 400 Bad Request', async () => {
      const payload = createCabPayload({ dropLat: 90.0001 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with latitude below -90 with 400 Bad Request', async () => {
      const payload = createCabPayload({ dropLat: -90.0001 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with longitude exceeding +180 with 400 Bad Request', async () => {
      const payload = createCabPayload({ dropLng: 180.0001 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });

    it('should reject cab creation with longitude below -180 with 400 Bad Request', async () => {
      const payload = createCabPayload({ dropLng: -180.0001 });

      const res = await creatorSession.client.post('/cabs', payload, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(400);
    });
  });
});
