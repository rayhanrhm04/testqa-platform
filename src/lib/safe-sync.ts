import { useSyncStore } from '@/store/useSyncStore';
import { safeWriteCache } from './safe-cache';

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Request Timeout (15s)'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function syncEntity<T>(
  entityName: string,
  fetchPromise: Promise<{ data: T[] | null; error: any }>,
  onSuccess: (data: T[]) => void
): Promise<void> {
  const syncStore = useSyncStore.getState();
  const startTime = Date.now();

  try {
    syncStore.addLog(entityName, 'Starting background sync...');
    
    const response = await withTimeout(fetchPromise, 15000);
    
    if (response.error) {
      throw new Error(response.error.message || 'Database error');
    }

    const data = response.data;
    if (data === null || data === undefined) {
      throw new Error('Server returned null or invalid data');
    }

    const duration = Date.now() - startTime;
    syncStore.addLog(
      entityName,
      `Sync success. Count: ${data.length}. Duration: ${duration}ms`
    );

    // Update cache
    safeWriteCache(entityName, data);
    
    // Update local state
    onSuccess(data);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    syncStore.addLog(
      entityName,
      `Sync failed: ${err.message || err} (Duration: ${duration}ms). Retaining cache.`
    );
    throw err;
  }
}
