import { useState, useEffect, useCallback } from "react";
import { sqliteService } from "../services/database/sqliteService";
import { Trip, Plan, User, Feedback } from "../types/Types";

export const useSQLite = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize database on mount
  useEffect(() => {
    const initDB = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await sqliteService.initDatabase();
        setIsInitialized(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize database"
        );
        console.error("Database initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initDB();
  }, []);

  // User operations
  const saveUser = useCallback(async (user: User) => {
    try {
      setError(null);
      await sqliteService.saveUser(user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save user";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getUser = useCallback(async (id: string): Promise<User | null> => {
    try {
      setError(null);
      return await sqliteService.getUser(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get user";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    try {
      setError(null);
      await sqliteService.deleteUser(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete user";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Plan operations
  const savePlan = useCallback(async (plan: Plan) => {
    try {
      setError(null);
      await sqliteService.savePlan(plan);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save plan";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getPlans = useCallback(async (userId: string): Promise<Plan[]> => {
    try {
      setError(null);
      return await sqliteService.getPlans(userId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get plans";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getPlan = useCallback(async (id: string): Promise<Plan | null> => {
    try {
      setError(null);
      return await sqliteService.getPlan(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get plan";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deletePlan = useCallback(async (id: string) => {
    try {
      setError(null);
      await sqliteService.deletePlan(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete plan";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Trip operations
  const saveTrip = useCallback(async (trip: Trip) => {
    try {
      setError(null);
      await sqliteService.saveTrip(trip);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save trip";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getTrips = useCallback(async (userId: string): Promise<Trip[]> => {
    try {
      setError(null);
      return await sqliteService.getTrips(userId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get trips";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getBookmarkedTrips = useCallback(
    async (userId: string): Promise<Trip[]> => {
      try {
        setError(null);
        return await sqliteService.getBookmarkedTrips(userId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get bookmarked trips";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const getTrip = useCallback(async (id: string): Promise<Trip | null> => {
    try {
      setError(null);
      return await sqliteService.getTrip(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get trip";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getTripsByPlan = useCallback(
    async (planId: string): Promise<Trip[]> => {
      try {
        setError(null);
        return await sqliteService.getTripsByPlan(planId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get trips by plan";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const updateTripBookmark = useCallback(
    async (tripId: string, bookmarked: boolean) => {
      try {
        setError(null);
        await sqliteService.updateTripBookmark(tripId, bookmarked);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update trip bookmark";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const deleteTrip = useCallback(async (id: string) => {
    try {
      setError(null);
      await sqliteService.deleteTrip(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete trip";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Feedback operations
  const saveFeedback = useCallback(async (feedback: Feedback) => {
    try {
      setError(null);
      await sqliteService.saveFeedback(feedback);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save feedback";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getFeedback = useCallback(
    async (userId: string): Promise<Feedback[]> => {
      try {
        setError(null);
        return await sqliteService.getFeedback(userId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get feedback";
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const deleteFeedback = useCallback(async (id: string) => {
    try {
      setError(null);
      await sqliteService.deleteFeedback(id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete feedback";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Utility operations
  const clearAllData = useCallback(async () => {
    try {
      setError(null);
      await sqliteService.clearAllData();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear data";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getDatabaseStats = useCallback(async () => {
    try {
      setError(null);
      return await sqliteService.getDatabaseStats();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get database stats";
      setError(errorMessage);
      throw err;
    }
  }, []);

  const closeDatabase = useCallback(async () => {
    try {
      setError(null);
      await sqliteService.closeDatabase();
      setIsInitialized(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to close database";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    error,

    // User operations
    saveUser,
    getUser,
    deleteUser,

    // Plan operations
    savePlan,
    getPlans,
    getPlan,
    deletePlan,

    // Trip operations
    saveTrip,
    getTrips,
    getBookmarkedTrips,
    getTrip,
    getTripsByPlan,
    updateTripBookmark,
    deleteTrip,

    // Feedback operations
    saveFeedback,
    getFeedback,
    deleteFeedback,

    // Utility operations
    clearAllData,
    getDatabaseStats,
    closeDatabase,
    clearError,
  };
};
