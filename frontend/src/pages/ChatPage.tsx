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
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-thapar-700 dark:text-thapar-400" />
                Messages
              </h1>
              <span className="text-xs px-2 py-0.5 font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                {conversations.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats or items..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-thapar-700 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            {/* Context Filters */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTabFilter('ALL')}
                className={`flex-1 py-1 px-2 text-xs font-semibold rounded-lg transition-colors ${
                  activeTabFilter === 'ALL'
                    ? 'bg-thapar-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTabFilter('CAB_GROUP')}
                className={`flex-1 py-1 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  activeTabFilter === 'CAB_GROUP'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Car className="w-3 h-3" />
                Cabs
              </button>
              <button
                onClick={() => setActiveTabFilter('LISTING')}
                className={`flex-1 py-1 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  activeTabFilter === 'LISTING'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-thapar-700 border-t-transparent" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400 dark:text-slate-500">
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
          className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 ${
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="w-16 h-16 rounded-2xl bg-thapar-50 dark:bg-thapar-950/40 text-thapar-700 dark:text-thapar-400 flex items-center justify-center mb-4 border border-thapar-200/50 dark:border-thapar-900/50">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                Select a conversation
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                Choose a conversation from the sidebar to view ride details or coordinate marketplace sales.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Protected by Thapar Campus Community Guidelines</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
