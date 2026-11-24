import { describe, it, expect } from 'vitest';
import { CONFIG } from './config/index';
import {
  ApiClient,
  createApiClient,
  defaultApiClient,
} from './helpers/apiClient';
import {
  StompTestClient,
  createStompClient,
} from './helpers/stompClient';
import {
  devLogin,
  devLoginUser,
  devLoginAdmin,
  onboardUser,
  getCurrentUser,
  createTestUserSession,
} from './helpers/authHelper';
import {
  HOSTELS,
  CAB_LOCATIONS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  generateThaparEmail,
  generateNonThaparEmail,
  randomValidPhone,
  randomInvalidPhone,
  randomHostel,
  generateUserFixture,
  createCabPayload,
  createListingPayload,
  createMockImage,
} from './helpers/dataFactory';

describe('E2E Scaffolding & Shared Harness Smoke Tests', () => {
  describe('Config Verification', () => {
    it('should have valid BASE_URL matching REST API version 1 convention', () => {
      expect(CONFIG.BASE_URL).toBeDefined();
      expect(CONFIG.BASE_URL).toContain('/api/v1');
      expect(CONFIG.BASE_URL.startsWith('http')).toBe(true);
    });

    it('should have valid WS_URL matching WebSocket convention', () => {
      expect(CONFIG.WS_URL).toBeDefined();
      expect(CONFIG.WS_URL).toMatch(/^wss?:\/\//);
      expect(CONFIG.WS_URL).toContain('/ws');
    });

    it('should have positive default timeouts', () => {
      expect(CONFIG.DEFAULT_TIMEOUT).toBeGreaterThan(0);
      expect(CONFIG.REQUEST_TIMEOUT).toBeGreaterThan(0);
      expect(CONFIG.WS_TIMEOUT).toBeGreaterThan(0);
    });
  });

  describe('Data Factory Verification', () => {
    it('should generate valid @thapar.edu emails', () => {
      for (let i = 0; i < 5; i++) {
        const email = generateThaparEmail();
        expect(email).toMatch(/^[a-zA-Z0-9._%+-]+@thapar\.edu$/);
        expect(email.endsWith('@thapar.edu')).toBe(true);
      }
    });

    it('should generate non-thapar emails for negative testing', () => {
      const gmail = generateNonThaparEmail('gmail.com');
      expect(gmail.endsWith('@gmail.com')).toBe(true);
      expect(gmail.endsWith('@thapar.edu')).toBe(false);

      const yahoo = generateNonThaparEmail('yahoo.com');
      expect(yahoo.endsWith('@yahoo.com')).toBe(true);
    });

    it('should generate valid 10-digit Indian phone numbers starting with 6-9', () => {
      const phoneRegex = /^[6-9]\d{9}$/;
      for (let i = 0; i < 10; i++) {
        const phone = randomValidPhone();
        expect(phone).toMatch(phoneRegex);
        expect(phone.length).toBe(10);
      }
    });

    it('should generate invalid phone numbers that fail phone validation', () => {
      const phoneRegex = /^[6-9]\d{9}$/;
      expect(randomInvalidPhone('short')).not.toMatch(phoneRegex);
      expect(randomInvalidPhone('long')).not.toMatch(phoneRegex);
      expect(randomInvalidPhone('alpha')).not.toMatch(phoneRegex);
      expect(randomInvalidPhone('invalid_start')).not.toMatch(phoneRegex);
    });

    it('should contain campus hostels list and select valid hostels', () => {
      expect(HOSTELS.length).toBeGreaterThan(5);
      expect(HOSTELS).toContain('Hostel J');
      expect(HOSTELS).toContain('Hostel M');
      expect(HOSTELS).toContain('Hostel PG');
      expect(HOSTELS).toContain('Hostel N');

      const selected = randomHostel();
      expect(HOSTELS).toContain(selected);
    });

    it('should define accurate geo-coordinates for campus and travel hubs', () => {
      // Campus Thapar
      expect(CAB_LOCATIONS.CAMPUS_THAPAR.latitude).toBeCloseTo(30.3533, 3);
      expect(CAB_LOCATIONS.CAMPUS_THAPAR.longitude).toBeCloseTo(76.3686, 3);

      // Patiala Bus Stand
      expect(CAB_LOCATIONS.PATIALA_BUS_STAND.latitude).toBeCloseTo(30.3256, 3);
      expect(CAB_LOCATIONS.PATIALA_BUS_STAND.longitude).toBeCloseTo(76.4022, 3);

      // Rajpura
      expect(CAB_LOCATIONS.RAJPURA.latitude).toBeCloseTo(30.484, 3);
      expect(CAB_LOCATIONS.RAJPURA.longitude).toBeCloseTo(76.5938, 3);

      // Chandigarh Airport
      expect(CAB_LOCATIONS.CHANDIGARH_AIRPORT.latitude).toBeCloseTo(30.6735, 3);
      expect(CAB_LOCATIONS.CHANDIGARH_AIRPORT.longitude).toBeCloseTo(76.7885, 3);

      // Delhi IGI Airport
      expect(CAB_LOCATIONS.DELHI_IGI_AIRPORT.latitude).toBeCloseTo(28.5562, 3);
      expect(CAB_LOCATIONS.DELHI_IGI_AIRPORT.longitude).toBeCloseTo(77.1, 3);
    });

    it('should define all 7 required marketplace categories', () => {
      const expected = [
        'Cycle',
        'Calculator',
        'Books',
        'Electronics',
        'Furniture',
        'Hostel essentials',
        'Other',
      ];
      for (const cat of expected) {
        expect(MARKETPLACE_CATEGORIES).toContain(cat);
      }
      expect(MARKETPLACE_CATEGORIES.length).toBe(7);
    });

    it('should define all 4 marketplace item conditions', () => {
      const expected = ['New', 'Like new', 'Used', 'Heavily used'];
      for (const cond of expected) {
        expect(MARKETPLACE_CONDITIONS).toContain(cond);
      }
      expect(MARKETPLACE_CONDITIONS.length).toBe(4);
    });

    it('should generate genuine 1x1 PNG image with standard PNG header', () => {
      const img = createMockImage('test.png');
      expect(img.filename).toBe('test.png');
      expect(img.mimetype).toBe('image/png');
      expect(img.buffer).toBeInstanceOf(Buffer);
      expect(img.buffer.length).toBeGreaterThan(0);

      // Verify PNG magic numbers: 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
      const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(img.buffer.subarray(0, 8)).toEqual(pngMagic);
    });

    it('should build a valid Cab group payload with future departure time', () => {
      const cab = createCabPayload();
      expect(cab.pickupPoint).toBe(CAB_LOCATIONS.CAMPUS_THAPAR.name);
      expect(cab.dropPoint).toBe(CAB_LOCATIONS.CHANDIGARH_AIRPORT.name);
      expect(cab.totalSeats).toBe(4);
      expect(cab.estimatedFare).toBeGreaterThan(0);

      const depDate = new Date(cab.departureTime);
      expect(depDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should build a valid Marketplace listing payload', () => {
      const listing = createListingPayload();
      expect(listing.title).toBeDefined();
      expect(listing.price).toBeGreaterThan(0);
      expect(MARKETPLACE_CATEGORIES).toContain(listing.category);
      expect(MARKETPLACE_CONDITIONS).toContain(listing.condition);
      expect(HOSTELS).toContain(listing.hostel);
    });

    it('should generate complete UserFixture with valid constraints', () => {
      const user = generateUserFixture();
      expect(user.email.endsWith('@thapar.edu')).toBe(true);
      expect(user.phoneNumber).toMatch(/^[6-9]\d{9}$/);
      expect(HOSTELS).toContain(user.hostel);
      expect(user.rollNumber).toBeDefined();
    });
  });

  describe('ApiClient Helper Verification', () => {
    it('should instantiate ApiClient with token and cookies management', () => {
      const client = createApiClient('mock-jwt-token');
      expect(client).toBeInstanceOf(ApiClient);
      expect(client.getAuthToken()).toBe('mock-jwt-token');

      // Test updating token
      client.setAuthToken('new-token');
      expect(client.getAuthToken()).toBe('new-token');

      // Test cookie management
      client.setCookie('session', 'xyz123');
      expect(client.getCookie('session')).toBe('xyz123');
      expect(client.getCookieHeader()).toBe('session=xyz123');

      client.clearCookies();
      expect(client.getCookie('session')).toBeUndefined();
      expect(client.getCookieHeader()).toBe('');
    });

    it('should have all expected HTTP methods', () => {
      const client = defaultApiClient;
      expect(typeof client.get).toBe('function');
      expect(typeof client.post).toBe('function');
      expect(typeof client.put).toBe('function');
      expect(typeof client.patch).toBe('function');
      expect(typeof client.delete).toBe('function');
      expect(typeof client.uploadMultipart).toBe('function');
      expect(typeof client.request).toBe('function');
      expect(typeof client.getAxiosInstance).toBe('function');
    });
  });

  describe('StompTestClient Helper Verification', () => {
    it('should instantiate StompTestClient with proper defaults', () => {
      const stomp = createStompClient('mock-token');
      expect(stomp).toBeInstanceOf(StompTestClient);
      expect(stomp.isConnected()).toBe(false);
      expect(typeof stomp.connect).toBe('function');
      expect(typeof stomp.disconnect).toBe('function');
      expect(typeof stomp.subscribe).toBe('function');
      expect(typeof stomp.send).toBe('function');
      expect(typeof stomp.sendChatMessage).toBe('function');
      expect(typeof stomp.waitForMessage).toBe('function');
      expect(typeof stomp.getRawClient).toBe('function');
    });
  });

  describe('Auth Helper Functions Verification', () => {
    it('should expose all required auth and onboarding helpers', () => {
      expect(typeof devLogin).toBe('function');
      expect(typeof devLoginUser).toBe('function');
      expect(typeof devLoginAdmin).toBe('function');
      expect(typeof onboardUser).toBe('function');
      expect(typeof getCurrentUser).toBe('function');
      expect(typeof createTestUserSession).toBe('function');
    });
  });
});
