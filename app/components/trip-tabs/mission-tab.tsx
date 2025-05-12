import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Typography } from "../../../constants/Typography";
import { Colors } from "../../../constants/Colors";
import { db, auth } from "../../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useColorScheme } from "../../../hooks/useColorScheme";

// Add this interface to define the component props
interface MissionTabProps {
  tripId?: string;
  tripData?: any;
}

export default function MissionTab({ tripId, tripData }: MissionTabProps) {
  const [missions, setMissions] = useState<
    Array<{ id: string; title: string; completed: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Fetch missions from Firestore or tripData
  useEffect(() => {
    const fetchMissions = async () => {
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

        if (tripData?.missions && Array.isArray(tripData.missions)) {
          setMissions(tripData.missions);
          setLoading(false);
          return;
        }

        if (currentTripId) {
          const tripDoc = await getDoc(doc(db, "trips", currentTripId));
          if (tripDoc.exists()) {
            const tripData = tripDoc.data();
            if (tripData.missions && Array.isArray(tripData.missions)) {
              setMissions(
                tripData.missions.map((mission: any, index: number) => ({
                  id: mission.id || String(index + 1),
                  title:
                    mission.title || mission.task || "Mission " + (index + 1),
                  completed: mission.completed || false,
                }))
              );
            } else {
              setDefaultMissions();
            }
          } else {
            setDefaultMissions();
          }
        } else {
          setDefaultMissions();
        }
      } catch (err) {
        console.error("Error fetching missions:", err);
        setError("Failed to load missions");
        setDefaultMissions();
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
  }, [tripId, tripData]);

  const setDefaultMissions = () => {
    setMissions([
      {
        id: "1",
        title: "🗑️ Pick up 3 pieces of litter and log it.",
        completed: false,
      },
      {
        id: "2",
        title: "📷 Take a photo of a rare plant and ID it.",
        completed: false,
      },
      {
        id: "3",
        title: "⛺ Find a Leave No Trace-friendly campsite.",
        completed: false,
      },
    ]);
  };

  const toggleMissionCompletion = async (id: string) => {
    try {
      // Find the current mission in local state to get its current completion status
      const missionIndex = missions.findIndex((m) => m.id === id);
      if (missionIndex === -1) return;

      const currentMission = missions[missionIndex];
      const newCompletionStatus = !currentMission.completed;

      // Update local state immediately for better UX
      setMissions((prevMissions) =>
        prevMissions.map((mission) =>
          mission.id === id
            ? { ...mission, completed: newCompletionStatus }
            : mission
        )
      );

      // Get current trip ID
      let currentTripId = tripId || tripData?.id;
      if (!currentTripId) {
        currentTripId = (await AsyncStorage.getItem("selectedTripId")) || "";
      }

      if (!currentTripId) {
        console.error("No trip ID available");
        return;
      }

      const tripRef = doc(db, "trips", currentTripId);
      const tripDoc = await getDoc(tripRef);

      if (tripDoc.exists()) {
        const tripData = tripDoc.data();

        if (tripData.missions && Array.isArray(tripData.missions)) {
          // Find the mission to toggle and track its points
          let missionPoints = 0;
          let missionToUpdate = null;

          const updatedMissions = tripData.missions.map(
            (mission: any, index: number) => {
              // Match by ID or index+1 (as string) for backward compatibility
              if (mission.id === id || (index + 1).toString() === id) {
                missionToUpdate = mission;
                missionPoints = mission.points || (index + 1) * 5; // Use points from mission or fallback to index-based calculation

                // Toggle the completion status
                return {
                  ...mission,
                  completed: newCompletionStatus,
                };
              }
              return mission;
            }
          );

          // Update Firestore with the new missions array
          await updateDoc(tripRef, {
            missions: updatedMissions,
          });

          // Get current user to update their eco points
          const user = auth.currentUser;
          if (user && missionToUpdate) {
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();
              const currentPoints = userData.ecoPoints || 0;

              if (newCompletionStatus) {
                // If mission is now completed, add points
                await updateDoc(userRef, {
                  ecoPoints: currentPoints + missionPoints,
                });
                console.log(
                  `Added ${missionPoints} eco points. New total: ${currentPoints + missionPoints
                  }`
                );
              } else {
                // If mission is now uncompleted, subtract points (don't go below 0)
                const newTotal = Math.max(0, currentPoints - missionPoints);
                await updateDoc(userRef, {
                  ecoPoints: newTotal,
                });
                console.log(
                  `Removed ${missionPoints} eco points. New total: ${newTotal}`
                );
              }
            }
          }

          console.log("Updated mission completion status in Firestore");
        } else {
          console.error("Missions array not found in Firestore data");
        }
      } else {
        console.error("Trip document not found in Firestore");
      }
    } catch (error) {
      console.error("Error toggling mission completion:", error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.inactive }]}>Loading missions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: isDarkMode ? "#ff6b6b" : "red" }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Missions To Complete</Text>
      <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />
      <FlatList
        data={missions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.missionItem}
            onPress={() => toggleMissionCompletion(item.id)}
          >
            <View style={[styles.checkboxCircle, { borderColor: theme.text }]}>
              {item.completed && <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>}
            </View>
            <Text
              style={[
                styles.missionText,
                { color: theme.text },
                item.completed && [styles.missionCompleted, { color: theme.inactive }],
              ]}
            >
              {item.title}
            </Text>
            <View style={[styles.pointsContainer, { backgroundColor: theme.primary }]}>
              <Text style={styles.pointsText}>{(index + 1) * 5}</Text>
              <Text style={styles.pointsLabel}>pts</Text>
            </View>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.inactive }]}>
            No missions available for this trip.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
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
    ...Typography.text.body,
    textAlign: "center",
  },
  emptyText: {
    ...Typography.text.body,
    textAlign: "center",
    marginTop: 20,
  },
  title: {
    ...Typography.text.h3,
    marginBottom: 15,
    textAlign: "center",
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginBottom: 18,
  },
  missionItem: {
    lineHeight: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 6, // Add small top margin to align checkbox with first line of text
  },
  checkmark: {
    fontSize: 13,
    fontWeight: "bold",
  },
  missionText: {
    ...Typography.text.body,
    flex: 1,
    flexWrap: "wrap", // Ensure text wraps properly
    paddingRight: 10, // Add padding to ensure text has room before points
  },
  missionCompleted: {
    textDecorationLine: "line-through",
  },
  pointsContainer: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6, // Align with checkbox
  },
  pointsText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  pointsLabel: {
    color: "white",
    fontSize: 12,
    marginLeft: 2,
  },
});
