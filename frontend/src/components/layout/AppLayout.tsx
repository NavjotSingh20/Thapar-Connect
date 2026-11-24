import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { OnboardingModal } from '@/components/auth/OnboardingModal';
import { useAuthStore } from '@/store/useAuthStore';

export const AppLayout: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <Navbar />
      
      {/* Non-dismissible Onboarding Modal mounted globally when authenticated but not onboarded */}
      <OnboardingModal />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation (visible < 768px) */}
      <BottomNav />
    </div>
  );
};
