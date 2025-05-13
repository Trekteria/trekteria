import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ColorSchemeProvider, useColorSchemeSimple } from '../hooks/useColorScheme';
import { TemperatureUnitProvider } from '../hooks/useTemperatureUnit';
import { clearExpiredWeatherCache } from '../services/cacheService';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function NavigationLayout() {
  const colorScheme = useColorSchemeSimple();

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
