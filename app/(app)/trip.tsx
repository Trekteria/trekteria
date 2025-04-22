import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, Animated, useWindowDimensions } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Typography } from '../../constants/Typography';
import { Colors } from '../../constants/Colors';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import ActionSheet, { ActionSheetRef } from 'react-native-actions-sheet';
import { TabView, SceneMap } from 'react-native-tab-view';

import InfoTab from '../components/trip-tabs/info-tab';
import NavigationTab from '../components/trip-tabs/navigation-tab';
import PackingTab from '../components/trip-tabs/packing-tab';
import MissionTab from '../components/trip-tabs/mission-tab';
import ChatTab from '../components/trip-tabs/chat-tab';

const renderScene = SceneMap({
     info: InfoTab,
     navigation: NavigationTab,
     packing: PackingTab,
     mission: MissionTab,
     chat: ChatTab,
});

// Simple routes with titles
const routes = [
     { key: 'info', title: 'Info' },
     { key: 'navigation', title: 'Navigation' },
     { key: 'packing', title: 'Packing' },
     { key: 'mission', title: 'Mission' },
     { key: 'chat', title: 'Chat' },
];

// Icon mapping with proper typing for Ionicons
const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
     info: 'information',
     navigation: 'navigate',
     packing: 'bag',
     mission: 'trophy',
     chat: 'chatbubble-ellipses'
};

