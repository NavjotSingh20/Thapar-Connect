import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  MoreVertical,
  Car,
  ShoppingBag,
  ArrowLeft,
  ShieldAlert,
  Info,
  Ban,
  Check,
  CheckCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { chatService } from '@/services/chatService';
import { stompClient } from '@/services/stompClient';
import { BlockReportModal } from './BlockReportModal';
import { ConversationSummaryDto, MessageDto } from '@/types';

interface ChatThreadProps {
  conversation: ConversationSummaryDto;
  onBack?: () => void;
  onBlockChanged?: (isBlocked: boolean) => void;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  conversation,
  onBack,
  onBlockChanged,
}) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [localBlocked, setLocalBlocked] = useState(
    conversation.isBlocked || conversation.blockedByMe || false
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { id: conversationId, contextType, contextId, otherParticipant } = conversation;
  const contextTitle =
    conversation.context?.title ||
    conversation.contextTitle ||
    (contextType === 'CAB_GROUP' ? 'Cab Pool' : 'Marketplace Item');

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load message history
  const loadMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    try {
      const msgs = await chatService.getMessages(conversationId);
      setMessages(msgs);
      // Mark read
      chatService.markAsRead(conversationId).catch(() => {});
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
    setLocalBlocked(conversation.isBlocked || conversation.blockedByMe || false);
  }, [conversationId, loadMessages, conversation.isBlocked, conversation.blockedByMe]);

  // Subscribe to real-time STOMP topic
  useEffect(() => {
    const unsubscribe = stompClient.subscribeToConversation(
      conversationId,
      (newMessage: MessageDto) => {
        setMessages((prev) => {
          // Deduplicate by message ID
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
        // Auto mark read if active thread
        chatService.markAsRead(conversationId).catch(() => {});
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || trimmed.length > 2000 || isSending || localBlocked) return;

    setIsSending(true);
    setInputText('');

    try {
      // Attempt STOMP delivery first
      const stompSent = stompClient.sendMessage(conversationId, trimmed);
      if (!stompSent) {
        // Fallback to HTTP REST send
        const saved = await chatService.sendHttpMessage(conversationId, trimmed);
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) return prev;
          return [...prev, saved];
        });
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Restore unsent text on failure
      setInputText(trimmed);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const charCount = inputText.length;
  const isCharLimitExceeded = charCount > 2000;
  const isCharWarning = charCount >= 1900;

  const contextHref =
    contextType === 'CAB_GROUP' ? '/cabs' : `/marketplace/${contextId}`;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg md:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative shrink-0">
            {otherParticipant.profilePictureUrl ? (
              <img
                src={otherParticipant.profilePictureUrl}
                alt={otherParticipant.name}
                className="w-10 h-10 rounded-full object-cover border border-[#B7BEB2]/60"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#E6E9E3] text-[#20251F] flex items-center justify-center font-bold text-sm border border-[#B7BEB2]/60">
                {otherParticipant.name ? otherParticipant.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            {localBlocked && (
              <span className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full p-0.5">
                <Ban className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#20251F] truncate flex items-center gap-2">
              <span>{otherParticipant.name}</span>
              {otherParticipant.isBanned && (
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">
                  Banned
                </span>
              )}
            </h3>

            {/* Context Link */}
            <Link
              to={contextHref}
              className="inline-flex items-center gap-1 text-xs text-[#20251F] hover:underline font-semibold truncate max-w-[200px] sm:max-w-[320px]"
            >
              {contextType === 'CAB_GROUP' ? (
                <Car className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">{contextTitle}</span>
            </Link>
          </div>
        </div>

        {/* Action Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Chat options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-fadeIn">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsSafetyModalOpen(true);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
              >
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Report or Block
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Offline Payment Disclaimer Banner */}
      <div className="bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 px-4 py-2 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 shrink-0">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          <strong>Notice:</strong> Thapar Connect does not process in-app payments. Always settle payments offline in person.
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#20251F] border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-[#20251F]/50">
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1">Say hello to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 text-sm shadow-xs break-words ${
                    isMe
                      ? 'bg-[#20251F] text-[#F6F7F5] rounded-br-xs'
                      : 'bg-[#E6E9E3] text-[#20251F] rounded-bl-xs border border-[#B7BEB2]/40'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] text-[#20251F]/50">
                    {timeStr}
                  </span>
                  {isMe && (
                    <span className="text-[#A3D65C]">
                      {msg.isRead ? (
                        <CheckCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-[#20251F]/40" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar or Blocked Notice */}
      <div className="p-3 border-t border-[#B7BEB2]/50 bg-white shrink-0">
        {localBlocked ? (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center text-xs text-red-700 font-medium flex items-center justify-center gap-2">
            <Ban className="w-4 h-4 shrink-0" />
            <span>Messaging is disabled because this user is blocked.</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Press Enter to send)"
                  rows={1}
                  maxLength={2000}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F6F7F5] border border-[#B7BEB2]/60 rounded-2xl focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] outline-none text-[#20251F] placeholder-[#20251F]/50 resize-none max-h-32 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isCharLimitExceeded || isSending}
                className="p-2.5 bg-[#A3D65C] hover:bg-[#92c949] disabled:opacity-40 text-[#20251F] font-semibold rounded-full transition-colors shrink-0 shadow-xs"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Character Counter */}
            <div className="flex justify-end px-2">
              <span
                className={`text-[11px] font-medium ${
                  isCharLimitExceeded
                    ? 'text-red-600 dark:text-red-400 font-bold'
                    : isCharWarning
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {charCount} / 2000
              </span>
            </div>
          </form>
        )}
      </div>

      {/* Safety Modal */}
      <BlockReportModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        targetUserId={otherParticipant.id}
        targetUserName={otherParticipant.name}
        isBlocked={localBlocked}
        onBlockStatusChanged={(blocked) => {
          setLocalBlocked(blocked);
          if (onBlockChanged) onBlockChanged(blocked);
        }}
      />
    </div>
  );
};
