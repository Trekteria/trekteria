import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ColorSchemeType = 'light' | 'dark' | 'system';
type ColorSchemeContextType = {
     colorScheme: ColorSchemeType;
     setColorScheme: (scheme: ColorSchemeType) => void;
     toggleColorScheme: () => void;
     effectiveColorScheme: 'light' | 'dark'; // The actual theme being used
};

// Default to system preference, but allow manual override
const ColorSchemeContext = createContext<ColorSchemeContextType>({
     colorScheme: 'system',
     setColorScheme: () => { },
     toggleColorScheme: () => { },
     effectiveColorScheme: 'light',
});

export const ColorSchemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const deviceColorScheme = useDeviceColorScheme() as 'light' | 'dark' || 'light';
     const [colorScheme, setColorScheme] = useState<ColorSchemeType>('system');
     const [isLoading, setIsLoading] = useState(true);

     // Calculate the effective color scheme based on preference and system setting
     const effectiveColorScheme = colorScheme === 'system' ? deviceColorScheme : colorScheme;

     // Load saved theme preference
     useEffect(() => {
          const loadColorScheme = async () => {
               try {
                    const savedColorScheme = await AsyncStorage.getItem('@theme');
                    if (savedColorScheme && (savedColorScheme === 'light' || savedColorScheme === 'dark' || savedColorScheme === 'system')) {
                         setColorScheme(savedColorScheme as ColorSchemeType);
                    } else {
                         // Use system preference if no saved preference exists
                         setColorScheme('system');
                    }
               } catch (error) {
                    console.error('Failed to load color scheme preference:', error);
               } finally {
                    setIsLoading(false);
               }
          };

          loadColorScheme();
     }, [deviceColorScheme]);

     // Save theme preference when changed
     const setAndSaveColorScheme = async (newScheme: ColorSchemeType) => {
          setColorScheme(newScheme);
          try {
               await AsyncStorage.setItem('@theme', newScheme);
          } catch (error) {
               console.error('Failed to save color scheme preference:', error);
          }
     };

     const toggleColorScheme = () => {
          // Cycle through light -> dark -> system
          const newScheme = colorScheme === 'light' ? 'dark' : colorScheme === 'dark' ? 'system' : 'light';
          setAndSaveColorScheme(newScheme);
     };

     if (isLoading) {
          return null;
     }

     return (
          <ColorSchemeContext.Provider
               value={{
                    colorScheme,
                    setColorScheme: setAndSaveColorScheme,
                    toggleColorScheme,
                    effectiveColorScheme,
               }}
          >
               {children}
          </ColorSchemeContext.Provider>
     );
};

export const useColorScheme = (): ColorSchemeContextType => {
     const context = useContext(ColorSchemeContext);
     if (!context) {
          throw new Error('useColorScheme must be used within a ColorSchemeProvider');
     }
     return context;
};

// For backward compatibility
export const useColorSchemeSimple = (): 'light' | 'dark' => {
     const { effectiveColorScheme } = useColorScheme();
     return effectiveColorScheme;
}; 