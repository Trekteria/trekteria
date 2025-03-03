import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Image, Animated } from 'react-native';
import { Redirect } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function Index() {
     const [isReady, setIsReady] = useState(false);
     const fadeAnim = useRef(new Animated.Value(1)).current;

     useEffect(() => {
          // Start with a delay before beginning the fade out
          const delayTimer = setTimeout(() => {
               // Fade out animation
               Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 500, // Shorter duration of fade out in milliseconds (1 second)
                    useNativeDriver: true,
               }).start(() => {
                    // Set ready state after animation completes
                    setIsReady(true);
               });
          }, 1500); // Show splash for 1.5 seconds before starting fade

          return () => clearTimeout(delayTimer);
     }, [fadeAnim]);

     // Show splash screen until ready
     if (!isReady) {
          return (
               <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                    <Image
                         source={require('../assets/images/logo-white.png')}
                         style={styles.logo}
                         resizeMode="contain"
                    />
               </Animated.View>
          );
     }

     // Redirect to the onboarding screen after splash screen
     return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
     container: {
          display: 'flex',
          flex: 1,
          backgroundColor: Colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
     },
     logo: {
          width: 80,
          height: 80,
     },
}); 