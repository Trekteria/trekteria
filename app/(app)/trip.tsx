import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  Animated,
  useWindowDimensions,
  ViewStyle,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Typography } from "../../constants/Typography";
import { Colors } from "../../constants/Colors";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { TabView, SceneMap } from "react-native-tab-view";
import { useColorScheme } from "../../hooks/useColorScheme";
import { Trip as TripType } from "../../types/Types";
import * as FileSystem from "expo-file-system";
import { format } from "date-fns";
import { supabase } from "../../services/supabaseConfig";

import InfoTab from "../components/trip-tabs/info-tab";
import ScheduleTab from "../components/trip-tabs/schedule-tab";
import PackingTab from "../components/trip-tabs/packing-tab";
import MissionTab from "../components/trip-tabs/mission-tab";
import ChatTab from "../components/trip-tabs/chat-tab";
import TripPdfGenerator from "../components/TripPdfGenerator";

// Simple routes with titles
const routes = [
  { key: "info", title: "Info" },
  { key: "schedule", title: "Schedule" },
  { key: "packing", title: "Packing" },
  // { key: "mission", title: "Mission" },
  { key: "chat", title: "Chat" },
];

// Icon mapping with proper typing for Ionicons
const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  info: "information",
  schedule: "navigate",
  packing: "bag",
  mission: "trophy",
  chat: "chatbubble-ellipses",
};

function Trip() {
  const { trip } = useLocalSearchParams();
  const router = useRouter();
  const tripData = JSON.parse(trip as string);
  const actionSheetRef = useRef<ActionSheetRef>(null);
  const [activeTab, setActiveTab] = useState<string>("info");
  const tabWidth = Dimensions.get("window").width / 5; // Width for each tab
  const animatedValue = useRef(new Animated.Value(0)).current;
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [fullTripData, setFullTripData] = useState<TripType | null>(null);

  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Fetch full trip data from Supabase
  useEffect(() => {
    const fetchTripData = async () => {
      try {
        if (!tripData.trip_id) {
          console.error("No trip ID provided");
          return;
        }

        const { data: trip, error } = await supabase
          .from('trips')
          .select('*')
          .eq('trip_id', tripData.trip_id)
          .single();

        if (error) throw error;
        if (trip) {
          setFullTripData(trip);
        }
      } catch (error) {
        console.error("Error fetching trip data:", error);
        Alert.alert("Error", "Failed to load trip details");
      }
    };

    fetchTripData();
  }, [tripData.trip_id]);

  // Replace the simple SceneMap with a function that passes props
  const renderScene = ({ route }: { route: { key: string } }) => {
    // Pass the tripData and tripId to each tab component
    switch (route.key) {
      case "info":
        return <InfoTab tripId={tripData.trip_id} tripData={fullTripData || tripData} />;
      case "schedule":
        return <ScheduleTab tripId={tripData.trip_id} tripData={fullTripData || tripData} />;
      case "packing":
        return <PackingTab tripId={tripData.trip_id} tripData={fullTripData || tripData} />;
      // case "mission":
      //   return <MissionTab tripId={tripData.trip_id} tripData={fullTripData || tripData} />;
      case "chat":
        return <ChatTab tripId={tripData.trip_id} />;
      default:
        return null;
    }
  };

  // Update animation when activeTab changes
  useEffect(() => {
    const tabIndex = [
      "info",
      "navigation",
      "packing",
      // "mission",
      "chat",
    ].indexOf(activeTab);
    Animated.spring(animatedValue, {
      toValue: (tabIndex * tabWidth) / 1.23,
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

  // Use the actual coordinates from the trip data, or fallback to default coordinates
  const initialRegion = {
    latitude: tripData.latitude || 37.7749,
    longitude: tripData.longitude || -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
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
              style={[
                styles.tabButton,
                { backgroundColor: isActive ? theme.primary : (isDarkMode ? "#333" : "#f2f2f2") },
              ]}
              onPress={() => setIndex(i)}
            >
              <Ionicons
                name={iconMap[route.key]}
                size={24}
                color={isActive ? Colors.white : theme.icon}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Create the action sheet style with proper typing
  const actionSheetStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 5,
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          showsCompass={true}
          showsScale={true}
          mapPadding={{ top: 80, right: 20, bottom: 0, left: 20 }}
          onPress={() => actionSheetRef.current?.show()}
          userInterfaceStyle={isDarkMode ? "dark" : "light"}
        >
          <Marker
            coordinate={{
              latitude: tripData.latitude || initialRegion.latitude,
              longitude: tripData.longitude || initialRegion.longitude,
            }}
            title={tripData.name}
            description={tripData.location}
          />
        </MapView>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.background }]}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={30} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tripNameContainer, { backgroundColor: theme.background }]}
          >
            <Text style={[styles.tripName, { color: isDarkMode ? theme.text : theme.primary }]}>{tripData.name}</Text>
          </TouchableOpacity>
        </View>

        {/* Use the TripPdfGenerator component */}
        <TripPdfGenerator tripId={tripData.trip_id} tripData={fullTripData || tripData} />

        <ActionSheet
          ref={actionSheetRef}
          containerStyle={actionSheetStyle}
          overlayColor="transparent"
          gestureEnabled
          snapPoints={[45, 100]}
          backgroundInteractionEnabled={true}
        >
          <View style={styles.sheetContent}>
            <View style={[styles.tabContent, { borderColor: theme.background }]}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    ...Typography.text.h1,
    marginBottom: 10,
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  topBar: {
    width: "100%",
    position: "absolute",
    top: 70,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    zIndex: 1,
  },
  backButton: {
    padding: 10,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tripNameContainer: {
    display: "flex",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "70%",
    height: "100%",
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tripName: {
    ...Typography.text.h4,
    textAlign: "center",
  },
  actionSheet: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 5,
  },
  sheetContent: {
    display: "flex",
    flexDirection: "column",
  },
  tabContent: {
    padding: 5,
    height: "100%",
  },
  customTabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    height: 70,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    borderRadius: 15,
    marginHorizontal: 5,
  },
});

export default Trip;
