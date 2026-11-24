import React, { useState } from 'react';
import { X, ShieldAlert, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { safetyService } from '@/services/safetyService';
import { ReportTargetType } from '@/types';

interface BlockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  targetType?: ReportTargetType;
  targetId?: string;
  isBlocked?: boolean;
  onBlockStatusChanged?: (isBlocked: boolean) => void;
}

export const BlockReportModal: React.FC<BlockReportModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  targetType = 'USER',
  targetId,
  isBlocked = false,
  onBlockStatusChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'report' | 'block'>('report');
  const [reason, setReason] = useState('Harassment & Inappropriate Behavior');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  if (!isOpen) return null;

  const actualTargetId = targetId || targetUserId;

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await safetyService.report({
        targetType,
        targetId: actualTargetId,
        reason,
        details: details.trim() || undefined,
      });

      setFeedback({
        type: 'success',
        message: 'Your report has been submitted to campus moderators for review.',
      });
      setTimeout(() => {
        onClose();
        setFeedback(null);
        setDetails('');
      }, 1800);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit safety report. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBlock = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (isBlocked) {
        await safetyService.unblockUser(targetUserId);
        setFeedback({
          type: 'success',
          message: `${targetUserName} has been unblocked.`,
        });
        if (onBlockStatusChanged) onBlockStatusChanged(false);
      } else {
        await safetyService.blockUser(targetUserId);
        setFeedback({
          type: 'success',
          message: `${targetUserName} has been blocked. They cannot message you.`,
        });
        if (onBlockStatusChanged) onBlockStatusChanged(true);
      }
      setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update block status.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#20251F]" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Safety & Moderation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('report');
              setFeedback(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'report'
                ? 'border-[#20251F] text-[#20251F] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Report Issue
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('block');
              setFeedback(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'block'
                ? 'border-[#20251F] text-[#20251F] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Ban className="w-4 h-4" />
            {isBlocked ? 'Unblock' : 'Block User'}
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {feedback && (
            <div
              className={`p-3.5 mb-4 rounded-xl flex items-start gap-2.5 text-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                  : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {activeTab === 'report' ? (
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Reporting Target
                </label>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 font-medium">
                  {targetType}: <span className="font-bold">{targetUserName}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Reason Category
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#A3D65C] focus:border-[#20251F] outline-none text-slate-900"
                >
                  <option value="Harassment & Inappropriate Behavior">
                    Harassment & Inappropriate Behavior
                  </option>
                  <option value="Spam & Fraud">Spam & Fraud</option>
                  <option value="No-Show / Unreliable Commute">No-Show / Unreliable Commute</option>
                  <option value="Counterfeit or Misrepresented Item">
                    Counterfeit or Misrepresented Item
                  </option>
                  <option value="Threatening or Abusive Language">
                    Threatening or Abusive Language
                  </option>
                  <option value="Other Safety Violation">Other Safety Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Details / Evidence (Optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide context for campus safety administrators..."
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#A3D65C] focus:border-[#20251F] outline-none text-slate-900 placeholder-slate-400 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-sm font-semibold border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-sm font-semibold bg-[#20251F] hover:bg-[#323930] text-[#F6F7F5] rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-sm text-amber-900 dark:text-amber-200">
                {isBlocked
                  ? `Unblocking ${targetUserName} will allow them to send you messages and view public ride/marketplace threads.`
                  : `Blocking ${targetUserName} will immediately cut off private chat messaging and prevent them from initiating new conversations with you.`}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-sm font-semibold border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  disabled={isSubmitting}
                  className={`flex-1 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 ${
                    isBlocked
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isSubmitting
                    ? 'Processing...'
                    : isBlocked
                    ? 'Unblock User'
                    : 'Block User'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
