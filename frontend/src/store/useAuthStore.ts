import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/authService';
import { UserDto, OnboardRequest, UpdateUserRequest, DevLoginRequest } from '@/types';

export interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  error: string | null;

  loginWithGoogle: (idToken: string) => Promise<void>;
  devLogin: (params: DevLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  onboardUser: (data: OnboardRequest) => Promise<void>;
  updateUser: (data: UpdateUserRequest) => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setAccessToken: (token: string | null) => void;
  setUser: (user: UserDto | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isOnboarded: false,
      isLoading: false,
      error: null,

      loginWithGoogle: async (idToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const authData = await authService.loginWithGoogle(idToken);
          set({
            user: authData.user,
            accessToken: authData.accessToken,
            isAuthenticated: true,
            isOnboarded: !!authData.user.isOnboarded,
            isLoading: false,
            error: null,
          });
        } catch (err: any) {
          const status = err.response?.status;
          const serverError = err.response?.data?.error;
          const serverMsg = err.response?.data?.message;

          let friendlyMessage = 'Sign-in failed. Please try again.';
          if (status === 403 || serverError === 'INVALID_DOMAIN') {
            friendlyMessage =
              'Access restricted to @thapar.edu domain. Please sign in with your university account.';
          } else if (serverMsg) {
            friendlyMessage = serverMsg;
          }
          set({ error: friendlyMessage, isLoading: false });
          throw err;
        }
      },

      devLogin: async (params: DevLoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const authData = await authService.devLogin(params);
          set({
            user: authData.user,
            accessToken: authData.accessToken,
            isAuthenticated: true,
            isOnboarded: !!authData.user.isOnboarded,
            isLoading: false,
            error: null,
          });
        } catch (err: any) {
          const msg =
            err.response?.data?.message || err.message || 'Developer login failed.';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (e) {
          // Ignore network errors on logout
        } finally {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isOnboarded: false,
            error: null,
            isLoading: false,
          });
          localStorage.removeItem('thapar-auth-storage');
        }
      },

      refreshAccessToken: async () => {
        try {
          const res = await authService.refreshAccessToken();
          set({ accessToken: res.accessToken });
          return res.accessToken;
        } catch (err) {
          get().logout();
          return null;
        }
      },

      onboardUser: async (data: OnboardRequest) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authService.onboardUser(data);
          const newAccessToken = (updatedUser as any).accessToken || get().accessToken;
          set({
            user: updatedUser,
            accessToken: newAccessToken,
            isOnboarded: true,
            isLoading: false,
          });
        } catch (err: any) {
          const msg =
            err.response?.data?.message || err.message || 'Onboarding submission failed.';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      updateUser: async (data: UpdateUserRequest) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authService.updateProfile(data);
          set({
            user: updatedUser,
            isOnboarded: updatedUser.isOnboarded,
            isLoading: false,
          });
        } catch (err: any) {
          const msg =
            err.response?.data?.message || err.message || 'Profile update failed.';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          try {
            const newAccessToken = await get().refreshAccessToken();
            if (!newAccessToken) return;
          } catch (e) {
            return;
          }
        }

        try {
          const user = await authService.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isOnboarded: !!user.isOnboarded,
          });
        } catch (err: any) {
          if (err.response?.status === 401) {
            get().logout();
          }
        }
      },

      clearError: () => set({ error: null }),
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user, isOnboarded: !!user?.isOnboarded }),
    }),
    {
      name: 'thapar-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);
