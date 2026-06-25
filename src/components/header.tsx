'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Sun, Moon, CloudOff, Cloud, Menu, Bell, ChevronDown, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';


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
        <div className="relative p-2 hover:bg-secondary rounded-full text-foreground cursor-pointer transition-all shrink-0">
          <Bell className="h-4.5 w-4.5" />
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
