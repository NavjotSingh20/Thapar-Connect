import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';
import { HomePage } from '@/pages/HomePage';
import { CabsPage } from '@/pages/CabsPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { ListingDetailPage } from '@/pages/ListingDetailPage';
import { ChatPage } from '@/pages/ChatPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LoginPage } from '@/pages/LoginPage';
import { AdminPage } from '@/pages/AdminPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminGuard } from '@/components/admin/AdminGuard';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />

            {/* Authenticated Routes */}
            <Route element={<AuthGuard />}>
              <Route path="profile" element={<ProfilePage />} />

              {/* Gated Application Features requiring Onboarding */}
              <Route element={<OnboardingGuard />}>
                <Route path="cabs" element={<CabsPage />} />
                <Route path="marketplace" element={<MarketplacePage />} />
                <Route path="marketplace/:id" element={<ListingDetailPage />} />
                <Route path="chat" element={<ChatPage />} />
              </Route>

              {/* Admin Moderation Portal */}
              <Route element={<AdminGuard />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
