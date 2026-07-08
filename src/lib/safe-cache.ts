const isBrowser = () => typeof window !== 'undefined';

export interface CacheWrapper<T> {
  data: T;
  lastSyncedAt: string | null;
  cacheVersion: number;
}

export function safeReadCache<T>(key: string, fallback: T): CacheWrapper<T> {
  if (!isBrowser()) {
    return { data: fallback, lastSyncedAt: null, cacheVersion: 1 };
  }

  try {
    const raw = localStorage.getItem(`qa_entity_${key}`);
    if (!raw) {
      return { data: fallback, lastSyncedAt: null, cacheVersion: 1 };
    }

    const parsed = JSON.parse(raw) as CacheWrapper<T>;
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return parsed;
    }
    return { data: fallback, lastSyncedAt: null, cacheVersion: 1 };
  } catch (e) {
    console.error(`Failed to read cache for ${key}:`, e);
    return { data: fallback, lastSyncedAt: null, cacheVersion: 1 };
  }
}

export function safeWriteCache<T>(key: string, data: T): boolean {
  if (!isBrowser()) return false;

  try {
    if (data === undefined || data === null) {
      return false;
    }

    const storageKey = `qa_entity_${key}`;
    const payload: CacheWrapper<T> = {
      data,
      lastSyncedAt: new Date().toISOString(),
      cacheVersion: 1
    };

    localStorage.setItem(storageKey, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error(`Failed to write cache for ${key}:`, e);
    return false;
  }
}

export function backupCache(key: string): void {
  if (!isBrowser()) return;
  const storageKey = `qa_entity_${key}`;
  const existing = localStorage.getItem(storageKey);
  if (existing) {
    localStorage.setItem(`backup_${storageKey}`, existing);
  }
}

export function restoreCache(key: string): boolean {
  if (!isBrowser()) return false;

  try {
    const storageKey = `qa_entity_${key}`;
    const backup = localStorage.getItem(`backup_${storageKey}`);
    if (backup) {
      localStorage.setItem(storageKey, backup);
      return true;
    }
    return false;
  } catch (e) {
    console.error(`Failed to restore cache for ${key}:`, e);
    return false;
  }
}

export function clearCache(key: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(`qa_entity_${key}`);
  localStorage.removeItem(`backup_qa_entity_${key}`);
}

export function exportAllData(): string {
  if (!isBrowser()) return '{}';

  const exportObj: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('qa_') || key.startsWith('backup_qa_'))) {
      const val = localStorage.getItem(key);
      if (val) {
        exportObj[key] = val;
      }
    }
  }
  return JSON.stringify(exportObj, null, 2);
}

export function importAllData(jsonStr: string): boolean {
  if (!isBrowser()) return false;

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, string>;
    if (!parsed || typeof parsed !== 'object') {
      return false;
    }

    // Backup all existing matching keys first
    const backupKeys: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('qa_') || key.startsWith('backup_qa_'))) {
        const val = localStorage.getItem(key);
        if (val) {
          backupKeys[`import_backup_${key}`] = val;
        }
      }
    }

    // Save import backups
    Object.entries(backupKeys).forEach(([k, v]) => {
      localStorage.setItem(k, v);
    });

    // Apply the imported keys
    Object.entries(parsed).forEach(([k, v]) => {
      if (k.startsWith('qa_') || k.startsWith('backup_qa_')) {
        localStorage.setItem(k, v);
      }
    });

    return true;
  } catch (e) {
    console.error('Failed to import backup data:', e);
    return false;
  }
}
