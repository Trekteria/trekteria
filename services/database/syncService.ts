import { sqliteService } from "./sqliteService";
import { supabase } from "../supabaseConfig";
import { Trip, Plan, User, Feedback } from "../../types/Types";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

class SyncService {
  private isOnline: boolean = true;
  private syncQueue: { type: string; data: any; timestamp: number }[] = [];
  private isSyncing: boolean = false;

  constructor() {
    // Listen to network status changes
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      this.setOnline(state.isConnected || false);
    });
  }

  private setOnline(status: boolean) {
    this.isOnline = status;
    if (status && this.syncQueue.length > 0) {
      this.processSyncQueue();
    }
  }

  // Save data with offline-first approach
  async saveData<T extends Trip | Plan | User | Feedback>(
    type: "trip" | "plan" | "user" | "feedback",
    data: T
  ): Promise<void> {
    try {
      // Always save to local SQLite first
      await this.saveToLocal(type, data);

      // If online, try to sync to Supabase
      if (this.isOnline) {
        try {
          await this.saveToSupabaseWithTimestampCheck(type, data);
        } catch (error) {
          console.warn(`Failed to sync ${type} to Supabase:`, error);
          // Add to sync queue for later
          this.addToSyncQueue(type, data);
        }
      } else {
        // Add to sync queue for when we come back online
        this.addToSyncQueue(type, data);
      }
    } catch (error) {
      console.error(`Failed to save ${type}:`, error);
      throw error;
    }
  }

  // Save to Supabase with timestamp comparison for last-to-win
  private async saveToSupabaseWithTimestampCheck<
    T extends Trip | Plan | User | Feedback
  >(type: "trip" | "plan" | "user" | "feedback", data: T): Promise<void> {
    try {
      // Get current timestamp from Supabase for comparison
      let cloudUpdatedAt: string | null = null;

      switch (type) {
        case "user":
          const { data: cloudUser } = await supabase
            .from("users")
            .select("updatedAt")
            .eq("user_id", (data as User).id)
            .single();
          cloudUpdatedAt = cloudUser?.updatedAt || null;
          break;

        case "plan":
          const { data: cloudPlan } = await supabase
            .from("plans")
            .select("updatedAt")
            .eq("plan_id", (data as Plan).id)
            .single();
          cloudUpdatedAt = cloudPlan?.updatedAt || null;
          break;

        case "trip":
          const { data: cloudTrip } = await supabase
            .from("trips")
            .select("updatedAt")
            .eq("trip_id", (data as Trip).id)
            .single();
          cloudUpdatedAt = cloudTrip?.updatedAt || null;
          break;

        case "feedback":
          const { data: cloudFeedback } = await supabase
            .from("feedback")
            .select("updatedAt")
            .eq("feedback_id", (data as Feedback).id)
            .single();
          cloudUpdatedAt = cloudFeedback?.updatedAt || null;
          break;
      }

      // If cloud data exists and is newer, don't overwrite
      if (cloudUpdatedAt && data.updatedAt) {
        const cloudTime = new Date(cloudUpdatedAt);
        const localTime = new Date(data.updatedAt);

        if (cloudTime > localTime) {
          console.log(`Skipping ${type} sync - cloud data is newer`);
          return;
        }
      }

      // Proceed with save to Supabase
      await this.saveToSupabase(type, data);
    } catch (error) {
      console.error(
        `Failed to save ${type} to Supabase with timestamp check:`,
        error
      );
      throw error;
    }
  }

  private async saveToLocal<T>(
    type: "trip" | "plan" | "user" | "feedback",
    data: T
  ): Promise<void> {
    switch (type) {
      case "trip":
        await sqliteService.saveTrip(data as Trip);
        break;
      case "plan":
        await sqliteService.savePlan(data as Plan);
        break;
      case "user":
        await sqliteService.saveUser(data as User);
        break;
      case "feedback":
        await sqliteService.saveFeedback(data as Feedback);
        break;
    }
  }

  private async saveToSupabase<T>(
    type: "trip" | "plan" | "user" | "feedback",
    data: T
  ): Promise<void> {
    switch (type) {
      case "trip":
        const tripData = this.convertTripToSupabase(data as Trip);
        const { error: tripError } = await supabase
          .from("trips")
          .upsert(tripData);
        if (tripError) throw tripError;
        break;

      case "plan":
        const planData = this.convertPlanToSupabase(data as Plan);
        const { error: planError } = await supabase
          .from("plans")
          .upsert(planData);
        if (planError) throw planError;
        break;

      case "user":
        const userData = this.convertUserToSupabase(data as User);
        const { error: userError } = await supabase
          .from("users")
          .upsert(userData);
        if (userError) throw userError;
        break;

      case "feedback":
        const feedbackData = this.convertFeedbackToSupabase(data as Feedback);
        const { error: feedbackError } = await supabase
          .from("feedback")
          .upsert(feedbackData);
        if (feedbackError) throw feedbackError;
        break;
    }
  }

  // Convert local data types to Supabase format
  private convertTripToSupabase(trip: Trip): any {
    return {
      trip_id: trip.id,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      planId: trip.planId,
      bookmarked: trip.bookmarked,
      userId: trip.userId,
      name: trip.name,
      location: trip.location,
      coordinates: trip.coordinates,
      address: trip.address,
      description: trip.description,
      imageUrl: trip.imageUrl,
      dateRange: trip.dateRange,
      groupSize: trip.groupSize,
      difficultyLevel: trip.difficultyLevel,
      amenities: trip.amenities,
      highlights: trip.highlights,
      parkWebsite: trip.parkWebsite,
      cellService: trip.cellService,
      parkContact: trip.parkContact,
      schedule: trip.schedule,
      packingChecklist: trip.packingChecklist,
      warnings: trip.warnings,
      thingsToKnow: trip.thingsToKnow,
      missions: trip.missions,
      hasAccessibilityNeeds: trip.hasAccessibilityNeeds,
      chatHistory: trip.chatHistory,
    };
  }

  private convertPlanToSupabase(plan: Plan): any {
    return {
      plan_id: plan.id,
      createdAt: plan.createdAt,
      imageUrl: plan.imageUrl,
      preferences: plan.preferences,
      summary: plan.summary,
      userId: plan.userId,
      tripIds: plan.tripIds,
      totalGroupSize: plan.totalGroupSize,
      updatedAt: plan.updatedAt,
    };
  }

  private convertUserToSupabase(user: User): any {
    return {
      user_id: user.id,
      lastname: user.lastName,
      emailVerified: user.emailVerified,
      firstname: user.firstName,
      email: user.email,
      ecoPoints: user.ecoPoints,
      updatedAt: user.updatedAt,
    };
  }

  private convertFeedbackToSupabase(feedback: Feedback): any {
    return {
      feedback_id: feedback.id,
      userId: feedback.userId,
      email: feedback.email,
      subject: feedback.subject,
      message: feedback.message,
      category: feedback.category,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    };
  }

  private addToSyncQueue<T>(
    type: "trip" | "plan" | "user" | "feedback",
    data: T
  ): void {
    this.syncQueue.push({
      type,
      data,
      timestamp: Date.now(),
    });

    // Store queue in AsyncStorage for persistence
    this.persistSyncQueue();
  }

  private async persistSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem("syncQueue", JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Failed to persist sync queue:", error);
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const queue = await AsyncStorage.getItem("syncQueue");
      if (queue) {
        this.syncQueue = JSON.parse(queue);
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
    }
  }

  // Process all pending sync operations
  async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    const queueToProcess = [...this.syncQueue];

    try {
      for (const item of queueToProcess) {
        try {
          await this.saveToSupabase(item.type as any, item.data);

          // Remove from queue after successful sync
          this.syncQueue = this.syncQueue.filter(
            (q) => q.timestamp !== item.timestamp
          );

          console.log(`Successfully synced ${item.type}`);
        } catch (error) {
          console.error(`Failed to sync ${item.type}:`, error);
          // Keep in queue for retry
        }
      }

      this.persistSyncQueue();
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync all local data to Supabase (useful for initial sync)
  async syncAllData(userId: string): Promise<void> {
    if (!this.isOnline) {
      throw new Error("Cannot sync while offline");
    }

    try {
      // Get all local data
      const [localTrips, localPlans, localUser, localFeedback] =
        await Promise.all([
          sqliteService.getTrips(userId),
          sqliteService.getPlans(userId),
          sqliteService.getUser(userId),
          sqliteService.getFeedback(userId),
        ]);

      // Sync each type with timestamp comparison
      if (localUser) {
        await this.saveToSupabaseWithTimestampCheck("user", localUser);
      }

      for (const plan of localPlans) {
        await this.saveToSupabaseWithTimestampCheck("plan", plan);
      }

      for (const trip of localTrips) {
        await this.saveToSupabaseWithTimestampCheck("trip", trip);
      }

      for (const feedback of localFeedback) {
        await this.saveToSupabaseWithTimestampCheck("feedback", feedback);
      }

      console.log("All data synced successfully with timestamp comparison");
    } catch (error) {
      console.error("Failed to sync all data:", error);
      throw error;
    }
  }

  private async retrySyncWithBackoff(item: any, maxRetries = 3) {
    let retryCount = 0;
    let delay = 1000; // Start with 1 second

    while (retryCount < maxRetries) {
      try {
        await this.saveToSupabase(item.type, item.data);
        return true;
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
    return false;
  }

  // Pull data from Supabase to local SQLite
  async pullData(userId: string): Promise<void> {
    if (!this.isOnline) {
      throw new Error("Cannot pull data while offline");
    }

    try {
      // Pull trips
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .eq("userId", userId);

      if (tripsError) throw tripsError;

      // Pull plans
      const { data: plans, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .eq("userId", userId);

      if (plansError) throw plansError;

      // Pull user
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (userError && userError.code !== "PGRST116") throw userError; // PGRST116 = no rows returned

      // Pull feedback
      const { data: feedback, error: feedbackError } = await supabase
        .from("feedback")
        .select("*")
        .eq("userId", userId);

      if (feedbackError) throw feedbackError;

      // Save to local SQLite with timestamp comparison
      if (user) {
        const shouldUpdate = await sqliteService.shouldUpdateUser(
          user.user_id,
          user.updatedAt
        );
        if (shouldUpdate) {
          await sqliteService.saveUser(this.convertSupabaseUserToLocal(user));
        }
      }

      for (const plan of plans || []) {
        const shouldUpdate = await sqliteService.shouldUpdatePlan(
          plan.plan_id,
          plan.updatedAt
        );
        if (shouldUpdate) {
          await sqliteService.savePlan(this.convertSupabasePlanToLocal(plan));
        }
      }

      for (const trip of trips || []) {
        const shouldUpdate = await sqliteService.shouldUpdateTrip(
          trip.trip_id,
          trip.updatedAt
        );
        if (shouldUpdate) {
          await sqliteService.saveTrip(this.convertSupabaseTripToLocal(trip));
        }
      }

      for (const fb of feedback || []) {
        const shouldUpdate = await sqliteService.shouldUpdateFeedback(
          fb.feedback_id,
          fb.updatedAt
        );
        if (shouldUpdate) {
          await sqliteService.saveFeedback(
            this.convertSupabaseFeedbackToLocal(fb)
          );
        }
      }

      console.log(
        "Data pulled successfully from Supabase with timestamp comparison"
      );
    } catch (error) {
      console.error("Failed to pull data:", error);
      throw error;
    }
  }

  // Convert Supabase data to local format
  private convertSupabaseUserToLocal(supabaseUser: any): User {
    return {
      id: supabaseUser.user_id,
      email: supabaseUser.email,
      lastName: supabaseUser.lastname,
      firstName: supabaseUser.firstname,
      emailVerified: supabaseUser.emailVerified,
      ecoPoints: supabaseUser.ecoPoints,
      updatedAt: supabaseUser.updatedAt,
    };
  }

  private convertSupabasePlanToLocal(supabasePlan: any): Plan {
    return {
      id: supabasePlan.plan_id,
      userId: supabasePlan.userId,
      createdAt: supabasePlan.createdAt,
      updatedAt: supabasePlan.updatedAt,
      imageUrl: supabasePlan.imageUrl,
      totalGroupSize: supabasePlan.totalGroupSize,
      preferences: supabasePlan.preferences,
      summary: supabasePlan.summary,
      tripIds: supabasePlan.tripIds,
    };
  }

  private convertSupabaseTripToLocal(supabaseTrip: any): Trip {
    return {
      id: supabaseTrip.trip_id,
      userId: supabaseTrip.userId,
      planId: supabaseTrip.planId,
      createdAt: supabaseTrip.createdAt,
      updatedAt: supabaseTrip.updatedAt,
      imageUrl: supabaseTrip.imageUrl,
      bookmarked: supabaseTrip.bookmarked,
      name: supabaseTrip.name,
      location: supabaseTrip.location,
      coordinates: supabaseTrip.coordinates,
      address: supabaseTrip.address,
      description: supabaseTrip.description,
      dateRange: supabaseTrip.dateRange,
      groupSize: supabaseTrip.groupSize,
      difficultyLevel: supabaseTrip.difficultyLevel,
      amenities: supabaseTrip.amenities,
      highlights: supabaseTrip.highlights,
      parkWebsite: supabaseTrip.parkWebsite,
      cellService: supabaseTrip.cellService,
      parkContact: supabaseTrip.parkContact,
      schedule: supabaseTrip.schedule,
      packingChecklist: supabaseTrip.packingChecklist,
      missions: supabaseTrip.missions,
      warnings: supabaseTrip.warnings,
      thingsToKnow: supabaseTrip.thingsToKnow,
      chatHistory: supabaseTrip.chatHistory,
      hasAccessibilityNeeds: supabaseTrip.hasAccessibilityNeeds,
    };
  }

  private convertSupabaseFeedbackToLocal(supabaseFeedback: any): Feedback {
    return {
      id: supabaseFeedback.feedback_id,
      userId: supabaseFeedback.userId,
      email: supabaseFeedback.email,
      subject: supabaseFeedback.subject,
      message: supabaseFeedback.message,
      createdAt: supabaseFeedback.createdAt,
      updatedAt: supabaseFeedback.updatedAt,
      category: supabaseFeedback.category,
    };
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingSyncs: this.syncQueue.length,
      lastSyncAttempt:
        this.syncQueue.length > 0
          ? new Date(Math.max(...this.syncQueue.map((q) => q.timestamp)))
          : null,
    };
  }

  // Manual sync trigger
  async manualSync(): Promise<void> {
    if (this.isOnline) {
      await this.processSyncQueue();
    } else {
      throw new Error("Cannot sync while offline");
    }
  }

  // Get sync queue for debugging
  getSyncQueue() {
    return [...this.syncQueue];
  }

  // Clear sync queue (useful for testing)
  clearSyncQueue(): void {
    this.syncQueue = [];
    this.persistSyncQueue();
  }
}

export const syncService = new SyncService();
export default syncService;
