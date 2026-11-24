import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Check,
  AlertCircle,
  Loader2,
  Lock,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { cabService } from '@/services/cabService';
import { CabGroupDetailDto, CabMemberDto } from '@/types';
import { formatHostelName } from '@/constants/hostels';

interface ManageRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cabId: string | null;
  onGroupUpdated: () => void;
}

export const ManageRequestsModal: React.FC<ManageRequestsModalProps> = ({
  isOpen,
  onClose,
  cabId,
  onGroupUpdated,
}) => {
  const navigate = useNavigate();
  const [cabDetail, setCabDetail] = useState<CabGroupDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [closeLoading, setCloseLoading] = useState<boolean>(false);
  const [groupChatLoading, setGroupChatLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed'>('pending');

  const fetchDetail = async () => {
    if (!cabId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await cabService.getCabGroupById(cabId);
      setCabDetail(data);
    } catch (err: any) {
      setError('Failed to fetch cab pool details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cabId) {
      fetchDetail();
    } else {
      setCabDetail(null);
      setError(null);
    }
  }, [isOpen, cabId]);

  if (!isOpen || !cabId) return null;

  const pendingMembers = cabDetail?.members?.filter((m) => m.status === 'PENDING') || [];
  const confirmedMembers = cabDetail?.members?.filter((m) => m.status === 'CONFIRMED') || [];

  const handleAccept = async (memberId: string) => {
    setActionLoadingId(memberId);
    setError(null);
    setSuccessNotice(null);
    try {
      await cabService.acceptMember(cabId, memberId);
      await fetchDetail();
      setSuccessNotice('Rider accepted! They have been added to the ride group chat.');
      onGroupUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to accept request.';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenGroupChat = async () => {
    if (!cabId) return;
    setGroupChatLoading(true);
    try {
      const conv = await cabService.getRideGroupChat(cabId);
      onClose();
      navigate(`/chat?conversationId=${conv.id}`);
    } catch {
      onClose();
      navigate('/chat');
    } finally {
      setGroupChatLoading(false);
    }
  };

  const handleReject = async (memberId: string) => {
    setActionLoadingId(memberId);
    setError(null);
    try {
      await cabService.rejectMember(cabId, memberId);
      await fetchDetail();
      onGroupUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to reject request.';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClosePool = async () => {
    if (!window.confirm('Are you sure you want to close this pool? No new members will be able to join.')) {
      return;
    }
    setCloseLoading(true);
    setError(null);
    try {
      await cabService.closeCabGroup(cabId);
      await fetchDetail();
      onGroupUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to close pool.';
      setError(msg);
    } finally {
      setCloseLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Manage Cab Pool
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {cabDetail ? `Destination: ${cabDetail.dropPoint}` : 'Loading details...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenGroupChat}
              disabled={groupChatLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20251F] text-[#A3D65C] hover:bg-[#323930] text-xs font-semibold shadow-xs transition-colors"
              title="Open Ride Group Chat"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#A3D65C]" />
              {groupChatLoading ? 'Opening...' : 'Group Chat'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {successNotice && (
          <div className="mx-5 mt-4 flex items-center justify-between gap-2 rounded-lg bg-[#A3D65C]/20 border border-[#A3D65C]/60 p-3 text-xs font-semibold text-[#20251F]">
            <span>{successNotice}</span>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-[#20251F]/60 hover:text-[#20251F]"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#20251F]/50">
              <Loader2 className="w-8 h-8 animate-spin text-[#20251F] mb-2" />
              <p className="text-xs">Loading pool participants...</p>
            </div>
          ) : cabDetail ? (
            <div className="space-y-4">
              {/* Pool Status Overview Bar */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-0.5">
                    Seat Utilization
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {cabDetail.seatsTaken} / {cabDetail.totalSeats} seats taken
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({cabDetail.seatsAvailable} remaining)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      cabDetail.status === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : cabDetail.status === 'FULL'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {cabDetail.status}
                  </span>

                  {cabDetail.status !== 'CLOSED' && cabDetail.status !== 'EXPIRED' && (
                    <button
                      onClick={handleClosePool}
                      disabled={closeLoading}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
                    >
                      {closeLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                      Close Pool
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#B7BEB2]/50">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`pb-2.5 px-4 text-xs font-semibold transition-colors border-b-2 ${
                    activeTab === 'pending'
                      ? 'border-[#20251F] text-[#20251F] font-bold'
                      : 'border-transparent text-[#20251F]/60 hover:text-[#20251F]'
                  }`}
                >
                  Pending Requests ({pendingMembers.length})
                </button>
                <button
                  onClick={() => setActiveTab('confirmed')}
                  className={`pb-2.5 px-4 text-xs font-semibold transition-colors border-b-2 ${
                    activeTab === 'confirmed'
                      ? 'border-[#20251F] text-[#20251F] font-bold'
                      : 'border-transparent text-[#20251F]/60 hover:text-[#20251F]'
                  }`}
                >
                  Confirmed Riders ({confirmedMembers.length})
                </button>
              </div>

              {/* Tab Content: Pending */}
              {activeTab === 'pending' && (
                <div className="space-y-3">
                  {pendingMembers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No pending join requests at this time.
                    </div>
                  ) : (
                    pendingMembers.map((member: CabMemberDto) => {
                      const memberPhone = member.user?.phoneNumber || member.user?.phone;
                      return (
                        <div
                          key={member.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                {member.user?.name || 'Student'}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {formatHostelName(member.user?.hostel) || 'Hostel'}
                              </span>
                              <span className="text-xs font-bold text-[#20251F]">
                                {member.seatsRequested} {member.seatsRequested === 1 ? 'seat' : 'seats'}
                              </span>
                            </div>
                            {member.note && (
                              <p className="text-xs text-[#20251F]/70 italic">
                                "{member.note}"
                              </p>
                            )}
                            {memberPhone && (
                              <a
                                href={`tel:${memberPhone}`}
                                className="inline-flex items-center gap-1 text-[11px] text-[#20251F]/60 hover:text-[#20251F]"
                              >
                                <Phone className="w-3 h-3" />
                                {memberPhone}
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleReject(member.id)}
                              disabled={actionLoadingId === member.id}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                            <button
                              onClick={() => handleAccept(member.id)}
                              disabled={actionLoadingId === member.id || cabDetail.seatsAvailable < member.seatsRequested}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
                            >
                              {actionLoadingId === member.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Accept
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab Content: Confirmed */}
              {activeTab === 'confirmed' && (
                <div className="space-y-3">
                  {/* Host card */}
                  <div className="flex items-center justify-between rounded-xl border border-[#B7BEB2]/60 bg-[#E6E9E3] p-3.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#20251F]">
                          {cabDetail.creator?.name || 'You'} (Host)
                        </span>
                        <span className="rounded bg-[#A3D65C] px-2 py-0.5 text-[10px] font-bold text-[#20251F]">
                          Creator
                        </span>
                      </div>
                      <p className="text-[11px] text-[#20251F]/60">
                        {cabDetail.creator?.hostel || 'Hostel'} • 1 seat
                      </p>
                    </div>
                  </div>

                  {confirmedMembers.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No additional confirmed riders yet.
                    </div>
                  ) : (
                    confirmedMembers.map((member: CabMemberDto) => {
                      const memberPhone = member.user?.phoneNumber || member.user?.phone;
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                {member.user?.name || 'Student'}
                              </span>
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Confirmed
                              </span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {member.seatsRequested} {member.seatsRequested === 1 ? 'seat' : 'seats'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {member.user?.hostel || 'Hostel'}
                            </p>
                            {member.note && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                "{member.note}"
                              </p>
                            )}
                          </div>

                          {memberPhone && (
                            <a
                              href={`tel:${memberPhone}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#B7BEB2] bg-[#E6E9E3] px-2.5 py-1 text-xs font-semibold text-[#20251F] hover:bg-[#d8ded4]"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              Call
                            </a>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
