import React from 'react';
import { Link } from 'react-router-dom';
import { Car, ShoppingBag, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-thapar-700 via-thapar-800 to-thapar-950 p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gold-300 ring-1 ring-gold-400/40">
            <span className="h-2 w-2 rounded-full bg-gold-400 animate-pulse" />
            TIET Closed Campus Network
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Connected Campus Living for Thapar Students
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            Split cab fares with verified batchmates to Delhi Airport, Chandigarh, or Rajpura, and buy/sell cycle, books, and hostel essentials securely.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/cabs"
              className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-5 py-2.5 text-sm font-semibold text-thapar-950 shadow-md transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <Car className="h-4 w-4" />
              Find Cab Pool
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ShoppingBag className="h-4 w-4" />
              Campus Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-thapar-100 text-thapar-700 dark:bg-thapar-900/40 dark:text-gold-400">
            <Car className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Smart Cab Pooling</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Geocoded drop-points with automated distance matching. View creator hostel details and call or chat directly.
          </p>
          <Link to="/cabs" className="inline-flex items-center gap-1 text-xs font-semibold text-thapar-700 hover:text-thapar-800 dark:text-gold-400">
            Browse trips <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Student Marketplace</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Filtered by category, condition, and hostel. Seller phone privacy protection with direct in-app chat negotiation.
          </p>
          <Link to="/marketplace" className="inline-flex items-center gap-1 text-xs font-semibold text-thapar-700 hover:text-thapar-800 dark:text-gold-400">
            Explore listings <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Real-Time Chat</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            One-to-one STOMP WebSocket messaging isolated by trip or item context with unread counts and delivery receipts.
          </p>
          <Link to="/chat" className="inline-flex items-center gap-1 text-xs font-semibold text-thapar-700 hover:text-thapar-800 dark:text-gold-400">
            Open inbox <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-semibold">Closed Campus Verification Notice</p>
          <p>
            Thapar Connect strictly requires authentication with an active <code>@thapar.edu</code> Google account. In version 1, all payments are settled directly between students offline.
          </p>
        </div>
      </div>
    </div>
  );
};
