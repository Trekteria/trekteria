import { useSQLite } from "./useSQLite";
import { useDataSync } from "./useDataSync";

export const useOfflineData = () => {
  const sqlite = useSQLite();
  const sync = useDataSync();

  return {
    // Database state
    isInitialized: sqlite.isInitialized,
    isLoading: sqlite.isLoading,
    error: sqlite.error || sync.error,

    // Sync state
    isSyncing: sync.isSyncing,
    lastSyncTime: sync.lastSyncTime,

    // Combined operations - these handle both local save and sync
    saveTrip: sync.saveData.bind(null, "trip"),
    savePlan: sync.saveData.bind(null, "plan"),
    saveUser: sync.saveData.bind(null, "user"),
    saveFeedback: sync.saveData.bind(null, "feedback"),

    // Local operations (when you only want local, no sync)
    saveTripLocal: sqlite.saveTrip,
    savePlanLocal: sqlite.savePlan,
    saveUserLocal: sqlite.saveUser,
    saveFeedbackLocal: sqlite.saveFeedback,

    // Read operations (always from local SQLite)
    getTrips: sqlite.getTrips,
    getTrip: sqlite.getTrip,
    getTripsByPlan: sqlite.getTripsByPlan,
    getPlans: sqlite.getPlans,
    getPlan: sqlite.getPlan,
    getUser: sqlite.getUser,
    getFeedback: sqlite.getFeedback,

    // Update operations
    updateTripBookmark: sqlite.updateTripBookmark,

    // Delete operations
    deleteTrip: sqlite.deleteTrip,
    deletePlan: sqlite.deletePlan,
    deleteUser: sqlite.deleteUser,
    deleteFeedback: sqlite.deleteFeedback,

    // Sync operations
    syncAllData: sync.syncAllData,
    pullData: sync.pullData,
    manualSync: sync.manualSync,
    getSyncStatus: sync.getSyncStatus,

    // Utility operations
    clearAllData: sqlite.clearAllData,
    getDatabaseStats: sqlite.getDatabaseStats,
    closeDatabase: sqlite.closeDatabase,
    clearError: () => {
      sqlite.clearError();
      sync.clearError();
    },

    // Debug operations
    getSyncQueue: sync.getSyncQueue,
    clearSyncQueue: sync.clearSyncQueue,
  };
};
