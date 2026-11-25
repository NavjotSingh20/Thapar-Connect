import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car,
  Calendar,
  Clock,
  MessageSquare,
  Settings,
  ArrowRight,
  Loader2,
  Users,
} from 'lucide-react';
import { CabGroupSummaryDto } from '@/types';
import { cabService } from '@/services/cabService';
import { ManageRequestsModal } from '@/components/cabs/ManageRequestsModal';

interface MyRidesTabProps {
  cabs: CabGroupSummaryDto[];
  currentUserId?: string;
  loading: boolean;
  onRefresh: () => void;
}

export const MyRidesTab: React.FC<MyRidesTabProps> = ({
  cabs,
  currentUserId,
  loading,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [manageCabId, setManageCabId] = useState<string | null>(null);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);

  const myCabs = cabs.filter(
    (c) =>
      (currentUserId && c.creator?.id === currentUserId) ||
      c.myMemberStatus === 'CONFIRMED' ||
      c.myMemberStatus === 'PENDING'
  );

  const handleOpenGroupChat = async (cab: CabGroupSummaryDto) => {
    setOpeningChatId(cab.id);
    try {
      const conv = await cabService.getRideGroupChat(cab.id);
      navigate(`/chat?conversationId=${conv.id}`);
    } catch {
      navigate('/chat');
    } finally {
      setOpeningChatId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#20251F]/60">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm font-medium">Loading your cab pools...</span>
      </div>
    );
  }

  if (myCabs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#B7BEB2] bg-[#F6F7F5] py-12 px-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6E9E3] text-[#20251F]">
          <Car className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-[#20251F]">No upcoming cab pools</h3>
        <p className="mt-1 text-xs text-[#20251F]/65 max-w-sm mx-auto">
          When you host a ride or join a cab pool to Chandigarh, Rajpura, or Delhi, it will appear here.
        </p>
        <Link
          to="/cabs"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#A3D65C] px-4 py-2 text-xs font-semibold text-[#20251F] hover:bg-[#92c949] transition"
        >
          <Car className="h-3.5 w-3.5" />
          Browse Cab Pools
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {myCabs.map((cab) => {
        const isCreator = Boolean(currentUserId && cab.creator?.id === currentUserId);
        const isConfirmed = cab.myMemberStatus === 'CONFIRMED';
        const isPending = cab.myMemberStatus === 'PENDING';
        const dep = new Date(cab.departureTime);

        return (
          <div
            key={cab.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#B7BEB2]/60 bg-[#F6F7F5] p-4 transition hover:border-[#20251F]/35"
          >
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {isCreator ? (
                  <span className="rounded-full bg-[#20251F] px-2.5 py-0.5 text-[10px] font-bold text-[#A3D65C]">
                    HOSTING
                  </span>
                ) : isConfirmed ? (
                  <span className="rounded-full bg-[#A3D65C]/30 border border-[#A3D65C] px-2.5 py-0.5 text-[10px] font-bold text-[#20251F]">
                    CONFIRMED
                  </span>
                ) : isPending ? (
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    REQUEST PENDING
                  </span>
                ) : null}

                <span className="inline-flex items-center gap-1 text-xs text-[#20251F]/65 font-medium">
                  <Users className="h-3.5 w-3.5" />
                  {cab.seatsTaken}/{cab.totalSeats} seats filled
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm font-bold text-[#20251F] flex-wrap">
                <span className="truncate max-w-[180px]">{cab.pickupPoint}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#20251F]/50" />
                <span className="truncate max-w-[240px]">{cab.dropPoint}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#20251F]/65">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {dep.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-bold text-[#20251F]">₹{cab.estimatedFare}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {(isCreator || isConfirmed) && (
                <button
                  type="button"
                  disabled={openingChatId === cab.id}
                  onClick={() => handleOpenGroupChat(cab)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#20251F] px-3 py-2 text-xs font-semibold text-[#A3D65C] hover:bg-black disabled:opacity-50 transition shadow-2xs"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {openingChatId === cab.id ? 'Opening...' : 'Group Chat'}
                </button>
              )}

              {isCreator && (
                <button
                  type="button"
                  onClick={() => setManageCabId(cab.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#B7BEB2] bg-white px-3 py-2 text-xs font-semibold text-[#20251F] hover:bg-[#E6E9E3] transition"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage Requests
                </button>
              )}
            </div>
          </div>
        );
      })}

      <ManageRequestsModal
        isOpen={Boolean(manageCabId)}
        onClose={() => setManageCabId(null)}
        cabId={manageCabId}
        onGroupUpdated={onRefresh}
      />
    </div>
  );
};
