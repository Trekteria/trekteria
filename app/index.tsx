import { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Image, Animated } from "react-native";
import { Redirect } from "expo-router";
import { Colors } from "../constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabaseConfig";
import { checkSession, handleSessionChange } from "../services/sessionManager";
import { analyticsService } from "../services/analyticsService";
import { useUserStore } from "../store";

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Initialize user store
  const { fetchUserData, reset } = useUserStore();

  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const setupApp = async () => {
      try {
        console.log('🚀 Starting app initialization...');

        // Initialize analytics
        await analyticsService.initialize();

        // Check onboarding status
        const onboardingStatus = await AsyncStorage.getItem("hasCompletedOnboarding");
        if (onboardingStatus === "true" && isMounted) {
          console.log('📝 Onboarding completed');
          setHasCompletedOnboarding(true);
        }

        // Check Supabase auth state
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setIsLoggedIn(!!session);
          console.log("User is logged in:", !!session);
        }

        // Set up Supabase auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (isMounted) {
              setIsLoggedIn(!!session);
              console.log("Auth state changed:", event, !!session);

              // Initialize or reset user store based on auth state
              if (session) {
                fetchUserData();
              } else {
                reset();
              }
            }
          }
        );

        authSubscription = subscription;

        // Start with a delay before beginning the fade out
        const delayTimer = setTimeout(() => {
          if (!isMounted) return;

          // Fade out animation
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            if (isMounted) {
              console.log('✨ Splash screen animation completed');
              setIsReady(true);
            }
          });
        }, 1500);

        return () => {
          clearTimeout(delayTimer);
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
        };
      } catch (error) {
        console.error("❌ Error in setupApp:", error);
        if (isMounted) {
          setIsLoggedIn(false);
          setIsReady(true);
        }
      }
    };

    setupApp();

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [fadeAnim]);

  // Show splash screen until ready
  if (!isReady) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Image
          source={require("../assets/images/logo-white.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    );
  }

  // Redirect based on login status and onboarding completion
  if (isLoggedIn) {
    // User is logged in - go to home
    return <Redirect href="/(app)/home" />;
  } else if (hasCompletedOnboarding) {
    // User has completed onboarding but is not logged in - go to auth
    return <Redirect href="/auth" />;
  } else {
    // First time user - go to onboarding
    return <Redirect href="/onboarding" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 80,
    height: 80,
  },
});
