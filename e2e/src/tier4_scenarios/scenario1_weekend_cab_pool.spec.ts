import { describe, it, expect } from 'vitest';
import { createTestUserSession } from '../helpers/authHelper';
import { CAB_LOCATIONS, createCabPayload } from '../helpers/dataFactory';

describe('Tier 4: Scenario 1 - Weekend Delhi Airport Cab Pool (S1)', () => {
  it('should complete the entire multi-user journey from spatial search to full capacity and group chat', async () => {
    // 1. Student 1 (Host/Creator) logs in and creates cab group to Delhi IGI Airport
    const creator = await createTestUserSession({
      onboard: true,
      name: 'Rohan Sharma',
      hostel: 'Hostel J',
    });

    const departureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const cabData = createCabPayload({
      pickupPoint: CAB_LOCATIONS.CAMPUS_THAPAR.name,
      pickupLat: CAB_LOCATIONS.CAMPUS_THAPAR.latitude,
      pickupLng: CAB_LOCATIONS.CAMPUS_THAPAR.longitude,
      dropPoint: CAB_LOCATIONS.DELHI_IGI_AIRPORT.name,
      dropLat: CAB_LOCATIONS.DELHI_IGI_AIRPORT.latitude,
      dropLng: CAB_LOCATIONS.DELHI_IGI_AIRPORT.longitude,
      departureTime,
      totalSeats: 3, // Creator + 2 passengers = 3 total
      estimatedFare: 800,
      note: 'Heading to Delhi Airport Terminal 3 for Diwali break. Split fuel & toll.',
      autoJoinEnabled: false,
    });

    const createCabRes = await creator.client.post('/cabs', cabData);
    expect([200, 201]).toContain(createCabRes.status);
    const cabId = createCabRes.data.id;
    expect(cabId).toBeDefined();
    expect(createCabRes.data.seatsTaken || createCabRes.data.seats_taken).toBe(1);

    // 2. Student 2 and Student 3 log in and perform spatial distance search near Delhi Airport
    const student2 = await createTestUserSession({
      onboard: true,
      name: 'Aarav Patel',
      hostel: 'Hostel M',
    });
    const student3 = await createTestUserSession({
      onboard: true,
      name: 'Simran Kaur',
      hostel: 'Hostel PG',
    });

    const spatialSearchRes = await student2.client.get('/cabs', {
      params: {
        searchLat: CAB_LOCATIONS.DELHI_IGI_AIRPORT.latitude,
        searchLng: CAB_LOCATIONS.DELHI_IGI_AIRPORT.longitude,
        minSeats: 1,
      },
    });
    expect(spatialSearchRes.status).toBe(200);

    const cabList: any[] = Array.isArray(spatialSearchRes.data)
      ? spatialSearchRes.data
      : spatialSearchRes.data?.content || [];

    const foundCab = cabList.find((c: any) => c.id === cabId);
    expect(foundCab).toBeDefined();
    // Verify distance is calculated and returned in km
    if (foundCab.distanceKm !== undefined) {
      expect(foundCab.distanceKm).toBeLessThan(10); // Searched at the exact airport drop coords
    }

    // 3. Student 2 and Student 3 submit join requests
    const joinReq2 = await student2.client.post(`/cabs/${cabId}/join`, {
      seatsRequested: 1,
      note: 'I have flight at 6 PM, will carry 1 handbag',
    });
    expect([200, 201]).toContain(joinReq2.status);
    const memberId2 = joinReq2.data.id;

    const joinReq3 = await student3.client.post(`/cabs/${cabId}/join`, {
      seatsRequested: 1,
      note: 'Flight at 7 PM from T3',
    });
    expect([200, 201]).toContain(joinReq3.status);
    const memberId3 = joinReq3.data.id;

    // 4. Creator reviews group details and accepts both students
    const cabDetailsBeforeAccept = await creator.client.get(`/cabs/${cabId}`);
    expect(cabDetailsBeforeAccept.status).toBe(200);

    const acceptRes2 = await creator.client.post(
      `/cabs/${cabId}/members/${memberId2}/accept`
    );
    expect([200, 204]).toContain(acceptRes2.status);

    const acceptRes3 = await creator.client.post(
      `/cabs/${cabId}/members/${memberId3}/accept`
    );
    expect([200, 204]).toContain(acceptRes3.status);

    // 5. Cab Group transitions to FULL status (3/3 seats filled)
    const cabDetailsAfterAccept = await creator.client.get(`/cabs/${cabId}`);
    expect(cabDetailsAfterAccept.status).toBe(200);
    expect(cabDetailsAfterAccept.data.status).toBe('FULL');
    expect(
      cabDetailsAfterAccept.data.seatsTaken || cabDetailsAfterAccept.data.seats_taken
    ).toBe(3);

    // 6. Overbooking prevention: Student 4 attempts to join FULL cab -> 409 Conflict
    const student4 = await createTestUserSession({ onboard: true });
    const overbookRes = await student4.client.post(
      `/cabs/${cabId}/join`,
      { seatsRequested: 1 },
      { validateStatus: () => true }
    );
    expect(overbookRes.status).toBe(409);

    // 7. Confirmed participants communicate via STOMP WebSocket in the CAB_GROUP thread
    const convRes = await student2.client.post('/chat/conversations', {
      contextType: 'CAB_GROUP',
      contextId: cabId,
      recipientId: creator.user.id,
    });
    expect([200, 201]).toContain(convRes.status);
    const convId = convRes.data.id;

    const creatorStomp = creator.createStompClient();
    const student2Stomp = student2.createStompClient();

    try {
      await Promise.all([creatorStomp.connect(), student2Stomp.connect()]);

      const msgPromise = creatorStomp.waitForMessage(
        `/topic/conversation/${convId}`,
        (msg) => msg.content === 'Cab booked with Ola, car number PB11-AB-1234'
      );

      student2Stomp.sendChatMessage(
        convId,
        'Cab booked with Ola, car number PB11-AB-1234'
      );

      const received = await msgPromise;
      expect(received.content).toBe('Cab booked with Ola, car number PB11-AB-1234');
    } finally {
      await Promise.all([
        creatorStomp.disconnect().catch(() => {}),
        student2Stomp.disconnect().catch(() => {}),
      ]);
    }

    // 8. Unified inbox shows the active cab thread for creator
    const inbox = await creator.client.get('/chat/conversations');
    expect(inbox.status).toBe(200);
    const threads: any[] = Array.isArray(inbox.data)
      ? inbox.data
      : inbox.data?.content || [];
    expect(threads.some((t: any) => t.id === convId)).toBe(true);
  });

  it('should verify creator details on cab card: phone link, hostel, and chat accessibility', async () => {
    const creator = await createTestUserSession({
      onboard: true,
      name: 'Aditya Verma',
      hostel: 'Hostel H',
      phoneNumber: '9888877777',
    });
    const cabRes = await creator.client.post('/cabs', createCabPayload());
    const cabId = cabRes.data.id;

    const seeker = await createTestUserSession({ onboard: true });
    const detailRes = await seeker.client.get(`/cabs/${cabId}`);
    expect(detailRes.status).toBe(200);

    const cab = detailRes.data;
    // On open cab card, creator's phone and hostel must be available for direct contact
    expect(cab.creator).toBeDefined();
    expect(cab.creator.hostel || cab.hostel).toBeDefined();
    expect(cab.creator.phoneNumber || cab.creator.phone).toBeDefined();
  });
});
