export interface HostelOption {
  id: string;
  name: string;
  category: 'BOYS' | 'GIRLS' | 'OTHER';
}

export const TIET_HOSTELS: HostelOption[] = [
  // Boys Hostels
  { id: 'Agira Hall (Hostel A)', name: 'Agira Hall (Hostel A)', category: 'BOYS' },
  { id: 'Amritam Hall (Hostel B)', name: 'Amritam Hall (Hostel B)', category: 'BOYS' },
  { id: 'Prithvi Hall (Hostel C)', name: 'Prithvi Hall (Hostel C)', category: 'BOYS' },
  { id: 'Neeram Hall (Hostel D)', name: 'Neeram Hall (Hostel D)', category: 'BOYS' },
  { id: 'Vyan Hall (Hostel H)', name: 'Vyan Hall (Hostel H)', category: 'BOYS' },
  { id: 'Tejas Hall (Hostel J)', name: 'Tejas Hall (Hostel J)', category: 'BOYS' },
  { id: 'Ambaram Hall (Hostel K)', name: 'Ambaram Hall (Hostel K)', category: 'BOYS' },
  { id: 'Viyat Hall (Hostel L)', name: 'Viyat Hall (Hostel L)', category: 'BOYS' },
  { id: 'Anantam Hall (Hostel M)', name: 'Anantam Hall (Hostel M)', category: 'BOYS' },
  { id: 'Vyom Hall (Hostel O)', name: 'Vyom Hall (Hostel O)', category: 'BOYS' },
  { id: 'Hostel FRF/G', name: 'Hostel FRF/G', category: 'BOYS' },

  // Girls Hostels
  { id: 'Vasudha Hall - Block E (Hostel E)', name: 'Vasudha Hall - Block E (Hostel E)', category: 'GIRLS' },
  { id: 'Vasudha Hall - Block G (Hostel G)', name: 'Vasudha Hall - Block G (Hostel G)', category: 'GIRLS' },
  { id: 'Ira Hall (Hostel I)', name: 'Ira Hall (Hostel I)', category: 'GIRLS' },
  { id: 'Ananta Hall (Hostel N)', name: 'Ananta Hall (Hostel N)', category: 'GIRLS' },
  { id: 'Dhriti Hall (Hostel PG)', name: 'Dhriti Hall (Hostel PG)', category: 'GIRLS' },
  { id: 'Vahni Hall (Hostel Q)', name: 'Vahni Hall (Hostel Q)', category: 'GIRLS' },
  { id: 'Pavani Hall (Hostel PG-2)', name: 'Pavani Hall (Hostel PG-2)', category: 'GIRLS' },

  // Day Scholar
  { id: 'Day Scholar', name: 'Day Scholar (Non-Hostelite)', category: 'OTHER' },
];

