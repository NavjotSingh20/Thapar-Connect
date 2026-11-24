export interface HostelOption {
  id: string;
  name: string;
  category: 'BOYS' | 'GIRLS' | 'OTHER';
}

export const TIET_HOSTELS: HostelOption[] = [
  // Boys Hostels
  { id: 'Hostel A', name: 'Hostel A', category: 'BOYS' },
  { id: 'Hostel B', name: 'Hostel B', category: 'BOYS' },
  { id: 'Hostel C', name: 'Hostel C', category: 'BOYS' },
  { id: 'Hostel D', name: 'Hostel D', category: 'BOYS' },
  { id: 'Hostel E', name: 'Hostel E', category: 'BOYS' },
  { id: 'Hostel H', name: 'Hostel H', category: 'BOYS' },
  { id: 'Hostel J', name: 'Hostel J', category: 'BOYS' },
  { id: 'Hostel K', name: 'Hostel K', category: 'BOYS' },
  { id: 'Hostel L', name: 'Hostel L', category: 'BOYS' },
  { id: 'Hostel M', name: 'Hostel M', category: 'BOYS' },
  { id: 'Hostel N', name: 'Hostel N', category: 'BOYS' },
  { id: 'Hostel O', name: 'Hostel O', category: 'BOYS' },
  { id: 'Hostel Q', name: 'Hostel Q', category: 'BOYS' },
  { id: 'Hostel PG', name: 'Hostel PG', category: 'BOYS' },
  { id: 'Hostel FRF', name: 'Hostel FRF', category: 'BOYS' },

  // Girls Hostels
  { id: 'Hostel G', name: 'Hostel G', category: 'GIRLS' },
  { id: 'Hostel I', name: 'Hostel I', category: 'GIRLS' },
  { id: 'Fraser Hostel', name: 'Fraser Hostel', category: 'GIRLS' },
  { id: 'Mother Teresa Hostel', name: 'Mother Teresa Hostel', category: 'GIRLS' },
  { id: 'Hostel FRG', name: 'Hostel FRG', category: 'GIRLS' },

  // Day Scholar
  { id: 'Day Scholar', name: 'Day Scholar (Non-Hostelite)', category: 'OTHER' },
];

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
