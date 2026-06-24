'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Sun, Moon, CloudOff, Cloud, Menu, Search, Bell, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';

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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/85 backdrop-blur-md px-4 md:px-6 text-foreground select-none">
      {/* Left: Toggle & Breadcrumbs & Search */}
      <div className="flex items-center gap-6 flex-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="h-9 w-9 md:hidden hover:bg-muted shrink-0 cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
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

        {/* Center Search input (Mock, styled exactly like image) */}
        <div className="hidden md:flex items-center gap-2 bg-secondary/80 focus-within:bg-secondary border border-transparent focus-within:border-primary/20 px-3.5 py-1.5 rounded-full w-60 lg:w-72 transition-all">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search here..." 
            className="bg-transparent text-xs text-foreground placeholder-muted-foreground outline-none w-full font-medium"
          />
        </div>
      </div>

      {/* Right: Actions (Language, Notifications, Profile, Theme) */}
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

        {/* Mock Language Selector (exactly like image) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-secondary/60 hover:bg-secondary rounded-full border border-border/30 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-all">
          <svg className="w-4 h-3 rounded-xs shadow-xs" viewBox="0 0 74 39" xmlns="http://www.w3.org/2000/svg">
            <rect width="74" height="39" fill="#B22234" />
            <path d="M0 3h74M0 9h74M0 15h74M0 21h74M0 27h74M0 33h74" stroke="#FFF" strokeWidth="3" />
            <rect width="30" height="21" fill="#3C3B6E" />
            <circle cx="5" cy="5" r="1.2" fill="#FFF" />
            <circle cx="15" cy="5" r="1.2" fill="#FFF" />
            <circle cx="25" cy="5" r="1.2" fill="#FFF" />
          </svg>
          <span className="text-foreground/80">Eng (US)</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </div>

        {/* Notification Bell (exactly like image) */}
        <div className="relative p-2 hover:bg-secondary rounded-full border border-transparent hover:border-border/35 text-amber-500 cursor-pointer transition-all">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-950 animate-pulse" />
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

        {/* User Profile Avatar (exactly like image) */}
        <div 
          className="h-8.5 w-8.5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-offset-2 ring-[#1a73e8]/20 cursor-pointer hover:opacity-95 transition-opacity"
          title={currentUser ? currentUser.name : 'Guest User'}
        >
          {currentUser ? currentUser.name.charAt(0).toUpperCase() : 'G'}
        </div>
      </div>
    </header>
  );
};
