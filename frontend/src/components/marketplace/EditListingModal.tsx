import React, { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { TIET_HOSTELS } from '@/constants/hostels';
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CONDITIONS } from '@/constants/marketplace';
import { marketplaceService } from '@/services/marketplaceService';
import { ListingDetailDto, MarketplaceCategory, MarketplaceCondition } from '@/types';

interface EditListingModalProps {
  isOpen: boolean;
  listing: ListingDetailDto;
  onClose: () => void;
  onSuccess: (updated: ListingDetailDto) => void;
}

export const EditListingModal: React.FC<EditListingModalProps> = ({
  isOpen,
  listing,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState(listing.title);
  const [category, setCategory] = useState<MarketplaceCategory>(
    (listing.category as MarketplaceCategory) || 'Cycle'
  );
  const [condition, setCondition] = useState<MarketplaceCondition>(
    (listing.condition as MarketplaceCondition) || 'Used'
  );
  const [price, setPrice] = useState<string>(String(listing.price));
  const [hostel, setHostel] = useState<string>(listing.hostel || 'Hostel J');
  const [description, setDescription] = useState(listing.description);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      setError('Please enter a valid price greater than ₹0.');
      return;
    }
    if (numPrice > 1000000) {
      setError('Price cannot exceed ₹10,00,000.');
      return;
    }

    if (!title.trim()) {
      setError('Listing title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Item description is required.');
      return;
    }

    try {
      setLoading(true);
      const updated = await marketplaceService.updateListing(listing.id, {
        title: title.trim(),
        category,
        condition,
        price: numPrice,
        hostel,
        description: description.trim(),
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update listing';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Listing</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update item details and pricing
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 rounded-xl bg-red-50 p-3.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
              >
                {MARKETPLACE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Condition <span className="text-red-500">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as MarketplaceCondition)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
              >
                {MARKETPLACE_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price & Hostel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Price (INR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Hostel / Location
              </label>
              <select
                value={hostel}
                onChange={(e) => setHostel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
              >
                {TIET_HOSTELS.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-800 shadow-sm focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#A3D65C] hover:bg-[#92c949] px-6 py-2.5 text-sm font-bold text-[#20251F] shadow-xs disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
