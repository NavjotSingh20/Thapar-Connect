import React from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Phone,
  MessageSquare,
  UserPlus,
  ArrowRight,
  Zap,
  Settings,
} from 'lucide-react';
import { CabGroupSummaryDto } from '@/types';
import { formatHostelName } from '@/constants/hostels';

interface CabCardProps {
  cab: CabGroupSummaryDto;
  currentUserId?: string;
  onJoin: (cab: CabGroupSummaryDto) => void;
  onManage: (cab: CabGroupSummaryDto) => void;
  onChat: (cab: CabGroupSummaryDto) => void;
}

export const CabCard: React.FC<CabCardProps> = ({
  cab,
  currentUserId,
  onJoin,
  onManage,
  onChat,
}) => {
  const isCreator = Boolean(currentUserId && cab.creator?.id === currentUserId);
  const isFull = cab.status === 'FULL' || cab.seatsAvailable <= 0;
  const isClosed = cab.status === 'CLOSED';
  const isExpired = cab.status === 'EXPIRED';

  const creatorPhone = cab.creator?.phoneNumber || cab.creator?.phone;

  // Format departure date and time
  const departureDate = new Date(cab.departureTime);
  const formattedDate = departureDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = departureDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Seat Badge Styling
  const getSeatBadge = () => {
    if (isClosed) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Closed
        </span>
      );
    }
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          Expired
        </span>
      );
    }
    if (isFull) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          Group Full
        </span>
      );
    }
    if (cab.seatsAvailable <= 2) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <Users className="w-3 h-3" />
          {cab.seatsAvailable} {cab.seatsAvailable === 1 ? 'seat' : 'seats'} left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#A3D65C]/25 text-[#20251F] dark:bg-emerald-950/60 dark:text-emerald-400 border border-[#A3D65C]/60 dark:border-emerald-800">
        <Users className="w-3 h-3" />
        {cab.seatsAvailable} seats available
      </span>
    );
  };

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-[#B7BEB2]/70 bg-[#F6F7F5] p-5 shadow-xs transition-all duration-200 hover:border-[#20251F]/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80">
      <div>
        {/* Top bar: Distance pill & status badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {cab.distanceKm !== undefined && cab.distanceKm !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E6E9E3] px-2.5 py-0.5 text-xs font-semibold text-[#20251F] border border-[#B7BEB2]">
                <MapPin className="w-3 h-3 text-[#20251F]" />
                {cab.distanceKm.toFixed(1)} km away
              </span>
            )}
            {cab.autoJoinEnabled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#A3D65C]/25 px-2 py-0.5 text-xs font-semibold text-[#20251F] dark:bg-amber-950/50 dark:text-amber-300 border border-[#A3D65C]/60 dark:border-amber-800/60">
                <Zap className="w-3 h-3 text-[#20251F] dark:text-amber-400" />
                Instant Join
              </span>
            )}
          </div>
          {getSeatBadge()}
        </div>

        {/* Route Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2.5">
            <div className="mt-1 flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#B7BEB2] dark:bg-slate-500" />
              <div className="w-0.5 h-6 bg-[#B7BEB2]/40 dark:bg-slate-700 my-0.5" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#20251F]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#20251F]/60 dark:text-slate-400 truncate">
                {cab.pickupPoint || 'Thapar University Campus, Patiala'}
              </p>
              <div className="my-1.5 flex items-center gap-1 text-[#20251F]/40 dark:text-slate-400">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <p className="text-base font-semibold text-[#20251F] dark:text-slate-100 truncate">
                {cab.dropPoint}
              </p>
            </div>
          </div>
        </div>

        {/* Time and Fare */}
        <div className="flex items-center justify-between rounded-lg bg-[#E6E9E3] px-3 py-2 text-xs text-[#20251F] dark:bg-slate-800/60 dark:text-slate-300 mb-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#20251F]/60 dark:text-slate-400" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#20251F]/60 dark:text-slate-400" />
              {formattedTime}
            </span>
          </div>
          <div className="font-extrabold text-[#20251F] dark:text-gold-300 text-sm">
            ₹{Number(cab.estimatedFare).toLocaleString('en-IN')}{' '}
            <span className="text-xs font-normal text-[#20251F]/60 dark:text-slate-400">/ person</span>
          </div>
        </div>

        {/* Optional Note */}
        {cab.note && (
          <p className="text-xs text-[#20251F]/70 dark:text-slate-400 italic mb-4 line-clamp-2 bg-[#E6E9E3]/50 dark:bg-slate-800/30 p-2 rounded border border-[#B7BEB2]/40 dark:border-slate-800">
            "{cab.note}"
          </p>
        )}
      </div>

      {/* Creator Info & Action CTAs */}
      <div className="pt-3 border-t border-[#B7BEB2]/40 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#E6E9E3] border border-[#B7BEB2]/60 text-[#20251F] font-bold text-xs flex items-center justify-center">
              {cab.creator?.name ? cab.creator.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#20251F] dark:text-slate-100 leading-tight">
                {cab.creator?.name || 'Student'}
              </p>
              <p className="text-[11px] text-[#20251F]/60 dark:text-slate-400 leading-tight">
                {formatHostelName(cab.creator?.hostel) || 'Hostel'}
              </p>
            </div>
          </div>

          {/* Call Link if phone is present */}
          {creatorPhone && (
            <a
              href={`tel:${creatorPhone}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#20251F] hover:underline px-2 py-1 rounded transition-colors"
              title="Call Creator"
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isCreator ? (
            <button
              onClick={() => onManage(cab)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#B7BEB2] bg-[#E6E9E3] px-3 py-2 text-xs font-semibold text-[#20251F] transition-colors hover:bg-[#d8ded4]"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage Requests
            </button>
          ) : (
            <>
              <button
                onClick={() => onChat(cab)}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#B7BEB2] bg-[#E6E9E3] px-3 py-2 text-xs font-medium text-[#20251F] shadow-xs transition-colors hover:bg-[#d8ded4] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Chat with Pool Creator"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </button>

              <button
                onClick={() => onJoin(cab)}
                disabled={isFull || isClosed || isExpired}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-xs transition-all ${isFull || isClosed || isExpired
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 border border-slate-200 dark:border-slate-700'
                    : 'bg-[#A3D65C] text-[#20251F] hover:bg-[#92c949]'
                  }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {isClosed ? 'Closed' : isExpired ? 'Expired' : isFull ? 'Full' : 'Join Pool'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
