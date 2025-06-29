import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const OnboardingContent1 = () => (
     <View style={styles.contentContainer}>
          <Image
               source={require('../../assets/images/onboarding1.png')}
               style={styles.image}
               resizeMode="cover"
          />
          <View style={styles.textContainer}>
               <Text style={styles.title}>Your Camping Journey Begins</Text>
               <Text style={styles.description}>
                    Meet Trekteria, your camping companion. Discover hidden gems from forest spots to lakeside retreats.
               </Text>
          </View>
     </View>
);

const OnboardingContent2 = () => (
     <View style={styles.contentContainer}>
          <Image
               source={require('../../assets/images/onboarding2.png')}
               style={styles.image}
               resizeMode="cover"
          />
          <View style={styles.textContainer}>
               <Text style={styles.title}>Smart Camping Planning</Text>
               <Text style={styles.description}>
                    Trekteria's AI crafts perfect gear lists and suggests the best routes for your camping adventure.
               </Text>
          </View>
     </View>
);

const OnboardingContent3 = () => (
     <View style={styles.contentContainer}>
          <Image
               source={require('../../assets/images/onboarding3.png')}
               style={styles.image}
               resizeMode="cover"
          />
          <View style={styles.textContainer}>
               <Text style={styles.title}>Create Lasting Memories</Text>
               <Text style={styles.description}>
                    Every camping trip becomes an epic adventure with Trekteria. Build unforgettable experiences.
               </Text>
          </View>
     </View>
);

export default function OnboardingIndex() {
     const router = useRouter();
     const [index, setIndex] = useState(0);

     const handleNext = () => {
          if (index < 2) {
               setIndex(index + 1);
          }
     };

     const handleGetStarted = async () => {
          try {
               // Mark onboarding as completed in AsyncStorage
               await AsyncStorage.setItem("hasCompletedOnboarding", "true");
               // Navigate to the authentication screen
               router.replace("/auth");
          } catch (error) {
               console.error("Error saving onboarding status:", error);
               // Still try to navigate even if saving fails
               router.replace("/auth");
          }
     };

     const renderScene = ({ route }: { route: { key: string } }) => {
          switch (route.key) {
               case 'first':
                    return <OnboardingContent1 />;
               case 'second':
                    return <OnboardingContent2 />;
               case 'third':
                    return <OnboardingContent3 />;
               default:
                    return null;
          }
     };

     const renderTabBar = () => null; // Hide the tab bar since we're using custom navigation

     const routes = [
          { key: 'first', title: 'Discover' },
          { key: 'second', title: 'Plan' },
          { key: 'third', title: 'Explore' },
     ];

     const renderProgressIndicators = () => {
          return (
               <View style={styles.progressContainer}>
                    <View style={[styles.progressIndicator, index >= 0 ? styles.progressIndicatorActive : styles.progressIndicatorInactive]}></View>
                    <View style={[styles.progressIndicator, index >= 1 ? styles.progressIndicatorActive : styles.progressIndicatorInactive]}></View>
                    <View style={[styles.progressIndicator, index >= 2 ? styles.progressIndicatorActive : styles.progressIndicatorInactive]}></View>
               </View>
          );
     };

     return (
          <View style={styles.container}>
               <View style={styles.swipeableContent}>
                    <TabView
                         navigationState={{ index, routes }}
                         renderScene={renderScene}
                         renderTabBar={renderTabBar}
                         onIndexChange={setIndex}
                         initialLayout={{ width }}
                         swipeEnabled={true}
                         lazy={false}
                    />
               </View>

               <View style={styles.fixedBottom}>
                    {renderProgressIndicators()}
                    <TouchableOpacity
                         style={[styles.button, index === 2 && styles.getStartedButton]}
                         onPress={index === 2 ? handleGetStarted : handleNext}
                    >
                         <Text style={styles.buttonText}>
                              {index === 2 ? 'Get Started' : 'Next'}
                         </Text>
                    </TouchableOpacity>
               </View>
          </View>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: '#fff',
     },
     swipeableContent: {
          flex: 1,
     },
     contentContainer: {
          flex: 1,
          position: 'relative',
     },
     image: {
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
     },
     textContainer: {
          position: 'absolute',
          bottom: '8%',
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: 120, // Space for fixed bottom section
     },
     title: {
          ...Typography.text.h1,
          color: 'white',
          marginBottom: 10,
     },
     description: {
          ...Typography.text.body,
          color: 'white',
          opacity: 0.8,
          lineHeight: 24,
     },
     fixedBottom: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          paddingBottom: 40,
     },
     progressContainer: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 30,
          marginBottom: 10,
     },
     progressIndicator: {
          width: 50,
          height: 4,
          borderRadius: 3,
          marginHorizontal: 5,
     },
     progressIndicatorActive: {
          backgroundColor: 'white',
     },
     progressIndicatorInactive: {
          backgroundColor: Colors.inactive,
     },
     button: {
          backgroundColor: 'white',
          padding: 20,
          borderRadius: 100,
          alignItems: 'center',
          margin: 20,
     },
     getStartedButton: {
          backgroundColor: '#85CA7B',
     },
     buttonText: {
          ...Typography.text.button,
          color: Colors.black,
     },
}); 