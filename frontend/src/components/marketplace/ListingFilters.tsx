import React from 'react';
import { RotateCcw, X, Filter } from 'lucide-react';
import { TIET_HOSTELS } from '@/constants/hostels';
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CONDITIONS } from '@/constants/marketplace';
import { ListingFilterParams, MarketplaceCategory, MarketplaceCondition } from '@/types';

interface ListingFiltersProps {
  filters: ListingFilterParams;
  onChange: (filters: ListingFilterParams) => void;
  onReset: () => void;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export const ListingFilters: React.FC<ListingFiltersProps> = ({
  filters,
  onChange,
  onReset,
  onClose,
  isMobileDrawer = false,
}) => {
  const handleCategoryClick = (category: MarketplaceCategory) => {
    if (filters.category === category) {
      onChange({ ...filters, category: undefined, page: 0 });
    } else {
      onChange({ ...filters, category, page: 0 });
    }
  };

  const handleConditionClick = (condition: MarketplaceCondition) => {
    if (filters.condition === condition) {
      onChange({ ...filters, condition: undefined, page: 0 });
    } else {
      onChange({ ...filters, condition, page: 0 });
    }
  };

  const handleHostelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange({ ...filters, hostel: val ? val : undefined, page: 0 });
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? Number(e.target.value) : undefined;
    onChange({ ...filters, minPrice: val, page: 0 });
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? Number(e.target.value) : undefined;
    onChange({ ...filters, maxPrice: val, page: 0 });
  };

  const hasActiveFilters = Boolean(
    filters.category ||
      filters.condition ||
      filters.hostel ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined
  );

  return (
    <div className={`flex flex-col space-y-6 ${isMobileDrawer ? 'p-5' : ''}`}>
      {/* Drawer Header for Mobile */}
      {isMobileDrawer && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-[#20251F]" />
            <h3 className="text-lg font-semibold text-[#20251F]">Filters</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Categories */}
      <div>
        <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400 mb-2.5">
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {MARKETPLACE_CATEGORIES.map((cat) => {
            const isSelected = filters.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#20251F] text-[#F6F7F5] shadow-xs font-semibold dark:bg-gold-500 dark:text-slate-950'
                    : 'border border-[#B7BEB2]/60 bg-[#E6E9E3] text-[#20251F] hover:bg-[#d8ded4] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hostel Selector */}
      <div>
        <label className="block text-xs font-semibold tracking-wider text-[#20251F]/70 uppercase dark:text-slate-400 mb-2">
          Campus Hostel
        </label>
        <select
          value={filters.hostel || ''}
          onChange={handleHostelChange}
          className="w-full rounded-xl border border-[#B7BEB2] bg-[#F6F7F5] px-3.5 py-2 text-sm text-[#20251F] shadow-xs focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#20251F] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">All Campus Hostels</option>
          {TIET_HOSTELS.map((h) => (
            <option key={h.id} value={h.name}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-xs font-semibold tracking-wider text-[#20251F]/70 uppercase dark:text-slate-400 mb-2">
          Price Range (₹)
        </label>
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#20251F]/50">₹</span>
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={filters.minPrice !== undefined ? filters.minPrice : ''}
              onChange={handleMinPriceChange}
              className="w-full rounded-xl border border-[#B7BEB2] bg-[#F6F7F5] pl-7 pr-3 py-2 text-sm text-[#20251F] placeholder-[#20251F]/40 shadow-xs focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#20251F] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <span className="text-[#20251F]/60 text-sm">to</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#20251F]/50">₹</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={filters.maxPrice !== undefined ? filters.maxPrice : ''}
              onChange={handleMaxPriceChange}
              className="w-full rounded-xl border border-[#B7BEB2] bg-[#F6F7F5] pl-7 pr-3 py-2 text-sm text-[#20251F] placeholder-[#20251F]/40 shadow-xs focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#20251F] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Item Condition */}
      <div>
        <label className="block text-xs font-semibold tracking-wider text-[#20251F]/70 uppercase dark:text-slate-400 mb-2.5">
          Condition
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MARKETPLACE_CONDITIONS.map((cond) => {
            const isSelected = filters.condition === cond;
            return (
              <button
                key={cond}
                type="button"
                onClick={() => handleConditionClick(cond)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium text-center transition-all ${
                  isSelected
                    ? 'border-[#20251F] bg-[#20251F] text-[#F6F7F5] font-semibold dark:border-gold-500 dark:bg-gold-950/30 dark:text-gold-300'
                    : 'border-[#B7BEB2]/60 bg-[#E6E9E3] text-[#20251F] hover:bg-[#d8ded4] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50'
                }`}
              >
                {cond}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset Filter Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#B7BEB2] bg-[#E6E9E3] py-2.5 text-xs font-semibold text-[#20251F] hover:bg-[#d8ded4] dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset All Filters
        </button>
      )}
    </div>
  );
};
