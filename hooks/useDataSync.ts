import { useState, useCallback } from "react";
import { syncService } from "../services/database/syncService";
import { Trip, Plan, User, Feedback } from "../types/Types";

export const useDataSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Save data with automatic sync
  const saveData = useCallback(
    async <T extends Trip | Plan | User | Feedback>(
      type: "trip" | "plan" | "user" | "feedback",
      data: T
    ): Promise<void> => {
      try {
        setError(null);
        await syncService.saveData(type, data);
        setLastSyncTime(new Date());
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save data";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Sync all local data to Supabase
  const syncAllData = useCallback(async (userId: string): Promise<void> => {
    try {
      setIsSyncing(true);
      setError(null);
      await syncService.syncAllData(userId);
      setLastSyncTime(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sync all data";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Pull data from Supabase to local SQLite
  const pullData = useCallback(async (userId: string): Promise<void> => {
    try {
      setIsSyncing(true);
      setError(null);
      await syncService.pullData(userId);
      setLastSyncTime(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to pull data";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Manual sync trigger
  const manualSync = useCallback(async (): Promise<void> => {
    try {
      setIsSyncing(true);
      setError(null);
      await syncService.manualSync();
      setLastSyncTime(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sync";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Get current sync status
  const getSyncStatus = useCallback(() => {
    return syncService.getSyncStatus();
  }, []);

  // Get sync queue for debugging
  const getSyncQueue = useCallback(() => {
    return syncService.getSyncQueue();
  }, []);

  // Clear sync queue (useful for testing)
  const clearSyncQueue = useCallback(() => {
    syncService.clearSyncQueue();
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isSyncing,
    lastSyncTime,
    error,

    // Actions
    saveData,
    syncAllData,
    pullData,
    manualSync,
    getSyncStatus,
    getSyncQueue,
    clearSyncQueue,
    clearError,
  };
};
