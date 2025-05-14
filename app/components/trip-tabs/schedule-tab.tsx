import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../../constants/Typography";
import * as Haptics from "expo-haptics";
import { Colors } from "../../../constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useColorScheme } from "../../../hooks/useColorScheme";
import { getCachedTrailData, cacheTrailData } from '../../../services/cacheService';

// Add interface for component props
interface ScheduleTabProps {
  tripId?: string;
  tripData?: any;
}

function ScheduleTab({ tripId, tripData }: ScheduleTabProps) {
  const [schedule, setSchedule] = useState<Array<{
    day: number;
    date: string;
    activities: Array<{
      startTime: string;
      endTime: string;
      activity: string;
    }>;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Fetch schedule from Firestore or tripData
  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        let currentTripId = tripId;

        if (!currentTripId && tripData?.id) {
          currentTripId = tripData.id;
        }

        if (currentTripId) {
          await AsyncStorage.setItem("selectedTripId", currentTripId);
        } else {
          const storedTripId = await AsyncStorage.getItem("selectedTripId");
          if (storedTripId) {
            currentTripId = storedTripId;
          }
        }

        if (tripData?.schedule && Array.isArray(tripData.schedule)) {
          setSchedule(tripData.schedule);
          setLoading(false);
          return;
        }

        if (currentTripId) {
          // Try cache first
          const cached = await getCachedTrailData(currentTripId);
          if (cached && Array.isArray(cached.schedule)) {
            console.log('Schedule loaded from CACHE for ScheduleTab:', currentTripId);
            setSchedule(cached.schedule);
            setLoading(false);
            return;
          }
          // Fallback to Firestore
          const tripDoc = await getDoc(doc(db, "trips", currentTripId));
          if (tripDoc.exists()) {
            const tripData = tripDoc.data();
            if (tripData.schedule && Array.isArray(tripData.schedule)) {
              console.log('Schedule loaded from FIREBASE for ScheduleTab:', currentTripId);
              setSchedule(tripData.schedule);
              await cacheTrailData(currentTripId, tripData);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching schedule:", err);
        setError("Failed to load schedule");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [tripId, tripData]);

  const goToPreviousDay = () => {
    if (currentDayIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentDayIndex(currentDayIndex - 1);
    }
  };

  const goToNextDay = () => {
    if (currentDayIndex < schedule.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading schedule...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: isDarkMode ? "#ff6b6b" : "red" }]}>{error}</Text>
      </View>
    );
  }

  if (schedule.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.emptyText, { color: theme.inactive }]}>No schedule available for this trip.</Text>
      </View>
    );
  }

  const currentDay = schedule[currentDayIndex];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={goToPreviousDay}
          disabled={currentDayIndex === 0}
          style={styles.navButton}
        >
          <Ionicons
            name="chevron-back"
            size={25}
            color={currentDayIndex === 0 ? theme.inactive : theme.primary}
          />
        </TouchableOpacity>

        <Text style={[styles.dateText, { color: theme.text }]}>{currentDay.date}</Text>

        <TouchableOpacity
          onPress={goToNextDay}
          disabled={currentDayIndex === schedule.length - 1}
          style={styles.navButton}
        >
          <Ionicons
            name="chevron-forward"
            size={25}
            color={currentDayIndex === schedule.length - 1 ? theme.inactive : theme.primary}
          />
        </TouchableOpacity>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

      <FlatList
        data={currentDay.activities}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.stepContainer}>
            <View style={styles.iconColumn}>
              <Ionicons name="location-sharp" size={28} color={theme.primary} />
              {/* {index !== currentDay.activities.length - 1 && (
                <View style={styles.lineContainer}>
                  <View style={styles.dashedLine} />
                  <View style={styles.dashedLine} />
                  <View style={styles.dashedLine} />
                </View> 
              {/* )} */}
            </View>

            <View style={styles.instructionRow}>
              <Text style={[styles.instructionText, { color: theme.text }]}>{item.activity}</Text>
              <Text style={[styles.timeText, { color: theme.inactive }]}>{(item.startTime).slice(0, -2)} - {(item.endTime)}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 15,
    paddingTop: 4,
  },
  dateText: {
    ...Typography.text.h3,
    textAlign: "center",
    fontSize: 16,
  },
  navButton: {
    padding: 5,
    borderRadius: 100,
    boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    minHeight: 30,
    marginBottom: 30,
  },
  iconColumn: {
    alignItems: "center",
    width: 30,
    height: "100%",
  },
  lineContainer: {
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  dashedLine: {
    width: 1.5,
    height: 7,
    marginBottom: 5,
    backgroundColor: Colors.primary,
  },
  instructionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 15,
    flex: 1,
  },
  instructionText: {
    ...Typography.text.body,
    fontSize: 16,
    fontWeight: "400",
    flex: 1,
    flexWrap: "wrap",
  },
  timeText: {
    ...Typography.text.body,
    fontSize: 14,
    marginLeft: 10,
  },
  divider: {
    height: 1,
    marginBottom: 18,
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
  },
});

export default ScheduleTab;
