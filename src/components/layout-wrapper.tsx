'use client';

import * as React from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { ToastContainer } from '@/components/ui/toast';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert, FileText, BarChart3, Lock, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';

export const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  
  const fetchData = useDataStore((state) => state.fetchData);
  const isLoading = useDataStore((state) => state.isLoading);
  const { theme, setTheme, sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { currentUser, activeRole, isInitialized, initializeAuth } = useAuthStore();
  
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // 1. Sync Theme
    const savedTheme = localStorage.getItem('qa_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');

    // 2. Init Auth session
    initializeAuth();

    // 3. Fetch initial data from localstorage / Supabase
    fetchData();

    // 4. Close sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    setMounted(true);
  }, [fetchData, setTheme, initializeAuth, setSidebarOpen]);

  // Collapse sidebar by default when opening a shared release notes link
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (pathname === '/release-notes' && params.has('project')) {
        setSidebarOpen(false);
      }
    }
  }, [pathname, setSidebarOpen]);

  // Handle redirects - guest users are restricted to /calendar and /release-notes only.
  React.useEffect(() => {
    if (mounted && isInitialized) {
      if (!currentUser) {
        const isAllowedPage = pathname === '/calendar' || 
                              pathname === '/release-notes' || 
                              pathname === '/login' || 
                              pathname === '/register';
        if (!isAllowedPage) {
          router.push('/login');
        }
      }
    }
  }, [currentUser, isInitialized, pathname, router, mounted]);

  // 2. General Role-based Page Restriction check
  const isRestricted = React.useMemo(() => {
    if (!currentUser) return false;
    if (activeRole === 'Admin') return false;

    if (activeRole === 'QA Engineer') {
      return pathname === '/settings' || pathname === '/analytics';
    }

    if (activeRole === 'Developer') {
      const allowed = [
        '/',
        '/feedback',
        '/user-feedback',
        '/issues',
        '/releases',
        '/release-notes',
        '/api-hub',
        '/login',
        '/register'
      ];
      const isDirectlyAllowed = allowed.includes(pathname);
      const isPrefixAllowed = pathname.startsWith('/feedback/') ||
                              pathname.startsWith('/api-hub/') ||
                              pathname.startsWith('/releases/') ||
                              pathname.startsWith('/release-notes/');
      return !(isDirectlyAllowed || isPrefixAllowed);
    }

    if (activeRole === 'PSE') {
      const allowed = [
        '/release-notes',
        '/calendar',
        '/projects',
        '/project-status',
        '/login',
        '/register'
      ];
      const isDirectlyAllowed = allowed.includes(pathname);
      const isPrefixAllowed = pathname.startsWith('/projects/') ||
                              pathname.startsWith('/release-notes/');
      return !(isDirectlyAllowed || isPrefixAllowed);
    }

    if (activeRole === 'Reporter') {
      const allowed = [
        '/reports',
        '/analytics',
        '/feedback',
        '/user-feedback',
        '/release-notes',
        '/implementation-reports',
        '/login',
        '/register'
      ];
      const isDirectlyAllowed = allowed.includes(pathname);
      const isPrefixAllowed = pathname.startsWith('/feedback/') ||
                              pathname.startsWith('/implementation-reports/') ||
                              pathname.startsWith('/release-notes/');
      return !(isDirectlyAllowed || isPrefixAllowed);
    }

    return false;
  }, [currentUser, activeRole, pathname]);

  const getRoleRedirectPath = () => {
    if (activeRole === 'PSE') return '/project-status';
    if (activeRole === 'Reporter') return '/feedback';
    if (activeRole === 'Developer') return '/';
    return '/';
  };

  if (!mounted || !isInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">MAPID QA Loading...</span>
        </div>
      </div>
    );
  }

  const isAuthPage = pathname === '/login' || pathname === '/register';

  // 1. Render Auth Pages (Full Screen)
  if (isAuthPage) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground">
        {children}
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background text-foreground transition-all duration-300 relative`}>
      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-25 bg-[#09090b]/60 backdrop-blur-xs md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <Sidebar />
      <div 
        className={`flex flex-col min-h-screen transition-all duration-300 pl-0 ${
          sidebarOpen ? 'md:pl-64' : 'md:pl-16'
        }`}
      >
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-[70vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs font-semibold text-muted-foreground animate-pulse">Tunggu sebentar yaa...</span>
              </div>
            </div>
          ) : isRestricted ? (
            /* ACCESS RESTRICTED ERROR SCREEN */
            <div className="flex h-[70vh] flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="rounded-full bg-red-500/10 p-4 text-red-500 border border-red-500/20">
                <Lock className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-foreground">Akses Dibatasi (Access Restricted)</h2>
                <p className="text-sm text-muted-foreground">
                  Akun Anda saat ini memiliki peran <strong className="text-foreground">{activeRole}</strong>. Peran ini dibatasi untuk mengakses halaman ini.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Link href={getRoleRedirectPath()}>
                  <Button className="cursor-pointer font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                    Kembali ke Modul Anda
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};
