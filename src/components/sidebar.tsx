'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { useSyncStore } from '@/store/useSyncStore';
import { 
  LayoutDashboard, MessageSquare, Bug, Rocket, FolderHeart, 
  FileSpreadsheet, PlayCircle, FileText, BarChart3, Settings, 
  ChevronLeft, ChevronRight, UserCheck, LogOut, MessageCircle,
  Compass, ClipboardList, Video, Layers, Calendar, Briefcase, TestTube2
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from '@/components/ui/avatar';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { activeRole, currentUser, logout } = useAuthStore();
  const { rolePermissions } = useDataStore();
  const { sidebarOpen, toggleSidebar, addToast } = useUIStore();
  const { syncStatus, lastSyncedAt } = useSyncStore();

  const itemModuleMap: Record<string, string> = {
    'Dashboard': 'dashboard',
    'Projects (QA)': 'projects',
    'Project Status': 'project-status',
    'Calendar Hub': 'calendar',
    'Feedback': 'feedback',
    'User Feedback': 'feedback',
    'Issues': 'issues',
    'Releases': 'releases',
    'Release Notes': 'release-notes',
    'Test Suites': 'test-suites',
    'Test Cases': 'test-cases',
    'Test Runs': 'test-runs',
    'Automation Testing': 'test-runs',
    'Exploratory Testing': 'exploratory',
    'Smart Recorder': 'smart-recorder',
    'API Testing Hub': 'api-hub',
    'Reports': 'reports',
    'Implementation Reports': 'reports',
    'Analytics': 'analytics',
    'Settings': 'settings',
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { name: 'Projects (QA)', path: '/projects', icon: <FolderHeart className="h-4.5 w-4.5" /> },
    { name: 'Project Status', path: '/project-status', icon: <Briefcase className="h-4.5 w-4.5" /> },
    { name: 'Calendar Hub', path: '/calendar', icon: <Calendar className="h-4.5 w-4.5" /> },
    { name: 'Feedback', path: '/feedback', icon: <MessageSquare className="h-4.5 w-4.5" /> },
    { name: 'User Feedback', path: '/user-feedback', icon: <MessageCircle className="h-4.5 w-4.5" /> },
    { name: 'Issues', path: '/issues', icon: <Bug className="h-4.5 w-4.5" /> },
    { name: 'Releases', path: '/releases', icon: <Rocket className="h-4.5 w-4.5" /> },
    { name: 'Release Notes', path: '/release-notes', icon: <FileText className="h-4.5 w-4.5" /> },
    { name: 'Test Suites', path: '/test-suites', icon: <FolderHeart className="h-4.5 w-4.5" /> },
    { name: 'Test Cases', path: '/test-cases', icon: <FileSpreadsheet className="h-4.5 w-4.5" /> },
    { name: 'Test Runs', path: '/test-runs', icon: <PlayCircle className="h-4.5 w-4.5" /> },
    { name: 'Automation Testing', path: '/automation', icon: <TestTube2 className="h-4.5 w-4.5" /> },
    { name: 'Exploratory Testing', path: '/exploratory', icon: <Compass className="h-4.5 w-4.5" /> },
    { name: 'Smart Recorder', path: '/smart-recorder', icon: <Video className="h-4.5 w-4.5" /> },
    { name: 'API Testing Hub', path: '/api-hub', icon: <Layers className="h-4.5 w-4.5" /> },
    { name: 'Reports', path: '/reports', icon: <FileText className="h-4.5 w-4.5" /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 className="h-4.5 w-4.5" /> },
    { name: 'Implementation Reports', path: '/implementation-reports', icon: <ClipboardList className="h-4.5 w-4.5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="h-4.5 w-4.5" /> },
  ].filter((item) => {
    if (!currentUser) {
      return item.name === 'Calendar Hub' || item.name === 'Release Notes';
    }
    const currentPermissions = rolePermissions.find(rp => rp.role_name === activeRole);
    if (!currentPermissions) {
      if (activeRole === 'Admin') return true;
      if (activeRole === 'QA Engineer') return item.name !== 'Settings' && item.name !== 'Analytics';
      if (activeRole === 'Developer') {
        return item.name === 'Dashboard' || item.name === 'Feedback' || item.name === 'User Feedback' ||
               item.name === 'Issues' || item.name === 'Releases' || item.name === 'Release Notes' || item.name === 'API Testing Hub';
      }
      if (activeRole === 'PSE') {
        return item.name === 'Release Notes' || item.name === 'Calendar Hub' || item.name === 'Projects (QA)' || item.name === 'Project Status';
      }
      return item.name === 'Reports' || item.name === 'Analytics' || item.name === 'Feedback' || item.name === 'User Feedback' || item.name === 'Release Notes';
    }
    const allowed = currentPermissions.allowed_modules.split(',');
    const moduleKey = itemModuleMap[item.name];
    return allowed.includes(moduleKey);
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
          <img src="/logo.png" alt="MAPID QA" className="w-6 h-6 shrink-0 object-contain" />
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
              {sidebarOpen && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{item.name}</span>
                  {item.name === 'User Feedback' && (
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap ml-2">
                      Coming Soon
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sync Status Badge */}
      {sidebarOpen && (
        <div className="px-4 py-2 border-t border-border/40 bg-slate-50/50 dark:bg-zinc-900/10 flex items-center justify-between text-[9px] font-bold text-muted-foreground select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              syncStatus === 'synced' ? 'bg-emerald-500' :
              syncStatus === 'syncing' ? 'bg-primary animate-pulse' :
              syncStatus === 'sync_failed' ? 'bg-red-500' :
              'bg-zinc-400'
            }`} />
            <span className="truncate">
              {syncStatus === 'synced' ? 'Sync: Synced' :
               syncStatus === 'syncing' ? 'Sync: Syncing...' :
               syncStatus === 'sync_failed' ? 'Sync: Offline/Failed' :
               'Sync: Standby'}
            </span>
          </div>
          {lastSyncedAt && (
            <span className="shrink-0 opacity-75 text-[8px]">
              {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* User Info Footer */}
      <div className="border-t border-border p-3 bg-white dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <Link href="/profile" className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
            <Avatar user={currentUser} className="h-8 w-8 text-primary-foreground bg-primary shrink-0" fallbackChar={currentUser ? currentUser.name.charAt(0) : 'G'} />
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
          </Link>
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
