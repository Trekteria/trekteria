import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TemperatureUnit = '°F' | '°C';

type TemperatureContextType = {
     temperatureUnit: TemperatureUnit;
     setTemperatureUnit: (unit: TemperatureUnit) => void;
     convertTemperature: (tempF: number) => { value: number; unit: string };
};

// Create context with default value
const TemperatureUnitContext = createContext<TemperatureContextType>({
     temperatureUnit: '°F',
     setTemperatureUnit: () => { },
     convertTemperature: () => ({ value: 0, unit: '°F' }),
});

export const TemperatureUnitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('°F');
     const [isLoading, setIsLoading] = useState(true);

     // Load saved temperature unit preference
     useEffect(() => {
          const loadTemperatureUnit = async () => {
               try {
                    const savedUnit = await AsyncStorage.getItem('@temperatureUnit');
                    if (savedUnit && (savedUnit === '°F' || savedUnit === '°C')) {
                         setTemperatureUnit(savedUnit as TemperatureUnit);
                    }
               } catch (error) {
                    console.error('Failed to load temperature unit preference:', error);
               } finally {
                    setIsLoading(false);
               }
          };

          loadTemperatureUnit();
     }, []);

     // Save temperature unit preference when changed
     const setAndSaveTemperatureUnit = async (newUnit: TemperatureUnit) => {
          setTemperatureUnit(newUnit);
          try {
               await AsyncStorage.setItem('@temperatureUnit', newUnit);
          } catch (error) {
               console.error('Failed to save temperature unit preference:', error);
          }
     };

     // Helper function to convert temperatures from Fahrenheit
     // Always assumes input temperature is in Fahrenheit
     const convertTemperature = (tempF: number) => {
          if (temperatureUnit === '°C') {
               // Convert from F to C
               const celsius = (tempF - 32) * 5 / 9;
               return { value: Math.round(celsius), unit: '°C' };
          } else {
               // Keep as Fahrenheit
               return { value: Math.round(tempF), unit: '°F' };
          }
     };

     if (isLoading) {
          return null;
     }

     return (
          <TemperatureUnitContext.Provider
               value={{
                    temperatureUnit,
                    setTemperatureUnit: setAndSaveTemperatureUnit,
                    convertTemperature
               }}
          >
               {children}
          </TemperatureUnitContext.Provider>
     );
};

// Custom hook to use the temperature context
export const useTemperatureUnit = () => useContext(TemperatureUnitContext); 