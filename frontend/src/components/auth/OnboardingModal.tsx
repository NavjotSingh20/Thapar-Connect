import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { TIET_HOSTELS, TIET_BRANCHES, STUDY_YEARS, isValidIndianPhone } from '@/constants/hostels';
import { getUserDisplayName } from '@/types';

export const OnboardingModal: React.FC = () => {
  const { user, isAuthenticated, isOnboarded, onboardUser, logout, isLoading, error, clearError } =
    useAuthStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [hostel, setHostel] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isAuthenticated || isOnboarded || user?.role === 'ADMIN') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    const cleanPhone = phoneNumber.trim().replace(/^(\+91|0)/, '');

    if (!cleanPhone) {
      setValidationError('Phone number is required.');
      return;
    }

    if (!isValidIndianPhone(cleanPhone)) {
      setValidationError('Please enter a valid 10-digit Indian phone number starting with 6-9.');
      return;
    }

    if (!hostel) {
      setValidationError('Please select your hostel or Day Scholar residence.');
      return;
    }

    try {
      await onboardUser({
        phoneNumber: cleanPhone,
        hostel,
        rollNumber: rollNumber.trim() || undefined,
        branch: branch || undefined,
        year: year ? Number(year) : undefined,
      });
    } catch (err) {
      // Error handled by store
    }
  };

  const boysHostels = TIET_HOSTELS.filter((h) => h.category === 'BOYS');
  const girlsHostels = TIET_HOSTELS.filter((h) => h.category === 'GIRLS');
  const otherOptions = TIET_HOSTELS.filter((h) => h.category === 'OTHER');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6E9E3] text-[#20251F] ring-2 ring-[#A3D65C]/50">
            {user?.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={getUserDisplayName(user)}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold">TC</span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome to Thapar Connect!
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Complete your profile onboarding before accessing cab pools, the campus marketplace, and messaging.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {getUserDisplayName(user)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Verified TIET
          </span>
        </div>

        {(validationError || error) && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <span>{validationError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mobile Phone Number (WhatsApp Active) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-medium text-slate-400">
                +91
              </span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                maxLength={10}
                required
                className="w-full rounded-xl border border-[#B7BEB2] bg-transparent pl-12 pr-4 py-2 text-sm text-[#20251F] placeholder-[#20251F]/40 focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Used strictly for cab pool coordination. Hidden from marketplace listings.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Hostel / Residence <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={hostel}
                onChange={(e) => setHostel(e.target.value)}
                required
                className="w-full rounded-xl border border-[#B7BEB2] bg-white px-3 py-2 text-sm text-[#20251F] focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C]"
              >
                <option value="">Select your hostel...</option>
                <optgroup label="Boys Hostels">
                  {boysHostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Girls Hostels">
                  {girlsHostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other / Day Scholar">
                  {otherOptions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-[11px] font-medium text-slate-400">Optional Academic Details</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="102103456"
                  className="w-full rounded-lg border border-[#B7BEB2] bg-transparent px-3 py-1.5 text-xs text-[#20251F] focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#20251F]/70 mb-1">
                  Year of Study
                </label>
                <select
                  value={year || ''}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-[#B7BEB2] bg-white px-3 py-1.5 text-xs text-[#20251F] focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] focus:outline-none"
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
              <label className="block text-xs text-[#20251F]/70 mb-1">Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-lg border border-[#B7BEB2] bg-white px-3 py-1.5 text-xs text-[#20251F] focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] focus:outline-none"
              >
                <option value="">Select branch...</option>
                {TIET_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#A3D65C] px-4 py-2.5 text-sm font-bold text-[#20251F] shadow-xs transition hover:bg-[#92c949] disabled:opacity-50"
            >
              {isLoading ? 'Saving profile...' : 'Complete Profile & Enter Campus'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Wrong account? Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
