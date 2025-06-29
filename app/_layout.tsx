import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';

import { ColorSchemeProvider, useColorSchemeSimple } from '../hooks/useColorScheme';
import { TemperatureUnitProvider } from '../hooks/useTemperatureUnit';
import { clearExpiredWeatherCache } from '../services/cacheService';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function NavigationLayout() {
  const colorScheme = useColorSchemeSimple();
  const router = useRouter();

  // Handle deep linking for password reset and email verification
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      
      const parsedUrl = Linking.parse(url);
      
      // Check if this is a password reset link
      if (parsedUrl.path === 'reset-password' || 
          parsedUrl.queryParams?.type === 'recovery' ||
          parsedUrl.queryParams?.access_token) {
        
        // Navigate to the reset password screen with the query parameters
        const queryString = Object.entries(parsedUrl.queryParams || {})
          .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
          .join('&');
        
        const resetUrl = `/auth/reset-password?${queryString}` as any;
        console.log('Navigating to reset password:', resetUrl);
        router.replace(resetUrl);
      }
      
      // Check if this is an email verification link with OTP
      if (parsedUrl.path === 'verify-email' || 
          parsedUrl.queryParams?.token ||
          parsedUrl.queryParams?.type === 'signup') {
        
        // Navigate to the verify email screen with the query parameters
        const queryString = Object.entries(parsedUrl.queryParams || {})
          .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
          .join('&');
        
        const verifyUrl = `/auth/verify-email?${queryString}` as any;
        console.log('Navigating to verify email:', verifyUrl);
        router.replace(verifyUrl);
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for incoming links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    'Montserrat': require('../assets/fonts/Montserrat-VariableFont_wght.ttf'),
    'Montserrat-Italic': require('../assets/fonts/Montserrat-Italic-VariableFont_wght.ttf'),
    'OpenSans': require('../assets/fonts/OpenSans-VariableFont_wdth,wght.ttf'),
    'OpenSans-Italic': require('../assets/fonts/OpenSans-Italic-VariableFont_wdth,wght.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      clearExpiredWeatherCache();
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ColorSchemeProvider>
      <TemperatureUnitProvider>
        <NavigationLayout />
      </TemperatureUnitProvider>
    </ColorSchemeProvider>
  );
}
