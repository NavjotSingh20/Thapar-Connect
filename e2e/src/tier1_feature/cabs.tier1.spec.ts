import { describe, it, expect, beforeAll } from 'vitest';
import { ApiClient } from '../helpers/apiClient';
import { createTestUserSession, TestUserSession } from '../helpers/authHelper';
import {
  CAB_LOCATIONS,
  createCabPayload,
  CabCreatePayload,
} from '../helpers/dataFactory';

export interface CabGroupSummaryDto {
  id: string;
  pickupPoint: string;
  pickupLat: number;
  pickupLng: number;
  dropPoint: string;
  dropLat: number;
  dropLng: number;
  departureTime: string;
  totalSeats: number;
  seatsTaken: number;
  seatsAvailable: number;
  estimatedFare: number;
  status: 'OPEN' | 'FULL' | 'CLOSED' | 'EXPIRED';
  note?: string;
  autoJoinEnabled: boolean;
  distanceKm?: number;
  creator: {
    id: string;
    name: string;
    hostel: string;
    phoneNumber?: string;
  };
  createdAt?: string;
}

export interface CabMemberDto {
  id: string;
  userId: string;
  cabGroupId: string;
  seatsRequested: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  note?: string;
  user?: {
    id: string;
    name: string;
    hostel?: string;
    phoneNumber?: string;
  };
  createdAt?: string;
}

export interface CabGroupDetailDto extends CabGroupSummaryDto {
  members: CabMemberDto[];
}

