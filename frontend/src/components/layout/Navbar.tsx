import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, ShoppingBag, MessageSquare, User, Sun, Moon, Menu, X, Shield, LogIn } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserDisplayName } from '@/types';
import { cn } from '@/utils/cn';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Cab Pooling', path: '/cabs', icon: Car },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'Inbox', path: '/chat', icon: MessageSquare },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-thapar-900/20 bg-thapar-700 text-white shadow-md backdrop-blur dark:border-slate-800 dark:bg-thapar-900">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-gold-400/40 transition group-hover:scale-105">
            <img
              src="/thapar-logo.png"
              alt="Thapar Connect Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-xs font-bold text-gold-400 tracking-wider">TC</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Thapar Connect
              <span className="rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-semibold text-gold-300 ring-1 ring-gold-400/30">
                TIET
              </span>
            </span>
            <span className="hidden text-[10px] text-slate-200 sm:inline-block">
              Campus Pool &amp; Marketplace
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-thapar-900 text-gold-300 shadow-sm ring-1 ring-gold-400/30 dark:bg-slate-900'
                    : 'text-slate-100 hover:bg-thapar-800 hover:text-white dark:hover:bg-thapar-800/60'
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-gold-400' : 'text-slate-300')} />
                {link.name}
              </Link>
            );
          })}
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive('/admin')
                  ? 'bg-thapar-900 text-gold-300 shadow-sm ring-1 ring-gold-400/30 dark:bg-slate-900'
                  : 'text-slate-100 hover:bg-thapar-800 hover:text-white dark:hover:bg-thapar-800/60'
              )}
            >
              <Shield className={cn('h-4 w-4', isActive('/admin') ? 'text-gold-400' : 'text-slate-300')} />
              Admin
            </Link>
          )}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-thapar-800/80 text-slate-100 transition hover:bg-thapar-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-400 dark:bg-slate-800 dark:text-slate-200"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-gold-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-200" />
            )}
          </button>

          {/* Profile / Account or Login Link */}
          {isAuthenticated ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg bg-thapar-800/80 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-thapar-800 hover:text-white dark:bg-slate-800"
            >
              {user?.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt={getUserDisplayName(user)}
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <User className="h-3.5 w-3.5 text-gold-400" />
              )}
              <span className="max-w-[100px] truncate">{getUserDisplayName(user)}</span>
              {user?.role === 'ADMIN' && (
                <span className="rounded bg-gold-400/20 px-1 text-[9px] font-bold text-gold-300">
                  ADMIN
                </span>
              )}
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-lg bg-gold-400/20 px-3 py-1.5 text-xs font-semibold text-gold-300 ring-1 ring-gold-400/30 transition hover:bg-gold-400/30"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg bg-thapar-800/80 text-white focus:outline-none focus:ring-2 focus:ring-gold-400 dark:bg-slate-800"
            aria-label="Open main menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-thapar-800 bg-thapar-800 px-4 pt-2 pb-4 space-y-1 shadow-lg dark:bg-slate-900 dark:border-slate-800">
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
                    ? 'bg-thapar-900 text-gold-300 font-semibold'
                    : 'text-slate-100 hover:bg-thapar-700 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 text-gold-400" />
                {link.name}
              </Link>
            );
          })}
          {isAuthenticated ? (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-100 hover:bg-thapar-700 hover:text-white"
            >
              <User className="h-4 w-4 text-gold-400" />
              {getUserDisplayName(user)}
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gold-300 hover:bg-thapar-700"
            >
              <LogIn className="h-4 w-4" />
              Sign In (@thapar.edu)
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-slate-300 hover:bg-thapar-700 hover:text-white"
            >
              <Shield className="h-3.5 w-3.5 text-gold-400" />
              Admin Moderation
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
