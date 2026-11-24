import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { OnboardingModal } from './OnboardingModal';

export const OnboardingGuard: React.FC = () => {
  const { isAuthenticated, isOnboarded, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-thapar-700 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isOnboarded) {
    return (
      <div className="relative">
        <OnboardingModal />
        <div className="p-8 text-center text-slate-400">
          <p>Profile onboarding required to access this feature.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
