export const HOSTELS = [
  'Hostel J',
  'Hostel M',
  'Hostel PG',
  'Hostel N',
  'Hostel H',
  'Hostel I',
  'Hostel K',
  'Hostel L',
  'Hostel Q',
  'Hostel A',
  'Hostel B',
  'Hostel C',
  'Hostel D',
  'Hostel E',
  'Hostel FRF',
  'Hostel FRG',
] as const;

export type Hostel = typeof HOSTELS[number];

export interface GeoLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export const CAB_LOCATIONS = {
  CAMPUS_THAPAR: {
    name: 'Thapar University Campus, Patiala',
    latitude: 30.3533,
    longitude: 76.3686,
  },
  PATIALA_BUS_STAND: {
    name: 'Patiala Bus Stand',
    latitude: 30.3256,
    longitude: 76.4022,
  },
  RAJPURA: {
    name: 'Rajpura Junction',
    latitude: 30.4840,
    longitude: 76.5938,
  },
  CHANDIGARH_AIRPORT: {
    name: 'Shaheed Bhagat Singh International Airport, Chandigarh',
    latitude: 30.6735,
    longitude: 76.7885,
  },
  DELHI_IGI_AIRPORT: {
    name: 'Indira Gandhi International Airport, Delhi (IGI)',
    latitude: 28.5562,
    longitude: 77.1000,
  },
} as const;

export const MARKETPLACE_CATEGORIES = [
  'Cycle',
  'Calculator',
  'Books',
  'Electronics',
  'Furniture',
  'Hostel essentials',
  'Other',
] as const;

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number];

export const MARKETPLACE_CONDITIONS = [
  'New',
  'Like new',
  'Used',
  'Heavily used',
] as const;

export type MarketplaceCondition = typeof MARKETPLACE_CONDITIONS[number];

/**
 * Generates a valid unique @thapar.edu email
 */
export function generateThaparEmail(prefix: string = 'student'): string {
  const timestamp = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return `${prefix}.${timestamp}.${rand}@thapar.edu`;
}

/**
 * Generates an invalid non-thapar email for negative auth testing
 */
export function generateNonThaparEmail(
  domain: string = 'gmail.com',
  prefix: string = 'outsider'
): string {
  const timestamp = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return `${prefix}.${timestamp}.${rand}@${domain}`;
}

/**
 * Generates a valid 10-digit Indian phone number starting with 6, 7, 8, or 9
 */
export function randomValidPhone(): string {
  const firstDigit = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
  const rest = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${firstDigit}${rest}`;
}

/**
 * Generates invalid phone numbers for boundary testing
 */
export function randomInvalidPhone(type: 'short' | 'long' | 'alpha' | 'invalid_start' = 'invalid_start'): string {
  switch (type) {
    case 'short':
      return '98765';
    case 'long':
      return '9876543210123';
    case 'alpha':
      return '98765abcde';
    case 'invalid_start':
    default:
      return '5' + Math.floor(100000000 + Math.random() * 900000000).toString();
  }
}

/**
 * Returns a random campus hostel
 */
export function randomHostel(): Hostel {
  return HOSTELS[Math.floor(Math.random() * HOSTELS.length)];
}

export interface UserFixture {
  email: string;
  name: string;
  phoneNumber: string;
  hostel: Hostel;
  rollNumber: string;
  branch: string;
  year: number;
}

export function generateUserFixture(overrides: Partial<UserFixture> = {}): UserFixture {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return {
    email: generateThaparEmail(),
    name: `Student ${rand}`,
    phoneNumber: randomValidPhone(),
    hostel: randomHostel(),
    rollNumber: `102103${rand.toString().substring(0, 3)}`,
    branch: 'COE',
    year: 3,
    ...overrides,
  };
}

export interface CabCreatePayload {
  pickupPoint: string;
  pickupLat: number;
  pickupLng: number;
  dropPoint: string;
  dropLat: number;
  dropLng: number;
  departureTime: string;
  totalSeats: number;
  estimatedFare: number;
  note?: string;
  autoJoinEnabled?: boolean;
}

export function createCabPayload(
  overrides: Partial<CabCreatePayload> = {}
): CabCreatePayload {
  const departureDate = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now
  return {
    pickupPoint: CAB_LOCATIONS.CAMPUS_THAPAR.name,
    pickupLat: CAB_LOCATIONS.CAMPUS_THAPAR.latitude,
    pickupLng: CAB_LOCATIONS.CAMPUS_THAPAR.longitude,
    dropPoint: CAB_LOCATIONS.CHANDIGARH_AIRPORT.name,
    dropLat: CAB_LOCATIONS.CHANDIGARH_AIRPORT.latitude,
    dropLng: CAB_LOCATIONS.CHANDIGARH_AIRPORT.longitude,
    departureTime: departureDate.toISOString(),
    totalSeats: 4,
    estimatedFare: 450,
    note: 'Ride to Chandigarh Airport. Split fare evenly.',
    autoJoinEnabled: false,
    ...overrides,
  };
}

export interface ListingCreatePayload {
  title: string;
  category: MarketplaceCategory;
  description: string;
  condition: MarketplaceCondition;
  price: number;
  hostel: string;
}

export function createListingPayload(
  overrides: Partial<ListingCreatePayload> = {}
): ListingCreatePayload {
  return {
    title: 'Hero Sprint Pro 21-Speed Mountain Bike',
    category: 'Cycle',
    description: 'Lightly used mountain bike, dual disc brakes, recently tuned.',
    condition: 'Like new',
    price: 3500,
    hostel: 'Hostel J',
    ...overrides,
  };
}

export interface MockImageFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

/**
 * Creates a genuine, valid 1x1 PNG image buffer with valid PNG magic numbers
 */
export function createMockImage(
  filename: string = 'test-image.png',
  mimetype: string = 'image/png'
): MockImageFile {
  // Base64 of a genuine 1x1 pixel PNG (starts with \x89PNG\r\n\x1a\n)
  const base64Png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(base64Png, 'base64');
  return {
    buffer,
    filename,
    mimetype,
  };
}
