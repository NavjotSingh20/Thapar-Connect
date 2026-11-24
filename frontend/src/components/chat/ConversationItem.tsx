import React from 'react';
import { Car, ShoppingBag, Ban, Users } from 'lucide-react';
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
  const { contextType, otherParticipant, unreadCount, isBlocked, isGroup, groupName, memberCount } = conversation;

  const displayName = isGroup
    ? (groupName || conversation.context?.title || 'Ride Pool Group')
    : otherParticipant.name;

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
          ? 'bg-[#E6E9E3] border-[#A3D65C] shadow-xs'
          : 'bg-white hover:bg-[#F6F7F5] border-[#B7BEB2]/40'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          {isGroup ? (
            <div className="w-11 h-11 rounded-full bg-[#20251F] text-[#A3D65C] flex items-center justify-center font-bold text-base border-2 border-[#A3D65C] shadow-xs">
              <Car className="w-5 h-5 text-[#A3D65C]" />
            </div>
          ) : otherParticipant.profilePictureUrl ? (
            <img
              src={otherParticipant.profilePictureUrl}
              alt={otherParticipant.name}
              className="w-11 h-11 rounded-full object-cover border border-[#B7BEB2]/60"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#E6E9E3] text-[#20251F] flex items-center justify-center font-bold text-base border border-[#B7BEB2]/60">
              {otherParticipant.name ? otherParticipant.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          {isBlocked && (
            <span
              title="Blocked"
              className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow-sm"
            >
              <Ban className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="text-sm font-semibold text-[#20251F] truncate flex items-center gap-1.5">
              <span className="truncate">{displayName}</span>
            </h4>
            {timestampStr && (
              <span className="text-xs text-[#20251F]/60 shrink-0 font-medium">
                {timestampStr}
              </span>
            )}
          </div>

          {/* Context Tag */}
          <div className="flex items-center gap-1.5 mb-1.5">
            {!isGroup && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  contextType === 'CAB_GROUP'
                    ? 'bg-[#E6E9E3] text-[#20251F] border border-[#B7BEB2]/60'
                    : 'bg-[#A3D65C]/20 text-[#20251F] border border-[#A3D65C]/40'
                }`}
              >
                {contextType === 'CAB_GROUP' ? (
                  <Car className="w-3 h-3 shrink-0" />
                ) : (
                  <ShoppingBag className="w-3 h-3 shrink-0" />
                )}
                <span className="truncate max-w-[140px]">{contextTitle}</span>
              </span>
            )}

            {isGroup && memberCount && memberCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#20251F]/70 bg-[#F6F7F5] px-2 py-0.5 rounded-full border border-[#B7BEB2]/40">
                <Users className="w-2.5 h-2.5 text-[#20251F]/70" />
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            )}
          </div>

          {/* Preview & Badge */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#20251F]/70 truncate">
              {lastMessageText}
            </p>
            {unreadCount > 0 && (
              <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-[#20251F] bg-[#A3D65C] rounded-full shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
