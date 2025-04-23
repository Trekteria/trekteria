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
import { db } from "../../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

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
      // Update local state immediately for better UX
      setMissions((prevMissions) =>
        prevMissions.map((mission) =>
          mission.id === id
            ? { ...mission, completed: !mission.completed }
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
          // Find the mission to toggle
          const updatedMissions = tripData.missions.map(
            (mission: any, index: number) => {
              if ((index + 1).toString() === id) {
                return { ...mission, completed: !mission.completed }; // Toggle completed status
              }
              return mission;
            }
          );

          // Update Firestore with the new missions array
          await updateDoc(tripRef, {
            missions: updatedMissions,
          });

          console.log("Updated mission completion status in Firestore");
          console.log("Updated missions:", updatedMissions);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading missions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Missions To Complete</Text>
      <View style={styles.divider} />
      <FlatList
        data={missions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.missionItem}
            onPress={() => toggleMissionCompletion(item.id)}
          >
            <View style={styles.checkboxCircle}>
              {item.completed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text
              style={[
                styles.missionText,
                item.completed && styles.missionCompleted,
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
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
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
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
    backgroundColor: "#ccc",
    marginBottom: 18,
  },
  missionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkmark: {
    fontSize: 13,
    color: Colors.primary || "#4CAF50",
    fontWeight: "bold",
  },
  missionText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  missionCompleted: {
    textDecorationLine: "line-through",
    color: "gray",
  },
});