function Trip() {
     const { trail } = useLocalSearchParams();
     const router = useRouter();
     const trailData = JSON.parse(trail as string);
     const actionSheetRef = useRef<ActionSheetRef>(null);
     const [activeTab, setActiveTab] = useState<string>('info');
     const tabWidth = Dimensions.get('window').width / 5; // Width for each tab
     const animatedValue = useRef(new Animated.Value(0)).current;
     const layout = useWindowDimensions();
     const [index, setIndex] = useState(0);

     // Update animation when activeTab changes
     useEffect(() => {
          const tabIndex = ['info', 'navigation', 'packing', 'mission', 'chat'].indexOf(activeTab);
          Animated.spring(animatedValue, {
               toValue: tabIndex * tabWidth / 1.23,
               useNativeDriver: true,
          }).start();
     }, [activeTab]);

     // Show ActionSheet at 45% when component mounts
     useEffect(() => {
          // Small delay to ensure component is fully rendered
          const timer = setTimeout(() => {
               actionSheetRef.current?.show(0); // Show at first snapPoint (45%)
          }, 300);

          return () => clearTimeout(timer);
     }, []);

     // Use the actual coordinates from the trail data, or fallback to default coordinates
     const initialRegion = {
          latitude: trailData.latitude || 37.7749,
          longitude: trailData.longitude || -122.4194,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
     };

     const openDirections = () => {
          const { latitude, longitude } = initialRegion;
          const label = encodeURIComponent(trailData.name);

          const scheme = Platform.select({
               ios: 'maps:',
               android: 'geo:',
          });
          const url = Platform.select({
               ios: `${scheme}${latitude},${longitude}?q=${label}`,
               android: `${scheme}${latitude},${longitude}?q=${label}`,
          });
          Linking.openURL(url!);
     };

     // Custom TabBar renderer with just icons
     const renderTabBar = (props: any) => {
          return (
               <View style={styles.customTabBar}>
                    {props.navigationState.routes.map((route: any, i: number) => {
                         const isActive = props.navigationState.index === i;
                         return (
                              <TouchableOpacity
                                   key={route.key}
                                   style={[styles.tabButton, isActive && { backgroundColor: Colors.primary }]}
                                   onPress={() => setIndex(i)}
                              >
                                   <Ionicons
                                        name={iconMap[route.key]}
                                        size={24}
                                        color={isActive ? Colors.white : '#999'}
                                   />
                              </TouchableOpacity>
                         );
                    })}
               </View>
          );
     };

     return (
          <>
               <Stack.Screen options={{ headerShown: false }} />
               <View style={styles.container}>
                    <MapView
                         style={styles.map}
                         initialRegion={initialRegion}
                         showsCompass={true}
                         showsScale={true}
                         mapPadding={{ top: 80, right: 20, bottom: 0, left: 20 }}
                         onPress={() => actionSheetRef.current?.show()}
                    >
                         <Marker
                              coordinate={{
                                   latitude: trailData.latitude || initialRegion.latitude,
                                   longitude: trailData.longitude || initialRegion.longitude
                              }}
                              title={trailData.name}
                              description={trailData.location}
                         />
                    </MapView>
                    <View style={styles.topBar}>
                         <TouchableOpacity
                              style={styles.backButton}
                              onPress={() => router.back()}
                         >
                              <Ionicons name="close" size={30} color="black" />
                         </TouchableOpacity>

                         <TouchableOpacity
                              style={styles.trailNameContainer}
                              onPress={() => router.back()}
                         >
                              <Text style={styles.trailName}>{trailData.name}</Text>
                         </TouchableOpacity>
                    </View>

                    {/* <View style={styles.bottomButtonsContainer}>
                         <TouchableOpacity
                              style={[styles.directionsButton, { flex: 1 }]}
                              onPress={openDirections}
                         >
                              <Ionicons name="navigate" size={24} color="white" />
                              <Text style={styles.buttonText}>Get Directions</Text>
                         </TouchableOpacity>
                    </View> */}

                    <ActionSheet
                         ref={actionSheetRef}
                         containerStyle={styles.actionSheet}
                         overlayColor="transparent"
                         gestureEnabled
                         snapPoints={[45, 100]}
                         backgroundInteractionEnabled={true}
                    >
                         <View style={styles.sheetContent}>
                              {/* <View style={styles.tabContainer}>
                                   <View style={styles.tabButtonsContainer}>
                                        <TouchableOpacity
                                             style={[styles.tabButton, activeTab === 'info' && { backgroundColor: Colors.primary }]}
                                             onPress={() => setActiveTab('info')}
                                        >
                                             <Ionicons
                                                  name="information"
                                                  size={25}
                                                  color={activeTab === 'info' ? Colors.white : '#999'}
                                             />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                             style={[styles.tabButton, activeTab === 'navigation' && { backgroundColor: Colors.primary }]}
                                             onPress={() => setActiveTab('navigation')}
                                        >
                                             <Ionicons
                                                  name="navigate"
                                                  size={25}
                                                  color={activeTab === 'navigation' ? Colors.white : '#999'}
                                             />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                             style={[styles.tabButton, activeTab === 'packing' && { backgroundColor: Colors.primary }]}
                                             onPress={() => setActiveTab('packing')}
                                        >
                                             <Ionicons
                                                  name="bag"
                                                  size={25}
                                                  color={activeTab === 'packing' ? Colors.white : '#999'}
                                             />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                             style={[styles.tabButton, activeTab === 'mission' && { backgroundColor: Colors.primary }]}
                                             onPress={() => setActiveTab('mission')}
                                        >
                                             <Ionicons
                                                  name="trophy"
                                                  size={25}
                                                  color={activeTab === 'mission' ? Colors.white : '#999'}
                                             />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                             style={[styles.tabButton, activeTab === 'chat' && { backgroundColor: Colors.primary }]}
                                             onPress={() => setActiveTab('chat')}
                                        >
                                             <Ionicons
                                                  name="chatbubble-ellipses"
                                                  size={25}
                                                  color={activeTab === 'chat' ? Colors.white : '#999'}
                                             />
                                        </TouchableOpacity>
                                   </View>
                                   <View style={styles.tabIndicatorContainer}>
                                        <Animated.View
                                             style={[
                                                  styles.tabIndicator,
                                                  {
                                                       transform: [{ translateX: animatedValue }]
                                                  }
                                             ]}
                                        >
                                             <View style={styles.tabIndicatorSmall} />
                                        </Animated.View>
                                   </View> 
                              </View> */}
                              <View style={styles.tabContent}>
                                   <TabView
                                        renderScene={renderScene}
                                        navigationState={{ index, routes }}
                                        onIndexChange={setIndex}
                                        initialLayout={{ width: layout.width }}
                                        renderTabBar={renderTabBar}
                                   />
                              </View>
                         </View>
                    </ActionSheet>
               </View>
          </>
     )
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: 'white',
     },
     title: {
          ...Typography.text.h1,
          marginBottom: 10,
     },
     map: {
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height,
     },
     topBar: {
          width: '100%',
          position: 'absolute',
          top: 70,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          zIndex: 1,
     },
     backButton: {
          backgroundColor: 'white',
          padding: 10,
          borderRadius: 30,
          shadowColor: '#000',
          shadowOffset: {
               width: 0,
               height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
     },
     trailNameContainer: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '70%',
          height: '100%',
          backgroundColor: 'white',
          borderRadius: 30,
          shadowColor: '#000',
          shadowOffset: {
               width: 0,
               height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
     },
     trailName: {
          ...Typography.text.h4,
          textAlign: 'center',
          color: Colors.primary,
     },
     // Commenting out unused styles for bottom buttons
     /* bottomButtonsContainer: {
          position: 'absolute',
          bottom: 40,
          left: 20,
          right: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 10,
     },
     directionsButton: {
          flex: 1,
          backgroundColor: '#007AFF',
          padding: 18,
          borderRadius: 30,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          shadowColor: '#000',
          shadowOffset: {
               width: 0,
               height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
     },
     buttonText: {
          ...Typography.text.h4,
          color: 'white',
          fontWeight: 'bold',
     }, */
     actionSheet: {
          flex: 1,
          backgroundColor: 'white',
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          padding: 5,
     },
     sheetContent: {
          display: 'flex',
          flexDirection: 'column',
     },
     // Commenting out unused tabContainer styles
     /* tabContainer: {
          backgroundColor: 'white',
          // boxShadow: '0px -4px 31px 0px rgba(0, 0, 0, 0.15)',
          // borderRadius: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: 70,
     }, */
     // Commenting out unused tabButtonsContainer styles
     /* tabButtonsContainer: {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
     }, */
     // Commenting out unused tabIndicator styles
     /* tabIndicatorContainer: {
          width: '100%',
          height: '10%',
          display: 'flex',
     },
     tabIndicator: {
          position: 'absolute',
          bottom: 7,
          height: 7,
          width: '20%',
          backgroundColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
     },
     tabIndicatorSmall: {
          width: '70%',
          height: 7,
          backgroundColor: Colors.primary,
          borderTopRightRadius: 20,
          borderTopLeftRadius: 20,
     }, */
     tabContent: {
          padding: 5,
          height: '100%',
          borderWidth: 1,
          borderBlockColor: 'white',
          borderColor: 'white',
     },
     customTabBar: {
          flexDirection: 'row',
          backgroundColor: 'white',
          justifyContent: 'space-around',
          paddingVertical: 10,
          height: 70,
          marginBottom: 20,
     },
     tabButton: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#f2f2f2',
          borderRadius: 15,
          marginHorizontal: 5,
     },
     // Commenting out unused customTabIndicator
     /* customTabIndicator: {
          backgroundColor: Colors.primary,
          height: 3,
     }, */
});

export default Trip;