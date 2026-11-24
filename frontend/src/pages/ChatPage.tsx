import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Search, Car, ShoppingBag, ShieldCheck } from 'lucide-react';
import { chatService } from '@/services/chatService';
import { ConversationItem } from '@/components/chat/ConversationItem';
import { ChatThread } from '@/components/chat/ChatThread';
import { ConversationSummaryDto } from '@/types';

export const ChatPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'CAB_GROUP' | 'LISTING'>('ALL');

  const selectedConvId = searchParams.get('conversationId');

  const fetchConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Filtered list
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Category filter
      if (activeTabFilter !== 'ALL' && c.contextType !== activeTabFilter) {
        return false;
      }
      // Text query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = c.otherParticipant?.name?.toLowerCase() || '';
      const title =
        c.context?.title?.toLowerCase() || c.contextTitle?.toLowerCase() || '';
      const lastMsg =
        typeof c.lastMessage === 'string'
          ? c.lastMessage.toLowerCase()
          : c.lastMessage?.content?.toLowerCase() || '';
      return name.includes(q) || title.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, activeTabFilter, searchQuery]);

  // Find active conversation object
  const activeConversation = useMemo(() => {
    if (!selectedConvId) return null;
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  const handleSelectConversation = (convId: string) => {
    setSearchParams({ conversationId: convId });
    // Optimistically clear unread count for UI responsiveness
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleBackToList = () => {
    setSearchParams({});
  };

  const handleBlockChanged = (isBlocked: boolean) => {
    if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, isBlocked, blockedByMe: isBlocked }
            : c
        )
      );
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] min-h-[500px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Search */}
          <div className="p-4 border-b border-[#B7BEB2]/50 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-[#20251F] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#20251F]" />
                Messages
              </h1>
              <span className="text-xs px-2.5 py-0.5 font-bold bg-[#E6E9E3] text-[#20251F] rounded-full border border-[#B7BEB2]/50">
                {conversations.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#20251F]/50 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats or items..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F7F5] border border-[#B7BEB2]/50 rounded-xl focus:border-[#20251F] focus:ring-1 focus:ring-[#A3D65C] outline-none text-[#20251F] placeholder-[#20251F]/50"
              />
            </div>

            {/* Context Filters */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveTabFilter('ALL')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors ${
                  activeTabFilter === 'ALL'
                    ? 'bg-[#20251F] text-[#F6F7F5] shadow-xs'
                    : 'bg-[#E6E9E3] text-[#20251F]/70 hover:bg-[#d8ded4] hover:text-[#20251F]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTabFilter('CAB_GROUP')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  activeTabFilter === 'CAB_GROUP'
                    ? 'bg-[#20251F] text-[#F6F7F5] shadow-xs'
                    : 'bg-[#E6E9E3] text-[#20251F]/70 hover:bg-[#d8ded4] hover:text-[#20251F]'
                }`}
              >
                <Car className="w-3 h-3" />
                Cabs
              </button>
              <button
                onClick={() => setActiveTabFilter('LISTING')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  activeTabFilter === 'LISTING'
                    ? 'bg-[#20251F] text-[#F6F7F5] shadow-xs'
                    : 'bg-[#E6E9E3] text-[#20251F]/70 hover:bg-[#d8ded4] hover:text-[#20251F]'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                Market
              </button>
            </div>
          </div>

          {/* Conversation Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#20251F] border-t-transparent" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-[#20251F]/50">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 stroke-1" />
                <p className="text-sm font-medium">No conversations found</p>
                <p className="text-xs mt-1">
                  {searchQuery ? 'Try another search term' : 'Join a cab pool or browse the marketplace to message peers.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === selectedConvId}
                  onClick={() => handleSelectConversation(conv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread or Empty State */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-white ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <ChatThread
              key={activeConversation.id}
              conversation={activeConversation}
              onBack={handleBackToList}
              onBlockChanged={handleBlockChanged}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#20251F]/60 bg-[#F6F7F5]/50">
              <div className="w-16 h-16 rounded-2xl bg-[#E6E9E3] text-[#20251F] flex items-center justify-center mb-4 border border-[#B7BEB2]/60 shadow-xs">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#20251F] mb-1">
                Select a conversation
              </h3>
              <p className="text-xs sm:text-sm text-[#20251F]/70 max-w-sm">
                Choose a conversation from the sidebar to view ride details or coordinate marketplace sales.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-[#20251F]/60">
                <ShieldCheck className="w-4 h-4 text-[#20251F]" />
                <span>Protected by Thapar Campus Community Guidelines</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
