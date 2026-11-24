import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Car, ShoppingBag, MessageSquare, User, Menu, X, Shield, LogIn, LogOut, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { LiquidNavbar, LiquidNavItem, NimbusIcons } from '@/components/ui/LiquidNavbar';
import { ThaparLogo } from '@/components/common/ThaparLogo';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Custom SVG Icons matching LiquidNavbar styling
  const CabIcon = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 10.9 2 11v5c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );

  const MarketIcon = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );

  const InboxIcon = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  const GetStartedIcon = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );

  const AdminIcon = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );

  // Items when NOT logged in: Home, Cab Pooling, MarketPlace, Get Started
  const guestItems: LiquidNavItem[] = [
    { label: 'Home', href: '/', icon: NimbusIcons.home, fx: 'glow' },
    { label: 'Cab Pooling', href: '/cabs', icon: CabIcon, fx: 'plane' },
    { label: 'MarketPlace', href: '/marketplace', icon: MarketIcon, fx: 'drop' },
    { label: 'Get Started', href: '/login', icon: GetStartedIcon, fx: 'pop' },
  ];

  // Items when LOGGED IN: Cab Pooling, MarketPlace, Inbox, Profile (+ Admin if admin)
  const authItems: LiquidNavItem[] = [
    { label: 'Cab Pooling', href: '/cabs', icon: CabIcon, fx: 'plane' },
    { label: 'MarketPlace', href: '/marketplace', icon: MarketIcon, fx: 'drop' },
    { label: 'Inbox', href: '/chat', icon: InboxIcon, fx: 'pop' },
    { label: 'Profile', href: '/profile', icon: NimbusIcons.user, fx: 'wave' },
    ...(user?.role === 'ADMIN'
      ? [
          {
            label: 'Admin',
            href: '/admin',
            icon: AdminIcon,
            fx: 'spin' as const,
          },
        ]
      : []),
  ];

  const items = isAuthenticated ? authItems : guestItems;

  const getActiveIndex = (): number | undefined => {
    if (!isAuthenticated) {
      if (location.pathname === '/') return 0;
      if (location.pathname.startsWith('/cabs')) return 1;
      if (location.pathname.startsWith('/marketplace')) return 2;
      if (location.pathname.startsWith('/login')) return 3;
      return undefined;
    } else {
      if (location.pathname.startsWith('/cabs')) return 0;
      if (location.pathname.startsWith('/marketplace')) return 1;
      if (location.pathname.startsWith('/chat')) return 2;
      if (location.pathname.startsWith('/profile')) return 3;
      if (location.pathname.startsWith('/admin') && user?.role === 'ADMIN') return 4;
      return undefined;
    }
  };

  const activeIndex = getActiveIndex();

  const handleNavChange = (_index: number, item: LiquidNavItem) => {
    if (item.href) {
      navigate(item.href);
    }
  };

  const navLinks = !isAuthenticated
    ? [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Cab Pooling', path: '/cabs', icon: Car },
        { name: 'MarketPlace', path: '/marketplace', icon: ShoppingBag },
        { name: 'Get Started', path: '/login', icon: ArrowRight },
      ]
    : [
        { name: 'Cab Pooling', path: '/cabs', icon: Car },
        { name: 'MarketPlace', path: '/marketplace', icon: ShoppingBag },
        { name: 'Inbox', path: '/chat', icon: MessageSquare },
        { name: 'Profile', path: '/profile', icon: User },
      ];

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#A3D65C]/35 bg-white/95 text-[#20251F] backdrop-blur-md shadow-xs transition-colors duration-200">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-2">
        {/* Left: Brand Logo & Title */}
        <div className="flex flex-1 items-center justify-start min-w-0">
          <Link to={isAuthenticated ? "/cabs" : "/"} className="flex items-center gap-3 group shrink-0">
            <ThaparLogo className="h-10 w-10 transition-transform duration-200 group-hover:scale-105 shrink-0" />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-[#20251F]">
                Thapar Connect
              </span>
              <span className="hidden text-[11px] font-medium text-[#20251F]/70 sm:inline-block">
                Campus Pool &amp; Marketplace
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Liquid Navbar ("Waterline") */}
        <nav className="hidden md:flex items-center justify-center shrink-0">
          <LiquidNavbar
            items={items}
            active={activeIndex}
            onChange={handleNavChange}
            tone="light"
            sound={false}
          />
        </nav>

        {/* Right: Balanced Container / Mobile Hamburger */}
        <div className="flex flex-1 items-center justify-end">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-[#B7BEB2] bg-[#E6E9E3] text-[#20251F] hover:bg-[#d8ded4] focus:outline-none focus:ring-2 focus:ring-[#A3D65C]"
            aria-label="Open main menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="border-b border-[#A3D65C]/35 bg-white/98 px-4 pt-2 pb-4 shadow-lg backdrop-blur-md md:hidden animate-fade-in">
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
                      ? 'bg-[#A3D65C]/25 text-[#20251F] font-semibold'
                      : 'text-[#20251F]/80 hover:bg-[#E6E9E3] hover:text-[#20251F]'
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-[#20251F]' : 'text-[#B7BEB2]')} />
                  {link.name}
                </Link>
              );
            })}

            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-[#20251F]/80 hover:bg-[#E6E9E3]"
              >
                <Shield className="h-3.5 w-3.5 text-[#20251F]" />
                Admin Moderation
              </Link>
            )}

            {!isAuthenticated ? (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-[#20251F] hover:bg-[#E6E9E3]"
              >
                <LogIn className="h-4 w-4" />
                Sign In (@thapar.edu)
              </Link>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[#20251F] hover:bg-[#E6E9E3]"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
