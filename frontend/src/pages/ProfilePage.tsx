import React, { useState } from 'react';
import { Phone, Building, User, Mail, GraduationCap, Edit2, Check, X, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { TIET_HOSTELS, TIET_BRANCHES, STUDY_YEARS, isValidIndianPhone } from '@/constants/hostels';
import { getUserDisplayName } from '@/types';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, logout, isLoading, error, clearError } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [hostel, setHostel] = useState(user?.hostel || '');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [year, setYear] = useState<number | undefined>(user?.year);
  const [validationError, setValidationError] = useState<string | null>(null);

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

    try {
      await updateUser({
        phoneNumber: cleanPhone || undefined,
        hostel: hostel || undefined,
        rollNumber: rollNumber.trim() || undefined,
        branch: branch || undefined,
        year: year ? Number(year) : undefined,
      });
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      // Handled in store
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-thapar-700 text-white text-xl font-bold ring-4 ring-gold-400/30 overflow-hidden">
              {user?.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt={getUserDisplayName(user)}
                  className="h-full w-full object-cover"
                />
              ) : (
                getUserDisplayName(user).substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {getUserDisplayName(user)}
                </h1>
                {user?.role === 'ADMIN' && (
                  <span className="rounded-full bg-thapar-700 px-2 py-0.5 text-[10px] font-bold text-white">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3 w-3 text-gold-400" />
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => {
                  setPhoneNumber(user?.phoneNumber || '');
                  setHostel(user?.hostel || '');
                  setRollNumber(user?.rollNumber || '');
                  setBranch(user?.branch || '');
                  setYear(user?.year);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            ) : null}
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {successMessage}
          </div>
        )}
        {(validationError || error) && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {validationError || error}
          </div>
        )}

        {!isEditing ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <Building className="h-5 w-5 text-thapar-700 dark:text-gold-400" />
              <div>
                <span className="block text-slate-400 text-[11px]">Hostel</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {user?.hostel || 'Not configured'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <Phone className="h-5 w-5 text-thapar-700 dark:text-gold-400" />
              <div>
                <span className="block text-slate-400 text-[11px]">Phone Number</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {user?.phoneNumber ? `+91 ${user.phoneNumber}` : 'Not configured'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <GraduationCap className="h-5 w-5 text-thapar-700 dark:text-gold-400" />
              <div>
                <span className="block text-slate-400 text-[11px]">Roll Number</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {user?.rollNumber || 'Not provided'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <User className="h-5 w-5 text-thapar-700 dark:text-gold-400" />
              <div>
                <span className="block text-slate-400 text-[11px]">Branch &amp; Year</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {user?.branch || 'General'} {user?.year ? `(${user.year} Year)` : ''}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hostel
                </label>
                <select
                  value={hostel}
                  onChange={(e) => setHostel(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="102103456"
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Year of Study
                </label>
                <select
                  value={year || ''}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Branch
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100"
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
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-thapar-700 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-thapar-800 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
