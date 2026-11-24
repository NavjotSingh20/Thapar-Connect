import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Search,
  PlusCircle,
  SlidersHorizontal,
  RotateCcw,
  LayoutGrid,
  List,
  AlertCircle,
  Calendar,
  ChevronDown,
  Navigation,
} from 'lucide-react';
import { cabService } from '@/services/cabService';
import { useAuthStore } from '@/store/useAuthStore';
import { CabGroupSummaryDto, CabGroupDetailDto } from '@/types';
import { CabCard } from '@/components/cabs/CabCard';
import { CreateCabModal } from '@/components/cabs/CreateCabModal';
import { JoinRequestModal } from '@/components/cabs/JoinRequestModal';
import { ManageRequestsModal } from '@/components/cabs/ManageRequestsModal';

interface QuickHub {
  name: string;
  coords: { lat: number; lng: number };
}

const QUICK_HUBS: QuickHub[] = [
  { name: 'Chandigarh Airport', coords: { lat: 30.6735, lng: 76.7885 } },
  { name: 'Delhi IGI Airport', coords: { lat: 28.5562, lng: 77.1000 } },
  { name: 'Patiala Railway Stn', coords: { lat: 30.3340, lng: 76.3980 } },
  { name: 'Patiala Bus Stand', coords: { lat: 30.3256, lng: 76.4022 } },
  { name: 'Rajpura Junction', coords: { lat: 30.4840, lng: 76.5938 } },
  { name: 'Ambala Cantt', coords: { lat: 30.3312, lng: 76.8406 } },
];

