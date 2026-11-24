import React from 'react';
import { Car, ShoppingBag, Ban } from 'lucide-react';
import { ConversationSummaryDto } from '@/types';

interface ConversationItemProps {
  conversation: ConversationSummaryDto;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const { contextType, otherParticipant, unreadCount, isBlocked } = conversation;

  const contextTitle =
    conversation.context?.title ||
    conversation.contextTitle ||
    (contextType === 'CAB_GROUP' ? 'Cab Pool' : 'Marketplace Item');

  const lastMessageText =
    typeof conversation.lastMessage === 'string'
      ? conversation.lastMessage
      : conversation.lastMessage?.content || 'No messages yet';

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const timestampStr = formatTimestamp(
    typeof conversation.lastMessage === 'object' && conversation.lastMessage?.createdAt
      ? conversation.lastMessage.createdAt
      : conversation.lastMessageAt || conversation.updatedAt
  );

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
        isActive
          ? 'bg-thapar-50 border-thapar-200 dark:bg-thapar-950/40 dark:border-thapar-900/60 shadow-sm'
          : 'bg-white hover:bg-slate-50 border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          {otherParticipant.profilePictureUrl ? (
            <img
              src={otherParticipant.profilePictureUrl}
              alt={otherParticipant.name}
              className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-thapar-100 dark:bg-thapar-900/60 text-thapar-800 dark:text-thapar-200 flex items-center justify-center font-bold text-base border border-thapar-200 dark:border-thapar-800">
              {otherParticipant.name ? otherParticipant.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          {isBlocked && (
            <span
              title="Blocked"
              className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm"
            >
              <Ban className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {otherParticipant.name}
            </h4>
            {timestampStr && (
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                {timestampStr}
              </span>
            )}
          </div>

          {/* Context Tag */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                contextType === 'CAB_GROUP'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50'
              }`}
            >
              {contextType === 'CAB_GROUP' ? (
                <Car className="w-3 h-3 shrink-0" />
              ) : (
                <ShoppingBag className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate max-w-[140px]">{contextTitle}</span>
            </span>
          </div>

          {/* Preview & Badge */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {lastMessageText}
            </p>
            {unreadCount > 0 && (
              <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-thapar-700 rounded-full shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
