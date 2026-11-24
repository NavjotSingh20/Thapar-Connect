import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Zap,
  Loader2,
  Check,
} from 'lucide-react';
import { cabService } from '@/services/cabService';
import { CabGroupSummaryDto, CabMemberDto } from '@/types';

interface JoinRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  cab: CabGroupSummaryDto | null;
  onSuccess: (member: CabMemberDto) => void;
}

export const JoinRequestModal: React.FC<JoinRequestModalProps> = ({
  isOpen,
  onClose,
  cab,
  onSuccess,
}) => {
  const [seatsRequested, setSeatsRequested] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !cab) return null;

  const maxAvailable = Math.max(1, cab.seatsAvailable);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (seatsRequested < 1 || seatsRequested > maxAvailable) {
      setError(`Please request between 1 and ${maxAvailable} seats.`);
      return;
    }

    setLoading(true);
    try {
      const member = await cabService.joinCabGroup(cab.id, {
        seatsRequested,
        note: note.trim() || undefined,
      });
      onSuccess(member);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to submit join request. Pool may be full or seats are unavailable.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Join Cab Pool
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Request a seat to travel with {cab.creator?.name || 'student host'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Ride Details Summary */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#20251F]">
            <MapPin className="w-4 h-4 text-[#20251F]" />
            <span>To: {cab.dropPoint}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formattedTime}
              </span>
            </div>
            <div className="font-bold text-slate-900 dark:text-gold-300">
              ₹{Number(cab.estimatedFare).toLocaleString('en-IN')}{' '}
              <span className="text-[10px] font-normal text-slate-400">/ person</span>
            </div>
          </div>
        </div>

        {/* Auto Join info pill */}
        <div className="mt-3">
          {cab.autoJoinEnabled ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>Instant Confirmation:</strong> Your seat is booked immediately upon submission.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Host Approval:</strong> The pool creator will review and accept your request.
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Seats Stepper */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Seats to Book
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSeatsRequested((s) => Math.max(1, s - 1))}
                disabled={seatsRequested <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                -
              </button>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {seatsRequested} {seatsRequested === 1 ? 'seat' : 'seats'}
              </div>
              <button
                type="button"
                onClick={() => setSeatsRequested((s) => Math.min(maxAvailable, s + 1))}
                disabled={seatsRequested >= maxAvailable}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                +
              </button>
              <span className="text-xs text-slate-400">
                ({cab.seatsAvailable} available)
              </span>
            </div>
          </div>

          {/* Note to creator */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Note to Host (Optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Can you pick me up from Hostel M? 1 bag."
              className="w-full rounded-lg border border-[#B7BEB2] bg-white p-2.5 text-xs text-[#20251F] placeholder-[#20251F]/50 focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#B7BEB2]/40">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-[#B7BEB2] bg-[#E6E9E3] px-4 py-2 text-xs font-semibold text-[#20251F] hover:bg-[#d8ded4] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#A3D65C] hover:bg-[#92c949] px-5 py-2 text-xs font-bold text-[#20251F] shadow-xs disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {cab.autoJoinEnabled ? 'Confirm Seat' : 'Send Request'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
