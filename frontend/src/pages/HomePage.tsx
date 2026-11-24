import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  ShoppingBag,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle2,
  Lock,
  ChevronDown,
  Sparkles,
  Tag,
  PhoneOff,
  Layers,
  Star,
  Compass,
  Check,
  X as CloseIcon,
} from 'lucide-react';
import { ThaparLogo } from '@/components/common/ThaparLogo';
import { useAuthStore } from '@/store/useAuthStore';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const transitHubs = [
    { label: '✈️ Chandigarh Airport (IXC)', query: 'Chandigarh International Airport (IXC)' },
    { label: '🛫 Delhi IGI Airport (T3)', query: 'Indira Gandhi International Airport, Delhi' },
    { label: '🚆 Patiala Railway Station', query: 'Patiala Railway Station' },
    { label: '🛍️ Elante Mall, Chandigarh', query: 'Elante Mall, Industrial Area Phase I, Chandigarh' },
    { label: '🚉 Ambala Cantt Junction', query: 'Ambala Cantt' },
  ];

  const testimonials = [
    {
      name: 'Aarav Mehta',
      role: '3rd Year, Computer Engineering',
      hostel: 'Hostel M',
      quote:
        'Saved over ₹650 on an early morning cab to Chandigarh Airport for Diwali break. Found 3 batchmates headed to the same terminal in 15 minutes. No more spamming WhatsApp groups!',
      avatar: 'AM',
      stars: 5,
    },
    {
      name: 'Priya Singh',
      role: '2nd Year, Electronics & Comm.',
      hostel: 'Hostel E',
      quote:
        'Sold my Hero Sprint cycle within 3 hours of listing it. The best part? My personal phone number was never leaked online—we chatted right here and met in the hostel common room.',
      avatar: 'PS',
      stars: 5,
    },
    {
      name: 'Rohan Sharma',
      role: '4th Year, Mechanical Engg.',
      hostel: 'Hostel J',
      quote:
        'Knowing everyone is strictly verified with a @thapar.edu email gives total peace of mind. It feels like an actual campus network rather than a public classifieds board.',
      avatar: 'RS',
      stars: 5,
    },
  ];

  const faqs = [
    {
      q: 'Who is allowed to access Thapar Connect?',
      a: 'Access is strictly limited to verified students, faculty, and staff possessing an active @thapar.edu Google account. All non-Thapar accounts are automatically rejected at the backend cryptographic token verification boundary.',
    },
    {
      q: 'How does spatial distance sorting work for Cab Pooling?',
      a: 'When you search for any drop-off location (e.g., Sector 56 Gurgaon or Mohali Phase 7), our database calculates the exact spherical Haversine distance between your destination and every open cab pool, ranking the nearest departures first.',
    },
    {
      q: 'Is my phone number visible to everyone on the marketplace?',
      a: 'No! Unlike WhatsApp groups or OLX, seller phone numbers are completely hidden from public listings. Interested students communicate exclusively through in-app STOMP chat until you choose to exchange details.',
    },
    {
      q: 'How are payments handled in Version 1?',
      a: 'In v1, all payments are settled directly between students offline (via UPI or cash) during ride pickup or item handover. There are zero platform cuts, commissions, or gateway fees.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-4 sm:py-8 animate-fade-in">
      {/* =====================================================================
          1. HERO SECTION (High-Impact Campus Super-App Welcome)
          ===================================================================== */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/70 to-slate-100/60 p-6 sm:p-12 lg:p-16 dark:border-white/10 dark:from-[#0c0d11] dark:via-[#111319] dark:to-[#0a0b0e] shadow-sm">
        {/* Subtle Ambient Radial Backdrops */}
        <div className="pointer-events-none absolute top-0 right-1/4 -z-10 h-80 w-80 rounded-full bg-thapar-700/10 blur-3xl dark:bg-thapar-700/20" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 -z-10 h-80 w-80 rounded-full bg-gold-400/10 blur-3xl dark:bg-gold-400/15" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Hero Left: Copy & Actions */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Campus Security Perimeter Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-thapar-200/90 bg-thapar-50/90 px-3.5 py-1.5 text-xs font-semibold text-thapar-800 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-300">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TIET Closed Campus Network</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">@thapar.edu Only</span>
            </div>

            {/* Main Headline (Humble Style Typographic Hierarchy) */}
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.08]">
              Your Campus.<br />
              Your Rides.<br />
              <span className="bg-gradient-to-r from-thapar-700 via-rose-700 to-amber-600 bg-clip-text text-transparent dark:from-gold-300 dark:via-gold-400 dark:to-amber-400">
                Your Marketplace.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Ditch chaotic WhatsApp groups and sketchy brokers. Share verified rides to Chandigarh &amp; Delhi airports, buy and sell cycles, calculators, and textbooks with hostel mates, and chat securely inside campus gates.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/cabs"
                className="inline-flex items-center gap-2.5 rounded-xl bg-thapar-700 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-thapar-800 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-thapar-700 dark:bg-gold-500 dark:text-slate-950 dark:hover:bg-gold-400"
              >
                <Car className="h-4 w-4" />
                <span>Find Cab Pool</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-xs backdrop-blur transition hover:bg-slate-100 hover:border-slate-400 dark:border-white/20 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                <ShoppingBag className="h-4 w-4 text-thapar-700 dark:text-gold-400" />
                <span>Browse Marketplace</span>
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-thapar-700 hover:underline dark:text-gold-400 px-2 py-1"
                >
                  <span>Sign In with @thapar.edu</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            {/* Assurance Footnote */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Zero Commission
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Direct Peer Settlement
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Hidden Phone Numbers
              </span>
            </div>
          </div>

          {/* Hero Right: Live Campus UI Product Mockups (Humble Style) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Card A: Live Cab Pooling Ride Preview */}
            <div className="group relative rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg dark:border-white/15 dark:bg-[#15171e] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-thapar-100 text-thapar-700 dark:bg-gold-500/10 dark:text-gold-400">
                    <Car className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Chandigarh Airport (IXC)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Leaving from Thapar Main Gate • Today 5:00 PM
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  2 Seats Left
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Estimated Fare</span>
                  <span className="text-base font-extrabold text-thapar-700 dark:text-gold-400">
                    ₹450 <span className="text-[10px] font-normal text-slate-500">/ person</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Spatial Distance</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    1.8 km from your stop
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Rohan S. • Hostel J (Verified)
                </span>
                <Link to="/cabs" className="font-semibold text-thapar-700 hover:underline dark:text-gold-400 flex items-center gap-1">
                  Join Pool <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Card B: Live Campus Marketplace Item Preview */}
            <div className="group relative rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg dark:border-white/15 dark:bg-[#15171e] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Hero Sprint Pro 21-Speed
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Cycle • Hostel E • 2nd Year
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  Like New
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Asking Price</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    ₹3,800
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <PhoneOff className="h-3.5 w-3.5" />
                  <span>Phone Protected</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500">
                <span>Priya S. • Direct In-App Chat</span>
                <Link to="/marketplace" className="font-semibold text-thapar-700 hover:underline dark:text-gold-400 flex items-center gap-1">
                  View Listing <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Card C: Realtime STOMP Chat Preview */}
            <div className="group relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-lg dark:border-white/15 dark:bg-[#15171e] transition-all duration-300 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-thapar-700 dark:text-gold-400" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    Ride Group: Delhi IGI T3
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">STOMP Realtime</span>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="rounded-xl bg-slate-100 dark:bg-white/5 p-2.5 max-w-[85%] text-slate-700 dark:text-slate-300 text-[11px]">
                  <span className="font-bold text-thapar-700 dark:text-gold-400 block text-[10px]">Aarav (Hostel M):</span>
                  Leaving from Hostel M porch at 4:30 AM sharp. Bags ready?
                </div>
                <div className="ml-auto rounded-xl bg-thapar-700 dark:bg-gold-500 p-2.5 max-w-[85%] text-white dark:text-slate-950 text-[11px]">
                  Bags packed! Settle the ₹650 on GPay when we reach.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* By The Numbers (Humble Style Metrics Strip) */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 border-t border-slate-200/80 pt-8 dark:border-white/10 text-left">
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">100%</span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Campus Verified</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              @thapar.edu domain restricted. Zero outsider spam.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-thapar-700 dark:text-gold-400">₹450+</span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Average Savings</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Per student on shared airport trips to Chandigarh &amp; Delhi.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">15+</span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Hostel Dorms</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Hostels A–Q, PG, and Day Scholars connected.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">0%</span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Platform Cut</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Direct peer settlement via UPI or cash.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. WHAT IS THAPAR CONNECT & WHO IS IT FOR? (Humble Signature Section)
          ===================================================================== */}
      <section className="space-y-8 text-left">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-thapar-700 dark:text-gold-400">
            <Compass className="h-3.5 w-3.5" />
            <span>Campus Mission</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Built by Students, for Students.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Campus life moves fast. Thapar Connect centralizes rides and peer commerce into one verified space so you save money, save time, and protect your privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box 1: Who is it for? */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs dark:border-white/10 dark:bg-[#12141a] space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-thapar-50 text-thapar-700 dark:bg-gold-500/10 dark:text-gold-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Who is Thapar Connect for?
              </h3>
            </div>
            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Freshers &amp; Hostelers</strong> needing to split airport or railway cabs without begging in 10 random WhatsApp groups.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Graduating Seniors</strong> passing down cycles, coolers, drafters, and engineering books directly to juniors.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Privacy-Conscious Students</strong> who do not want their personal WhatsApp phone number floating in massive public groups.
                </span>
              </li>
            </ul>
          </div>

          {/* Box 2: What can students do? */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs dark:border-white/10 dark:bg-[#12141a] space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-thapar-50 text-thapar-700 dark:bg-gold-500/10 dark:text-gold-400">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                What can you do on Thapar Connect?
              </h3>
            </div>
            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <Car className="h-4 w-4 text-thapar-700 dark:text-gold-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Share Rides:</strong> Find or create cab pools to IXC, Delhi IGI, or Patiala Station sorted by proximity to your exact drop point.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ShoppingBag className="h-4 w-4 text-thapar-700 dark:text-gold-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Buy &amp; Sell:</strong> Trade cycles, calculators, books, and dorm essentials with zero commission and instant in-app chat.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Stay Safe:</strong> 100% verified campus identities, one-click user blocking, reporting, and administrative moderation.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. CAB POOLING MODULE SECTION (Spatial Proximity & Transit Hubs)
          ===================================================================== */}
      <section className="space-y-8 text-left">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-thapar-700 dark:text-gold-400">
            <Car className="h-3.5 w-3.5" />
            <span>Module 01 • Spatial Cab Pooling</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Rides made effortless. No more WhatsApp spam.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Heading to Chandigarh Airport, Delhi IGI, or Patiala Station? Join open pools or create your own with database-level spherical distance matching.
          </p>
        </div>

        {/* Transit Hub Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {transitHubs.map((hub) => (
            <Link
              key={hub.label}
              to={`/cabs?search=${encodeURIComponent(hub.query)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:border-thapar-700 hover:text-thapar-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-gold-400 dark:hover:text-gold-300"
            >
              <span>{hub.label}</span>
            </Link>
          ))}
        </div>

        {/* Bento Grid: Cab Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#12141a] space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-thapar-50 text-thapar-700 dark:bg-gold-500/10 dark:text-gold-400">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Haversine Proximity Ranking
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Search any drop point (e.g. Sector 56 Gurgaon, Elante Mall). All open trips are automatically sorted by nearest drop-off distance.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#12141a] space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-thapar-50 text-thapar-700 dark:bg-gold-500/10 dark:text-gold-400">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pessimistic Concurrency
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Zero overbooking. Database-level row locking prevents race conditions when students book the final seat simultaneously.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#12141a] space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-thapar-50 text-thapar-700 dark:bg-gold-500/10 dark:text-gold-400">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Auto-Expiration &amp; Phone Calls
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Past-departure trips expire automatically. Confirmed members get one-click call links to coordinate departures effortlessly.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. CAMPUS MARKETPLACE MODULE SECTION (Privacy & Trust)
          ===================================================================== */}
      <section className="space-y-8 text-left">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-thapar-700 dark:text-gold-400">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Module 02 • Campus Marketplace</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Buy smarter. Sell faster. Inside campus gates.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            From cycles and scientific calculators to Galvin OS textbooks and hostel coolers. Trade directly with verified batchmates without exposing your personal phone number.
          </p>
        </div>

        {/* Bento Grid: Marketplace Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#12141a] space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <PhoneOff className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Seller Phone Privacy Protected
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your phone number is strictly excluded from all public APIs and cards. Interested buyers initiate contact via in-app chat.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#12141a] space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Tag className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Campus-Specific Categories
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Tailored categories: Cycles, Calculators, Books, Electronics, Furniture, Hostel Essentials. Filter by your specific hostel block.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#12141a] space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Direct Peer Settlement
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              No middleman delays or transaction fees. Inspect the item in person at the hostel common room and settle directly via UPI or cash.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. COMPARISON SECTION (Why Thapar Connect over WhatsApp)
          ===================================================================== */}
      <section className="space-y-6 text-left">
        <div className="max-w-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-thapar-700 dark:text-gold-400">
            <Layers className="h-3.5 w-3.5" />
            <span>The Upgrade</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Why replace WhatsApp groups?
          </h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#12141a]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <th className="py-3.5 px-4 font-bold">Feature</th>
                <th className="py-3.5 px-4 font-bold text-slate-500">WhatsApp Groups &amp; Spreadsheets</th>
                <th className="py-3.5 px-4 font-bold text-thapar-700 dark:text-gold-400">Thapar Connect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">Identity Verification</td>
                <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1.5">
                  <CloseIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  Unverified strangers, alumni, spammers
                </td>
                <td className="py-3.5 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Strict @thapar.edu Google authentication
                  </div>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">Phone Privacy</td>
                <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1.5">
                  <CloseIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  Your phone number is exposed to hundreds of members
                </td>
                <td className="py-3.5 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Hidden by default; safe in-app chat
                  </div>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">Ride Discovery</td>
                <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1.5">
                  <CloseIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  Lost in hundreds of daily chat messages
                </td>
                <td className="py-3.5 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Spatial Haversine distance search &amp; filters
                  </div>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">Seat Capacity</td>
                <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1.5">
                  <CloseIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  Accidental double-bookings, manual lists
                </td>
                <td className="py-3.5 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Pessimistic concurrency locking
                  </div>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">Marketplace Catalog</td>
                <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1.5">
                  <CloseIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  Reposting photos daily, no search or categories
                </td>
                <td className="py-3.5 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Persistent catalog with category &amp; hostel filters
                  </div>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">Abuse Protection</td>
                <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1.5">
                  <CloseIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  No admin recourse, no user blocking
                </td>
                <td className="py-3.5 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    1-Click user block, reporting &amp; admin ban
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================================
          6. TESTIMONIALS SECTION (Humble "Loved by Students" Style)
          ===================================================================== */}
      <section className="space-y-8 text-left">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-thapar-700 dark:text-gold-400">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>Loved by Students</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Real stories from verified batchmates.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Here is how TIET students are already using Thapar Connect to coordinate daily life across campus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#12141a] flex flex-col justify-between space-y-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-thapar-100 text-thapar-700 dark:bg-gold-500/20 dark:text-gold-400 font-bold text-xs">
                  {t.avatar}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {t.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {t.hostel} • {t.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          7. FAQ SECTION (Accordion)
          ===================================================================== */}
      <section className="space-y-6 text-left">
        <div className="max-w-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-thapar-700 dark:text-gold-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.q}
              className="rounded-2xl border border-slate-200 bg-white transition-all dark:border-white/10 dark:bg-[#12141a]"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="flex w-full items-center justify-between p-4 sm:p-5 text-left text-sm font-bold text-slate-900 dark:text-white"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                    openFaq === index ? 'rotate-180 text-thapar-700 dark:text-gold-400' : ''
                  }`}
                />
              </button>
              {openFaq === index && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-xs sm:text-sm text-slate-600 dark:border-white/5 dark:text-slate-400 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          8. BOTTOM CALL-TO-ACTION BANNER (Humble "Hey, Student!" Style)
          ===================================================================== */}
      <section className="relative overflow-hidden rounded-3xl border border-thapar-900/30 bg-gradient-to-r from-thapar-700 via-thapar-800 to-thapar-950 p-8 sm:p-12 text-center text-white shadow-xl dark:border-white/15">
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-gold-400/40">
            <ThaparLogo className="h-10 w-10" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Join 15,000+ TIET Students Today
          </h2>
          <p className="text-sm sm:text-base text-slate-200 max-w-lg mx-auto">
            Experience reliable campus pooling, student marketplace, and authenticated safety controls built exclusively for Thapar.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            {!isAuthenticated ? (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-semibold text-thapar-950 shadow-md transition hover:bg-gold-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <span>Sign In with Thapar Email</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/cabs"
                className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-semibold text-thapar-950 shadow-md transition hover:bg-gold-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <span>Go to Cab Pooling</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <span>Explore Marketplace</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          9. FOOTER
          ===================================================================== */}
      <footer className="border-t border-slate-200/80 pt-8 pb-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400 text-left">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ThaparLogo className="h-6 w-6" />
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Thapar Connect
            </span>
            <span>•</span>
            <span>TIET Patiala, Punjab</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <Link to="/cabs" className="hover:underline">Cab Pooling</Link>
            <Link to="/marketplace" className="hover:underline">Marketplace</Link>
            <Link to="/chat" className="hover:underline">Chat</Link>
            <Link to="/profile" className="hover:underline">Profile</Link>
            <Link to="/login" className="hover:underline">Sign In</Link>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">
          Built exclusively for the Thapar Institute of Engineering and Technology community. Offline peer-to-peer settlement only.
        </p>
      </footer>
    </div>
  );
};
