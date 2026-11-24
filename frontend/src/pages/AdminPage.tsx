import React, { useState, useEffect } from 'react';
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

  const loadData = async (tab: AdminTab) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      if (tab === 'reports') {
        const data = await adminService.getReports();
        setReports(data);
      } else if (tab === 'listings') {
        const data = await adminService.getListings();
        setListings(data);
      } else if (tab === 'cabs') {
        const data = await adminService.getCabs();
        setCabs(data);
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

  const handleDeleteListing = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await adminService.deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
      setFeedback({ type: 'success', message: 'Listing removed successfully.' });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete listing.',
      });
    }
  };

  const handleDeleteCab = async (id: string) => {
    if (!window.confirm('Are you sure you want to close/delete this cab group?')) return;
    try {
      await adminService.deleteCab(id);
      setCabs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'CLOSED' as any } : c))
      );
      setFeedback({ type: 'success', message: 'Cab group closed successfully.' });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to close cab group.',
      });
    }
  };

  const handleToggleUserBan = async (id: string, isCurrentlyBanned: boolean) => {
    try {
      if (isCurrentlyBanned) {
        await adminService.unbanUser(id);
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isBanned: false } : u))
        );
        setFeedback({ type: 'success', message: 'User unbanned successfully.' });
      } else {
        if (!window.confirm('Are you sure you want to ban this user?')) return;
        await adminService.banUser(id);
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isBanned: true } : u))
        );
        setFeedback({ type: 'success', message: 'User banned and sessions revoked.' });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update user ban status.',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-thapar-700 dark:text-thapar-400" />
            Campus Moderation Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administrative controls for campus safety reports, content moderation, and user bans.
          </p>
        </div>

        <button
          onClick={() => loadData(activeTab)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 self-start sm:self-auto"
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
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'reports'
              ? 'border-thapar-700 text-thapar-800 dark:text-thapar-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Safety Reports
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
            {reports.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'listings'
              ? 'border-thapar-700 text-thapar-800 dark:text-thapar-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Listings
        </button>

        <button
          onClick={() => setActiveTab('cabs')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'cabs'
              ? 'border-thapar-700 text-thapar-800 dark:text-thapar-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Car className="w-4 h-4" />
          Cab Pools
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'users'
              ? 'border-thapar-700 text-thapar-800 dark:text-thapar-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
      </div>

      {/* Tab Panels */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-thapar-700 border-t-transparent" />
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No reports filed. Campus community is operating cleanly!
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                        report.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : report.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Target: {report.targetType} ({report.targetId})
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {report.reason}
                  </h4>
                  {report.details && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
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
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  )}
                  {report.status !== 'DISMISSED' && (
                    <button
                      onClick={() => handleUpdateReportStatus(report.id, 'DISMISSED')}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors"
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
              No listings found.
            </div>
          ) : (
            listings.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </h4>
                    <span className="text-xs font-bold text-thapar-700 dark:text-thapar-400 shrink-0">
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
                    onClick={() => handleDeleteListing(item.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1.5 transition-colors"
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
              No cab pools found.
            </div>
          ) : (
            cabs.map((cab) => (
              <div
                key={cab.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3"
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
                  {cab.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleDeleteCab(cab.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Close Cab
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
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
                    <td className="py-3 px-4 font-semibold">{u.fullName || u.name || 'Unnamed'}</td>
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
                          onClick={() => handleToggleUserBan(u.id, !!u.isBanned)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
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
    </div>
  );
};
