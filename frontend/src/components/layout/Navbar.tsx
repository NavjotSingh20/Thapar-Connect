import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Car, ShoppingBag, MessageSquare, User, Sun, Moon, Menu, X, Shield, LogIn } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserDisplayName } from '@/types';
import { cn } from '@/lib/utils';
import { Tabs, Tab } from '@/components/ui/Tabs';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const baseTabs: Tab[] = [
    { id: '/cabs', label: 'Cab Pooling' },
    { id: '/marketplace', label: 'Marketplace' },
    { id: '/chat', label: 'Inbox' },
  ];

  const tabs: Tab[] = user?.role === 'ADMIN'
    ? [...baseTabs, { id: '/admin', label: 'Admin' }]
    : baseTabs;

  // Determine which tab matches the current URL
  const activeTab = tabs.find((t) => location.pathname.startsWith(t.id))?.id;

  const handleTabChange = (tabId: string) => {
    navigate(tabId);
  };

  const navLinks = [
    { name: 'Cab Pooling', path: '/cabs', icon: Car },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'Inbox', path: '/chat', icon: MessageSquare },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 text-slate-900 backdrop-blur-md shadow-xs dark:border-white/10 dark:bg-[#0c0d0e]/90 dark:text-white transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-thapar-700 text-white ring-1 ring-thapar-800/40 shadow-xs transition group-hover:scale-105">
            <img
              src="/thapar-logo.png"
              alt="Thapar Connect Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-xs font-bold text-gold-300 tracking-wider">TC</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Thapar Connect
              <span className="rounded-full bg-thapar-100 dark:bg-thapar-950/60 px-2 py-0.5 text-[10px] font-semibold text-thapar-800 dark:text-gold-400 border border-thapar-200 dark:border-gold-400/20">
                TIET
              </span>
            </span>
            <span className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:inline-block">
              Campus Pool &amp; Marketplace
            </span>
          </div>
        </Link>

        {/* Desktop Animated Navigation Tabs */}
        <nav className="hidden md:flex items-center justify-center">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            className="py-1"
          />
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-thapar-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-gold-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* Profile / Account or Login Link */}
          {isAuthenticated ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {user?.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt={getUserDisplayName(user)}
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <User className="h-3.5 w-3.5 text-thapar-700 dark:text-gold-400" />
              )}
              <span className="max-w-[100px] truncate">{getUserDisplayName(user)}</span>
              {user?.role === 'ADMIN' && (
                <span className="rounded bg-thapar-100 dark:bg-gold-400/20 px-1 text-[9px] font-bold text-thapar-800 dark:text-gold-300">
                  ADMIN
                </span>
              )}
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-lg bg-thapar-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-thapar-800 focus:outline-none focus:ring-2 focus:ring-thapar-700 dark:bg-gold-500 dark:text-slate-950 dark:hover:bg-gold-400"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-thapar-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label="Open main menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg dark:bg-[#0c0d0e] dark:border-white/10">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-thapar-50 text-thapar-700 dark:bg-white/10 dark:text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-thapar-700 dark:text-gold-400' : 'text-slate-400')} />
                {link.name}
              </Link>
            );
          })}
          {isAuthenticated ? (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <User className="h-4 w-4 text-thapar-700 dark:text-gold-400" />
              {getUserDisplayName(user)}
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-thapar-700 dark:text-gold-400 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <LogIn className="h-4 w-4" />
              Sign In (@thapar.edu)
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
            >
              <Shield className="h-3.5 w-3.5 text-thapar-700 dark:text-gold-400" />
              Admin Moderation
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
