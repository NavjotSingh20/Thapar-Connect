import { MarketplaceCategory, MarketplaceCondition } from '@/types';

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  'Cycle',
  'Calculator',
  'Books',
  'Electronics',
  'Furniture',
  'Hostel essentials',
  'Other',
];

export const MARKETPLACE_CONDITIONS: MarketplaceCondition[] = [
  'New',
  'Like new',
  'Used',
  'Heavily used',
];

export const SORT_OPTIONS = [
  { label: 'Newest First', value: 'createdAt,desc' },
  { label: 'Price: Low to High', value: 'price,asc' },
  { label: 'Price: High to Low', value: 'price,desc' },
];
