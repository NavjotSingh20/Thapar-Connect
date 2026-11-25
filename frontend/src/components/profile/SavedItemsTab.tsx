import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Package, MapPin, Loader2, ExternalLink } from 'lucide-react';
import { ListingSummaryDto } from '@/types';
import { getFullImageUrl } from '@/utils/imageUrl';
import { formatHostelName } from '@/constants/hostels';
import { useSavedListingsStore } from '@/store/useSavedListingsStore';

interface SavedItemsTabProps {
  listings: ListingSummaryDto[];
  loading: boolean;
  onRefresh: () => void;
}

export const SavedItemsTab: React.FC<SavedItemsTabProps> = ({
  listings,
  loading,
  onRefresh,
}) => {
  const toggleSave = useSavedListingsStore((s) => s.toggleSave);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);

  const handleUnsave = async (id: string) => {
    setRemovingId(id);
    try {
      await toggleSave(id);
      onRefresh();
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#20251F]/60">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm font-medium">Loading saved items...</span>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#B7BEB2] bg-[#F6F7F5] py-12 px-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6E9E3] text-[#20251F]">
          <Bookmark className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-[#20251F]">Your watchlist is empty</h3>
        <p className="mt-1 text-xs text-[#20251F]/65 max-w-sm mx-auto">
          Tap the bookmark icon on any marketplace listing to save items you are interested in.
        </p>
        <Link
          to="/marketplace"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#A3D65C] px-4 py-2 text-xs font-semibold text-[#20251F] hover:bg-[#92c949] transition"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((item) => {
        const isSold = item.status === 'SOLD';
        return (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#B7BEB2]/60 bg-[#F6F7F5] p-3.5 transition hover:border-[#20251F]/35"
          >
            <Link to={`/marketplace/${item.id}`} className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#B7BEB2]/50 bg-[#E6E9E3]">
                {item.primaryImageUrl ? (
                  <img
                    src={getFullImageUrl(item.primaryImageUrl)}
                    alt={item.title}
                    className={`h-full w-full object-cover ${isSold ? 'grayscale opacity-70' : ''}`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#20251F]/40">
                    <Package className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-[#20251F] truncate">{item.title}</h4>
                  {isSold && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      SOLD
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-extrabold text-[#20251F]">
                  {formatPrice(item.price)}
                  <span className="ml-2 font-medium text-[#20251F]/60 inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {formatHostelName(item.hostel)}
                  </span>
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/marketplace/${item.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-[#B7BEB2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#20251F] hover:bg-[#E6E9E3] transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </Link>
              <button
                type="button"
                disabled={removingId === item.id}
                onClick={() => handleUnsave(item.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#B7BEB2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#20251F] hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-50 transition"
              >
                <Bookmark className="h-3.5 w-3.5 fill-[#20251F]" />
                {removingId === item.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
