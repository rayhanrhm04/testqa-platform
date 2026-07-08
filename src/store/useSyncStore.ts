import { create } from 'zustand';

export type SyncStatusType = 'idle' | 'loading_cache' | 'syncing' | 'synced' | 'sync_failed';

interface SyncState {
  syncStatus: SyncStatusType;
  lastSyncedAt: string | null;
  debugMode: boolean;
  logs: string[];
  
  setSyncStatus: (status: SyncStatusType) => void;
  setLastSyncedAt: (time: string | null) => void;
  toggleDebugMode: () => void;
  addLog: (entity: string, message: string) => void;
  clearLogs: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  syncStatus: 'idle',
  lastSyncedAt: null,
  debugMode: false,
  logs: [],

  setSyncStatus: (syncStatus) => set({ syncStatus }),
  
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  
  toggleDebugMode: () => set((state) => {
    const next = !state.debugMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('qa_sync_debug_mode', String(next));
    }
    return { debugMode: next };
  }),

  addLog: (entity, message) => set((state) => {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${entity.toUpperCase()}] ${message}`;
    
    if (state.debugMode) {
      console.log(formatted);
    }
    
    // Keep max 100 logs
    const nextLogs = [formatted, ...state.logs].slice(0, 100);
    return { logs: nextLogs };
  }),

  clearLogs: () => set({ logs: [] })
}));

// Initialize debugMode from localStorage on startup if on client
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('qa_sync_debug_mode');
  if (stored === 'true') {
    useSyncStore.setState({ debugMode: true });
  }
}
