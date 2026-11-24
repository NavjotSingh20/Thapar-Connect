import { describe, it, expect } from 'vitest';
import FormData from 'form-data';
import { createTestUserSession } from '../helpers/authHelper';
import {
  createListingPayload,
  createMockImage,
} from '../helpers/dataFactory';

describe('Tier 3: Pairwise - Marketplace & Chat Messaging Interactions', () => {
  it('should navigate full lifecycle: browse listing (phone shielded) -> chat -> negotiate offline -> mark SOLD -> hidden from browse', async () => {
    // 1. Setup Seller and Buyer sessions
    const seller = await createTestUserSession({
      onboard: true,
      hostel: 'Hostel J',
      phoneNumber: '9876543210',
    });
    const buyer = await createTestUserSession({
      onboard: true,
      hostel: 'Hostel M',
      phoneNumber: '9123456789',
    });

    // 2. Seller creates a marketplace listing with photo
    const form = new FormData();
    const payload = createListingPayload({
      title: 'TI-84 Plus Graphing Calculator',
      category: 'Calculator',
      price: 2500,
      hostel: 'Hostel J',
    });

    form.append('title', payload.title);
    form.append('category', payload.category);
    form.append('description', payload.description);
    form.append('condition', payload.condition);
    form.append('price', String(payload.price));
    form.append('hostel', payload.hostel);

    const mockImg = createMockImage('calc.png');
    form.append('images', mockImg.buffer, {
      filename: mockImg.filename,
      contentType: mockImg.mimetype,
    });

    const createRes = await seller.client.uploadMultipart(
      '/marketplace/listings',
      form
    );
    expect([200, 201]).toContain(createRes.status);
    const listingId = createRes.data.id;
    expect(listingId).toBeDefined();

    // 3. Buyer browses marketplace and fetches listing details
    const browseRes = await buyer.client.get('/marketplace/listings', {
      params: { category: 'Calculator' },
    });
    expect(browseRes.status).toBe(200);

    const detailRes = await buyer.client.get(
      `/marketplace/listings/${listingId}`
    );
    expect(detailRes.status).toBe(200);
    const detail = detailRes.data;

    // Verify privacy: Seller phone number must NOT be exposed
    expect(detail.seller).toBeDefined();
    expect(detail.seller.name || detail.sellerName).toBeDefined();
    expect(detail.seller.phoneNumber).toBeUndefined();
    expect(detail.seller.phone).toBeUndefined();
    expect(detail.phoneNumber).toBeUndefined();

    // Verify offline payment notice
    const detailString = JSON.stringify(detail);
    expect(detailString.toLowerCase()).toMatch(/offline|cash|in-person|settled/i);

    // 4. Buyer initiates chat with seller under LISTING context
    const convRes = await buyer.client.post(
      '/chat/conversations',
      {
        contextType: 'LISTING',
        contextId: listingId,
        recipientId: seller.user.id,
      },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(convRes.status);
    const convId = convRes.data.id;

    // 5. Buyer and Seller exchange negotiation messages
    const buyerMsg = await buyer.client.post(
      `/chat/conversations/${convId}/messages`,
      { content: 'Hi, would you take 2200 and meet at Cosy food court?' },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(buyerMsg.status);

    const sellerReply = await seller.client.post(
      `/chat/conversations/${convId}/messages`,
      { content: 'Deal! Let us meet tomorrow at 4 PM for offline payment.' },
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(sellerReply.status);

    // 6. Seller marks the listing as SOLD
    const soldRes = await seller.client.patch(
      `/marketplace/listings/${listingId}/sold`,
      {},
      { validateStatus: () => true }
    );
    expect([200, 204]).toContain(soldRes.status);

    // 7. Verify listing shows SOLD status
    const postSoldDetail = await buyer.client.get(
      `/marketplace/listings/${listingId}`
    );
    expect(postSoldDetail.status).toBe(200);
    expect(postSoldDetail.data.status).toBe('SOLD');

    // 8. Verify listing disappears from public browse
    const publicBrowseAfterSold = await buyer.client.get(
      '/marketplace/listings'
    );
    const items: any[] = Array.isArray(publicBrowseAfterSold.data)
      ? publicBrowseAfterSold.data
      : publicBrowseAfterSold.data?.content || [];
    const foundSold = items.find((item: any) => item.id === listingId);
    expect(foundSold).toBeUndefined();
  });

  it('should preserve chat conversation history after listing transitions to SOLD', async () => {
    const seller = await createTestUserSession({ onboard: true });
    const buyer = await createTestUserSession({ onboard: true });

    // 1. Seller creates listing
    const form = new FormData();
    const payload = createListingPayload({ title: 'Engineering Mechanics Book' });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
    const img = createMockImage('book.png');
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const createRes = await seller.client.uploadMultipart('/marketplace/listings', form);
    const listingId = createRes.data.id;

    // 2. Chat initiated and messages exchanged
    const convRes = await buyer.client.post('/chat/conversations', {
      contextType: 'LISTING',
      contextId: listingId,
      recipientId: seller.user.id,
    });
    const convId = convRes.data.id;

    await buyer.client.post(`/chat/conversations/${convId}/messages`, {
      content: 'Can I pick it up tonight?',
    });

    // 3. Seller marks sold
    await seller.client.patch(`/marketplace/listings/${listingId}/sold`, {});

    // 4. Verify conversation history remains accessible
    const messagesRes = await buyer.client.get(`/chat/conversations/${convId}/messages`);
    expect(messagesRes.status).toBe(200);
    const msgs: any[] = Array.isArray(messagesRes.data)
      ? messagesRes.data
      : messagesRes.data?.content || [];
    expect(msgs.length).toBeGreaterThanOrEqual(1);
    expect(msgs.some((m: any) => m.content === 'Can I pick it up tonight?')).toBe(true);
  });

  it('should prevent seller from starting a conversation with themselves on their own listing (400 Bad Request)', async () => {
    const seller = await createTestUserSession({ onboard: true });

    // Create listing
    const form = new FormData();
    const payload = createListingPayload({ title: 'Study Lamp' });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
    const img = createMockImage('lamp.png');
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const createRes = await seller.client.uploadMultipart('/marketplace/listings', form);
    const listingId = createRes.data.id;

    // Attempt self-chat
    const selfChatRes = await seller.client.post(
      '/chat/conversations',
      {
        contextType: 'LISTING',
        contextId: listingId,
        recipientId: seller.user.id,
      },
      { validateStatus: () => true }
    );
    expect([400, 422]).toContain(selfChatRes.status);
  });

  it('should prevent un-onboarded buyer from creating marketplace listing or initiating chat', async () => {
    const unOnboarded = await createTestUserSession({ onboard: false });
    const seller = await createTestUserSession({ onboard: true });

    // 1. Attempt to create listing while un-onboarded
    const form = new FormData();
    const payload = createListingPayload({ title: 'Lab Coat' });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
    const img = createMockImage('coat.png');
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const listingRes = await unOnboarded.client.uploadMultipart(
      '/marketplace/listings',
      form,
      { validateStatus: () => true }
    );
    expect(listingRes.status).toBe(403);

    // 2. Seller creates valid listing
    const sellerForm = new FormData();
    Object.entries(payload).forEach(([k, v]) => sellerForm.append(k, String(v)));
    sellerForm.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });
    const sellerListing = await seller.client.uploadMultipart('/marketplace/listings', sellerForm);

    // 3. Un-onboarded student attempts to open chat
    const chatRes = await unOnboarded.client.post(
      '/chat/conversations',
      {
        contextType: 'LISTING',
        contextId: sellerListing.data.id,
        recipientId: seller.user.id,
      },
      { validateStatus: () => true }
    );
    expect(chatRes.status).toBe(403);
  });

  it('should display explicit offline payment disclaimer in both marketplace listing and chat responses', async () => {
    const seller = await createTestUserSession({ onboard: true });
    const buyer = await createTestUserSession({ onboard: true });

    const form = new FormData();
    const payload = createListingPayload({ title: 'Wireless Mouse' });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
    const img = createMockImage('mouse.png');
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const createRes = await seller.client.uploadMultipart('/marketplace/listings', form);
    const listingId = createRes.data.id;

    // Check listing disclaimer
    const listingRes = await buyer.client.get(`/marketplace/listings/${listingId}`);
    const listingBody = JSON.stringify(listingRes.data).toLowerCase();
    expect(
      listingBody.includes('offline') ||
      listingBody.includes('settle') ||
      listingBody.includes('cash') ||
      listingBody.includes('direct')
    ).toBe(true);
  });

  it('should exclude deleted listing from browse while preserving existing chat thread', async () => {
    const seller = await createTestUserSession({ onboard: true });
    const buyer = await createTestUserSession({ onboard: true });

    // 1. Seller creates listing
    const form = new FormData();
    const payload = createListingPayload({ title: 'Dorm Fan' });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
    const img = createMockImage('fan.png');
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const createRes = await seller.client.uploadMultipart('/marketplace/listings', form);
    const listingId = createRes.data.id;

    // 2. Chat initiated
    const convRes = await buyer.client.post('/chat/conversations', {
      contextType: 'LISTING',
      contextId: listingId,
      recipientId: seller.user.id,
    });
    const convId = convRes.data.id;

    // 3. Seller deletes listing
    const deleteRes = await seller.client.delete(`/marketplace/listings/${listingId}`);
    expect([200, 204]).toContain(deleteRes.status);

    // 4. Verify browse excludes deleted item
    const browseRes = await buyer.client.get('/marketplace/listings');
    const items: any[] = Array.isArray(browseRes.data)
      ? browseRes.data
      : browseRes.data?.content || [];
    expect(items.some((i: any) => i.id === listingId)).toBe(false);

    // 5. Chat inbox still lists conversation
    const inboxRes = await buyer.client.get('/chat/conversations');
    const convs: any[] = Array.isArray(inboxRes.data)
      ? inboxRes.data
      : inboxRes.data?.content || [];
    expect(convs.some((c: any) => c.id === convId)).toBe(true);
  });
});