export const HOSTEL_NAME_MAP: Record<string, string> = {
  // Boys Hostels
  'agira hall': 'Agira Hall (Hostel A)',
  'agira hall (hostel a)': 'Agira Hall (Hostel A)',
  'agira hall (previously known as hostel-a)': 'Agira Hall (Hostel A)',
  'hostel a': 'Agira Hall (Hostel A)',
  'hostel-a': 'Agira Hall (Hostel A)',

  'amritam hall': 'Amritam Hall (Hostel B)',
  'amritam hall (hostel b)': 'Amritam Hall (Hostel B)',
  'amritam hall (previously known as hostel-b)': 'Amritam Hall (Hostel B)',
  'hostel b': 'Amritam Hall (Hostel B)',
  'hostel-b': 'Amritam Hall (Hostel B)',

  'prithvi hall': 'Prithvi Hall (Hostel C)',
  'prithvi hall (hostel c)': 'Prithvi Hall (Hostel C)',
  'prithvi hall (previously known as hostel-c)': 'Prithvi Hall (Hostel C)',
  'hostel c': 'Prithvi Hall (Hostel C)',
  'hostel-c': 'Prithvi Hall (Hostel C)',

  'neeram hall': 'Neeram Hall (Hostel D)',
  'neeram hall (hostel d)': 'Neeram Hall (Hostel D)',
  'neeram hall (previously known as hostel-d)': 'Neeram Hall (Hostel D)',
  'hostel d': 'Neeram Hall (Hostel D)',
  'hostel-d': 'Neeram Hall (Hostel D)',

  'vyan hall': 'Vyan Hall (Hostel H)',
  'vyan hall (hostel h)': 'Vyan Hall (Hostel H)',
  'vyan hall (previously known as hostel-h)': 'Vyan Hall (Hostel H)',
  'hostel h': 'Vyan Hall (Hostel H)',
  'hostel-h': 'Vyan Hall (Hostel H)',

  'tejas hall': 'Tejas Hall (Hostel J)',
  'tejas hall (hostel j)': 'Tejas Hall (Hostel J)',
  'tejas hall (previously known as hostel-j)': 'Tejas Hall (Hostel J)',
  'hostel j': 'Tejas Hall (Hostel J)',
  'hostel-j': 'Tejas Hall (Hostel J)',

  'ambaram hall': 'Ambaram Hall (Hostel K)',
  'ambaram hall (hostel k)': 'Ambaram Hall (Hostel K)',
  'ambaram hall (previously known as hostel-k)': 'Ambaram Hall (Hostel K)',
  'hostel k': 'Ambaram Hall (Hostel K)',
  'hostel-k': 'Ambaram Hall (Hostel K)',

  'viyat hall': 'Viyat Hall (Hostel L)',
  'viyat hall (hostel l)': 'Viyat Hall (Hostel L)',
  'viyat hall (previously known as hostel-l)': 'Viyat Hall (Hostel L)',
  'hostel l': 'Viyat Hall (Hostel L)',
  'hostel-l': 'Viyat Hall (Hostel L)',

  'anantam hall': 'Anantam Hall (Hostel M)',
  'anantam hall (hostel m)': 'Anantam Hall (Hostel M)',
  'anantam hall (previously known as hostel-m)': 'Anantam Hall (Hostel M)',
  'hostel m': 'Anantam Hall (Hostel M)',
  'hostel-m': 'Anantam Hall (Hostel M)',

  'vyom hall': 'Vyom Hall (Hostel O)',
  'vyom hall (hostel o)': 'Vyom Hall (Hostel O)',
  'vyom hall (previously known as hostel-o)': 'Vyom Hall (Hostel O)',
  'hostel o': 'Vyom Hall (Hostel O)',
  'hostel-o': 'Vyom Hall (Hostel O)',

  'hostel frf': 'Hostel FRF/G',
  'hostel frg': 'Hostel FRF/G',
  'hostel-frf/g': 'Hostel FRF/G',
  'hostel frf/g': 'Hostel FRF/G',
  'fraser hostel': 'Hostel FRF/G',
  'fraser hall': 'Hostel FRF/G',
  'mother teresa hostel': 'Hostel FRF/G',

  // Girls Hostels
  'vasudha hall - block e': 'Vasudha Hall - Block E (Hostel E)',
  'vasudha hall - block e (hostel e)': 'Vasudha Hall - Block E (Hostel E)',
  'vasudha hall - block e (previously known as hostel-e)': 'Vasudha Hall - Block E (Hostel E)',
  'hostel e': 'Vasudha Hall - Block E (Hostel E)',
  'hostel-e': 'Vasudha Hall - Block E (Hostel E)',

  'vasudha hall - block g': 'Vasudha Hall - Block G (Hostel G)',
  'vasudha hall - block g (hostel g)': 'Vasudha Hall - Block G (Hostel G)',
  'vasudha hall - block g (previously known as hostel-g)': 'Vasudha Hall - Block G (Hostel G)',
  'hostel g': 'Vasudha Hall - Block G (Hostel G)',
  'hostel-g': 'Vasudha Hall - Block G (Hostel G)',

  'ira hall': 'Ira Hall (Hostel I)',
  'ira hall (hostel i)': 'Ira Hall (Hostel I)',
  'ira hall (previously known as hostel-i)': 'Ira Hall (Hostel I)',
  'hostel i': 'Ira Hall (Hostel I)',
  'hostel-i': 'Ira Hall (Hostel I)',

  'ananta hall': 'Ananta Hall (Hostel N)',
  'ananta hall (hostel n)': 'Ananta Hall (Hostel N)',
  'ananta hall (previously known as hostel-n)': 'Ananta Hall (Hostel N)',
  'hostel n': 'Ananta Hall (Hostel N)',
  'hostel-n': 'Ananta Hall (Hostel N)',

  'dhriti hall': 'Dhriti Hall (Hostel PG)',
  'dhriti hall (hostel pg)': 'Dhriti Hall (Hostel PG)',
  'dhriti hall (hostel-pg)': 'Dhriti Hall (Hostel PG)',
  'hostel pg': 'Dhriti Hall (Hostel PG)',
  'hostel-pg': 'Dhriti Hall (Hostel PG)',

  'vahni hall': 'Vahni Hall (Hostel Q)',
  'vahni hall (hostel q)': 'Vahni Hall (Hostel Q)',
  'vahni hall (previously known as hostel-q)': 'Vahni Hall (Hostel Q)',
  'hostel q': 'Vahni Hall (Hostel Q)',
  'hostel-q': 'Vahni Hall (Hostel Q)',

  'pavani hall': 'Pavani Hall (Hostel PG-2)',
  'pavani hall (hostel pg-2)': 'Pavani Hall (Hostel PG-2)',
  'pavani hall (previously known as pg-2)': 'Pavani Hall (Hostel PG-2)',
  'hostel-pavani hall': 'Pavani Hall (Hostel PG-2)',
  'hostel-pavani hall (previously known as pg-2)': 'Pavani Hall (Hostel PG-2)',
  'hostel-pavani hall (previously known as hostel-pg-2)': 'Pavani Hall (Hostel PG-2)',
  'hostel pg-2': 'Pavani Hall (Hostel PG-2)',
  'hostel-pg-2': 'Pavani Hall (Hostel PG-2)',
  'hostel pg2': 'Pavani Hall (Hostel PG-2)',

  'day scholar': 'Day Scholar (Non-Hostelite)',
  'day scholar (non-hostelite)': 'Day Scholar (Non-Hostelite)',
};

