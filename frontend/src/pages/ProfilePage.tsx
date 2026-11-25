import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Phone,
  Building,
  User,
  Mail,
  GraduationCap,
  Edit2,
  Check,
  X,
  LogOut,
  Camera,
  Calendar,
  Package,
  Car,
  Bookmark,
  Shield,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSavedListingsStore } from '@/store/useSavedListingsStore';
import { marketplaceService } from '@/services/marketplaceService';
import { cabService } from '@/services/cabService';
import { safetyService } from '@/services/safetyService';
import {
  TIET_HOSTELS,
  TIET_BRANCHES,
  STUDY_YEARS,
  isValidIndianPhone,
  formatHostelName,
} from '@/constants/hostels';
import {
  BlockDto,
  CabGroupSummaryDto,
  ListingSummaryDto,
  getUserDisplayName,
} from '@/types';
import { getFullImageUrl } from '@/utils/imageUrl';
import { MyListingsTab } from '@/components/profile/MyListingsTab';
import { MyRidesTab } from '@/components/profile/MyRidesTab';
import { SavedItemsTab } from '@/components/profile/SavedItemsTab';
import { PrivacySafetyTab } from '@/components/profile/PrivacySafetyTab';

type ProfileTabKey = 'listings' | 'rides' | 'saved' | 'privacy';

