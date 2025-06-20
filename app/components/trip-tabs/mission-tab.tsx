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
import { supabase } from "../../../services/supabaseConfig";
import { useColorScheme } from "../../../hooks/useColorScheme";
import { trackScreen, trackEvent } from "../../../services/analyticsService";

// Add this interface to define the component props
interface MissionTabProps {
  tripId?: string;
  tripData?: any;
}

export default function MissionTab({ tripId, tripData }: MissionTabProps) {
  const [missions, setMissions] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Track tab view
  useEffect(() => {
    trackScreen('trip_mission_tab');
    trackEvent('trip_mission_tab_viewed', {
      trip_id: tripId,
      category: 'trip_interaction'
    });
  }, [tripId]);

  // Fetch missions from Supabase or tripData
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
          // Fetch trip data from Supabase
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', currentTripId)
            .single();

          if (tripError) {
            console.error("Error fetching trip:", tripError);
            setDefaultMissions();
          } else if (tripData && tripData.missions && Array.isArray(tripData.missions)) {
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

      // Fetch current trip data from Supabase
      const { data: currentTripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', currentTripId)
        .single();

      if (tripError) {
        console.error("Error fetching trip:", tripError);
        return;
      }

      if (currentTripData && currentTripData.missions && Array.isArray(currentTripData.missions)) {
        // Find the mission to toggle and track its points
        let missionPoints = 0;
        let missionToUpdate = null;

        const updatedMissions = currentTripData.missions.map(
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

        // Update Supabase with the new missions array
        const { error: updateError } = await supabase
          .from('trips')
          .update({ missions: updatedMissions })
          .eq('id', currentTripId);

        if (updateError) {
          console.error("Error updating missions:", updateError);
          return;
        }

        // Get current user to update their eco points
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (user && missionToUpdate) {
          // Fetch current user data
          const { data: userData, error: fetchUserError } = await supabase
            .from('users')
            .select('eco_points')
            .eq('id', user.id)
            .single();

          if (fetchUserError) {
            console.error("Error fetching user data:", fetchUserError);
            return;
          }

          const currentPoints = userData?.eco_points || 0;

          if (newCompletionStatus) {
            // If mission is now completed, add points
            const { error: pointsError } = await supabase
              .from('users')
              .update({ eco_points: currentPoints + missionPoints })
              .eq('id', user.id);

            if (pointsError) {
              console.error("Error updating eco points:", pointsError);
            } else {
              trackEvent('mission_completed', {
                trip_id: currentTripId,
                mission_id: id,
                points_earned: missionPoints,
                new_total_points: currentPoints + missionPoints,
                category: 'mission_interaction'
              });
              console.log(
                `Added ${missionPoints} eco points. New total: ${currentPoints + missionPoints}`
              );
            }
          } else {
            // If mission is now uncompleted, subtract points (don't go below 0)
            const newTotal = Math.max(0, currentPoints - missionPoints);
            const { error: pointsError } = await supabase
              .from('users')
              .update({ eco_points: newTotal })
              .eq('id', user.id);

            if (pointsError) {
              console.error("Error updating eco points:", pointsError);
            } else {
              trackEvent('mission_uncompleted', {
                trip_id: currentTripId,
                mission_id: id,
                points_lost: missionPoints,
                new_total_points: newTotal,
                category: 'mission_interaction'
              });
              console.log(
                `Removed ${missionPoints} eco points. New total: ${newTotal}`
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error toggling mission completion:", error);
      // Revert local state on error
      setMissions((prevMissions) =>
        prevMissions.map((mission) =>
          mission.id === id
            ? { ...mission, completed: !mission.completed }
            : mission
        )
      );
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
