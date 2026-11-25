import React, { useState } from 'react';
import { Shield, PhoneOff, UserCheck, LogOut, Loader2 } from 'lucide-react';
import { BlockDto } from '@/types';
import { safetyService } from '@/services/safetyService';

interface PrivacySafetyTabProps {
  phoneVisibleConfirmedOnly: boolean;
  onTogglePhonePrivacy: (nextValue: boolean) => Promise<void>;
  blockedUsers: BlockDto[];
  loadingBlocked: boolean;
  onRefreshBlocked: () => void;
  onLogoutAll: () => Promise<void>;
}

export const PrivacySafetyTab: React.FC<PrivacySafetyTabProps> = ({
  phoneVisibleConfirmedOnly,
  onTogglePhonePrivacy,
  blockedUsers,
  loadingBlocked,
  onRefreshBlocked,
  onLogoutAll,
}) => {
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const handlePrivacyChange = async () => {
    setSavingPrivacy(true);
    try {
      await onTogglePhonePrivacy(!phoneVisibleConfirmedOnly);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    setUnblockingId(userId);
    try {
      await safetyService.unblockUser(userId);
      onRefreshBlocked();
    } finally {
      setUnblockingId(null);
    }
  };

  const handleConfirmLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await onLogoutAll();
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Phone Number Privacy Control */}
      <div className="rounded-xl border border-[#B7BEB2]/60 bg-[#F6F7F5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#A3D65C]/25 text-[#20251F] shrink-0 mt-0.5">
            <PhoneOff className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#20251F]">
              Hide phone number until rider is confirmed
            </h4>
            <p className="mt-0.5 text-xs text-[#20251F]/65 leading-relaxed max-w-xl">
              When enabled, your phone number is hidden on public Cab Pool cards and only revealed to confirmed riders inside your pool or ride group chat.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={phoneVisibleConfirmedOnly}
          disabled={savingPrivacy}
          onClick={handlePrivacyChange}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
            phoneVisibleConfirmedOnly ? 'bg-[#A3D65C]' : 'bg-[#B7BEB2]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-[#20251F] shadow transition ${
              phoneVisibleConfirmedOnly ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Blocked Users Management */}
      <div className="rounded-xl border border-[#B7BEB2]/60 bg-[#F6F7F5] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#20251F]" />
          <h4 className="text-sm font-bold text-[#20251F]">
            Blocked Users ({blockedUsers.length})
          </h4>
        </div>

        {loadingBlocked ? (
          <div className="flex items-center py-4 text-xs text-[#20251F]/60">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading blocked accounts...
          </div>
        ) : blockedUsers.length === 0 ? (
          <p className="text-xs text-[#20251F]/60 py-2">
            You haven&apos;t blocked any users. Blocked peers cannot message you or start new chats.
          </p>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#B7BEB2]/50 bg-white px-3.5 py-2.5"
              >
                <div>
                  <p className="text-xs font-bold text-[#20251F]">
                    {b.blockedUserName || 'Campus User'}
                  </p>
                  <p className="text-[11px] text-[#20251F]/55">
                    Blocked on {new Date(b.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={unblockingId === b.blockedUserId}
                  onClick={() => handleUnblock(b.blockedUserId)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#B7BEB2] bg-[#E6E9E3] px-3 py-1.5 text-xs font-semibold text-[#20251F] hover:bg-[#d8ded4] disabled:opacity-50 transition"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  {unblockingId === b.blockedUserId ? 'Unblocking...' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Security: Sign Out Everywhere */}
      <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[#20251F]">Session Security</h4>
          <p className="mt-0.5 text-xs text-[#20251F]/65">
            Revoke all active login sessions across browsers and mobile devices immediately.
          </p>
        </div>

        {confirmLogoutAll ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={loggingOutAll}
              onClick={handleConfirmLogoutAll}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loggingOutAll ? 'Signing Out...' : 'Confirm Sign Out Everywhere'}
            </button>
            <button
              type="button"
              disabled={loggingOutAll}
              onClick={() => setConfirmLogoutAll(false)}
              className="rounded-xl border border-[#B7BEB2] bg-white px-3 py-2 text-xs font-semibold text-[#20251F] hover:bg-[#E6E9E3] transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLogoutAll(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 shrink-0 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out of All Devices
          </button>
        )}
      </div>
    </div>
  );
};