export const ProfilePage: React.FC = () => {
  const {
    user,
    updateUser,
    uploadAvatar,
    deleteAvatar,
    logout,
    logoutAll,
    isLoading,
    error,
    clearError,
  } = useAuthStore();
  const fetchSavedIds = useSavedListingsStore((s) => s.fetchSavedIds);

  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('listings');

  // Edit Form State
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [hostel, setHostel] = useState(user?.hostel || '');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [year, setYear] = useState<number | undefined>(user?.year);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Avatar upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Activity & Tabs Data
  const [myListings, setMyListings] = useState<ListingSummaryDto[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const [allCabs, setAllCabs] = useState<CabGroupSummaryDto[]>([]);
  const [loadingCabs, setLoadingCabs] = useState(true);

  const [savedListings, setSavedListings] = useState<ListingSummaryDto[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const [blockedUsers, setBlockedUsers] = useState<BlockDto[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);

  const loadMyListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await marketplaceService.getMyListings(0, 50);
      setMyListings(res.content || []);
    } catch {
      setMyListings([]);
    } finally {
      setLoadingListings(false);
    }
  }, []);

  const loadCabs = useCallback(async () => {
    setLoadingCabs(true);
    try {
      const data = await cabService.getCabGroups();
      setAllCabs(data || []);
    } catch {
      setAllCabs([]);
    } finally {
      setLoadingCabs(false);
    }
  }, []);

  const loadSavedListings = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const data = await marketplaceService.getSavedListings();
      setSavedListings(data || []);
      fetchSavedIds();
    } catch {
      setSavedListings([]);
    } finally {
      setLoadingSaved(false);
    }
  }, [fetchSavedIds]);

  const loadBlockedUsers = useCallback(async () => {
    setLoadingBlocked(true);
    try {
      const data = await safetyService.getBlockedUsers();
      setBlockedUsers(data || []);
    } catch {
      setBlockedUsers([]);
    } finally {
      setLoadingBlocked(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadMyListings();
    loadCabs();
    loadSavedListings();
    loadBlockedUsers();
  }, [user?.id, loadMyListings, loadCabs, loadSavedListings, loadBlockedUsers]);

  const showTempSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();
    setSuccessMessage(null);

    const cleanPhone = phoneNumber.trim().replace(/^(\+91|0)/, '');
    if (cleanPhone && !isValidIndianPhone(cleanPhone)) {
      setValidationError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateUser({
        phoneNumber: cleanPhone || undefined,
        hostel: hostel || undefined,
        rollNumber: rollNumber.trim() || undefined,
        branch: branch || undefined,
        year: year ? Number(year) : undefined,
      });
      setIsEditing(false);
      showTempSuccess('Profile updated successfully!');
    } catch {
      // Handled in store
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setValidationError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setValidationError('Profile photo must be smaller than 5MB.');
      return;
    }

    setValidationError(null);
    clearError();
    setAvatarBusy(true);
    try {
      await uploadAvatar(file);
      showTempSuccess('Profile photo updated!');
    } catch {
      // Handled in store
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setValidationError(null);
    clearError();
    setAvatarBusy(true);
    try {
      await deleteAvatar();
      showTempSuccess('Profile photo removed.');
    } catch {
      // Handled in store
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleTogglePhonePrivacy = async (nextValue: boolean) => {
    setValidationError(null);
    clearError();
    await updateUser({ phoneVisibleConfirmedOnly: nextValue });
    showTempSuccess(
      nextValue
        ? 'Phone number is now hidden until co-riders are confirmed.'
        : 'Phone number is now visible on your cab pool cards.'
    );
  };

  const activeListingsCount = myListings.filter((l) => l.status === 'AVAILABLE').length;
  const soldListingsCount = myListings.filter((l) => l.status === 'SOLD').length;
  const myRidesCount = allCabs.filter(
    (c) =>
      (user?.id && c.creator?.id === user.id) ||
      c.myMemberStatus === 'CONFIRMED' ||
      c.myMemberStatus === 'PENDING'
  ).length;

  const memberSinceText = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    })
    : null;

  const tabs: Array<{ key: ProfileTabKey; label: string; count?: number; icon: React.ReactNode }> = [
    {
      key: 'listings',
      label: 'My Listings',
      count: myListings.length,
      icon: <Package className="h-3.5 w-3.5" />,
    },
    {
      key: 'rides',
      label: 'My Rides',
      count: myRidesCount,
      icon: <Car className="h-3.5 w-3.5" />,
    },
    {
      key: 'saved',
      label: 'Saved Items',
      count: savedListings.length,
      icon: <Bookmark className="h-3.5 w-3.5" />,
    },
    {
      key: 'privacy',
      label: 'Privacy & Safety',
      icon: <Shield className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Main Profile Card */}
      <div className="rounded-2xl border border-[#B7BEB2]/60 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar with Upload Overlay */}
            <div className="relative shrink-0 group">
              <div className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-[#20251F] text-[#F6F7F5] text-xl font-bold ring-2 ring-[#A3D65C]/60 overflow-hidden shadow-xs">
                {user?.profilePictureUrl ? (
                  <img
                    src={getFullImageUrl(user.profilePictureUrl)}
                    alt={getUserDisplayName(user)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getUserDisplayName(user).substring(0, 2).toUpperCase()
                )}
              </div>

              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
                title="Upload profile photo"
                aria-label="Upload profile photo"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#A3D65C] text-[#20251F] shadow-sm hover:bg-[#92c949] transition active:scale-95 disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#20251F]">
                  {getUserDisplayName(user)}
                </h1>
                {user?.role === 'ADMIN' && (
                  <span className="rounded-full bg-[#A3D65C] px-2.5 py-0.5 text-[10px] font-bold text-[#20251F] shadow-xs">
                    ADMIN
                  </span>
                )}
              </div>

              <p className="text-xs text-[#20251F]/70 flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5 text-[#20251F]/60" />
                {user?.email}
              </p>

              <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                {memberSinceText && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#20251F]/60">
                    <Calendar className="h-3 w-3" />
                    Member since {memberSinceText}
                  </span>
                )}
                {user?.profilePictureUrl && (
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#20251F]/60 hover:text-red-700 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => {
                  setPhoneNumber(user?.phoneNumber || '');
                  setHostel(user?.hostel || '');
                  setRollNumber(user?.rollNumber || '');
                  setBranch(user?.branch || '');
                  setYear(user?.year);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#B7BEB2] bg-[#E6E9E3] px-3.5 py-1.5 text-xs font-semibold text-[#20251F] hover:bg-[#d8ded4] transition shadow-xs"
              >
                <Edit2 className="h-3.5 w-3.5 text-[#20251F]" />
                Edit Profile
              </button>
            )}
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#B7BEB2] bg-[#E6E9E3] px-3.5 py-1.5 text-xs font-semibold text-[#20251F] hover:bg-[#d8ded4] transition shadow-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Quick Activity Stats Strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('listings')}
            className="rounded-xl border border-[#B7BEB2]/50 bg-[#F6F7F5] px-3.5 py-2.5 text-left transition hover:border-[#20251F]/40"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#20251F]/60">
              <span>Active Listings</span>
              <Package className="h-3.5 w-3.5 text-[#20251F]/50" />
            </div>
            <div className="mt-1 text-lg font-extrabold text-[#20251F]">{activeListingsCount}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('listings')}
            className="rounded-xl border border-[#B7BEB2]/50 bg-[#F6F7F5] px-3.5 py-2.5 text-left transition hover:border-[#20251F]/40"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#20251F]/60">
              <span>Items Sold</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-[#20251F]/50" />
            </div>
            <div className="mt-1 text-lg font-extrabold text-[#20251F]">{soldListingsCount}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rides')}
            className="rounded-xl border border-[#B7BEB2]/50 bg-[#F6F7F5] px-3.5 py-2.5 text-left transition hover:border-[#20251F]/40"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#20251F]/60">
              <span>Rides Shared</span>
              <Car className="h-3.5 w-3.5 text-[#20251F]/50" />
            </div>
            <div className="mt-1 text-lg font-extrabold text-[#20251F]">{myRidesCount}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className="rounded-xl border border-[#B7BEB2]/50 bg-[#F6F7F5] px-3.5 py-2.5 text-left transition hover:border-[#20251F]/40"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#20251F]/60">
              <span>Saved Items</span>
              <Bookmark className="h-3.5 w-3.5 text-[#20251F]/50" />
            </div>
            <div className="mt-1 text-lg font-extrabold text-[#20251F]">{savedListings.length}</div>
          </button>
        </div>

        {successMessage && (
          <div className="mt-4 rounded-xl border border-[#A3D65C] bg-[#A3D65C]/15 p-3 text-xs text-[#20251F] font-medium">
            {successMessage}
          </div>
        )}
        {(validationError || error) && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {validationError || error}
          </div>
        )}

        {!isEditing ? (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-3 rounded-xl border border-[#B7BEB2]/50 bg-[#F6F7F5] p-3.5">
              <div className="p-2 rounded-lg bg-[#A3D65C]/20 text-[#20251F]">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[#20251F]/60 text-[11px] font-medium">Hostel</span>
                <span className="font-semibold text-[#20251F]">
                  {formatHostelName(user?.hostel) || 'Not configured'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#B7BEB2]/50 bg-[#F6F7F5] p-3.5">
              <div className="p-2 rounded-lg bg-[#A3D65C]/20 text-[#20251F]">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[#20251F]/60 text-[11px] font-medium">Phone Number</span>
                <span className="font-semibold text-[#20251F]">
                  {user?.phoneNumber ? `+91 ${user.phoneNumber}` : 'Not configured'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#B7BEB2]/50 bg-[#F6F7F5] p-3.5">
              <div className="p-2 rounded-lg bg-[#A3D65C]/20 text-[#20251F]">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[#20251F]/60 text-[11px] font-medium">Roll Number</span>
                <span className="font-semibold text-[#20251F]">
                  {user?.rollNumber || 'Not provided'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#B7BEB2]/50 bg-[#F6F7F5] p-3.5">
              <div className="p-2 rounded-lg bg-[#A3D65C]/20 text-[#20251F]">
                <User className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[#20251F]/60 text-[11px] font-medium">Branch &amp; Year</span>
                <span className="font-semibold text-[#20251F]">
                  {user?.branch || 'General'} {user?.year ? `(${user.year} Year)` : ''}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#20251F] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-[#B7BEB2] bg-white px-3 py-2 text-sm text-[#20251F] focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#20251F] mb-1">
                  Hostel
                </label>
                <select
                  value={hostel}
                  onChange={(e) => setHostel(e.target.value)}
                  className="w-full rounded-xl border border-[#B7BEB2] bg-white px-3 py-2 text-sm text-[#20251F] focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] outline-none"
                >
                  <option value="">Select hostel...</option>
                  {TIET_HOSTELS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#20251F] mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="102103456"
                  className="w-full rounded-xl border border-[#B7BEB2] bg-white px-3 py-2 text-sm text-[#20251F] focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#20251F] mb-1">
                  Year of Study
                </label>
                <select
                  value={year || ''}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-xl border border-[#B7BEB2] bg-white px-3 py-2 text-sm text-[#20251F] focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] outline-none"
                >
                  <option value="">Select year...</option>
                  {STUDY_YEARS.map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#20251F] mb-1">
                Branch
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-xl border border-[#B7BEB2] bg-white px-3 py-2 text-sm text-[#20251F] focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] outline-none"
              >
                <option value="">Select branch...</option>
                {TIET_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingProfile || isLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3D65C] px-4 py-2 text-xs font-semibold text-[#20251F] shadow hover:bg-[#92c949] disabled:opacity-50 transition"
              >
                <Check className="h-4 w-4" />
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#B7BEB2] bg-[#E6E9E3] px-4 py-2 text-xs font-semibold text-[#20251F] hover:bg-[#d8ded4] transition"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Activity & Safety Tabs Card */}
      <div className="rounded-2xl border border-[#B7BEB2]/60 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#B7BEB2]/50">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${isActive
                  ? 'bg-[#20251F] text-[#A3D65C] shadow-xs'
                  : 'text-[#20251F]/70 hover:bg-[#E6E9E3]/70 hover:text-[#20251F]'
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${isActive ? 'bg-[#A3D65C] text-[#20251F]' : 'bg-[#E6E9E3] text-[#20251F]'
                      }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'listings' && (
          <MyListingsTab
            listings={myListings}
            loading={loadingListings}
            onRefresh={loadMyListings}
          />
        )}

        {activeTab === 'rides' && (
          <MyRidesTab
            cabs={allCabs}
            currentUserId={user?.id}
            loading={loadingCabs}
            onRefresh={loadCabs}
          />
        )}

        {activeTab === 'saved' && (
          <SavedItemsTab
            listings={savedListings}
            loading={loadingSaved}
            onRefresh={loadSavedListings}
          />
        )}

        {activeTab === 'privacy' && (
          <PrivacySafetyTab
            phoneVisibleConfirmedOnly={Boolean(user?.phoneVisibleConfirmedOnly)}
            onTogglePhonePrivacy={handleTogglePhonePrivacy}
            blockedUsers={blockedUsers}
            loadingBlocked={loadingBlocked}
            onRefreshBlocked={loadBlockedUsers}
            onLogoutAll={logoutAll}
          />
        )}
      </div>
    </div>
  );
};
