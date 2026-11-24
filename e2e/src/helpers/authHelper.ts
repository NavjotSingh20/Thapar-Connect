import { ApiClient, createApiClient } from './apiClient';
import { StompTestClient, createStompClient } from './stompClient';
import { CONFIG } from '../config/index';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  phoneNumber?: string;
  hostel?: string;
  rollNumber?: string;
  branch?: string;
  year?: number;
  profilePictureUrl?: string;
  isOnboarded: boolean;
  isBanned?: boolean;
  createdAt?: string;
}

export interface DevLoginRequest {
  email: string;
  name?: string;
  role?: 'USER' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface OnboardRequest {
  phoneNumber: string;
  hostel: string;
  rollNumber?: string;
  branch?: string;
  year?: number;
}

export interface CreateUserOptions {
  email?: string;
  name?: string;
  role?: 'USER' | 'ADMIN';
  onboard?: boolean;
  hostel?: string;
  phoneNumber?: string;
  rollNumber?: string;
  branch?: string;
  year?: number;
}

export interface TestUserSession {
  user: UserDto;
  accessToken: string;
  client: ApiClient;
  createStompClient(wsUrl?: string): StompTestClient;
}

/**
 * Calls POST /api/v1/auth/dev-login
 */
export async function devLogin(
  params: DevLoginRequest,
  client: ApiClient = createApiClient()
): Promise<AuthResponse> {
  const payload = {
    email: params.email,
    name: params.name || params.email.split('@')[0],
    role: params.role || 'USER',
  };

  const response = await client.post<AuthResponse>('/auth/dev-login', payload);
  const authData = response.data;
  client.setAuthToken(authData.accessToken);
  return authData;
}

/**
 * Dev login helper for standard USER role
 */
export async function devLoginUser(
  email: string = `test.user.${Date.now()}.${Math.floor(Math.random() * 1000)}@thapar.edu`,
  name: string = 'Test Student',
  client: ApiClient = createApiClient()
): Promise<AuthResponse> {
  return devLogin({ email, name, role: 'USER' }, client);
}

/**
 * Dev login helper for ADMIN role
 */
export async function devLoginAdmin(
  email: string = `admin.${Date.now()}@thapar.edu`,
  name: string = 'Campus Admin',
  client: ApiClient = createApiClient()
): Promise<AuthResponse> {
  return devLogin({ email, name, role: 'ADMIN' }, client);
}

/**
 * Calls POST /api/v1/users/me/onboard
 */
export async function onboardUser(
  client: ApiClient,
  data: OnboardRequest
): Promise<UserDto> {
  const response = await client.post<UserDto>('/users/me/onboard', data);
  return response.data;
}

/**
 * Calls GET /api/v1/users/me
 */
export async function getCurrentUser(client: ApiClient): Promise<UserDto> {
  const response = await client.get<UserDto>('/users/me');
  return response.data;
}

/**
 * High-level user session factory:
 * Generates an isolated ApiClient, logs in via dev-login,
 * optionally performs onboarding, and provides a STOMP client factory.
 */
export async function createTestUserSession(
  options: CreateUserOptions = {}
): Promise<TestUserSession> {
  const client = createApiClient();
  const timestamp = Date.now();
  const rand = Math.floor(Math.random() * 10000);

  const email =
    options.email ||
    (options.role === 'ADMIN'
      ? `admin.${timestamp}.${rand}@thapar.edu`
      : `student.${timestamp}.${rand}@thapar.edu`);

  const name =
    options.name ||
    (options.role === 'ADMIN' ? `Admin ${rand}` : `Student ${rand}`);

  const role = options.role || 'USER';

  const authData = await devLogin({ email, name, role }, client);
  let user = authData.user;

  const shouldOnboard = options.onboard !== false; // default true
  if (shouldOnboard && !user.isOnboarded) {
    const onboardData: OnboardRequest = {
      phoneNumber: options.phoneNumber || '9876543210',
      hostel: options.hostel || 'Hostel J',
      rollNumber: options.rollNumber || `102103${rand.toString().padStart(3, '0')}`,
      branch: options.branch || 'COE',
      year: options.year || 3,
    };
    user = await onboardUser(client, onboardData);
  }

  return {
    user,
    accessToken: authData.accessToken,
    client,
    createStompClient: (wsUrl: string = CONFIG.WS_URL) =>
      createStompClient(authData.accessToken, wsUrl),
  };
}
