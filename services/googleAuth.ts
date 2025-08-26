import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabaseConfig";
import { router } from "expo-router";
import {
  trackAuthEvent,
  analyticsService,
  trackEvent,
} from "./analyticsService";
import { syncService } from "./database/syncService";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  try {
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: "trekteria",
      path: "auth/callback",
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === "success" && result.url) {
        // Parse the URL to extract the session
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));

        if (params.get("access_token")) {
          // Session was returned in URL fragments
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (!accessToken) throw new Error("No access token found");

          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (setSessionError) throw setSessionError;
        } else {
          // Use the newer exchangeCodeForSession method
          const { error: sessionError } =
            await supabase.auth.exchangeCodeForSession(result.url);
          if (sessionError) throw sessionError;
        }

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

          // Store user data in the users table
          const { error: upsertError } = await supabase.from("users").upsert(
            {
              user_id: user.id,
              email: user.email,
              emailVerified: true,
              firstname:
                existingUser?.firstname ||
                user.user_metadata?.full_name?.split(" ")[0] ||
                "User",
              lastname:
                existingUser?.lastname ||
                user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
                "",
              ecoPoints: existingUser?.ecoPoints || 0,
              //   avatar_url: user.user_metadata?.avatar_url,
              //   created_at: new Date().toISOString(),
              //   updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            }
          );

          if (upsertError) throw upsertError;

          // Track successful sign in
          trackEvent("google_signin_success", {
            method: "google",
            user_id: user.id,
            is_new_user: !existingUser,
            provider: "google",
            category: "authentication",
          });

          // Set user in analytics
          analyticsService.setUser(user.id, {
            email: user.email,
            name: user.user_metadata?.full_name || "User",
            hasCompletedOnboarding: !!existingUser,
          });

          // Pull data from Supabase to local SQLite
          try {
            await syncService.pullData(user.id);
          } catch (error) {
            console.error("Error pulling data:", error);
          }
        }

        console.log("Google OAuth successful! User is signed in.");
        router.replace("/(app)/home");
      }
    }
  } catch (error) {
    console.error("Error signing in with Google:", error);

    // Track failed sign in
    trackEvent("google_signin_failed", {
      method: "google",
      provider: "google",
      error_message: error instanceof Error ? error.message : "Unknown error",
      category: "authentication",
    });

    throw error;
  }
}
