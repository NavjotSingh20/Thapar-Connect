import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShoppingBag,
  Car,
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  Ban,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import {
  CabGroupDetailDto,
  ListingDetailDto,
  ReportDto,
  ReportStatus,
  UserDto,
} from '@/types';

type AdminTab = 'reports' | 'listings' | 'cabs' | 'users';

interface ConfirmModalState {
  type: 'listing' | 'cab' | 'user';
  id: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  extra?: any;
}

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [listings, setListings] = useState<ListingDetailDto[]>([]);
  const [cabs, setCabs] = useState<CabGroupDetailDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // In-app modal for instant, non-blocking confirmation
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  // Track session-deleted item IDs so they NEVER reappear even before backend re-deploys
  const sessionDeletedListingIds = useRef<Set<string>>(new Set());
  const sessionClosedCabIds = useRef<Set<string>>(new Set());

  const loadData = async (tab: AdminTab) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      if (tab === 'reports') {
        const data = await adminService.getReports();
        setReports(data);
      } else if (tab === 'listings') {
        const data = await adminService.getListings();
        const rawListings = Array.isArray(data) ? data : (data as any)?.content || [];
        // Strictly filter out any items that are soft-deleted or marked deleted in this session
        const activeListings = rawListings.filter(
          (item: any) =>
            !item.isDeleted &&
            item.status !== 'DELETED' &&
            !sessionDeletedListingIds.current.has(item.id)
        );
        setListings(activeListings);
      } else if (tab === 'cabs') {
        const data = await adminService.getCabs();
        const rawCabs = Array.isArray(data) ? data : (data as any)?.content || [];
        // Strictly filter out any cabs that are closed or closed in this session
        const activeCabs = rawCabs.filter(
          (c: any) => c.status !== 'CLOSED' && !sessionClosedCabIds.current.has(c.id)
        );
        setCabs(activeCabs);
      } else if (tab === 'users') {
        const data = await adminService.getUsers();
        setUsers(data);
      }
    } catch (err: any) {
      console.error(`Failed to load ${tab}:`, err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || `Failed to load ${tab} data.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const handleUpdateReportStatus = async (id: string, status: ReportStatus) => {
    try {
      await adminService.updateReportStatus(id, status);
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      setFeedback({ type: 'success', message: `Report marked as ${status}.` });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update report status.',
      });
    }
  };

  // Instant optimistic removal for listings
  const executeDeleteListing = async (id: string) => {
    sessionDeletedListingIds.current.add(id);
    const previousListings = listings;
    // Disappear instantly from UI (0ms perceived latency)
    setListings((prev) => prev.filter((l) => l.id !== id));
    setFeedback({ type: 'success', message: 'Listing permanently removed from marketplace.' });

    try {
      await adminService.deleteListing(id);
    } catch (err: any) {
      // Revert if backend error
      sessionDeletedListingIds.current.delete(id);
      setListings(previousListings);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete listing on server.',
      });
    }
  };

  // Instant optimistic removal for cabs
  const executeDeleteCab = async (id: string) => {
    sessionClosedCabIds.current.add(id);
    const previousCabs = cabs;
    // Disappear instantly from UI (0ms perceived latency)
    setCabs((prev) => prev.filter((c) => c.id !== id));
    setFeedback({ type: 'success', message: 'Cab group closed and removed.' });

    try {
      await adminService.deleteCab(id);
    } catch (err: any) {
      sessionClosedCabIds.current.delete(id);
      setCabs(previousCabs);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to close cab group on server.',
      });
    }
  };

  // Toggle user ban status
  const executeToggleUserBan = async (id: string, isCurrentlyBanned: boolean) => {
    const targetStatus = !isCurrentlyBanned;
    const previousUsers = users;
    // Optimistic status update
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isBanned: targetStatus } : u))
    );
    setFeedback({
      type: 'success',
      message: targetStatus ? 'User banned and sessions revoked.' : 'User unbanned successfully.',
    });

    try {
      if (targetStatus) {
        await adminService.banUser(id);
      } else {
        await adminService.unbanUser(id);
      }
    } catch (err: any) {
      setUsers(previousUsers);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update user ban status.',
      });
    }
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;
    const { type, id, extra } = confirmModal;
    setConfirmModal(null);

    if (type === 'listing') {
      executeDeleteListing(id);
    } else if (type === 'cab') {
      executeDeleteCab(id);
    } else if (type === 'user') {
      executeToggleUserBan(id, extra?.isCurrentlyBanned);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#20251F] flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-[#20251F]" />
            Campus Moderation Portal
          </h1>
          <p className="text-sm text-[#20251F]/70">
            Administrative controls for campus safety reports, content moderation, and user bans.
          </p>
        </div>

        <button
          onClick={() => loadData(activeTab)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#B7BEB2] bg-[#E6E9E3] hover:bg-[#d8ded4] transition-colors text-[#20251F] self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            feedback.type === 'success'
              ? 'bg-[#A3D65C]/20 text-[#20251F] border border-[#A3D65C]'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold underline ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#B7BEB2]/50 space-x-1 sm:space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'reports'
              ? 'border-[#20251F] text-[#20251F] font-bold'
              : 'border-transparent text-[#20251F]/60 hover:text-[#20251F]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Safety Reports
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E6E9E3] text-[#20251F] font-bold">
            {reports.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'listings'
              ? 'border-[#20251F] text-[#20251F] font-bold'
              : 'border-transparent text-[#20251F]/60 hover:text-[#20251F]'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Marketplace Listings
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E6E9E3] text-[#20251F] font-bold">
            {listings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cabs')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'cabs'
              ? 'border-[#20251F] text-[#20251F] font-bold'
              : 'border-transparent text-[#20251F]/60 hover:text-[#20251F]'
          }`}
        >
          <Car className="w-4 h-4" />
          Cab Pools
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E6E9E3] text-[#20251F] font-bold">
            {cabs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'border-[#20251F] text-[#20251F] font-bold'
              : 'border-transparent text-[#20251F]/60 hover:text-[#20251F]'
          }`}
        >
          <Users className="w-4 h-4" />
          User Moderation
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E6E9E3] text-[#20251F] font-bold">
            {users.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="p-12 text-center text-[#20251F]/50 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#20251F]" />
          Loading moderation records...
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No reports filed yet. Campus network is safe.
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        report.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : report.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {report.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Target: {report.targetType}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Reason: {report.reason}
                  </h4>
                  {report.details && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {report.details}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Reported by {report.reporterName || report.reporterId} on{' '}
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {report.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateReportStatus(report.id, 'RESOLVED')}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  )}
                  {report.status !== 'DISMISSED' && (
                    <button
                      onClick={() => handleUpdateReportStatus(report.id, 'DISMISSED')}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'listings' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No active marketplace listings found.
            </div>
          ) : (
            listings.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-[#20251F]/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </h4>
                    <span className="text-xs font-bold text-[#20251F] dark:text-emerald-400 shrink-0">
                      ₹{item.price}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.category} • {item.hostel}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Seller: {item.seller?.name || 'Peer'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() =>
                      setConfirmModal({
                        type: 'listing',
                        id: item.id,
                        title: `Delete "${item.title}"?`,
                        subtitle: 'This listing will be permanently removed from the campus marketplace immediately.',
                        actionLabel: 'Delete Listing',
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Listing
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'cabs' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cabs.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No active cab pools found.
            </div>
          ) : (
            cabs.map((cab) => (
              <div
                key={cab.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-[#20251F]/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {cab.dropPoint}
                    </h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        cab.status === 'OPEN'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {cab.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Pickup: {cab.pickupPoint}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Creator: {cab.creator?.name || 'Creator'} • Seats: {cab.seatsTaken}/{cab.totalSeats}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() =>
                      setConfirmModal({
                        type: 'cab',
                        id: cab.id,
                        title: `Close ride to "${cab.dropPoint}"?`,
                        subtitle: 'This cab group will be closed and removed from active ride listings immediately.',
                        actionLabel: 'Close & Remove Cab',
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Close Cab
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Hostel</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold">{u.fullName || (u as any).name || 'Unnamed'}</td>
                    <td className="py-3 px-4 text-slate-500">{u.email}</td>
                    <td className="py-3 px-4">{u.hostel || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[11px]">{u.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      {u.isBanned ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold">
                          Banned
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => {
                            if (u.isBanned) {
                              executeToggleUserBan(u.id, true);
                            } else {
                              setConfirmModal({
                                type: 'user',
                                id: u.id,
                                title: `Ban "${u.fullName || u.email}"?`,
                                subtitle: 'Their active sessions will be terminated and they will be barred from posting cabs or items.',
                                actionLabel: 'Ban User',
                                extra: { isCurrentlyBanned: false },
                              });
                            }
                          }}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            u.isBanned
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300'
                          }`}
                        >
                          {u.isBanned ? (
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              Unban
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5" />
                              Ban User
                            </span>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Non-Blocking In-App Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-[#B7BEB2] bg-[#F6F7F5] dark:bg-slate-900 dark:border-slate-800 p-5 shadow-xl text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-[#20251F] dark:text-slate-100">
                  {confirmModal.title}
                </h3>
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                className="text-[#20251F]/50 hover:text-[#20251F] dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-[#20251F]/70 dark:text-slate-400 leading-relaxed">
              {confirmModal.subtitle}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#B7BEB2] bg-white text-[#20251F] hover:bg-[#E6E9E3] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-xs cursor-pointer transition-colors"
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
