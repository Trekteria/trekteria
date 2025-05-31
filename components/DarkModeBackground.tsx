import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

interface DarkModeBackgroundProps {
     children: React.ReactNode;
}

export default function DarkModeBackground({ children }: DarkModeBackgroundProps) {
     const { effectiveColorScheme } = useColorScheme();
     const isDarkMode = effectiveColorScheme === 'dark';
     const { width, height } = useWindowDimensions();

     if (!isDarkMode) {
          return <>{children}</>;
     }

     return (
          <View style={styles.container}>
               <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
                    <Defs>
                         <RadialGradient
                              id="grad"
                              cx="0%"
                              cy="0%"
                              rx="80%"
                              ry="40%"
                              gradientUnits="userSpaceOnUse"
                         >
                              <Stop offset="0" stopColor="#124637" stopOpacity="1" />
                              <Stop offset="1" stopColor="#1A1A1A" stopOpacity="1" />
                         </RadialGradient>
                    </Defs>
                    <Rect x="0" y="0" width={width} height={height} fill="url(#grad)" />
               </Svg>
               {children}
          </View>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
     },
}); 