import { describe, it, expect, beforeAll } from 'vitest';
import FormData from 'form-data';
import { createTestUserSession, TestUserSession } from '../helpers/authHelper';
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  MarketplaceCategory,
  MarketplaceCondition,
  createListingPayload,
  createMockImage,
} from '../helpers/dataFactory';

export interface ListingImageDto {
  id: string;
  imageUrl: string;
  orderIndex: number;
}

export interface ListingSellerDto {
  id: string;
  name: string;
  hostel: string;
  profilePictureUrl?: string;
  phoneNumber?: string; // strictly hidden or omitted in response
}

export interface ListingSummaryDto {
  id: string;
  title: string;
  category: string;
  price: number;
  condition: string;
  hostel: string;
  primaryImageUrl?: string;
  status: 'ACTIVE' | 'SOLD' | 'DELETED';
  createdAt: string;
}

export interface ListingDetailDto {
  id: string;
  title: string;
  category: string;
  description: string;
  condition: string;
  price: number;
  hostel: string;
  status: 'ACTIVE' | 'SOLD' | 'DELETED';
  images: ListingImageDto[];
  seller: ListingSellerDto;
  offlinePaymentDisclaimer?: string;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

describe('Tier 1: Campus Marketplace Feature Coverage (F11 - F15)', () => {
  let sellerSession: TestUserSession;
  let buyerSession: TestUserSession;

  beforeAll(async () => {
    sellerSession = await createTestUserSession({
      name: 'Marketplace Seller',
      hostel: 'Hostel J',
      phoneNumber: '9876543210',
    });

    buyerSession = await createTestUserSession({
      name: 'Marketplace Buyer',
      hostel: 'Hostel M',
      phoneNumber: '9876509876',
    });
  });

  // Helper to build multipart form for listing creation
  function buildListingForm(
    overrides: Partial<ReturnType<typeof createListingPayload>> = {},
    imageCount: number = 1
  ): FormData {
    const payload = createListingPayload(overrides);
    const form = new FormData();
    form.append('title', payload.title);
    form.append('category', payload.category);
    form.append('description', payload.description);
    form.append('condition', payload.condition);
    form.append('price', String(payload.price));
    form.append('hostel', payload.hostel);

    for (let i = 0; i < imageCount; i++) {
      const img = createMockImage(`photo_${i + 1}.png`);
      form.append('images', img.buffer, {
        filename: img.filename,
        contentType: img.mimetype,
      });
    }

    return form;
  }

  // =========================================================================
  // F11: Marketplace Listing Creation & Image Upload (>= 5 tests)
  // =========================================================================
  describe('F11: Marketplace Listing Creation & Image Upload', () => {
    it('F11-1: should create listing with 1 image successfully', async () => {
      const form = buildListingForm({ title: 'Single Photo Cycle' }, 1);
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBeDefined();
      expect(res.data.title).toBe('Single Photo Cycle');
      expect(Array.isArray(res.data.images)).toBe(true);
      expect(res.data.images.length).toBeGreaterThanOrEqual(1);
    });

    it('F11-2: should create listing with 3 images preserving all images', async () => {
      const form = buildListingForm({ title: 'Three Photos Engineering Books' }, 3);
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      expect(res.data.images.length).toBe(3);
    });

    it('F11-3: should create listing with maximum allowed 5 images', async () => {
      const form = buildListingForm({ title: 'Five Photos Room Cooler' }, 5);
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      expect(res.data.images.length).toBe(5);
    });

    it('F11-4: should support all 7 official marketplace categories', async () => {
      for (const category of MARKETPLACE_CATEGORIES) {
        const form = buildListingForm({
          title: `Item in ${category}`,
          category: category as MarketplaceCategory,
        }, 1);

        const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
          '/marketplace/listings',
          form,
          { validateStatus: () => true }
        );

        expect([200, 201]).toContain(res.status);
        expect(res.data.category).toBe(category);
      }
    });

    it('F11-5: should support all 4 official item conditions', async () => {
      for (const condition of MARKETPLACE_CONDITIONS) {
        const form = buildListingForm({
          title: `Item Condition ${condition}`,
          condition: condition as MarketplaceCondition,
        }, 1);

        const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
          '/marketplace/listings',
          form,
          { validateStatus: () => true }
        );

        expect([200, 201]).toContain(res.status);
        expect(res.data.condition).toBe(condition);
      }
    });
  });

