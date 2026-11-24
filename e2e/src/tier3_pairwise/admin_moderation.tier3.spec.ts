import { describe, it, expect } from 'vitest';
import FormData from 'form-data';
import { createTestUserSession } from '../helpers/authHelper';
import {
  createCabPayload,
  createListingPayload,
  createMockImage,
} from '../helpers/dataFactory';

describe('Tier 3: Pairwise - Admin Moderation Interactions', () => {
  it('should allow admin to list all cabs and delete any illicit cab group', async () => {
    // 1. Regular student creates a cab group
    const student = await createTestUserSession({ onboard: true });
    const admin = await createTestUserSession({ role: 'ADMIN', onboard: true });

    const cabRes = await student.client.post('/cabs', createCabPayload());
    const cabId = cabRes.data.id;

    // 2. Admin retrieves all cabs
    const adminCabsRes = await admin.client.get('/admin/cabs', {
      validateStatus: () => true,
    });
    expect(adminCabsRes.status).toBe(200);
    const cabList: any[] = Array.isArray(adminCabsRes.data)
      ? adminCabsRes.data
      : adminCabsRes.data?.content || [];
    expect(cabList.some((c: any) => c.id === cabId)).toBe(true);

    // 3. Admin deletes the cab group
    const deleteRes = await admin.client.delete(`/admin/cabs/${cabId}`, {
      validateStatus: () => true,
    });
    expect([200, 204]).toContain(deleteRes.status);

    // 4. Verify the cab group is no longer present in public search
    const browseRes = await student.client.get('/cabs');
    const openCabs: any[] = Array.isArray(browseRes.data)
      ? browseRes.data
      : browseRes.data?.content || [];
    const found = openCabs.find((c: any) => c.id === cabId);
    expect(found === undefined || found.status === 'CLOSED').toBe(true);
  });

  it('should allow admin to view all listings and delete illicit marketplace listings', async () => {
    const student = await createTestUserSession({ onboard: true });
    const admin = await createTestUserSession({ role: 'ADMIN', onboard: true });

    // 1. Student creates listing
    const form = new FormData();
    const payload = createListingPayload({ title: 'Illicit / Banned Item' });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
    const img = createMockImage('item.png');
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const createRes = await student.client.uploadMultipart('/marketplace/listings', form);
    const listingId = createRes.data.id;

    // 2. Admin lists marketplace listings
    const adminListingsRes = await admin.client.get('/admin/listings', {
      validateStatus: () => true,
    });
    expect(adminListingsRes.status).toBe(200);

    // 3. Admin deletes the listing
    const deleteRes = await admin.client.delete(`/admin/listings/${listingId}`, {
      validateStatus: () => true,
    });
    expect([200, 204]).toContain(deleteRes.status);

    // 4. Verify listing is excluded from regular browse
    const browseRes = await student.client.get('/marketplace/listings');
    const items: any[] = Array.isArray(browseRes.data)
      ? browseRes.data
      : browseRes.data?.content || [];
    expect(items.some((i: any) => i.id === listingId)).toBe(false);
  });

  it('should revoke access token and block all protected endpoints when admin bans a user', async () => {
    const admin = await createTestUserSession({ role: 'ADMIN', onboard: true });
    const rogueStudent = await createTestUserSession({ onboard: true });

    // Verify initial access
    const meBefore = await rogueStudent.client.get('/users/me');
    expect(meBefore.status).toBe(200);

    // Admin bans rogue user
    const banRes = await admin.client.post(
      `/admin/users/${rogueStudent.user.id}/ban`,
      {},
      { validateStatus: () => true }
    );
    expect([200, 204]).toContain(banRes.status);

    // Any subsequent protected call from rogueStudent must return 401 or 403
    const meAfter = await rogueStudent.client.get('/users/me', {
      validateStatus: () => true,
    });
    expect([401, 403]).toContain(meAfter.status);

    const cabAttempt = await rogueStudent.client.post(
      '/cabs',
      createCabPayload(),
      { validateStatus: () => true }
    );
    expect([401, 403]).toContain(cabAttempt.status);

    const chatAttempt = await rogueStudent.client.get('/chat/conversations', {
      validateStatus: () => true,
    });
    expect([401, 403]).toContain(chatAttempt.status);
  });

  it('should restore user access when admin unbans a previously banned user', async () => {
    const admin = await createTestUserSession({ role: 'ADMIN', onboard: true });
    const student = await createTestUserSession({ onboard: true });

    // Ban
    await admin.client.post(`/admin/users/${student.user.id}/ban`);

    // Unban
    const unbanRes = await admin.client.post(
      `/admin/users/${student.user.id}/unban`,
      {},
      { validateStatus: () => true }
    );
    expect([200, 204]).toContain(unbanRes.status);

    // User access restored
    const meRes = await student.client.get('/users/me', {
      validateStatus: () => true,
    });
    expect(meRes.status).toBe(200);
    expect(meRes.data.isBanned).toBe(false);
  });

  it('should strictly reject regular USER role from invoking any /admin/* endpoints (403 Forbidden)', async () => {
    const regularStudent = await createTestUserSession({ role: 'USER', onboard: true });
    const targetUserId = 'b0000000-0000-0000-0000-000000000002';

    // 1. Attempt admin cabs access
    const cabRes = await regularStudent.client.get('/admin/cabs', {
      validateStatus: () => true,
    });
    expect(cabRes.status).toBe(403);

    // 2. Attempt admin listings access
    const listingRes = await regularStudent.client.get('/admin/listings', {
      validateStatus: () => true,
    });
    expect(listingRes.status).toBe(403);

    // 3. Attempt admin user ban
    const banRes = await regularStudent.client.post(
      `/admin/users/${targetUserId}/ban`,
      {},
      { validateStatus: () => true }
    );
    expect(banRes.status).toBe(403);
  });

  it('should allow admin to review incoming safety reports queue and inspect report details', async () => {
    const admin = await createTestUserSession({ role: 'ADMIN', onboard: true });
    const reporter = await createTestUserSession({ onboard: true });
    const reported = await createTestUserSession({ onboard: true });

    // Reporter files a safety report
    await reporter.client.post('/safety/report', {
      targetType: 'USER',
      targetId: reported.user.id,
      reason: 'Spamming ride listings',
      details: 'Creating automated cab duplicates',
    });

    // Admin inspects reports queue
    const reportsRes = await admin.client.get('/admin/reports', {
      validateStatus: () => true,
    });
    expect(reportsRes.status).toBe(200);

    const reports: any[] = Array.isArray(reportsRes.data)
      ? reportsRes.data
      : reportsRes.data?.content || [];
    const foundReport = reports.find(
      (r: any) =>
        (r.targetId === reported.user.id || r.target_id === reported.user.id) &&
        r.reason?.includes('Spamming')
    );
    expect(foundReport).toBeDefined();
  });
});
