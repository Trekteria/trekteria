# Amplitude Analytics Setup Guide

This guide walks you through the Amplitude analytics setup for your Trekteria app.

## 🚀 Getting Started

### 1. Create an Amplitude Account

1. Go to [https://amplitude.com](https://amplitude.com)
2. Sign up for a free account
3. Create a new project for your app
4. Copy your API key from the project settings

### 2. Configure Environment Variables

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add your Amplitude API key:

```env
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_api_key_here
```

**Note:** The `EXPO_PUBLIC_` prefix is required for Expo to make the variable available in your app.

### 3. Verify Installation

The Amplitude React Native SDK is already installed in your project:

```json
"@amplitude/analytics-react-native": "^1.4.13"
```

## 📊 What's Already Implemented

### Analytics Service

The project includes a comprehensive analytics service (`services/analyticsService.ts`) with:

- **Auto-initialization** on app startup
- **Event tracking** with custom properties
- **User identification** and properties
- **Screen view tracking**
- **Error handling** and offline support

### Pre-configured Events

The following events are already being tracked:

#### App Lifecycle

- `app_opened` - When the app starts
- `screen_{screen_name}_viewed` - When users navigate to different screens (e.g., `screen_home_viewed`, `screen_preferences_viewed`)

#### Authentication

- `google_signin_button_clicked` - When user clicks Google sign-in button
- `google_signin_success` - Successful Google authentication
- `google_signin_failed` - Failed Google authentication attempts
- `sign_out` - When users log out

#### User Preferences

- `screen_preferences_viewed` - When preferences screen is opened
- `preferences_question_answered` - Each step in the preferences flow with question details
- `preferences_form_submitted` - When preferences are completed

#### Trip Planning

- `trip_created` - When a new trip is planned
- `trip_viewed` - When trip details are viewed
- `trip_shared` - When trips are shared
- `trip_completed` - When trips are marked as complete

#### AI Interactions

- `ai_query` - When users interact with Gemini AI
- `ai_response_received` - When AI responds successfully
- `ai_error` - When AI interactions fail

#### General User Actions

- `user_action` - Generic user interactions with additional context

## 🛠 How to Use Analytics

### Basic Event Tracking

```typescript
import {
  trackEvent,
  trackUserAction,
  trackScreen,
} from "../services/analyticsService";

// Track a custom event
trackEvent("button_clicked", {
  button_name: "create_trip",
  screen: "home",
});

// Track user actions
trackUserAction("search_performed", {
  query: "camping near me",
  filters_applied: ["distance", "price"],
});

// Track screen views
trackScreen("trip_details", {
  trip_id: "trip_123",
  trip_type: "camping",
});
```

### Specialized Event Tracking

```typescript
import {
  trackTripEvent,
  trackAuthEvent,
  trackAIEvent,
  trackOnboardingEvent,
  trackPreferencesEvent,
} from "../services/analyticsService";

// Trip events
trackTripEvent("trip_created", {
  trip_duration: 3,
  destination: "Yosemite",
  group_size: 4,
});

// Authentication events
trackAuthEvent("sign_up", {
  method: "google",
  user_source: "organic",
});

// AI interaction events
trackAIEvent("ai_query", {
  query_type: "trip_recommendation",
  response_time_ms: 1250,
});

// Onboarding events
trackOnboardingEvent("step_completed", true, {
  step_name: "profile_setup",
  time_spent_seconds: 45,
});
```

### User Properties

```typescript
import { analyticsService } from "../services/analyticsService";

// Set user properties when they sign in
analyticsService.setUser(userId, {
  email: user.email,
  name: user.name,
  experienceLevel: "beginner",
  preferredTheme: "dark",
  hasCompletedOnboarding: true,
});

// Update user properties
analyticsService.updateUserProperties({
  preferredCampingType: "backpacking",
  ecoPoints: 150,
});

// Clear user data on sign out
analyticsService.clearUser();
```

## 📈 Key Metrics to Track

### User Engagement

- Screen views and time spent
- Feature usage patterns
- Session duration and frequency

### Trip Planning Funnel

- Preference completion rate
- AI query → trip creation conversion
- Trip planning abandonment points

### Authentication Flow

- Sign-up completion rate
- Login success/failure rates
- Onboarding completion

### AI Performance

- Query response times
- User satisfaction with AI responses
- Most common query types

## 🔍 Analytics Dashboard Setup

### Recommended Charts in Amplitude

1. **User Journey Funnel**

   - Onboarding → Preferences → First Trip Creation

2. **Feature Adoption**

   - AI query usage over time
   - Trip sharing frequency
   - Preference updates

3. **Retention Cohorts**

   - Day 1, 7, 30 retention rates
   - User segments by experience level

4. **User Pathways**
   - Common navigation patterns
   - Drop-off points in key flows

### Custom User Properties

Set up these user properties in Amplitude for better segmentation:

- `experience_level` - beginner, intermediate, expert
- `preferred_camping_type` - tent, RV, cabin, etc.
- `group_size_preference` - solo, couple, family, large group
- `has_completed_onboarding` - true/false
- `preferred_theme` - light/dark
- `eco_points` - user's current eco points

## 🚨 Best Practices

### Event Naming

- Use snake_case for event names
- Be descriptive but concise
- Group related events with prefixes (trip*, auth*, ai\_)

### Properties

- Always include relevant context
- Use consistent property names across events
- Include timestamps when relevant

### Privacy

- Never track PII (personally identifiable information)
- Respect user consent preferences
- Use hashed IDs when necessary

### Performance

- The analytics service handles batching automatically
- Events are queued locally if offline
- Flushes happen every 30 seconds or 30 events

## 🐛 Debugging

### Check Analytics Status

```typescript
import { analyticsService } from "../services/analyticsService";

const status = analyticsService.getStatus();
console.log("Analytics initialized:", status.initialized);
console.log("Has API key:", status.hasApiKey);
```

### Manually Flush Events

```typescript
import { analyticsService } from "../services/analyticsService";

// Force send queued events
await analyticsService.flushEvents();
```

### Common Issues

1. **Events not appearing in Amplitude**

   - Check your API key is correct
   - Verify environment variable is set
   - Check network connectivity

2. **TypeScript errors**

   - Ensure all imports use the correct paths
   - Check property types match the interfaces

3. **Missing user context**
   - Verify user is set after authentication
   - Check user properties are being passed correctly

## 📚 Additional Resources

- [Amplitude React Native SDK Documentation](https://developers.amplitude.com/docs/react-native)
- [Amplitude Event Planning Guide](https://help.amplitude.com/hc/en-us/articles/229313067)
- [Analytics Best Practices](https://help.amplitude.com/hc/en-us/articles/115002923827)

---

For questions about the analytics implementation, check the `services/analyticsService.ts` file or refer to the Amplitude documentation.
