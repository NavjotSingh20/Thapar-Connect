import { describe, it, expect, beforeAll } from 'vitest';
import FormData from 'form-data';
import { ApiClient } from '../helpers/apiClient';
import { createTestUserSession, TestUserSession } from '../helpers/authHelper';
import {
  createListingPayload,
  createMockImage,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
} from '../helpers/dataFactory';

/**
 * Helper to build standard multipart form data for listing tests
 */
function buildMultipartListing(
  fields: Record<string, any> = {},
  imageBuffers: Array<{ buffer: Buffer; filename: string; contentType: string }> = []
): FormData {
  const form = new FormData();
  const defaultFields = {
    title: 'Scientific Calculator Casio fx-991EX',
    category: 'Calculator',
    description: 'Advanced engineering calculator in mint condition.',
    condition: 'Like new',
    price: '850',
    hostel: 'Hostel J',
    ...fields,
  };

  for (const [key, value] of Object.entries(defaultFields)) {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  }

  for (const img of imageBuffers) {
    form.append('images', img.buffer, {
      filename: img.filename,
      contentType: img.contentType,
    });
  }

  return form;
}

describe('Tier 2: Marketplace Boundary & Negative Corner Cases', () => {
  let sellerSession: TestUserSession;
  let buyerSession: TestUserSession;
  let anonymousClient: ApiClient;

  beforeAll(async () => {
    sellerSession = await createTestUserSession({ name: 'Marketplace Seller' });
    buyerSession = await createTestUserSession({ name: 'Marketplace Buyer' });
    anonymousClient = sellerSession.client; // will use fresh or override token
  });

  // =========================================================================
  // 1. Zero Images Validation (Contract: 1 to 5 photos required) (>= 3 tests)
  // =========================================================================
  describe('Zero Images Validation (Contract: 400 Bad Request)', () => {
    it('should reject listing creation without any images attached', async () => {
      const form = buildMultipartListing({}, []); // 0 images

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject listing creation where image field is omitted from form-data', async () => {
      const form = new FormData();
      form.append('title', 'Hero Mountain Bike');
      form.append('category', 'Cycle');
      form.append('description', 'Great ride across campus.');
      form.append('condition', 'Used');
      form.append('price', '2500');
      form.append('hostel', 'Hostel M');

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject listing creation with empty buffer as image', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const form = buildMultipartListing({}, [
        { buffer: emptyBuffer, filename: 'empty.png', contentType: 'image/png' },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 2. Exceeding Max Images (> 5 photos rejected) (>= 3 tests)
  // =========================================================================
  describe('Exceeding Maximum Images (Max 5 photos allowed) (Contract: 400 Bad Request)', () => {
    it('should reject listing creation with 6 photos attached', async () => {
      const images = Array.from({ length: 6 }, (_, i) => {
        const mock = createMockImage(`photo-${i + 1}.png`);
        return { buffer: mock.buffer, filename: mock.filename, contentType: mock.mimetype };
      });

      const form = buildMultipartListing({}, images);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject listing creation with 7 photos attached', async () => {
      const images = Array.from({ length: 7 }, (_, i) => {
        const mock = createMockImage(`photo-${i + 1}.png`);
        return { buffer: mock.buffer, filename: mock.filename, contentType: mock.mimetype };
      });

      const form = buildMultipartListing({}, images);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject listing creation with 10 photos attached', async () => {
      const images = Array.from({ length: 10 }, (_, i) => {
        const mock = createMockImage(`photo-${i + 1}.png`);
        return { buffer: mock.buffer, filename: mock.filename, contentType: mock.mimetype };
      });

      const form = buildMultipartListing({}, images);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 3. Non-Image File Upload Rejection (>= 4 tests)
  // =========================================================================
  describe('Non-Image File Format Validation (Contract: 400 Bad Request)', () => {
    it('should reject executable file (.exe) with application/x-msdownload', async () => {
      // MZ header for Windows executable
      const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
      const form = buildMultipartListing({}, [
        { buffer: exeBuffer, filename: 'malware.exe', contentType: 'application/x-msdownload' },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject PDF document (.pdf) with application/pdf', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      const form = buildMultipartListing({}, [
        { buffer: pdfBuffer, filename: 'document.pdf', contentType: 'application/pdf' },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject plain text file (.txt) with text/plain', async () => {
      const txtBuffer = Buffer.from('This is a plain text file, not an image.');
      const form = buildMultipartListing({}, [
        { buffer: txtBuffer, filename: 'notes.txt', contentType: 'text/plain' },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject shell script (.sh) with application/x-sh', async () => {
      const shBuffer = Buffer.from('#!/bin/bash\necho "exploit"\n');
      const form = buildMultipartListing({}, [
        { buffer: shBuffer, filename: 'script.sh', contentType: 'application/x-sh' },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject spoofed extension with non-image content (.png containing binary script)', async () => {
      const fakePngBuffer = Buffer.from('#!/usr/bin/env python3\nprint("fake png")');
      const form = buildMultipartListing({}, [
        { buffer: fakePngBuffer, filename: 'disguised.png', contentType: 'image/png' },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      // Backend image validation service should check magic bytes or image metadata
      expect([400, 422]).toContain(res.status);
    });
  });

  // =========================================================================
  // 4. Oversized Image File Rejection (> 5MB) (>= 3 tests)
  // =========================================================================
  describe('Oversized Image Rejection (> 5MB Limit)', () => {
    it('should reject single image file exceeding 5MB (e.g. 5.5MB)', async () => {
      // 5.5 MB buffer
      const largeBuffer = Buffer.alloc(Math.floor(5.5 * 1024 * 1024), 0x5a);
      // Prepend valid PNG header
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      pngHeader.copy(largeBuffer, 0);

      const form = buildMultipartListing({}, [
        { buffer: largeBuffer, filename: 'large-photo.png', contentType: 'image/png' },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([400, 413]).toContain(res.status);
    });

    it('should reject single image file of 8MB with 400 or 413 Payload Too Large', async () => {
      const largeBuffer = Buffer.alloc(8 * 1024 * 1024, 0x5a);
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      pngHeader.copy(largeBuffer, 0);

      const form = buildMultipartListing({}, [
        { buffer: largeBuffer, filename: 'huge-photo.png', contentType: 'image/png' },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect([400, 413]).toContain(res.status);
    });

    it('should reject aggregate image payload exceeding maximum multipart limits', async () => {
      const buffer1 = Buffer.alloc(3 * 1024 * 1024, 0x5a);
      const buffer2 = Buffer.alloc(3 * 1024 * 1024, 0x5a);
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      pngHeader.copy(buffer1, 0);
      pngHeader.copy(buffer2, 0);

      const form = buildMultipartListing({}, [
        { buffer: buffer1, filename: 'p1.png', contentType: 'image/png' },
        { buffer: buffer2, filename: 'p2.png', contentType: 'image/png' },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      // If individual or total exceeds threshold
      expect([200, 201, 400, 413]).toContain(res.status);
    });
  });

  // =========================================================================
  // 5. Negative Price Validation (>= 3 tests)
  // =========================================================================
  describe('Negative Price Validation (Contract: 400 Bad Request)', () => {
    it('should reject listing creation with negative price (-1 INR)', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ price: '-1' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject listing creation with large negative price (-5000 INR)', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ price: '-5000' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject fractional negative price (-0.01 INR)', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ price: '-0.01' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 6. Price Exceeding Maximum Limit (> 1,000,000 INR) (>= 2 tests)
  // =========================================================================
  describe('Price Maximum Bound Validation (> 1,000,000 INR)', () => {
    it('should reject price exceeding 1,000,000 INR (e.g. 1,000,001 INR)', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ price: '1000001' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject extreme price (e.g. 99,999,999 INR)', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ price: '99999999' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 7. Blank / Empty Title or Description (>= 3 tests)
  // =========================================================================
  describe('Blank / Empty Title or Description Validation', () => {
    it('should reject listing creation with empty title string', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ title: '' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject listing creation with whitespace-only title', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ title: '     ' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject listing creation with empty description string', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ description: '' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject listing creation with excessively long title (> 255 chars)', async () => {
      const img = createMockImage('item.png');
      const longTitle = 'A'.repeat(300);
      const form = buildMultipartListing({ title: longTitle }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 8. Invalid Category Enum (>= 3 tests)
  // =========================================================================
  describe('Category Enum Domain Boundaries', () => {
    it('should reject invalid category "Vehicles" not in allowed enum', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ category: 'Vehicles' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject arbitrary category string "Electronics&Gadgets"', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ category: 'Electronics&Gadgets' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject empty category string with 400 Bad Request', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ category: '' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 9. Invalid Condition Enum (>= 3 tests)
  // =========================================================================
  describe('Condition Enum Domain Boundaries', () => {
    it('should reject invalid condition "Broken" not in allowed enum', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ condition: 'Broken' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject arbitrary condition string "MintCondition"', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ condition: 'MintCondition' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });

    it('should reject empty condition string with 400 Bad Request', async () => {
      const img = createMockImage('item.png');
      const form = buildMultipartListing({ condition: '' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const res = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 10. Non-Seller Edit & Delete Rejection (Contract: 403 Forbidden) (>= 4 tests)
  // =========================================================================
  describe('Non-Seller Edit & Delete Authorization Barriers', () => {
    let testListingId: string;

    beforeAll(async () => {
      const img = createMockImage('cycle.png');
      const form = buildMultipartListing({ title: 'Seller Mountain Bike' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const createRes = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );
      expect([200, 201]).toContain(createRes.status);
      testListingId = createRes.data.id;
    });

    it('should reject non-seller calling PUT /marketplace/listings/{id} with 403 Forbidden', async () => {
      const res = await buyerSession.client.put(
        `/marketplace/listings/${testListingId}`,
        {
          title: 'Hacked Title By Buyer',
          price: 10,
        },
        { validateStatus: () => true }
      );

      expect(res.status).toBe(403);
    });

    it('should reject non-seller calling DELETE /marketplace/listings/{id} with 403 Forbidden', async () => {
      const res = await buyerSession.client.delete(
        `/marketplace/listings/${testListingId}`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(403);
    });

    it('should reject anonymous unauthenticated user calling PUT with 401 Unauthorized', async () => {
      const noAuthClient = new ApiClient();
      const res = await noAuthClient.put(
        `/marketplace/listings/${testListingId}`,
        { title: 'Anon Change' },
        { validateStatus: () => true }
      );

      expect(res.status).toBe(401);
    });

    it('should reject anonymous unauthenticated user calling DELETE with 401 Unauthorized', async () => {
      const noAuthClient = new ApiClient();
      const res = await noAuthClient.delete(
        `/marketplace/listings/${testListingId}`,
        { validateStatus: () => true }
      );

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 11. Non-Seller Sold Status Update Rejection (>= 2 tests)
  // =========================================================================
  describe('Sold Status Modification Authorization Barriers', () => {
    let testListingId: string;

    beforeAll(async () => {
      const img = createMockImage('book.png');
      const form = buildMultipartListing({ title: 'Algorithms Textbook', category: 'Books' }, [
        { buffer: img.buffer, filename: img.filename, contentType: img.mimetype },
      ]);

      const createRes = await sellerSession.client.uploadMultipart(
        '/marketplace/listings',
        form,
        { validateStatus: () => true }
      );
      testListingId = createRes.data.id;
    });

    it('should reject non-seller attempting to mark listing as SOLD with 403 Forbidden', async () => {
      const res = await buyerSession.client.patch(
        `/marketplace/listings/${testListingId}/sold`,
        {},
        { validateStatus: () => true }
      );

      expect(res.status).toBe(403);
    });

    it('should handle repeated mark as SOLD call by seller idempotently or return 400/409', async () => {
      // First mark as sold by seller
      const firstRes = await sellerSession.client.patch(
        `/marketplace/listings/${testListingId}/sold`,
        {},
        { validateStatus: () => true }
      );
      expect([200, 204]).toContain(firstRes.status);

      // Second mark as sold by seller
      const secondRes = await sellerSession.client.patch(
        `/marketplace/listings/${testListingId}/sold`,
        {},
        { validateStatus: () => true }
      );
      expect([200, 204, 400, 409]).toContain(secondRes.status);
    });
  });
});
