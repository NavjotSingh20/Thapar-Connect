import React from 'react';
import { NavLink } from 'react-router-dom';
import { Car, ShoppingBag, MessageSquare, User } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TabItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const tabs: TabItem[] = [
  { name: 'Cabs', path: '/cabs', icon: Car },
  { name: 'Market', path: '/marketplace', icon: ShoppingBag },
  { name: 'Chat', path: '/chat', icon: MessageSquare },
  { name: 'Profile', path: '/profile', icon: User },
];

export const BottomNav: React.FC = () => {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 safe-area-bottom shadow-lg"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-150',
                  isActive
                    ? 'text-thapar-700 font-semibold dark:text-gold-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      'relative flex items-center justify-center rounded-full p-1 transition-colors',
                      isActive && 'bg-thapar-100 dark:bg-thapar-900/60'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isActive
                          ? 'text-thapar-700 dark:text-gold-400'
                          : 'text-slate-500 dark:text-slate-400'
                      )}
                    />
                    {tab.badge && tab.badge > 0 ? (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-thapar-700 px-1 text-[10px] font-bold text-white">
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-0.5 text-[11px] tracking-tight">{tab.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
