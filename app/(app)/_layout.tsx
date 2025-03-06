import { Stack } from 'expo-router';

export default function AppLayout() {
     return (
          <Stack>
               <Stack.Screen
                    name="home"
                    options={{
                         title: 'Home',
                         headerShown: false,
                    }}
               />
               <Stack.Screen
                    name="settings"
                    options={{
                         title: 'Settings',
                         headerShown: false,
                    }}
               />
               <Stack.Screen
                    name="preferences"
                    options={{
                         title: 'Preferences',
                         headerShown: false,
                    }}
               />
               <Stack.Screen
                    name="result"
                    options={{
                         title: 'Result',
                         headerShown: false,
                    }}
               />
          </Stack>
     );
} 