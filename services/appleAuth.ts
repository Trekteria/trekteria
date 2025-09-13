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
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Error", "Apple Sign In is not available on this device.");
      return;
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log("Apple credential:", credential);

    if (credential.identityToken) {
      // Sign in with Supabase using the Apple credential
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error("Supabase Apple sign-in error:", error);
        Alert.alert("Sign In Failed", error.message);
        return;
      }

      if (data.user) {
        // Track successful sign-in
        trackAuthEvent('sign_in', {
          user_id: data.user.id,
          method: 'apple'
        });

        // Create or update user record
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            user_id: data.user.id,
            email: data.user.email,
            full_name: credential.fullName ? 
              `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : 
              null,
            emailVerified: true,
            auth_provider: 'apple',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (upsertError) {
          console.error("Error upserting user:", upsertError);
        }

        console.log("Apple Sign In successful:", data.user.email);
        
        // Navigate to home screen
        router.replace('/(app)/home');
      }
    } else {
      Alert.alert("Error", "Failed to get identity token from Apple.");
    }
  } catch (e: any) {
    console.error("Apple Sign In error:", e);
    
    if (e.code === 'ERR_REQUEST_CANCELED') {
      console.log("User canceled the sign-in flow");
      // Don't show error for user cancellation
    } else if (e.code === 'ERR_REQUEST_NOT_HANDLED') {
      Alert.alert("Error", "Apple Sign In is not configured properly. Please contact support.");
    } else if (e.code === 'ERR_REQUEST_NOT_INTERACTIVE') {
      Alert.alert("Error", "Apple Sign In is not available in this context.");
    } else {
      Alert.alert("Sign In Failed", e.message || "An unknown error occurred during Apple Sign In.");
    }
  }
}