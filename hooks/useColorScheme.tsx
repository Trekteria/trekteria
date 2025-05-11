import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ColorSchemeType = 'light' | 'dark';
type ColorSchemeContextType = {
     colorScheme: ColorSchemeType;
     setColorScheme: (scheme: ColorSchemeType) => void;
     toggleColorScheme: () => void;
};

// Default to system preference, but allow manual override
const ColorSchemeContext = createContext<ColorSchemeContextType>({
     colorScheme: 'light',
     setColorScheme: () => { },
     toggleColorScheme: () => { },
});

export const ColorSchemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const deviceColorScheme = useDeviceColorScheme() as ColorSchemeType || 'light';
     const [colorScheme, setColorScheme] = useState<ColorSchemeType>('light');
     const [isLoading, setIsLoading] = useState(true);

     // Load saved theme preference
     useEffect(() => {
          const loadColorScheme = async () => {
               try {
                    const savedColorScheme = await AsyncStorage.getItem('@theme');
                    if (savedColorScheme) {
                         setColorScheme(savedColorScheme as ColorSchemeType);
                    } else {
                         // Use device preference if no saved preference exists
                         setColorScheme(deviceColorScheme);
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
          const newScheme = colorScheme === 'light' ? 'dark' : 'light';
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
export const useColorSchemeSimple = (): ColorSchemeType => {
     const { colorScheme } = useColorScheme();
     return colorScheme;
}; 