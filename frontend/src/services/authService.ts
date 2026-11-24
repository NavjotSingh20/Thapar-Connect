import { api, unwrapData } from './api';
import {
  AuthResponse,
  DevLoginRequest,
  OnboardRequest,
  UpdateUserRequest,
  UserDto,
  TokenRefreshResponse,
} from '@/types';

export const authService = {
  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const res = await api.post('/auth/google', { idToken });
    return unwrapData<AuthResponse>(res);
  },

  async devLogin(data: DevLoginRequest): Promise<AuthResponse> {
    const res = await api.post('/auth/dev-login', data);
    return unwrapData<AuthResponse>(res);
  },

  async refreshAccessToken(): Promise<TokenRefreshResponse> {
    const res = await api.post('/auth/refresh');
    return unwrapData<TokenRefreshResponse>(res);
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getCurrentUser(): Promise<UserDto> {
    const res = await api.get('/users/me');
    return unwrapData<UserDto>(res);
  },

  async onboardUser(data: OnboardRequest): Promise<UserDto> {
    const res = await api.post('/users/me/onboard', data);
    return unwrapData<UserDto>(res);
  },

  async updateProfile(data: UpdateUserRequest): Promise<UserDto> {
    const res = await api.put('/users/me', data);
    return unwrapData<UserDto>(res);
  },
};