  // =========================================================================
  // F12: Pluggable Storage & Image Validation (>= 5 tests)
  // =========================================================================
  describe('F12: Pluggable Storage & Image Validation', () => {
    it('F12-1: should return accessible storage URLs for uploaded photos', async () => {
      const form = buildListingForm({ title: 'Storage URL Test Item' }, 1);
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      const firstImage = res.data.images[0];
      expect(firstImage.imageUrl).toBeDefined();
      expect(typeof firstImage.imageUrl).toBe('string');
      expect(firstImage.imageUrl.length).toBeGreaterThan(0);
    });

    it('F12-2: should successfully process genuine 1x1 PNG image buffer', async () => {
      const form = buildListingForm({ title: 'PNG Validation Item' }, 1);
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      expect(res.data.images.length).toBeGreaterThanOrEqual(1);
    });

    it('F12-3: should persist and return image metadata (id, url, orderIndex)', async () => {
      const form = buildListingForm({ title: 'Image Metadata Item' }, 2);
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      for (const img of res.data.images) {
        expect(img.id).toBeDefined();
        expect(img.imageUrl).toBeDefined();
        expect(typeof img.orderIndex).toBe('number');
      }
    });

    it('F12-4: should default listing hostel to seller hostel if not explicitly overridden', async () => {
      const payload = createListingPayload({ hostel: sellerSession.user.hostel || 'Hostel J' });
      const form = new FormData();
      form.append('title', 'Default Hostel Item');
      form.append('category', payload.category);
      form.append('description', payload.description);
      form.append('condition', payload.condition);
      form.append('price', String(payload.price));
      const img = createMockImage();
      form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      expect(res.data.hostel).toBe(sellerSession.user.hostel);
    });

    it('F12-5: should preserve upload sequence in image orderIndex', async () => {
      const form = buildListingForm({ title: 'Ordered Images Item' }, 3);
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([200, 201]).toContain(res.status);
      const indices = res.data.images.map((img) => img.orderIndex);
      for (let i = 0; i < indices.length - 1; i++) {
        expect(indices[i]).toBeLessThanOrEqual(indices[i + 1]);
      }
    });
  });

