import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Car, ShoppingBag, MessageSquare, User, Sun, Moon, Menu, X, Shield, LogIn } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserDisplayName } from '@/types';
import { cn } from '@/lib/utils';
import { LiquidNavbar, LiquidNavItem, NimbusIcons } from '@/components/ui/LiquidNavbar';
import { ThaparLogo } from '@/components/common/ThaparLogo';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const baseItems: LiquidNavItem[] = [
    { label: 'Home', href: '/', icon: NimbusIcons.home, fx: 'glow' },
    {
      label: 'Cab Pooling',
      href: '/cabs',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 10.9 2 11v5c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      ),
      fx: 'plane',
    },
    {
      label: 'Marketplace',
      href: '/marketplace',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      fx: 'drop',
    },
    {
      label: 'Inbox',
      href: '/chat',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      fx: 'pop',
    },
  ];

  const items: LiquidNavItem[] = user?.role === 'ADMIN'
    ? [
        ...baseItems,
        {
          label: 'Admin',
          href: '/admin',
          icon: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          ),
          fx: 'spin',
        },
      ]
    : baseItems;

  const getActiveIndex = () => {
    if (location.pathname === '/') return 0;
    if (location.pathname.startsWith('/cabs')) return 1;
    if (location.pathname.startsWith('/marketplace')) return 2;
    if (location.pathname.startsWith('/chat')) return 3;
    if (location.pathname.startsWith('/admin') && user?.role === 'ADMIN') return 4;
    return undefined;
  };

  const activeIndex = getActiveIndex();

  const handleNavChange = (_index: number, item: LiquidNavItem) => {
    if (item.href) {
      navigate(item.href);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Cab Pooling', path: '/cabs', icon: Car },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'Inbox', path: '/chat', icon: MessageSquare },
  ];

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 text-slate-900 backdrop-blur-md shadow-xs dark:border-white/10 dark:bg-[#0c0d0e]/90 dark:text-white transition-colors duration-200">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-2">
        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <ThaparLogo className="h-10 w-10 transition-transform duration-200 group-hover:scale-105 shrink-0" />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Thapar Connect
            </span>
            <span className="hidden text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:inline-block">
              Campus Pool &amp; Marketplace
            </span>
          </div>
        </Link>

        {/* Desktop Liquid Navbar ("Waterline") */}
        <nav className="hidden md:flex items-center justify-center">
          <LiquidNavbar
            items={items}
            active={activeIndex}
            onChange={handleNavChange}
            tone={theme === 'dark' ? 'dark' : 'light'}
            sound={true}
          />
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
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
              className="flex items-center gap-1.5 rounded-lg bg-thapar-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-thapar-800 focus:outline-none focus:ring-2 focus:ring-thapar-700 dark:bg-gold-500 dark:text-slate-950 dark:hover:bg-gold-400"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-thapar-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label="Open main menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white/95 px-4 pt-2 pb-4 shadow-lg backdrop-blur-md md:hidden dark:border-white/10 dark:bg-[#0c0d0e]/95 animate-fade-in">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const Icon = link.icon;
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

            {!isAuthenticated ? (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-thapar-700 dark:text-gold-400 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <LogIn className="h-4 w-4" />
                Sign In (@thapar.edu)
              </Link>
            ) : (
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <User className="h-4 w-4 text-thapar-700 dark:text-gold-400" />
                {getUserDisplayName(user)}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
