import * as SQLite from "expo-sqlite";
import { Trip, Plan, User, Feedback } from "../../types/Types";

class SQLiteService {
  private db: SQLite.SQLiteDatabase | null = null;

  // Initialize the database
  async initDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync("trekteria.db");

      await this.createTables();

      console.log("SQLite database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  // Create all necessary tables
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Users table - matches your Supabase schema
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        lastname TEXT,
        "emailVerified" INTEGER,
        firstname TEXT,
        email TEXT,
        "ecoPoints" REAL,
        "updatedAt" TEXT
      );
    `);

    // Plans table - matches your Supabase schema
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS plans (
        plan_id TEXT PRIMARY KEY,
        "createdAt" TEXT,
        "imageUrl" TEXT,
        preferences TEXT,
        summary TEXT,
        "userId" TEXT,
        "tripIds" TEXT,
        "totalGroupSize" REAL,
        "updatedAt" TEXT
      );
    `);

    // Trips table - matches your Supabase schema
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS trips (
        trip_id TEXT PRIMARY KEY,
        "createdAt" TEXT,
        "updatedAt" TEXT,
        "planId" TEXT,
        bookmarked INTEGER,
        "userId" TEXT,
        name TEXT,
        location TEXT,
        coordinates TEXT,
        address TEXT,
        description TEXT,
        "imageUrl" TEXT,
        "dateRange" TEXT,
        "groupSize" REAL,
        "difficultyLevel" TEXT,
        amenities TEXT,
        highlights TEXT,
        "parkWebsite" TEXT,
        "cellService" TEXT,
        "parkContact" TEXT,
        schedule TEXT,
        "packingChecklist" TEXT,
        warnings TEXT,
        "thingsToKnow" TEXT,
        missions TEXT,
        "hasAccessibilityNeeds" INTEGER,
        "chatHistory" TEXT
      );
    `);

    // Feedback table - matches your Supabase schema
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS feedback (
        feedback_id TEXT PRIMARY KEY,
        "userId" TEXT,
        email TEXT,
        subject TEXT,
        message TEXT,
        category TEXT,
        "createdAt" TEXT,
        "updatedAt" TEXT
      );
    `);

    console.log("Database tables created successfully");
  }

  // User operations
  async saveUser(user: User): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const currentTime = new Date().toISOString();

    await this.db.runAsync(
      `INSERT OR REPLACE INTO users (
        user_id, lastname, "emailVerified", firstname, email, "ecoPoints", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.lastName || null,
        user.emailVerified ? 1 : 0,
        user.firstName || null,
        user.email,
        user.ecoPoints || null,
        currentTime, // Always update timestamp
      ]
    );
  }

  async getUser(id: string): Promise<User | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<User>(
      "SELECT * FROM users WHERE user_id = ?",
      [id]
    );
    return result || null;
  }

  async deleteUser(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync("DELETE FROM users WHERE user_id = ?", [id]);
  }

  // Plan operations
  async savePlan(plan: Plan): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const currentTime = new Date().toISOString();

    await this.db.runAsync(
      `INSERT OR REPLACE INTO plans (
        plan_id, "createdAt", "updatedAt", "imageUrl", preferences, summary, "userId", 
        "tripIds", "totalGroupSize"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan.id || this.generateId(),
        plan.createdAt,
        currentTime, // Always update timestamp
        plan.imageUrl || null,
        JSON.stringify(plan.preferences),
        plan.summary,
        plan.userId,
        JSON.stringify(plan.tripIds),
        plan.totalGroupSize || null,
      ]
    );
  }

  async getPlans(userId: string): Promise<Plan[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync<Plan>(
      'SELECT * FROM plans WHERE "userId" = ? ORDER BY "createdAt" DESC',
      [userId]
    );

    return result.map((plan) => this.parsePlanFromDB(plan));
  }

  async getPlan(id: string): Promise<Plan | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<Plan>(
      "SELECT * FROM plans WHERE plan_id = ?",
      [id]
    );

    if (!result) return null;

    // Use the same transformation logic as getPlans
    return this.parsePlanFromDB(result);
  }

  async deletePlan(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync("DELETE FROM plans WHERE plan_id = ?", [id]);
  }

  // Trip operations
  async saveTrip(trip: Trip): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const currentTime = new Date().toISOString();

    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO trips (
          trip_id, "createdAt", "updatedAt", "planId", bookmarked, "userId", name, location,
          coordinates, address, description, "imageUrl", "dateRange", "groupSize", "difficultyLevel",
          amenities, highlights, "parkWebsite", "cellService", "parkContact", schedule,
          "packingChecklist", warnings, "thingsToKnow", missions, "hasAccessibilityNeeds", "chatHistory"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trip.id || this.generateId(),
          trip.createdAt,
          currentTime, // Always update timestamp
          trip.planId,
          trip.bookmarked ? 1 : 0,
          trip.userId,
          trip.name,
          trip.location,
          trip.coordinates ? JSON.stringify(trip.coordinates) : null,
          trip.address || null,
          trip.description || null,
          trip.imageUrl || null,
          trip.dateRange ? JSON.stringify(trip.dateRange) : null,
          trip.groupSize || null,
          trip.difficultyLevel || null,
          trip.amenities ? JSON.stringify(trip.amenities) : null,
          trip.highlights ? JSON.stringify(trip.highlights) : null,
          trip.parkWebsite || null,
          trip.cellService || null,
          trip.parkContact || null,
          JSON.stringify(trip.schedule),
          JSON.stringify(trip.packingChecklist),
          trip.warnings ? JSON.stringify(trip.warnings) : null,
          trip.thingsToKnow ? JSON.stringify(trip.thingsToKnow) : null,
          JSON.stringify(trip.missions),
          trip.hasAccessibilityNeeds ? 1 : 0,
          trip.chatHistory ? JSON.stringify(trip.chatHistory) : null,
        ]
      );
    } catch (error) {
      console.error("Error saving trip to SQLite:", error);
      throw error;
    }
  }

  async getTrips(userId: string): Promise<Trip[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync<Trip>(
      'SELECT * FROM trips WHERE "userId" = ? ORDER BY "createdAt" DESC',
      [userId]
    );

    return result.map((trip) => this.parseTripFromDB(trip));
  }

  async getBookmarkedTrips(userId: string): Promise<Trip[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync<Trip>(
      'SELECT * FROM trips WHERE "userId" = ? AND bookmarked = 1 ORDER BY "createdAt" DESC',
      [userId]
    );

    return result.map((trip) => this.parseTripFromDB(trip));
  }

  async getTrip(id: string): Promise<Trip | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<Trip>(
      "SELECT * FROM trips WHERE trip_id = ?",
      [id]
    );

    if (!result) return null;

    return this.parseTripFromDB(result);
  }

  async getTripsByPlan(planId: string): Promise<Trip[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync<Trip>(
      'SELECT * FROM trips WHERE "planId" = ? ORDER BY "createdAt" ASC',
      [planId]
    );

    return result.map((trip) => this.parseTripFromDB(trip));
  }

  async updateTripBookmark(tripId: string, bookmarked: boolean): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      "UPDATE trips SET bookmarked = ? WHERE trip_id = ?",
      [bookmarked ? 1 : 0, tripId]
    );
  }

  async deleteTrip(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync("DELETE FROM trips WHERE trip_id = ?", [id]);
  }

  // Feedback operations
  async saveFeedback(feedback: Feedback): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const currentTime = new Date().toISOString();

    await this.db.runAsync(
      `INSERT OR REPLACE INTO feedback (
        feedback_id, "userId", email, subject, message, category, "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        feedback.id || this.generateId(),
        feedback.userId,
        feedback.email || null,
        feedback.subject || null,
        feedback.message || null,
        feedback.category || null,
        feedback.createdAt,
        currentTime, // Always update timestamp
      ]
    );
  }

  async getFeedback(userId: string): Promise<Feedback[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync<any>(
      'SELECT * FROM feedback WHERE "userId" = ? ORDER BY "createdAt" DESC',
      [userId]
    );

    return result.map((feedback) => this.parseFeedbackFromDB(feedback));
  }

  async getFeedbackById(id: string): Promise<Feedback | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<any>(
      "SELECT * FROM feedback WHERE feedback_id = ?",
      [id]
    );

    if (!result) return null;
    return this.parseFeedbackFromDB(result);
  }

  async deleteFeedback(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync("DELETE FROM feedback WHERE feedback_id = ?", [id]);
  }

  // Utility methods
  private parsePlanFromDB(dbPlan: any): Plan {
    return {
      id: dbPlan.plan_id,
      userId: dbPlan.userId,
      preferences: JSON.parse(dbPlan.preferences as any),
      tripIds: JSON.parse((dbPlan as any).tripIds),
      updatedAt: dbPlan.updatedAt || new Date().toISOString(),
      createdAt: dbPlan.createdAt || new Date().toISOString(),
      imageUrl: dbPlan.imageUrl,
      summary: dbPlan.summary,
      totalGroupSize: dbPlan.totalGroupSize,
    };
  }

  private parseTripFromDB(dbTrip: any): Trip {
    return {
      id: dbTrip.trip_id,
      userId: dbTrip.userId,
      planId: dbTrip.planId,
      createdAt: dbTrip.createdAt,
      updatedAt: dbTrip.updatedAt,
      imageUrl: dbTrip.imageUrl,
      bookmarked: Boolean(dbTrip.bookmarked),
      name: dbTrip.name,
      location: dbTrip.location,
      coordinates: dbTrip.coordinates ? JSON.parse(dbTrip.coordinates) : null,
      address: dbTrip.address,
      description: dbTrip.description,
      dateRange: dbTrip.dateRange ? JSON.parse(dbTrip.dateRange) : undefined,
      groupSize: dbTrip.groupSize,
      difficultyLevel: dbTrip.difficultyLevel,
      amenities: dbTrip.amenities ? JSON.parse(dbTrip.amenities) : undefined,
      highlights: dbTrip.highlights ? JSON.parse(dbTrip.highlights) : undefined,
      parkWebsite: dbTrip.parkWebsite,
      cellService: dbTrip.cellService,
      parkContact: dbTrip.parkContact,
      schedule: dbTrip.schedule ? JSON.parse(dbTrip.schedule) : [],
      packingChecklist: dbTrip.packingChecklist
        ? JSON.parse(dbTrip.packingChecklist)
        : [],
      missions: dbTrip.missions ? JSON.parse(dbTrip.missions) : [],
      warnings: dbTrip.warnings ? JSON.parse(dbTrip.warnings) : undefined,
      thingsToKnow: dbTrip.thingsToKnow
        ? JSON.parse(dbTrip.thingsToKnow)
        : undefined,
      chatHistory: dbTrip.chatHistory
        ? JSON.parse(dbTrip.chatHistory)
        : undefined,
      hasAccessibilityNeeds: Boolean(dbTrip.hasAccessibilityNeeds),
    };
  }

  private parseFeedbackFromDB(dbFeedback: any): Feedback {
    return {
      id: dbFeedback.feedback_id,
      userId: dbFeedback.userId,
      email: dbFeedback.email,
      subject: dbFeedback.subject,
      message: dbFeedback.message,
      category: dbFeedback.category,
      createdAt: dbFeedback.createdAt,
      updatedAt: dbFeedback.updatedAt,
    };
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Clear all data (useful for testing or reset)
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.execAsync(`
      DELETE FROM feedback;
      DELETE FROM trips;
      DELETE FROM plans;
      DELETE FROM users;
    `);
  }

  // Get database statistics
  async getDatabaseStats(): Promise<{
    users: number;
    plans: number;
    trips: number;
    feedback: number;
  }> {
    if (!this.db) throw new Error("Database not initialized");

    const [users, plans, trips, feedback] = await Promise.all([
      this.db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM users"
      ),
      this.db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM plans"
      ),
      this.db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM trips"
      ),
      this.db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM feedback"
      ),
    ]);

    return {
      users: users?.count || 0,
      plans: plans?.count || 0,
      trips: trips?.count || 0,
      feedback: feedback?.count || 0,
    };
  }

  // Force recreate all tables (useful for debugging)
  async forceRecreateTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    console.log("Force recreating all tables...");

    try {
      // Drop existing tables
      await this.db.execAsync(`
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS plans;
        DROP TABLE IF EXISTS trips;
        DROP TABLE IF EXISTS feedback;
      `);

      console.log("Tables dropped successfully");

      // Recreate tables
      await this.createTables();

      console.log("Tables recreated successfully");
    } catch (error) {
      console.error("Error recreating tables:", error);
      throw error;
    }
  }

  // Close database connection
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  // Check if database is initialized
  isInitialized(): boolean {
    return this.db !== null;
  }

  // Timestamp comparison methods for last-to-win strategy
  async shouldUpdateUser(
    userId: string,
    cloudUpdatedAt: string
  ): Promise<boolean> {
    if (!this.db) throw new Error("Database not initialized");

    const localUser = await this.getUser(userId);
    if (!localUser || !localUser.updatedAt) return true;

    // If cloud timestamp is undefined, assume we should update
    if (!cloudUpdatedAt) return true;

    return new Date(cloudUpdatedAt) > new Date(localUser.updatedAt);
  }

  async shouldUpdatePlan(
    planId: string,
    cloudUpdatedAt: string
  ): Promise<boolean> {
    if (!this.db) throw new Error("Database not initialized");

    const localPlan = await this.getPlan(planId);
    if (!localPlan || !localPlan.updatedAt) return true;

    // If cloud timestamp is undefined, assume we should update
    if (!cloudUpdatedAt) return true;

    return new Date(cloudUpdatedAt) > new Date(localPlan.updatedAt);
  }

  async shouldUpdateTrip(
    tripId: string,
    cloudUpdatedAt: string
  ): Promise<boolean> {
    if (!this.db) throw new Error("Database not initialized");

    const localTrip = await this.getTrip(tripId);

    if (!localTrip || !localTrip.updatedAt) {
      return true;
    }

    // If cloud timestamp is undefined, assume we should update
    if (!cloudUpdatedAt) {
      return true;
    }

    return new Date(cloudUpdatedAt) > new Date(localTrip.updatedAt);
  }

  async shouldUpdateFeedback(
    feedbackId: string,
    cloudUpdatedAt: string
  ): Promise<boolean> {
    if (!this.db) throw new Error("Database not initialized");

    const localFeedback = await this.getFeedbackById(feedbackId);
    if (!localFeedback || !localFeedback.updatedAt) return true;

    // If cloud timestamp is undefined, assume we should update
    if (!cloudUpdatedAt) return true;

    return new Date(cloudUpdatedAt) > new Date(localFeedback.updatedAt);
  }

  // Test database connectivity and basic operations
  async testDatabase(): Promise<boolean> {
    if (!this.db) {
      console.error("Database not initialized");
      return false;
    }

    try {
      // Test basic query
      const result = await this.db.getFirstAsync<{ test: number }>(
        "SELECT 1 as test"
      );

      if (!result || result.test !== 1) {
        console.error("Basic query test failed");
        return false;
      }

      // Test table creation
      await this.db.execAsync(
        "CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY)"
      );

      // Test insert
      await this.db.runAsync("INSERT INTO test_table (id) VALUES (?)", [1]);

      // Test select
      const testResult = await this.db.getFirstAsync<{ id: number }>(
        "SELECT id FROM test_table WHERE id = ?",
        [1]
      );

      if (!testResult || testResult.id !== 1) {
        console.error("Test select failed");
        return false;
      }

      // Clean up test table
      await this.db.execAsync("DROP TABLE test_table");

      return true;
    } catch (error) {
      console.error("Database test failed:", error);
      return false;
    }
  }
}

// Export a singleton instance
export const sqliteService = new SQLiteService();
export default sqliteService;
