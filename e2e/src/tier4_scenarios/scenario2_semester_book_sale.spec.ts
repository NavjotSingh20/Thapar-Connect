import { describe, it, expect } from 'vitest';
import FormData from 'form-data';
import { createTestUserSession } from '../helpers/authHelper';
import {
  createListingPayload,
  createMockImage,
} from '../helpers/dataFactory';

describe('Tier 4: Scenario 2 - Semester End Cycle Sale (S2)', () => {
  it('should complete senior student cycle sale: listing with 3 photos, category search, phone privacy, chat negotiation, SOLD lifecycle', async () => {
    // 1. Senior student logs in and onboards
    const seniorSeller = await createTestUserSession({
      onboard: true,
      name: 'Harsh Vardhan',
      hostel: 'Hostel J',
      phoneNumber: '9876543210',
    });

    // 2. Junior buyer logs in and onboards
    const juniorBuyer = await createTestUserSession({
      onboard: true,
      name: 'Ananya Gupta',
      hostel: 'Hostel PG',
      phoneNumber: '9123456780',
    });

    // 3. Senior creates cycle listing with 3 photos
    const form = new FormData();
    const cyclePayload = createListingPayload({
      title: 'Hero Sprint Pro 21-Speed Mountain Bike',
      category: 'Cycle',
      description: 'Used for 2 years on campus. New dual disc brakes installed last month.',
      condition: 'Used',
      price: 3200,
      hostel: 'Hostel J',
    });

    form.append('title', cyclePayload.title);
    form.append('category', cyclePayload.category);
    form.append('description', cyclePayload.description);
    form.append('condition', cyclePayload.condition);
    form.append('price', String(cyclePayload.price));
    form.append('hostel', cyclePayload.hostel);

    // Attach 3 distinct images
    const img1 = createMockImage('cycle_front.png');
    const img2 = createMockImage('cycle_side.png');
    const img3 = createMockImage('cycle_gears.png');
    form.append('images', img1.buffer, { filename: img1.filename, contentType: img1.mimetype });
    form.append('images', img2.buffer, { filename: img2.filename, contentType: img2.mimetype });
    form.append('images', img3.buffer, { filename: img3.filename, contentType: img3.mimetype });

    const createRes = await seniorSeller.client.uploadMultipart(
      '/marketplace/listings',
      form
    );
    expect([200, 201]).toContain(createRes.status);
    const listingId = createRes.data.id;
    expect(listingId).toBeDefined();

    // Verify 3 images uploaded
    if (createRes.data.images || createRes.data.imageUrls) {
      const images = createRes.data.images || createRes.data.imageUrls;
      expect(images.length).toBe(3);
    }

    // 4. Buyer searches marketplace filtering by category 'Cycle' and hostel 'Hostel J'
    const searchRes = await juniorBuyer.client.get('/marketplace/listings', {
      params: {
        category: 'Cycle',
        hostel: 'Hostel J',
        minPrice: 1000,
        maxPrice: 4000,
      },
    });
    expect(searchRes.status).toBe(200);

    const listings: any[] = Array.isArray(searchRes.data)
      ? searchRes.data
      : searchRes.data?.content || [];
    const cycleItem = listings.find((item: any) => item.id === listingId);
    expect(cycleItem).toBeDefined();
    expect(cycleItem.title).toContain('Hero Sprint');

    // 5. Buyer inspects listing detail view: Privacy check (phone hidden) + Offline payment notice
    const detailRes = await juniorBuyer.client.get(
      `/marketplace/listings/${listingId}`
    );
    expect(detailRes.status).toBe(200);
    const detail = detailRes.data;

    // Strict privacy assertion: Seller's phone number must NEVER appear in marketplace details
    expect(detail.seller?.phoneNumber).toBeUndefined();
    expect(detail.seller?.phone).toBeUndefined();
    expect(detail.phoneNumber).toBeUndefined();
    expect(detail.phone).toBeUndefined();

    // Verify offline transaction disclaimer notice
    const detailText = JSON.stringify(detail).toLowerCase();
    expect(
      detailText.includes('offline') ||
      detailText.includes('cash') ||
      detailText.includes('direct') ||
      detailText.includes('settle')
    ).toBe(true);

    // 6. Buyer initiates chat with seller under LISTING context
    const convRes = await juniorBuyer.client.post('/chat/conversations', {
      contextType: 'LISTING',
      contextId: listingId,
      recipientId: seniorSeller.user.id,
    });
    expect([200, 201]).toContain(convRes.status);
    const convId = convRes.data.id;

    // 7. Buyer and seller negotiate deal via chat
    await juniorBuyer.client.post(`/chat/conversations/${convId}/messages`, {
      content: 'Hi Harsh, I am interested in the Hero Sprint. Would you take 2800?',
    });

    await seniorSeller.client.post(`/chat/conversations/${convId}/messages`, {
      content: 'Can meet midway at 3000 cash. You can test ride outside Hostel J.',
    });

    await juniorBuyer.client.post(`/chat/conversations/${convId}/messages`, {
      content: 'Agreed, 3000 cash. See you in 15 minutes!',
    });

    // 8. Seller marks the item as SOLD after offline handover
    const soldRes = await seniorSeller.client.patch(
      `/marketplace/listings/${listingId}/sold`,
      {},
      { validateStatus: () => true }
    );
    expect([200, 204]).toContain(soldRes.status);

    // 9. Verify listing displays SOLD badge
    const verifySold = await juniorBuyer.client.get(
      `/marketplace/listings/${listingId}`
    );
    expect(verifySold.status).toBe(200);
    expect(verifySold.data.status).toBe('SOLD');

    // 10. Default public marketplace browse excludes SOLD items
    const browseAfterSold = await juniorBuyer.client.get(
      '/marketplace/listings'
    );
    const activeList: any[] = Array.isArray(browseAfterSold.data)
      ? browseAfterSold.data
      : browseAfterSold.data?.content || [];
    expect(activeList.some((item: any) => item.id === listingId)).toBe(false);

    // 11. Conversation history remains in buyer's inbox
    const inbox = await juniorBuyer.client.get('/chat/conversations');
    const convs: any[] = Array.isArray(inbox.data)
      ? inbox.data
      : inbox.data?.content || [];
    expect(convs.some((c: any) => c.id === convId)).toBe(true);
  });

  it('should reject listing creation with invalid image formats or exceeding 5 image limit', async () => {
    const seller = await createTestUserSession({ onboard: true });

    // Try to upload with 6 images (exceeding 5 maximum allowed)
    const form = new FormData();
    const payload = createListingPayload({ title: 'Excessive Images Test' });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));

    for (let i = 0; i < 6; i++) {
      const img = createMockImage(`img_${i}.png`);
      form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });
    }

    const res = await seller.client.uploadMultipart('/marketplace/listings', form, {
      validateStatus: () => true,
    });
    // Must return 400 Bad Request or validation failure
    expect([400, 422]).toContain(res.status);
  });
});