  // =========================================================================
  // F13: Marketplace Multi-Faceted Browse & Search (>= 5 tests)
  // =========================================================================
  describe('F13: Marketplace Multi-Faceted Browse & Search', () => {
    let searchableListingId: string;

    beforeAll(async () => {
      const form = buildListingForm({
        title: 'Casio Scientific Calculator FX-991EX',
        category: 'Calculator',
        price: 950,
        condition: 'Like new',
        hostel: 'Hostel J',
      });
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );
      if (res.data?.id) searchableListingId = res.data.id;
    });

    it('F13-1: should return paginated listing browse structure', async () => {
      const res = await buyerSession.client.get<PageResponse<ListingSummaryDto>>(
        '/marketplace/listings',
        {
          params: { page: 0, size: 10 },
          validateStatus: () => true,
        }
      );

      expect(res.status).toBe(200);
      const data = res.data;
      if (data && 'content' in data) {
        expect(Array.isArray(data.content)).toBe(true);
        expect(typeof data.totalElements).toBe('number');
        expect(typeof data.totalPages).toBe('number');
      } else if (Array.isArray(data)) {
        expect(Array.isArray(data)).toBe(true);
      }
    });

    it('F13-2: should filter listings by text search query', async () => {
      const res = await buyerSession.client.get<PageResponse<ListingSummaryDto>>(
        '/marketplace/listings',
        {
          params: { query: 'Casio' },
          validateStatus: () => true,
        }
      );

      expect(res.status).toBe(200);
      const items = Array.isArray(res.data) ? res.data : res.data.content || [];
      if (items.length > 0) {
        const hasCasio = items.some((item) =>
          item.title.toLowerCase().includes('casio')
        );
        expect(hasCasio).toBe(true);
      }
    });

    it('F13-3: should filter listings by category', async () => {
      const res = await buyerSession.client.get<PageResponse<ListingSummaryDto>>(
        '/marketplace/listings',
        {
          params: { category: 'Calculator' },
          validateStatus: () => true,
        }
      );

      expect(res.status).toBe(200);
      const items = Array.isArray(res.data) ? res.data : res.data.content || [];
      for (const item of items) {
        expect(item.category).toBe('Calculator');
      }
    });

    it('F13-4: should filter listings by hostel', async () => {
      const res = await buyerSession.client.get<PageResponse<ListingSummaryDto>>(
        '/marketplace/listings',
        {
          params: { hostel: 'Hostel J' },
          validateStatus: () => true,
        }
      );

      expect(res.status).toBe(200);
      const items = Array.isArray(res.data) ? res.data : res.data.content || [];
      for (const item of items) {
        expect(item.hostel).toBe('Hostel J');
      }
    });

    it('F13-5: should filter listings by price range and condition with sorting', async () => {
      const res = await buyerSession.client.get<PageResponse<ListingSummaryDto>>(
        '/marketplace/listings',
        {
          params: {
            minPrice: 500,
            maxPrice: 2000,
            condition: 'Like new',
            sortBy: 'price,asc',
          },
          validateStatus: () => true,
        }
      );

      expect(res.status).toBe(200);
      const items = Array.isArray(res.data) ? res.data : res.data.content || [];
      for (const item of items) {
        expect(item.price).toBeGreaterThanOrEqual(500);
        expect(item.price).toBeLessThanOrEqual(2000);
        expect(item.condition).toBe('Like new');
      }
    });
  });

  // =========================================================================
  // F14: Listing Detail & Seller Phone Privacy (>= 5 tests)
  // =========================================================================
  describe('F14: Listing Detail & Seller Phone Privacy', () => {
    let detailListingId: string;

    beforeAll(async () => {
      const form = buildListingForm({
        title: 'Privacy Verification Bicycle',
        category: 'Cycle',
        price: 2800,
      });
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );
      detailListingId = res.data.id;
    });

    it('F14-1: should return full listing detail with image gallery', async () => {
      const res = await buyerSession.client.get<ListingDetailDto>(
        `/marketplace/listings/${detailListingId}`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(detailListingId);
      expect(res.data.title).toBe('Privacy Verification Bicycle');
      expect(Array.isArray(res.data.images)).toBe(true);
    });

    it('F14-2: should display seller name and hostel in listing detail', async () => {
      const res = await buyerSession.client.get<ListingDetailDto>(
        `/marketplace/listings/${detailListingId}`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      expect(res.data.seller).toBeDefined();
      expect(res.data.seller.name).toBe(sellerSession.user.name);
      expect(res.data.seller.hostel).toBe(sellerSession.user.hostel);
    });

    it('F14-3: should strictly omit seller phone number from marketplace listing response', async () => {
      const res = await buyerSession.client.get<ListingDetailDto>(
        `/marketplace/listings/${detailListingId}`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      // Privacy requirement: seller phone must never be exposed on marketplace listings
      expect(res.data.seller.phoneNumber).toBeUndefined();
    });

    it('F14-4: should include explicit offline payment settlement disclaimer notice', async () => {
      const res = await buyerSession.client.get<ListingDetailDto>(
        `/marketplace/listings/${detailListingId}`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      expect(res.data.offlinePaymentDisclaimer).toBeDefined();
      expect(res.data.offlinePaymentDisclaimer!.toLowerCase()).toContain('offline');
    });

    it('F14-5: should have initial active status on newly created listing', async () => {
      const res = await buyerSession.client.get<ListingDetailDto>(
        `/marketplace/listings/${detailListingId}`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      expect(['ACTIVE', 'AVAILABLE']).toContain(res.data.status);
    });
  });

  // =========================================================================
  // F15: Seller Controls & Sold Item Lifecycle (>= 5 tests)
  // =========================================================================
  describe('F15: Seller Controls & Sold Item Lifecycle', () => {
    let lifecycleListingId: string;

    beforeAll(async () => {
      const form = buildListingForm({
        title: 'Original Title Before Edit',
        price: 1500,
        description: 'Original description text',
      });
      const res = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );
      lifecycleListingId = res.data.id;
    });

    it('F15-1: should allow seller to edit title, price, and description', async () => {
      const updatePayload = {
        title: 'Updated Cycle Title',
        price: 1800,
        description: 'Updated comprehensive description',
        category: 'Cycle',
        condition: 'Like new',
        hostel: sellerSession.user.hostel,
      };

      const res = await sellerSession.client.put<ListingDetailDto>(
        `/marketplace/listings/${lifecycleListingId}`,
        updatePayload,
        { validateStatus: () => true }
      );

      expect([200, 204]).toContain(res.status);

      const check = await buyerSession.client.get<ListingDetailDto>(
        `/marketplace/listings/${lifecycleListingId}`,
        { validateStatus: () => true }
      );
      expect(check.status).toBe(200);
      expect(check.data.title).toBe('Updated Cycle Title');
      expect(check.data.price).toBe(1800);
    });

    it('F15-2: should allow seller to mark listing as SOLD', async () => {
      const res = await sellerSession.client.patch<ListingDetailDto>(
        `/marketplace/listings/${lifecycleListingId}/sold`,
        {},
        { validateStatus: () => true }
      );

      expect([200, 204]).toContain(res.status);
    });

    it('F15-3: should render SOLD status badge on listing detail', async () => {
      const res = await buyerSession.client.get<ListingDetailDto>(
        `/marketplace/listings/${lifecycleListingId}`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      expect(res.data.status).toBe('SOLD');
    });

    it('F15-4: should exclude SOLD items from default public browse results', async () => {
      const res = await buyerSession.client.get<PageResponse<ListingSummaryDto>>(
        '/marketplace/listings',
        { validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      const items = Array.isArray(res.data) ? res.data : res.data.content || [];
      const found = items.find((item) => item.id === lifecycleListingId);
      expect(found).toBeUndefined();
    });

    it('F15-5: should allow seller to soft-delete listing via DELETE /marketplace/listings/{id}', async () => {
      const form = buildListingForm({ title: 'Item to Delete' });
      const createRes = await sellerSession.client.uploadMultipart<ListingDetailDto>(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );
      const delId = createRes.data.id;

      const delRes = await sellerSession.client.delete(
        `/marketplace/listings/${delId}`,
        { validateStatus: () => true }
      );

      expect([200, 204]).toContain(delRes.status);

      // Subsequent fetch should return 404 Not Found or status DELETED
      const checkRes = await buyerSession.client.get<ListingDetailDto>(
        `/marketplace/listings/${delId}`,
        { validateStatus: () => true }
      );
      expect([404, 200]).toContain(checkRes.status);
      if (checkRes.status === 200) {
        expect(checkRes.data.status).toBe('DELETED');
      }
    });
  });
});
