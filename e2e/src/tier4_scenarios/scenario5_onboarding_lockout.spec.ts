import { describe, it, expect } from 'vitest';
import FormData from 'form-data';
import {
  createTestUserSession,
  onboardUser,
} from '../helpers/authHelper';
import {
  createCabPayload,
  createListingPayload,
  createMockImage,
  randomInvalidPhone,
  randomValidPhone,
} from '../helpers/dataFactory';

describe('Tier 4: Scenario 5 - New Student First-Login & Onboarding Lockout (S5)', () => {
  it('should strictly lock out newly logged in student from all core features until phone & hostel validation passes', async () => {
    // 1. Fresh student signs in for the very first time with @thapar.edu email
    const freshStudent = await createTestUserSession({
      onboard: false,
      name: 'Freshman Student',
    });

    expect(freshStudent.user.isOnboarded).toBe(false);
    expect(freshStudent.accessToken).toBeDefined();

    // 2. Student attempts cab group creation -> Blocked with 403 Forbidden
    const cabAttempt = await freshStudent.client.post(
      '/cabs',
      createCabPayload(),
      { validateStatus: () => true }
    );
    expect(cabAttempt.status).toBe(403);
    const cabErrBody = JSON.stringify(cabAttempt.data).toLowerCase();
    expect(cabErrBody).toMatch(/onboard/);

    // 3. Student attempts marketplace listing creation -> Blocked with 403 Forbidden
    const form = new FormData();
    const payload = createListingPayload({ title: 'Used Notebook' });
    Object.entries(payload).forEach(([k, v]) => form.append(k, String(v)));
    const img = createMockImage('notebook.png');
    form.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const listingAttempt = await freshStudent.client.uploadMultipart(
      '/marketplace/listings',
      form,
      { validateStatus: () => true }
    );
    expect(listingAttempt.status).toBe(403);

    // 4. Onboarding validation: submit invalid phone number formats -> 400 Bad Request
    const invalidPhoneAttempts = [
      randomInvalidPhone('short'), // 5 digits
      randomInvalidPhone('long'), // 13 digits
      randomInvalidPhone('alpha'), // Contains letters
      randomInvalidPhone('invalid_start'), // Starts with 5
    ];

    for (const badPhone of invalidPhoneAttempts) {
      const badOnboardRes = await freshStudent.client.post(
        '/users/me/onboard',
        {
          phoneNumber: badPhone,
          hostel: 'Hostel J',
        },
        { validateStatus: () => true }
      );
      expect([400, 422]).toContain(badOnboardRes.status);
    }

    // 5. Onboarding validation: submit empty hostel -> 400 Bad Request
    const emptyHostelRes = await freshStudent.client.post(
      '/users/me/onboard',
      {
        phoneNumber: randomValidPhone(),
        hostel: '',
      },
      { validateStatus: () => true }
    );
    expect([400, 422]).toContain(emptyHostelRes.status);

    // 6. Submit valid profile details
    const validPhone = randomValidPhone();
    const onboardedUser = await onboardUser(freshStudent.client, {
      phoneNumber: validPhone,
      hostel: 'Hostel M',
      rollNumber: '102303001',
      branch: 'COE',
      year: 1,
    });

    expect(onboardedUser.isOnboarded).toBe(true);
    expect(onboardedUser.phoneNumber).toBe(validPhone);
    expect(onboardedUser.hostel).toBe('Hostel M');

    // 7. Verify GET /users/me reflects onboarded status
    const meRes = await freshStudent.client.get('/users/me');
    expect(meRes.status).toBe(200);
    expect(meRes.data.isOnboarded).toBe(true);

    // 8. Re-attempt cab group creation -> Now succeeds (200/201)
    const cabRetry = await freshStudent.client.post(
      '/cabs',
      createCabPayload(),
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(cabRetry.status);
    expect(cabRetry.data.id).toBeDefined();

    // 9. Re-attempt marketplace listing creation -> Now succeeds (200/201)
    const formSuccess = new FormData();
    Object.entries(payload).forEach(([k, v]) => formSuccess.append(k, String(v)));
    formSuccess.append('images', img.buffer, { filename: img.filename, contentType: img.mimetype });

    const listingRetry = await freshStudent.client.uploadMultipart(
      '/marketplace/listings',
      formSuccess,
      { validateStatus: () => true }
    );
    expect([200, 201]).toContain(listingRetry.status);
    expect(listingRetry.data.id).toBeDefined();
  });

  it('should prevent repeated onboarding once profile is already verified and active', async () => {
    const student = await createTestUserSession({ onboard: true });

    // Try onboarding again
    const repeatOnboard = await student.client.post(
      '/users/me/onboard',
      {
        phoneNumber: randomValidPhone(),
        hostel: 'Hostel J',
      },
      { validateStatus: () => true }
    );
    // Either idempotent 200 with unchanged state or 400 Bad Request
    expect([200, 400, 409]).toContain(repeatOnboard.status);
  });
});
