import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "./supabaseConfig";
import { router } from "expo-router";
import {
  trackAuthEvent,
  analyticsService,
  trackEvent,
} from "./analyticsService";
import { syncService } from "./database/syncService";
import { Platform, Alert } from "react-native";

export async function signInWithApple() {
  try {
    // Check if Apple Authentication is available
    if (Platform.OS !== "ios") {
      Alert.alert(
        "Apple Sign In Unavailable",
        "Apple Sign In is only available on iOS devices. Please use Google Sign In or email authentication instead.",
        [{ text: "OK" }]
      );
      return;
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Apple Sign In Unavailable",
        "Apple Sign In is not available on this device. Please use Google Sign In or email authentication instead.",
        [{ text: "OK" }]
      );
      return;
    }

    // Request Apple Authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Sign in with Supabase using the Apple ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken!,
    });

    if (error) throw error;

    // Get user data after successful authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;

    if (user) {
      // Check if user already exists in our database
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("firstname, lastname, ecoPoints")
        .eq("user_id", user.id)
        .single();

      // Extract name information from Apple credential
      const firstName =
        credential.fullName?.givenName || existingUser?.firstname || "User";
      const lastName =
        credential.fullName?.familyName || existingUser?.lastname || "";

      // Store user data in the users table
      const { error: upsertError } = await supabase.from("users").upsert(
        {
          user_id: user.id,
          email: user.email || credential.email,
          emailVerified: true, // Apple emails are always verified
          firstname: firstName,
          lastname: lastName,
          ecoPoints: existingUser?.ecoPoints || 0,
        },
        {
          onConflict: "user_id",
        }
      );

      if (upsertError) throw upsertError;

      // Track successful sign in
      trackEvent("apple_signin_success", {
        method: "apple",
        user_id: user.id,
        is_new_user: !existingUser,
        provider: "apple",
        category: "authentication",
      });

      // Set user in analytics
      analyticsService.setUser(user.id, {
        email: user.email || credential.email || "",
        name: `${firstName} ${lastName}`.trim(),
        hasCompletedOnboarding: !!existingUser,
      });

      // Pull data from Supabase to local SQLite
      try {
        await syncService.pullData(user.id);
      } catch (error) {
        console.error("Error pulling data:", error);
      }
    }

    console.log("Apple OAuth successful! User is signed in.");
    router.replace("/(app)/home");
  } catch (error: any) {
    console.error("Error signing in with Apple:", error);

    // Handle specific Apple Authentication errors
    if (error.code === "ERR_REQUEST_CANCELED") {
      console.log("User canceled Apple Sign-In");
      return; // Don't track this as an error since user intentionally canceled
    }

    // Show user-friendly error message
    Alert.alert(
      "Apple Sign In Error",
      "There was an issue signing in with Apple. Please try again or use an alternative sign-in method.",
      [{ text: "OK" }]
    );

    // Track failed sign in
    trackEvent("apple_signin_failed", {
      method: "apple",
      provider: "apple",
      error_message: error instanceof Error ? error.message : "Unknown error",
      error_code: error.code,
      category: "authentication",
    });
  }
}

export async function isAppleAuthenticationAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.error("Error checking Apple Authentication availability:", error);
    return false;
  }
}
