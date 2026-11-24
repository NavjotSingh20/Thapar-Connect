import React, { useEffect, useState, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  PlusCircle,
  SlidersHorizontal,
  RotateCcw,
  PackageSearch,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { marketplaceService } from '@/services/marketplaceService';
import { ListingSummaryDto, ListingFilterParams, MarketplaceCategory } from '@/types';
import { MARKETPLACE_CATEGORIES, SORT_OPTIONS } from '@/constants/marketplace';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { ListingFilters } from '@/components/marketplace/ListingFilters';
import { CreateListingModal } from '@/components/marketplace/CreateListingModal';

export const MarketplacePage: React.FC = () => {
  // Active Tab: Browse All vs My Listings
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // Listings State
  const [listings, setListings] = useState<ListingSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState<number>(0);
  const [pageSize] = useState<number>(12);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Filters State
  const [searchInput, setSearchInput] = useState<string>('');
  const [filters, setFilters] = useState<ListingFilterParams>({
    page: 0,
    size: 12,
    sortBy: 'createdAt,desc',
  });

  // Mobile Filter Drawer
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);

  // Create Listing Modal
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  // Fetch listings from service
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'my') {
        const res = await marketplaceService.getMyListings(page, pageSize);
        setListings(res.content || []);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
      } else {
        const queryParams: ListingFilterParams = {
          ...filters,
          page,
          size: pageSize,
        };
        const res = await marketplaceService.getListings(queryParams);
        setListings(res.content || []);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || 0);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load marketplace listings');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, page, pageSize]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setFilters((prev) => ({
      ...prev,
      query: searchInput.trim() ? searchInput.trim() : undefined,
      page: 0,
    }));
  };

  // Quick Category Chip Toggle
  const handleCategorySelect = (category: MarketplaceCategory | 'All') => {
    setPage(0);
    setFilters((prev) => ({
      ...prev,
      category: category === 'All' ? undefined : category,
      page: 0,
    }));
  };

  // Sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPage(0);
    setFilters((prev) => ({
      ...prev,
      sortBy: e.target.value,
      page: 0,
    }));
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchInput('');
    setPage(0);
    setFilters({
      page: 0,
      size: pageSize,
      sortBy: 'createdAt,desc',
    });
  };

  const hasActiveFilters = Boolean(
    filters.query ||
      filters.category ||
      filters.condition ||
      filters.hostel ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShoppingBag className="h-7 w-7 text-thapar-700 dark:text-gold-400" />
            Campus Marketplace
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Buy and sell cycles, calculators, textbooks, and hostel essentials directly from fellow Thapar students.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-thapar-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-thapar-800 dark:bg-thapar-600 dark:hover:bg-thapar-700 shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            Post Item for Sale
          </button>
        </div>
      </div>

      {/* Tabs: Browse All vs My Listings */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveTab('all');
            setPage(0);
          }}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'all'
              ? 'border-thapar-700 text-thapar-700 dark:border-gold-400 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          All Listings
        </button>
        <button
          onClick={() => {
            setActiveTab('my');
            setPage(0);
          }}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'my'
              ? 'border-thapar-700 text-thapar-700 dark:border-gold-400 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <User className="h-4 w-4" />
          My Listings
        </button>
      </div>

      {/* Browse Controls (Search, Categories, Drawer toggle, Sort) - Shown only on 'all' tab */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Search bar + Sort + Filter button */}
          <div className="flex flex-col md:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title or description (e.g. Hero cycle, Casio fx-991EX, BTech books)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-24 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-thapar-600 focus:outline-none focus:ring-1 focus:ring-thapar-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Sort Selector */}
              <div className="relative flex items-center">
                <ArrowUpDown className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <select
                  value={filters.sortBy || 'createdAt,desc'}
                  onChange={handleSortChange}
                  className="rounded-xl border border-slate-200 bg-white pl-8 pr-8 py-2.5 text-xs font-medium text-slate-700 shadow-sm focus:border-thapar-600 focus:outline-none focus:ring-1 focus:ring-thapar-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowFilterDrawer(true)}
                className={`lg:hidden inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium shadow-sm transition-colors ${
                  hasActiveFilters
                    ? 'border-thapar-600 bg-thapar-50 text-thapar-800 dark:border-gold-500 dark:bg-gold-950/40 dark:text-gold-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {hasActiveFilters && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-thapar-600 dark:bg-gold-400" />
                )}
              </button>
            </div>
          </div>

          {/* Category Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => handleCategorySelect('All')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                !filters.category
                  ? 'bg-thapar-700 text-white shadow-sm dark:bg-gold-500 dark:text-slate-950'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
              }`}
            >
              All Items
            </button>
            {MARKETPLACE_CATEGORIES.map((cat) => {
              const isSelected = filters.category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-thapar-700 text-white shadow-sm dark:bg-gold-500 dark:text-slate-950 font-semibold'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Layout (Desktop: Sidebar Filters + Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Filter Sidebar - Visible only on 'all' tab */}
        {activeTab === 'all' && (
          <aside className="hidden lg:block lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sticky top-20">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Filter Items
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-thapar-700 hover:underline dark:text-gold-400 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            <ListingFilters
              filters={filters}
              onChange={(newFilters) => {
                setPage(0);
                setFilters(newFilters);
              }}
              onReset={handleResetFilters}
            />
          </aside>
        )}

        {/* Listings Grid Container */}
        <main className={activeTab === 'all' ? 'lg:col-span-3' : 'lg:col-span-4'}>
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 mb-6">
              {error}
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
                >
                  <div className="aspect-square bg-slate-200 dark:bg-slate-800" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loaded Listings Grid */}
          {!loading && listings.length > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map((item) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Page <span className="font-semibold text-slate-900 dark:text-white">{page + 1}</span> of{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span> ({totalElements} items)
                  </span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && listings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
              <PackageSearch className="mx-auto h-14 w-14 text-slate-400" />
              <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-200">
                {activeTab === 'my'
                  ? "You haven't listed any items for sale yet"
                  : 'No items matching your criteria'}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {activeTab === 'my'
                  ? 'Have a cycle, calculator, or textbook to pass along to junior students? Post it now.'
                  : 'Try clearing some filters or searching for different keywords.'}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                {activeTab === 'all' && hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Filters
                  </button>
                )}
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-thapar-700 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-thapar-800 dark:bg-thapar-600 dark:hover:bg-thapar-700"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Post Listing
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filters Drawer */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowFilterDrawer(false)}
          />
          <div className="relative ml-auto h-full w-full max-w-xs bg-white shadow-2xl dark:bg-slate-900 overflow-y-auto">
            <ListingFilters
              filters={filters}
              onChange={(newFilters) => {
                setPage(0);
                setFilters(newFilters);
              }}
              onReset={() => {
                handleResetFilters();
                setShowFilterDrawer(false);
              }}
              onClose={() => setShowFilterDrawer(false)}
              isMobileDrawer
            />
          </div>
        </div>
      )}

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchListings();
        }}
      />
    </div>
  );
};
