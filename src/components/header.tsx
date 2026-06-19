'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/store/useUIStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Sun, Moon, Database, CloudOff, Cloud, Menu } from 'lucide-react';
import { Button } from './ui/button';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 md:px-6 text-foreground">
      {/* Menu Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="h-9 w-9 md:hidden hover:bg-muted shrink-0 cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden sm:flex items-center gap-1.5 text-sm font-medium">
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Portal</span>
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className="text-muted-foreground font-normal">/</span>
              <span className={idx === crumbs.length - 1 ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground transition-colors'}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Action panel */}
      <div className="flex items-center gap-4">
        {/* DB Connection Badge */}
        <div 
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            supabaseConnected
              ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
              : 'bg-amber-500/5 text-amber-500 border-amber-500/20'
          }`}
          title={supabaseConnected ? 'Supabase Syncing Enabled' : 'No Supabase Configuration Found. Saved to LocalStorage.'}
        >
          {supabaseConnected ? (
            <>
              <Cloud className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Supabase Active</span>
            </>
          ) : (
            <>
              <CloudOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Local fallback</span>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          className="h-9 w-9 rounded-lg hover:bg-muted"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
        </Button>
      </div>
    </header>
  );
};
