'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Sun, Moon, CloudOff, Cloud, Menu, Bell, ChevronDown, ChevronLeft, MessageSquare, Bug, FileText } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Notification } from '@/lib/validators';


export const Header: React.FC = () => {
  const pathname = usePathname();
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const { currentUser } = useAuthStore();
  const [supabaseConnected, setSupabaseConnected] = React.useState(false);

  React.useEffect(() => {
    setSupabaseConnected(isSupabaseConfigured());
  }, []);

  // Generates simple breadcrumbs based on route
  const getBreadcrumbs = () => {
    if (pathname === '/') return ['Dashboard'];
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace('-', ' '));
  };

  const crumbs = getBreadcrumbs();

  const router = useRouter();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useDataStore();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userNotifications = React.useMemo(() => {
    if (!currentUser) return notifications.filter(n => n.user_id === null);
    return notifications.filter(n => n.user_id === null || n.user_id === currentUser.id);
  }, [notifications, currentUser]);

  const unreadCount = React.useMemo(() => {
    return userNotifications.filter(n => !n.is_read).length;
  }, [userNotifications]);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-white dark:bg-zinc-950 px-4 md:px-6 text-foreground select-none">
      {/* Left: Toggle & Breadcrumbs & Search */}
      <div className="flex items-center gap-4 flex-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="h-9 w-9 md:hidden hover:bg-muted shrink-0 cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Back Button matching mockup */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => window.history.back()} 
          className="h-8 w-8 rounded-full border border-border flex items-center justify-center cursor-pointer hover:bg-muted text-foreground shrink-0"
          title="Go Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground shrink-0">
          <span className="hover:text-foreground cursor-pointer transition-colors">Portal</span>
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className="text-gray-300 font-normal">/</span>
              <span className={idx === crumbs.length - 1 ? 'text-foreground font-bold text-sm tracking-normal capitalize' : 'hover:text-foreground transition-colors normal-case'}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right: Actions (DB Status, Limit Count, Notifications, Profile, Theme) */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        
        {/* DB Connection Badge */}
        <div 
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            supabaseConnected
              ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10'
              : 'bg-amber-500/5 text-amber-500 border-amber-500/10'
          }`}
          title={supabaseConnected ? 'Supabase Syncing Enabled' : 'No Supabase Configuration Found. Saved to LocalStorage.'}
        >
          {supabaseConnected ? (
            <>
              <Cloud className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Supabase Active</span>
            </>
          ) : (
            <>
              <CloudOff className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Local fallback</span>
            </>
          )}
        </div>

        {/* Mock Limit/Credit Indicator (exactly like image) */}
        <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center font-bold text-xs text-foreground select-none shrink-0" title="Portal usage credit">
          1
        </div>

        {/* Notification Bell (exactly like image) */}
        <div className="relative shrink-0" ref={notificationsRef}>
          <div 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 hover:bg-secondary rounded-full text-foreground cursor-pointer transition-all"
            title="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-white dark:bg-zinc-950 p-2 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                <span className="text-xs font-bold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={async () => {
                      await markAllNotificationsAsRead(currentUser?.id || null);
                    }}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto py-1 divide-y divide-border/40">
                {userNotifications.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  userNotifications.map((notif) => {
                    // Choose icon based on type
                    let IconComponent = Bell;
                    let iconBg = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
                    if (notif.type === 'feedback') {
                      IconComponent = MessageSquare;
                      iconBg = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
                    } else if (notif.type === 'exploratory') {
                      IconComponent = Bug;
                      iconBg = 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
                    } else if (notif.type === 'report') {
                      IconComponent = FileText;
                      iconBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
                    }

                    // Format timestamp
                    const date = new Date(notif.created_at);
                    const diffMs = Date.now() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMins / 60);
                    const diffDays = Math.floor(diffHours / 24);
                    let relativeTime = 'Just now';
                    if (diffDays > 0) {
                      relativeTime = `${diffDays}d ago`;
                    } else if (diffHours > 0) {
                      relativeTime = `${diffHours}h ago`;
                    } else if (diffMins > 0) {
                      relativeTime = `${diffMins}m ago`;
                    }

                    return (
                      <div 
                        key={notif.id}
                        onClick={async () => {
                          await markNotificationAsRead(notif.id);
                          setIsNotificationsOpen(false);
                          router.push(notif.link);
                        }}
                        className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
                          !notif.is_read ? 'bg-zinc-50/50 dark:bg-zinc-900/30 font-semibold' : ''
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${iconBg}`}>
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-foreground truncate">{notif.title}</p>
                            <span className="text-[9px] text-muted-foreground font-normal ml-2 shrink-0">{relativeTime}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 font-normal leading-normal">
                            {notif.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          className="h-9 w-9 rounded-full hover:bg-secondary"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="h-4.5 w-4.5 text-muted-foreground" /> : <Sun className="h-4.5 w-4.5 text-amber-400" />}
        </Button>

        {/* User Profile Avatar (simplified: name text removed, wrapped in link to /profile) */}
        <Link href="/profile" className="flex items-center gap-1 cursor-pointer hover:opacity-90 select-none shrink-0" title={currentUser ? currentUser.name : 'Guest User'}>
          <Avatar user={currentUser} className="h-8.5 w-8.5 text-white font-black text-sm bg-[#00E575]" />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </div>
    </header>
  );
};
