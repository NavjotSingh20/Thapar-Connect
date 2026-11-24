import { describe, it, expect } from 'vitest';
import { createTestUserSession } from '../helpers/authHelper';
import { createCabPayload } from '../helpers/dataFactory';

describe('Tier 4: Scenario 3 - Concurrent High-Demand Cab Booking (S3)', () => {
  it('should enforce pessimistic locking: exactly 2 of 5 concurrent joiners succeed for 2 remaining seats with zero overbooking', async () => {
    // 1. Host creates a high-demand cab with 3 total seats (1 taken by host, 2 available)
    const host = await createTestUserSession({
      onboard: true,
      name: 'Host Student',
      hostel: 'Hostel J',
    });

    const cabRes = await host.client.post(
      '/cabs',
      createCabPayload({
        totalSeats: 3,
        autoJoinEnabled: true, // auto-join enables instant confirmation to test concurrency
        note: 'Urgent rush to Chandigarh Shatabdi! Fast seats.',
      })
    );
    expect([200, 201]).toContain(cabRes.status);
    const cabId = cabRes.data.id;

    // 2. Instantiate 5 distinct students concurrently
    const students = await Promise.all([
      createTestUserSession({ onboard: true, name: 'Student 1' }),
      createTestUserSession({ onboard: true, name: 'Student 2' }),
      createTestUserSession({ onboard: true, name: 'Student 3' }),
      createTestUserSession({ onboard: true, name: 'Student 4' }),
      createTestUserSession({ onboard: true, name: 'Student 5' }),
    ]);

    // 3. Fire all 5 join requests simultaneously via Promise.all
    const joinPromises = students.map((student) =>
      student.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1, note: 'Rushing to station!' },
        { validateStatus: () => true }
      )
    );

    const responses = await Promise.all(joinPromises);

    // 4. Analyze responses
    const successful = responses.filter(
      (r) => r.status === 200 || r.status === 201
    );
    const rejected = responses.filter(
      (r) => r.status === 409 || r.status === 400
    );

    // Exactly 2 must succeed, exactly 3 must receive Conflict (409)
    expect(successful.length).toBe(2);
    expect(rejected.length).toBe(3);

    // Verify error messages for rejected users mention capacity / group full
    rejected.forEach((rej) => {
      expect(rej.status).toBe(409);
      const msg = rej.data.message || rej.data.error || JSON.stringify(rej.data);
      expect(msg.toLowerCase()).toMatch(/full|conflict|seat|capacity|no.*available/i);
    });

    // 5. Query cab group from DB/API to verify capacity invariant
    const finalCabRes = await host.client.get(`/cabs/${cabId}`);
    expect(finalCabRes.status).toBe(200);
    const cab = finalCabRes.data;

    const seatsTaken = cab.seatsTaken ?? cab.seats_taken;
    const totalSeats = cab.totalSeats ?? cab.total_seats;

    expect(seatsTaken).toBe(3);
    expect(totalSeats).toBe(3);
    expect(seatsTaken).toBeLessThanOrEqual(totalSeats);
    expect(cab.status).toBe('FULL');
  });

  it('should prevent creator self-join and duplicate join requests by the same user', async () => {
    const creator = await createTestUserSession({ onboard: true });
    const student = await createTestUserSession({ onboard: true });

    const cabRes = await creator.client.post(
      '/cabs',
      createCabPayload({ totalSeats: 4, autoJoinEnabled: true })
    );
    const cabId = cabRes.data.id;

    // 1. Creator attempts to join their own cab group -> 400 or 409
    const selfJoinRes = await creator.client.post(
      `/cabs/${cabId}/join`,
      { seatsRequested: 1 },
      { validateStatus: () => true }
    );
    expect([400, 409, 422]).toContain(selfJoinRes.status);

    // 2. Student joins successfully once
    const firstJoin = await student.client.post(`/cabs/${cabId}/join`, {
      seatsRequested: 1,
    });
    expect([200, 201]).toContain(firstJoin.status);

    // 3. Student attempts duplicate join on the same cab group -> 409 Conflict
    const duplicateJoin = await student.client.post(
      `/cabs/${cabId}/join`,
      { seatsRequested: 1 },
      { validateStatus: () => true }
    );
    expect([400, 409]).toContain(duplicateJoin.status);
  });
});