export function formatHostelName(hostel?: string | null): string {
  if (!hostel) return '';
  const trimmed = hostel.trim();
  const lower = trimmed.toLowerCase();
  if (HOSTEL_NAME_MAP[lower]) {
    return HOSTEL_NAME_MAP[lower];
  }

  // Handle dynamic strings like "Agira Hall (Previously known as Hostel-A)"
  const prevKnownMatch = trimmed.match(/^(.+?)\s*\((?:previously\s+known\s+as\s+)?hostel[-\s]*([a-z0-9\/-]+)\)$/i);
  if (prevKnownMatch) {
    const hallName = prevKnownMatch[1].trim();
    const rawCode = prevKnownMatch[2].trim().toUpperCase();
    const cleanCode = rawCode.startsWith('PG') ? rawCode : rawCode.replace('-', '');
    return `${hallName} (Hostel ${cleanCode})`;
  }

  return trimmed;
}

export const TIET_BRANCHES = [
  'Computer Engineering (COE)',
  'Computer Science and Engineering (CSE)',
  'Computer Science and Business Systems (CSBS)',
  'Electronics and Communication Engineering (ECE)',
  'Electronics (Instrumentation and Control) Engineering (EIC)',
  'Electrical Engineering (EE)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Chemical Engineering (CHE)',
  'Biotechnology (BT)',
  'Other / Postgraduate / PhD',
];

export const STUDY_YEARS = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
  { value: 5, label: '5th Year / PG' },
];

export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export function isValidIndianPhone(phone: string): boolean {
  return INDIAN_PHONE_REGEX.test(phone.trim());
}