export const CabsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  // Pool List State
  const [cabs, setCabs] = useState<CabGroupSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeHub, setActiveHub] = useState<string | null>(null);
  const [searchCoords, setSearchCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [minSeats, setMinSeats] = useState<number | undefined>(undefined);
  const [maxFare, setMaxFare] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('distance');
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [joinModalOpen, setJoinModalOpen] = useState<boolean>(false);
  const [manageModalOpen, setManageModalOpen] = useState<boolean>(false);
  const [selectedCab, setSelectedCab] = useState<CabGroupSummaryDto | null>(null);

  // Notification Banner
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchCabs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchCoords) {
        params.searchLat = searchCoords.lat;
        params.searchLng = searchCoords.lng;
      }
      if (selectedDate) {
        params.date = selectedDate;
      }
      if (minSeats !== undefined && minSeats > 0) {
        params.minSeats = minSeats;
      }
      if (maxFare !== undefined && maxFare > 0) {
        params.maxFare = maxFare;
      }
      if (sortBy) {
        params.sortBy = sortBy;
      }

      const data = await cabService.getCabGroups(params);
      setCabs(data);
    } catch (err: any) {
      setError('Unable to load cab pools. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCabs();
  }, [searchCoords, selectedDate, minSeats, maxFare, sortBy]);

  // Client-side text query search refinement
  const filteredCabs = useMemo(() => {
    if (!searchQuery.trim()) return cabs;
    const q = searchQuery.toLowerCase().trim();
    return cabs.filter(
      (c) =>
        c.dropPoint.toLowerCase().includes(q) ||
        c.pickupPoint.toLowerCase().includes(q) ||
        c.creator?.name?.toLowerCase().includes(q) ||
        c.creator?.hostel?.toLowerCase().includes(q)
    );
  }, [cabs, searchQuery]);

  const handleHubSelect = (hub: QuickHub) => {
    if (activeHub === hub.name) {
      setActiveHub(null);
      setSearchCoords(null);
    } else {
      setActiveHub(hub.name);
      setSearchCoords(hub.coords);
      setSearchQuery('');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveHub(null);
    setSearchCoords(null);
    setSelectedDate('');
    setMinSeats(undefined);
    setMaxFare(undefined);
    setSortBy('distance');
  };

  const handleJoinClick = (cab: CabGroupSummaryDto) => {
    setSelectedCab(cab);
    setJoinModalOpen(true);
  };

  const handleManageClick = (cab: CabGroupSummaryDto) => {
    setSelectedCab(cab);
    setManageModalOpen(true);
  };

  const handleChatClick = async (cab: CabGroupSummaryDto) => {
    if (!cab.creator?.id) return;
    try {
      const conversation = await cabService.initiateCabChat(cab.id, cab.creator.id);
      navigate(`/chat?conversationId=${conversation.id}`);
    } catch (err) {
      // If chat service is not active, direct to chat inbox
      navigate('/chat');
    }
  };

  const handleCreated = (newCab: CabGroupDetailDto) => {
    setSuccessNotice(`Cab pool to ${newCab.dropPoint} published successfully!`);
    fetchCabs();
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleJoined = () => {
    setSuccessNotice('Your request has been submitted successfully!');
    fetchCabs();
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Car className="h-7 w-7 text-thapar-700 dark:text-gold-400" />
            Cab Pooling
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Coordinate shared rides to airports, transit stations, and cities with verified TIET students. Save money and travel safely together.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-thapar-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-thapar-800 active:scale-95 dark:bg-thapar-800 dark:hover:bg-thapar-700"
        >
          <PlusCircle className="h-4 w-4" />
          Create Pool
        </button>
      </div>

      {/* Success Notice */}
      {successNotice && (
        <div className="rounded-xl bg-emerald-50 p-4 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between animate-in fade-in">
          <span>{successNotice}</span>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search, Filter Bar, Quick Hubs */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by drop destination, pickup, or student..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-thapar-700 focus:outline-none focus:ring-1 focus:ring-thapar-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Action Buttons: Filter drawer toggle, Sort dropdown, View Mode */}
          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold shadow-sm transition-colors ${
                showFilterDrawer || selectedDate || minSeats || maxFare
                  ? 'border-thapar-700 bg-thapar-50 text-thapar-800 dark:border-thapar-700 dark:bg-thapar-950/60 dark:text-thapar-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {(selectedDate || minSeats || maxFare) && (
                <span className="ml-1 w-2 h-2 rounded-full bg-thapar-700 dark:bg-gold-400" />
              )}
            </button>

            {/* Sort Selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-slate-700 shadow-sm focus:border-thapar-700 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="distance,asc">Sort: Nearest Distance</option>
                <option value="departureTime,asc">Sort: Earliest Departure</option>
                <option value="estimatedFare,asc">Sort: Lowest Fare</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Hub Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <Navigation className="w-3 h-3" /> Spatial:
          </span>
          {QUICK_HUBS.map((hub) => {
            const isSelected = activeHub === hub.name;
            return (
              <button
                key={hub.name}
                onClick={() => handleHubSelect(hub)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-thapar-700 text-white shadow-sm dark:bg-thapar-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {hub.name}
              </button>
            );
          })}
          {(activeHub || searchCoords) && (
            <button
              onClick={() => {
                setActiveHub(null);
                setSearchCoords(null);
              }}
              className="shrink-0 text-xs text-thapar-700 dark:text-thapar-400 hover:underline px-2"
            >
              Clear spatial
            </button>
          )}
        </div>

        {/* Expandable Filter Drawer */}
        {showFilterDrawer && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Date Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Departure Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-thapar-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Min Seats */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Min Available Seats
                </label>
                <select
                  value={minSeats ?? ''}
                  onChange={(e) => setMinSeats(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:border-thapar-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Any seats available</option>
                  <option value="1">At least 1 seat</option>
                  <option value="2">At least 2 seats</option>
                  <option value="3">At least 3 seats</option>
                  <option value="4">At least 4 seats</option>
                </select>
              </div>

              {/* Max Fare */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Max Fare (₹) {maxFare ? `≤ ₹${maxFare}` : ''}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 600"
                  value={maxFare ?? ''}
                  onChange={(e) => setMaxFare(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:border-thapar-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3 h-3" />
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pools Grid / List Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="mx-auto w-8 h-8 mb-2 text-rose-600 dark:text-rose-400" />
          <h3 className="font-bold text-sm">Failed to Load Cab Pools</h3>
          <p className="mt-1 text-xs">{error}</p>
          <button
            onClick={fetchCabs}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-700"
          >
            Try Again
          </button>
        </div>
      ) : filteredCabs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-thapar-50 text-thapar-700 dark:bg-thapar-950 dark:text-gold-400 mb-4">
            <Car className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Cab Pools Found
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery || activeHub || selectedDate || minSeats || maxFare
              ? 'No active cab pools match your search criteria. Try relaxing your filters or searching from a different hub.'
              : 'There are currently no upcoming open cab pools. Be the first to create one!'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {(searchQuery || activeHub || selectedDate || minSeats || maxFare) && (
              <button
                onClick={handleResetFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-thapar-700 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-thapar-800 dark:bg-thapar-800"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Create a Pool
            </button>
          </div>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'flex flex-col gap-4'
          }
        >
          {filteredCabs.map((cab) => (
            <CabCard
              key={cab.id}
              cab={cab}
              currentUserId={currentUser?.id}
              onJoin={handleJoinClick}
              onManage={handleManageClick}
              onChat={handleChatClick}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateCabModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreated}
      />

      <JoinRequestModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        cab={selectedCab}
        onSuccess={handleJoined}
      />

      <ManageRequestsModal
        isOpen={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        cabId={selectedCab?.id || null}
        onGroupUpdated={fetchCabs}
      />
    </div>
  );
};
