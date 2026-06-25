'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { 
  LayoutDashboard, MessageSquare, Bug, Rocket, FolderHeart, 
  FileSpreadsheet, PlayCircle, FileText, BarChart3, Settings, 
  ChevronLeft, ChevronRight, UserCheck, LogOut, MessageCircle
} from 'lucide-react';
import { Button } from './ui/button';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { activeRole, currentUser, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, addToast } = useUIStore();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { name: 'Feedback', path: '/feedback', icon: <MessageSquare className="h-4.5 w-4.5" /> },
    { name: 'User Feedback', path: '/user-feedback', icon: <MessageCircle className="h-4.5 w-4.5" /> },
    { name: 'Issues', path: '/issues', icon: <Bug className="h-4.5 w-4.5" /> },
    { name: 'Releases', path: '/releases', icon: <Rocket className="h-4.5 w-4.5" /> },
    { name: 'Test Suites', path: '/test-suites', icon: <FolderHeart className="h-4.5 w-4.5" /> },
    { name: 'Test Cases', path: '/test-cases', icon: <FileSpreadsheet className="h-4.5 w-4.5" /> },
    { name: 'Test Runs', path: '/test-runs', icon: <PlayCircle className="h-4.5 w-4.5" /> },
    { name: 'Reports', path: '/reports', icon: <FileText className="h-4.5 w-4.5" /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 className="h-4.5 w-4.5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="h-4.5 w-4.5" /> },
  ].filter((item) => {
    if (currentUser && activeRole === 'Reporter') {
      return item.name === 'Reports' || item.name === 'Analytics' || item.name === 'Feedback' || item.name === 'User Feedback';
    }
    return true;
  });

  return (
    <aside 
      className={`fixed top-0 left-0 bottom-0 z-30 flex flex-col border-r border-border bg-white dark:bg-zinc-950 text-foreground transition-all duration-300 ${
        sidebarOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full md:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border bg-white dark:bg-zinc-950">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 20L14 4L9 20H4Z" fill="#00D2FF" />
            <path d="M9 20L14 4L19 20H9Z" fill="#2979FF" />
            <path d="M14 4L24 20H19L14 4Z" fill="#00E575" />
          </svg>
          {sidebarOpen && (
            <span className="text-sm font-black uppercase tracking-wider text-foreground">
              MAPID QA
            </span>
          )}
        </Link>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded-full hover:bg-muted"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Guest Promo / Upgrade Card (Premium Blue Gradient Card) */}
      {sidebarOpen && !currentUser && (
        <div className="p-4 m-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-border text-foreground text-center relative overflow-hidden select-none">
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-foreground/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-center mb-2">
            <div className="h-8 w-8 rounded-lg bg-foreground/10 flex items-center justify-center">
              <UserCheck className="h-4.5 w-4.5 text-foreground" />
            </div>
          </div>
          <p className="text-[11px] font-bold tracking-wide">MAPID QA Portal</p>
          <p className="text-[9px] text-muted-foreground mt-1 mb-3.5 font-medium leading-relaxed">
            Get full access to run tests, write suites, and log developer bug reports.
          </p>
          <Link href="/login" className="block">
            <button className="w-full py-1.5 px-3 bg-primary hover:bg-primary-hover text-primary-foreground transition-colors text-[10px] font-black rounded-lg shadow-xs cursor-pointer uppercase tracking-wider">
              Sign In Now
            </button>
          </Link>
        </div>
      )}

      {/* Nav Menu */}
      <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-[#f0f2f5] dark:bg-zinc-800 text-foreground font-semibold' 
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info Footer */}
      <div className="border-t border-border p-3 bg-white dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-xs">
              {currentUser ? currentUser.name.charAt(0).toUpperCase() : 'G'}
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">
                  {currentUser ? currentUser.name : 'Guest Viewer'}
                </p>
                <p className="truncate text-[10px] text-muted-foreground font-medium">
                  {currentUser ? currentUser.email : 'Read-only access'}
                </p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            currentUser ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0 cursor-pointer"
                onClick={async () => {
                  await logout();
                  addToast('Logged out successfully!', 'info');
                }}
                title="Sign Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </Button>
            ) : (
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                  title="Sign In / Register"
                >
                  <UserCheck className="h-4.5 w-4.5" />
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </aside>
  );
};
