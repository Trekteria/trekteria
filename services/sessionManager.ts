import { supabase } from "./supabaseConfig";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function checkSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Error checking session:", error);
      return false;
    }

    if (session) {
      // Store the session in AsyncStorage as a backup
      try {
        await AsyncStorage.setItem(
          "supabase.auth.token",
          JSON.stringify(session)
        );
      } catch (e) {
        console.log("Note: Could not backup session to AsyncStorage");
      }

      console.log("✅ Active session found - User is logged in");
      return true;
    }

    // If no session found in Supabase, try to restore from AsyncStorage
    try {
      const storedSession = await AsyncStorage.getItem("supabase.auth.token");
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        const { error: restoreError } = await supabase.auth.setSession({
          access_token: parsedSession.access_token,
          refresh_token: parsedSession.refresh_token,
        });

        if (!restoreError) {
          console.log("✅ Session restored from backup - User is logged in");
          return true;
        }
      }
    } catch (e) {
      console.log("Note: Could not restore session from backup");
    }

    console.log("❌ No active session found - User needs to log in");
    return false;
  } catch (error) {
    console.error("Error in checkSession:", error);
    return false;
  }
}

export async function handleSessionChange() {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session) {
      // Store the session in AsyncStorage as a backup
      try {
        await AsyncStorage.setItem(
          "supabase.auth.token",
          JSON.stringify(session)
        );
      } catch (e) {
        console.log("Note: Could not backup session to AsyncStorage");
      }

      console.log("✅ User signed in successfully");
      router.replace("/(app)/home");
    } else if (event === "SIGNED_OUT") {
      // Clear the backup session
      try {
        await AsyncStorage.removeItem("supabase.auth.token");
      } catch (e) {
        console.log("Note: Could not clear backup session");
      }

      console.log("👋 User signed out");
      router.replace("/auth");
    } else if (event === "TOKEN_REFRESHED") {
      // Update the backup session
      try {
        await AsyncStorage.setItem(
          "supabase.auth.token",
          JSON.stringify(session)
        );
      } catch (e) {
        console.log("Note: Could not update backup session");
      }
    }
  });

  return subscription;
}
