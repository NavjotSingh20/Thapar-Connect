import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Package, CheckCircle2 } from 'lucide-react';
import { ListingSummaryDto } from '@/types';
import { getFullImageUrl } from '@/utils/imageUrl';
import { formatHostelName } from '@/constants/hostels';

interface ListingCardProps {
  listing: ListingSummaryDto;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const isSold = listing.status === 'SOLD';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'new':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'like new':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'used':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'heavily used':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div
      onClick={() => navigate(`/marketplace/${listing.id}`)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#B7BEB2]/70 bg-[#F6F7F5] shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#20251F]/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
    >
      {/* Image Thumbnail with Overlay */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#E6E9E3] dark:bg-slate-800">
        {listing.primaryImageUrl && !imageError ? (
          <img
            src={getFullImageUrl(listing.primaryImageUrl)}
            alt={listing.title}
            onError={() => setImageError(true)}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${isSold ? 'grayscale contrast-75 opacity-70' : ''
              }`}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-[#20251F]/40 dark:text-slate-400">
            <Package className="h-12 w-12 stroke-[1.5]" />
            <span className="mt-2 text-xs font-medium">No photo available</span>
          </div>
        )}

        {/* SOLD Overlay Badge */}
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold tracking-wider text-white uppercase shadow-md border border-red-400">
              <CheckCircle2 className="h-4 w-4" />
              SOLD
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-[#20251F]/80 px-2.5 py-0.5 text-xs font-medium text-[#F6F7F5] backdrop-blur-md">
            {listing.category}
          </span>
        </div>

        {/* Condition Badge */}
        <div className="absolute bottom-2.5 left-2.5">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium backdrop-blur-md ${getConditionColor(
              listing.condition
            )}`}
          >
            {listing.condition}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Price and Hostel */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-black tracking-tight text-[#20251F] dark:text-gold-400">
            {formatPrice(listing.price)}
          </span>
          <div className="flex items-center text-xs text-[#20251F]/60 dark:text-slate-400">
            <MapPin className="mr-1 h-3.5 w-3.5 text-[#20251F]/40 shrink-0 dark:text-slate-400" />
            <span className="truncate max-w-[150px]">{formatHostelName(listing.hostel)}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-[#20251F] group-hover:text-[#20251F] dark:text-slate-100 dark:group-hover:text-gold-300">
          {listing.title}
        </h3>

        {/* Footer Meta */}
        <div className="mt-auto pt-3 border-t border-[#B7BEB2]/40 dark:border-slate-800/80 flex items-center justify-between text-xs text-[#20251F]/60 dark:text-slate-400">
          <span className="truncate">
            {listing.seller?.name ? `By ${listing.seller.name.split(' ')[0]}` : 'Campus Seller'}
          </span>
          <span className="flex items-center text-[11px] text-[#20251F]/50 dark:text-slate-400">
            <Clock className="mr-1 h-3 w-3" />
            {timeAgo(listing.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