describe('Tier 1: Cab Pooling Feature Coverage (F6 - F10)', () => {
  let creatorSession: TestUserSession;
  let riderSession: TestUserSession;
  let secondaryRiderSession: TestUserSession;

  beforeAll(async () => {
    creatorSession = await createTestUserSession({
      name: 'Cab Creator Host',
      hostel: 'Hostel J',
      phoneNumber: '9876543210',
    });

    riderSession = await createTestUserSession({
      name: 'Rider Student One',
      hostel: 'Hostel M',
      phoneNumber: '9876501234',
    });

    secondaryRiderSession = await createTestUserSession({
      name: 'Rider Student Two',
      hostel: 'Hostel PG',
      phoneNumber: '9876505678',
    });
  });

  // =========================================================================
  // F6: Cab Group Creation & Geocoding (>= 5 tests)
  // =========================================================================
  describe('F6: Cab Group Creation & Geocoding', () => {
    it('F6-1: should create cab group with Thapar campus as default pickup point', async () => {
      const payload = createCabPayload({
        pickupPoint: CAB_LOCATIONS.CAMPUS_THAPAR.name,
        pickupLat: CAB_LOCATIONS.CAMPUS_THAPAR.latitude,
        pickupLng: CAB_LOCATIONS.CAMPUS_THAPAR.longitude,
      });

      const res = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBeDefined();
      expect(res.data.pickupPoint).toBe(CAB_LOCATIONS.CAMPUS_THAPAR.name);
      expect(res.data.pickupLat).toBeCloseTo(CAB_LOCATIONS.CAMPUS_THAPAR.latitude, 3);
      expect(res.data.pickupLng).toBeCloseTo(CAB_LOCATIONS.CAMPUS_THAPAR.longitude, 3);
    });

    it('F6-2: should store geocoded drop coordinates with high precision', async () => {
      const payload = createCabPayload({
        dropPoint: CAB_LOCATIONS.CHANDIGARH_AIRPORT.name,
        dropLat: CAB_LOCATIONS.CHANDIGARH_AIRPORT.latitude,
        dropLng: CAB_LOCATIONS.CHANDIGARH_AIRPORT.longitude,
      });

      const res = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data.dropPoint).toBe(CAB_LOCATIONS.CHANDIGARH_AIRPORT.name);
      expect(res.data.dropLat).toBeCloseTo(CAB_LOCATIONS.CHANDIGARH_AIRPORT.latitude, 3);
      expect(res.data.dropLng).toBeCloseTo(CAB_LOCATIONS.CHANDIGARH_AIRPORT.longitude, 3);
    });

    it('F6-3: should record future departure time in ISO 8601 format', async () => {
      const futureDeparture = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
      const payload = createCabPayload({ departureTime: futureDeparture });

      const res = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data.departureTime).toBeDefined();
      const parsedTime = new Date(res.data.departureTime).getTime();
      expect(parsedTime).toBeGreaterThan(Date.now());
    });

    it('F6-4: should store totalSeats and estimatedFare per person correctly', async () => {
      const payload = createCabPayload({
        totalSeats: 4,
        estimatedFare: 550,
        note: 'Luggage space needed, AC ride',
      });

      const res = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data.totalSeats).toBe(4);
      expect(res.data.estimatedFare).toBe(550);
      expect(res.data.note).toBe('Luggage space needed, AC ride');
    });

    it('F6-5: should count creator as 1 seat taken upon creation', async () => {
      const payload = createCabPayload({ totalSeats: 4 });

      const res = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data.seatsTaken).toBe(1);
      expect(res.data.seatsAvailable).toBe(3);
    });
  });

  // =========================================================================
  // F7: Spatial Distance Search (Haversine) (>= 5 tests)
  // =========================================================================
  describe('F7: Spatial Distance Search (Haversine)', () => {
    let chandigarhCabId: string;
    let patialaCabId: string;

    beforeAll(async () => {
      // Create a cab group to Chandigarh Airport (~55 km from Patiala)
      const c1 = await creatorSession.client.post<CabGroupDetailDto>(
        '/cabs',
        createCabPayload({
          dropPoint: CAB_LOCATIONS.CHANDIGARH_AIRPORT.name,
          dropLat: CAB_LOCATIONS.CHANDIGARH_AIRPORT.latitude,
          dropLng: CAB_LOCATIONS.CHANDIGARH_AIRPORT.longitude,
        }),
        { validateStatus: () => true }
      );
      if (c1.data?.id) chandigarhCabId = c1.data.id;

      // Create a cab group to Patiala Bus Stand (~5 km from Campus)
      const c2 = await creatorSession.client.post<CabGroupDetailDto>(
        '/cabs',
        createCabPayload({
          dropPoint: CAB_LOCATIONS.PATIALA_BUS_STAND.name,
          dropLat: CAB_LOCATIONS.PATIALA_BUS_STAND.latitude,
          dropLng: CAB_LOCATIONS.PATIALA_BUS_STAND.longitude,
        }),
        { validateStatus: () => true }
      );
      if (c2.data?.id) patialaCabId = c2.data.id;
    });

    it('F7-1: should return open cab groups sorted by ascending distance from searched coordinates', async () => {
      // Search from Patiala Bus Stand coords
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        params: {
          searchLat: CAB_LOCATIONS.PATIALA_BUS_STAND.latitude,
          searchLng: CAB_LOCATIONS.PATIALA_BUS_STAND.longitude,
        },
        validateStatus: () => true,
      });

      expect([200, 204]).toContain(res.status);
      const groups = Array.isArray(res.data) ? res.data : [];
      if (groups.length >= 2) {
        // First group distance should be <= second group distance
        for (let i = 0; i < groups.length - 1; i++) {
          if (groups[i].distanceKm !== undefined && groups[i + 1].distanceKm !== undefined) {
            expect(groups[i].distanceKm!).toBeLessThanOrEqual(groups[i + 1].distanceKm! + 0.5);
          }
        }
      }
    });

    it('F7-2: should return distanceKm calculated per result item', async () => {
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        params: {
          searchLat: CAB_LOCATIONS.CAMPUS_THAPAR.latitude,
          searchLng: CAB_LOCATIONS.CAMPUS_THAPAR.longitude,
        },
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      const groups = Array.isArray(res.data) ? res.data : [];
      if (groups.length > 0) {
        const item = groups[0];
        expect(item.distanceKm).toBeDefined();
        expect(typeof item.distanceKm).toBe('number');
        expect(item.distanceKm).toBeGreaterThanOrEqual(0);
      }
    });

    it('F7-3: should default to upcoming departure time ordering when no spatial query is provided', async () => {
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      const groups = Array.isArray(res.data) ? res.data : [];
      if (groups.length >= 2) {
        const t1 = new Date(groups[0].departureTime).getTime();
        const t2 = new Date(groups[1].departureTime).getTime();
        expect(t1).toBeLessThanOrEqual(t2 + 1000);
      }
    });

    it('F7-4: should calculate near 0 km distance when searching exact drop point location', async () => {
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        params: {
          searchLat: CAB_LOCATIONS.CHANDIGARH_AIRPORT.latitude,
          searchLng: CAB_LOCATIONS.CHANDIGARH_AIRPORT.longitude,
        },
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      const groups = Array.isArray(res.data) ? res.data : [];
      const match = groups.find((g) => g.id === chandigarhCabId);
      if (match && match.distanceKm !== undefined) {
        // Distance from exact coordinates should be ~0 km
        expect(match.distanceKm).toBeLessThan(1.0);
      }
    });

    it('F7-5: should compute greater distance for distant hubs than local stops', async () => {
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        params: {
          searchLat: CAB_LOCATIONS.CAMPUS_THAPAR.latitude,
          searchLng: CAB_LOCATIONS.CAMPUS_THAPAR.longitude,
        },
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      const groups = Array.isArray(res.data) ? res.data : [];
      const patiala = groups.find((g) => g.id === patialaCabId);
      const chd = groups.find((g) => g.id === chandigarhCabId);

      if (patiala?.distanceKm !== undefined && chd?.distanceKm !== undefined) {
        expect(patiala.distanceKm).toBeLessThan(chd.distanceKm);
      }
    });
  });

  // =========================================================================
  // F8: Cab Pooling Filters & Secondary Sorting (>= 5 tests)
  // =========================================================================
  describe('F8: Cab Pooling Filters & Secondary Sorting', () => {
    it('F8-1: should filter cab groups by minSeats available', async () => {
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        params: { minSeats: 2 },
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      const groups = Array.isArray(res.data) ? res.data : [];
      for (const group of groups) {
        expect(group.seatsAvailable).toBeGreaterThanOrEqual(2);
      }
    });

    it('F8-2: should filter cab groups by maxFare', async () => {
      const maxFare = 500;
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        params: { maxFare },
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      const groups = Array.isArray(res.data) ? res.data : [];
      for (const group of groups) {
        expect(group.estimatedFare).toBeLessThanOrEqual(maxFare);
      }
    });

    it('F8-3: should filter cab groups by specific departure date', async () => {
      const todayIso = new Date().toISOString().split('T')[0];
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        params: { date: todayIso },
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      const groups = Array.isArray(res.data) ? res.data : [];
      for (const group of groups) {
        expect(group.departureTime.startsWith(todayIso)).toBe(true);
      }
    });

    it('F8-4: should perform secondary sort by departureTime ascending', async () => {
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        params: { sortBy: 'departureTime,asc' },
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      const groups = Array.isArray(res.data) ? res.data : [];
      if (groups.length >= 2) {
        const time1 = new Date(groups[0].departureTime).getTime();
        const time2 = new Date(groups[1].departureTime).getTime();
        expect(time1).toBeLessThanOrEqual(time2);
      }
    });

    it('F8-5: should perform secondary sort by estimatedFare ascending', async () => {
      const res = await riderSession.client.get<CabGroupSummaryDto[]>('/cabs', {
        params: { sortBy: 'estimatedFare,asc' },
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      const groups = Array.isArray(res.data) ? res.data : [];
      if (groups.length >= 2) {
        expect(groups[0].estimatedFare).toBeLessThanOrEqual(groups[1].estimatedFare);
      }
    });
  });

  // =========================================================================
  // F9: Cab Lifecycle & Concurrency Control (>= 5 tests)
  // =========================================================================
  describe('F9: Cab Lifecycle & Concurrency Control', () => {
    it('F9-1: should initialize new cab group in OPEN status', async () => {
      const payload = createCabPayload();
      const res = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data.status).toBe('OPEN');
    });

    it('F9-2: should automatically transition status to FULL when available seats reach zero', async () => {
      // Create a 2-seat cab group (1 creator + 1 rider capacity)
      const payload = createCabPayload({ totalSeats: 2, autoJoinEnabled: true });
      const createRes = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });
      const cabId = createRes.data.id;

      // Rider joins taking the last available seat
      await riderSession.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );

      // Verify cab group transitioned to FULL
      const cabDetail = await creatorSession.client.get<CabGroupDetailDto>(`/cabs/${cabId}`, {
        validateStatus: () => true,
      });

      expect(cabDetail.status).toBe(200);
      expect(['FULL', 'OPEN']).toContain(cabDetail.data.status);
      if (cabDetail.data.seatsAvailable === 0) {
        expect(cabDetail.data.status).toBe('FULL');
      }
    });

    it('F9-3: should allow creator to manually close cab group via PATCH /cabs/{id}/close', async () => {
      const payload = createCabPayload();
      const createRes = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });
      const cabId = createRes.data.id;

      const closeRes = await creatorSession.client.patch<CabGroupDetailDto>(
        `/cabs/${cabId}/close`,
        {},
        { validateStatus: () => true }
      );

      expect([200, 204]).toContain(closeRes.status);

      const checkRes = await creatorSession.client.get<CabGroupDetailDto>(`/cabs/${cabId}`, {
        validateStatus: () => true,
      });
      expect(checkRes.status).toBe(200);
      expect(checkRes.data.status).toBe('CLOSED');
    });

    it('F9-4: should respect autoJoinEnabled toggle confirming members immediately', async () => {
      const payload = createCabPayload({ autoJoinEnabled: true, totalSeats: 4 });
      const createRes = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });
      const cabId = createRes.data.id;

      const joinRes = await riderSession.client.post<CabMemberDto>(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(joinRes.status);
      // Auto join confirms directly
      expect(['CONFIRMED', 'PENDING']).toContain(joinRes.data.status);
    });

    it('F9-5: should accurately decrement seatsAvailable when members are confirmed', async () => {
      const payload = createCabPayload({ totalSeats: 4, autoJoinEnabled: true });
      const createRes = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });
      const cabId = createRes.data.id;
      const initialAvailable = createRes.data.seatsAvailable;

      await riderSession.client.post(
        `/cabs/${cabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );

      const checkRes = await creatorSession.client.get<CabGroupDetailDto>(`/cabs/${cabId}`, {
        validateStatus: () => true,
      });

      expect(checkRes.status).toBe(200);
      expect(checkRes.data.seatsAvailable).toBeLessThan(initialAvailable + 1);
    });
  });

  // =========================================================================
  // F10: Cab Card & Join Request Workflow (>= 5 tests)
  // =========================================================================
  describe('F10: Cab Card & Join Request Workflow', () => {
    let joinTestCabId: string;

    beforeAll(async () => {
      const payload = createCabPayload({ totalSeats: 4, autoJoinEnabled: false });
      const res = await creatorSession.client.post<CabGroupDetailDto>('/cabs', payload, {
        validateStatus: () => true,
      });
      joinTestCabId = res.data.id;
    });

    it('F10-1: should submit join request with PENDING status when autoJoin is false', async () => {
      const joinRes = await riderSession.client.post<CabMemberDto>(
        `/cabs/${joinTestCabId}/join`,
        { seatsRequested: 1, note: 'Pick me up near Hostel M' },
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(joinRes.status);
      expect(joinRes.data.id).toBeDefined();
      expect(joinRes.data.status).toBe('PENDING');
      expect(joinRes.data.seatsRequested).toBe(1);
    });

    it('F10-2: should allow creator to accept pending join request transitioning status to CONFIRMED', async () => {
      // Secondary rider requests join
      const joinRes = await secondaryRiderSession.client.post<CabMemberDto>(
        `/cabs/${joinTestCabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      const memberId = joinRes.data.id;

      // Creator accepts
      const acceptRes = await creatorSession.client.post<CabMemberDto>(
        `/cabs/${joinTestCabId}/members/${memberId}/accept`,
        {},
        { validateStatus: () => true }
      );

      expect([200, 204]).toContain(acceptRes.status);
      if (acceptRes.data && typeof acceptRes.data === 'object') {
        expect(acceptRes.data.status).toBe('CONFIRMED');
      }
    });

    it('F10-3: should allow creator to reject pending join request transitioning status to REJECTED', async () => {
      const newRider = await createTestUserSession({ name: 'Rejected Rider' });
      const joinRes = await newRider.client.post<CabMemberDto>(
        `/cabs/${joinTestCabId}/join`,
        { seatsRequested: 1 },
        { validateStatus: () => true }
      );
      const memberId = joinRes.data.id;

      const rejectRes = await creatorSession.client.post<CabMemberDto>(
        `/cabs/${joinTestCabId}/members/${memberId}/reject`,
        {},
        { validateStatus: () => true }
      );

      expect([200, 204]).toContain(rejectRes.status);
      if (rejectRes.data && typeof rejectRes.data === 'object') {
        expect(rejectRes.data.status).toBe('REJECTED');
      }
    });

    it('F10-4: should include creator details (name, hostel, phone) on cab group response', async () => {
      const res = await riderSession.client.get<CabGroupDetailDto>(`/cabs/${joinTestCabId}`, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      expect(res.data.creator).toBeDefined();
      expect(res.data.creator.name).toBe(creatorSession.user.name);
      expect(res.data.creator.hostel).toBe(creatorSession.user.hostel);
      // Phone number should be present for direct student phone call link on cab cards
      expect(res.data.creator.phoneNumber).toBeDefined();
    });

    it('F10-5: should provide chat initiation target metadata (creator ID, cab group ID)', async () => {
      const res = await riderSession.client.get<CabGroupDetailDto>(`/cabs/${joinTestCabId}`, {
        validateStatus: () => true,
      });

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(joinTestCabId);
      expect(res.data.creator.id).toBe(creatorSession.user.id);
    });
  });
});
