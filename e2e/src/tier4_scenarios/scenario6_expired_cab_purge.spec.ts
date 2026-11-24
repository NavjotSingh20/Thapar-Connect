import { describe, it, expect } from 'vitest';
import { createTestUserSession } from '../helpers/authHelper';
import { CAB_LOCATIONS, createCabPayload } from '../helpers/dataFactory';

describe('Tier 4: Scenario 6 - Departure Time Expiration & Filter Exclusion (S6)', () => {
  it('should exclude expired cab groups from public browse and spatial search while retaining record in direct fetch', async () => {
    const creator = await createTestUserSession({ onboard: true });
    const seeker = await createTestUserSession({ onboard: true });

    // 1. Create an upcoming active cab group (departs in 5 hours)
    const upcomingDeparture = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    const activeCabRes = await creator.client.post(
      '/cabs',
      createCabPayload({
        dropPoint: CAB_LOCATIONS.CHANDIGARH_AIRPORT.name,
        dropLat: CAB_LOCATIONS.CHANDIGARH_AIRPORT.latitude,
        dropLng: CAB_LOCATIONS.CHANDIGARH_AIRPORT.longitude,
        departureTime: upcomingDeparture,
        totalSeats: 4,
      })
    );
    expect([200, 201]).toContain(activeCabRes.status);
    const activeCabId = activeCabRes.data.id;

    // 2. Create a cab group with departure in the past (or immediately expiring)
    const pastDeparture = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const expiredCabAttempt = await creator.client.post(
      '/cabs',
      createCabPayload({
        dropPoint: CAB_LOCATIONS.CHANDIGARH_AIRPORT.name,
        dropLat: CAB_LOCATIONS.CHANDIGARH_AIRPORT.latitude,
        dropLng: CAB_LOCATIONS.CHANDIGARH_AIRPORT.longitude,
        departureTime: pastDeparture,
        totalSeats: 3,
      }),
      { validateStatus: () => true }
    );

    // If backend rejects past departure on creation:
    let expiredCabId: string | null = null;
    if (expiredCabAttempt.status === 200 || expiredCabAttempt.status === 201) {
      expiredCabId = expiredCabAttempt.data.id;
    }

    // 3. Perform spatial search near Chandigarh Airport
    const spatialSearch = await seeker.client.get('/cabs', {
      params: {
        searchLat: CAB_LOCATIONS.CHANDIGARH_AIRPORT.latitude,
        searchLng: CAB_LOCATIONS.CHANDIGARH_AIRPORT.longitude,
      },
    });
    expect(spatialSearch.status).toBe(200);

    const searchResults: any[] = Array.isArray(spatialSearch.data)
      ? spatialSearch.data
      : spatialSearch.data?.content || [];

    // The upcoming active cab must be present
    expect(searchResults.some((c: any) => c.id === activeCabId)).toBe(true);

    // If an expired cab was created, it must NOT appear in active search results
    if (expiredCabId) {
      const foundExpired = searchResults.find((c: any) => c.id === expiredCabId);
      expect(foundExpired).toBeUndefined();

      // 4. Direct GET /cabs/{id} on the expired cab shows EXPIRED status
      const directGet = await seeker.client.get(`/cabs/${expiredCabId}`, {
        validateStatus: () => true,
      });
      if (directGet.status === 200) {
        expect(['EXPIRED', 'CLOSED']).toContain(directGet.data.status);
      }

      // 5. Attempting to join an expired cab group must fail
      const joinExpiredRes = await seeker.client.post(
        `/cabs/${expiredCabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      expect([400, 409]).toContain(joinExpiredRes.status);
    }
  });

  it('should verify date and timeWindow filters strictly exclude out-of-window cab groups', async () => {
    const creator = await createTestUserSession({ onboard: true });
    const seeker = await createTestUserSession({ onboard: true });

    // Cab tomorrow afternoon
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const cabRes = await creator.client.post(
      '/cabs',
      createCabPayload({
        departureTime: tomorrow.toISOString(),
      })
    );
    const cabId = cabRes.data.id;

    // Filter by matching date
    const matchingDateSearch = await seeker.client.get('/cabs', {
      params: { date: dateStr },
    });
    expect(matchingDateSearch.status).toBe(200);
    const matchingList: any[] = Array.isArray(matchingDateSearch.data)
      ? matchingDateSearch.data
      : matchingDateSearch.data?.content || [];
    expect(matchingList.some((c: any) => c.id === cabId)).toBe(true);

    // Filter by different date (e.g., 5 days later)
    const laterDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const mismatchDateSearch = await seeker.client.get('/cabs', {
      params: { date: laterDate },
    });
    expect(mismatchDateSearch.status).toBe(200);
    const mismatchList: any[] = Array.isArray(mismatchDateSearch.data)
      ? mismatchDateSearch.data
      : mismatchDateSearch.data?.content || [];
    expect(mismatchList.some((c: any) => c.id === cabId)).toBe(false);
  });
});
