import {
  init,
  track,
  identify,
  setUserId,
  flush,
  Identify,
} from "@amplitude/analytics-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Types for analytics events
interface UserProperties {
  email?: string;
  name?: string;
  userId?: string;
  hasCompletedOnboarding?: boolean;
  preferredTheme?: "light" | "dark" | "auto";
  experienceLevel?: string;
  campingPreference?: string;
  [key: string]: any;
}

interface EventProperties {
  [key: string]: any;
}

class AnalyticsService {
  private isInitialized = false;
  private amplitudeApiKey: string | null = null;

  constructor() {
    this.amplitudeApiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY || null;
  }

  /**
   * Initialize Amplitude analytics
   * Call this in your app's entry point
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("Analytics already initialized");
      return;
    }

    if (!this.amplitudeApiKey) {
      console.warn(
        "Amplitude API key not found. Analytics will not be tracked."
      );
      return;
    }

    try {
      await init(this.amplitudeApiKey, undefined, {
        flushIntervalMillis: 30000, // Flush every 30 seconds
        flushQueueSize: 30, // Flush when queue reaches 30 events
        minIdLength: 1, // Allow shorter IDs
      });

      this.isInitialized = true;
      console.log("Analytics initialized successfully");

      // Track app open
      this.trackEvent("app_opened", {
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to initialize analytics:", error);
    }
  }

  /**
   * Track a custom event
   */
  async trackEvent(
    eventName: string,
    properties?: EventProperties
  ): Promise<void> {
    if (!this.isInitialized) {
      console.warn("Analytics not initialized. Call initialize() first.");
      return;
    }

    try {
      await track(eventName, {
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        ...properties,
      });
    } catch (error) {
      console.error("Failed to track event:", error);
    }
  }

  /**
   * Track screen views
   */
  async trackScreen(
    screenName: string,
    properties?: EventProperties
  ): Promise<void> {
    await this.trackEvent(`screen_${screenName}_viewed`, {
      screen_name: screenName,
      category: "navigation",
      ...properties,
    });
  }

  /**
   * Track user actions
   */
  async trackUserAction(
    action: string,
    properties?: EventProperties
  ): Promise<void> {
    await this.trackEvent("user_action", {
      action,
      ...properties,
    });
  }

  /**
   * Track trip-related events
   */
  async trackTripEvent(
    eventType:
      | "trip_created"
      | "trip_viewed"
      | "trip_shared"
      | "trip_completed",
    properties?: EventProperties
  ): Promise<void> {
    await this.trackEvent(eventType, {
      category: "trip",
      ...properties,
    });
  }

  /**
   * Track onboarding events
   */
  async trackOnboardingEvent(
    step: string,
    completed: boolean = false,
    properties?: EventProperties
  ): Promise<void> {
    await this.trackEvent("onboarding_step", {
      step,
      completed,
      category: "onboarding",
      ...properties,
    });
  }

  /**
   * Track authentication events
   */
  async trackAuthEvent(
    eventType: "sign_in" | "sign_up" | "sign_out" | "sign_in_failed",
    properties?: EventProperties
  ): Promise<void> {
    await this.trackEvent(eventType, {
      category: "authentication",
      ...properties,
    });
  }

  /**
   * Track preferences and settings
   */
  async trackPreferencesEvent(
    eventType: "preferences_updated" | "preferences_viewed",
    properties?: EventProperties
  ): Promise<void> {
    await this.trackEvent(eventType, {
      category: "preferences",
      ...properties,
    });
  }

  /**
   * Track AI/Gemini interactions
   */
  async trackAIEvent(
    eventType: "ai_query" | "ai_response_received" | "ai_error",
    properties?: EventProperties
  ): Promise<void> {
    await this.trackEvent(eventType, {
      category: "ai_interaction",
      ...properties,
    });
  }

  /**
   * Set user ID
   */
  async setUser(userId: string, properties?: UserProperties): Promise<void> {
    if (!this.isInitialized) {
      console.warn("Analytics not initialized. Call initialize() first.");
      return;
    }

    try {
      await setUserId(userId);

      if (properties) {
        const identifyObj = new Identify();
        Object.entries(properties).forEach(([key, value]) => {
          identifyObj.set(key, value);
        });
        await identify(identifyObj);
      }
    } catch (error) {
      console.error("Failed to set user:", error);
    }
  }

  /**
   * Update user properties
   */
  async updateUserProperties(properties: UserProperties): Promise<void> {
    if (!this.isInitialized) {
      console.warn("Analytics not initialized. Call initialize() first.");
      return;
    }

    try {
      const identifyObj = new Identify();
      Object.entries(properties).forEach(([key, value]) => {
        identifyObj.set(key, value);
      });
      await identify(identifyObj);
    } catch (error) {
      console.error("Failed to update user properties:", error);
    }
  }

  /**
   * Flush pending events
   * Useful when the app is about to close
   */
  async flushEvents(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await flush();
    } catch (error) {
      console.error("Failed to flush events:", error);
    }
  }

  /**
   * Clear user data (useful for sign out)
   */
  async clearUser(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await setUserId(undefined);
      await this.trackAuthEvent("sign_out");
    } catch (error) {
      console.error("Failed to clear user:", error);
    }
  }

  /**
   * Get analytics status
   */
  getStatus(): { initialized: boolean; hasApiKey: boolean } {
    return {
      initialized: this.isInitialized,
      hasApiKey: !!this.amplitudeApiKey,
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export common tracking functions for convenience
export const trackEvent = (eventName: string, properties?: EventProperties) =>
  analyticsService.trackEvent(eventName, properties);

export const trackScreen = (screenName: string, properties?: EventProperties) =>
  analyticsService.trackScreen(screenName, properties);

export const trackUserAction = (action: string, properties?: EventProperties) =>
  analyticsService.trackUserAction(action, properties);

export const trackTripEvent = (
  eventType: "trip_created" | "trip_viewed" | "trip_shared" | "trip_completed",
  properties?: EventProperties
) => analyticsService.trackTripEvent(eventType, properties);

export const trackOnboardingEvent = (
  step: string,
  completed?: boolean,
  properties?: EventProperties
) => analyticsService.trackOnboardingEvent(step, completed, properties);

export const trackAuthEvent = (
  eventType: "sign_in" | "sign_up" | "sign_out" | "sign_in_failed",
  properties?: EventProperties
) => analyticsService.trackAuthEvent(eventType, properties);

export const trackPreferencesEvent = (
  eventType: "preferences_updated" | "preferences_viewed",
  properties?: EventProperties
) => analyticsService.trackPreferencesEvent(eventType, properties);

export const trackAIEvent = (
  eventType: "ai_query" | "ai_response_received" | "ai_error",
  properties?: EventProperties
) => analyticsService.trackAIEvent(eventType, properties);

export default analyticsService;
