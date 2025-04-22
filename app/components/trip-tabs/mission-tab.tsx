import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Typography } from "../../../constants/Typography";

export default function MissionTab() {
  const [missions, setMissions] = useState([
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

  const toggleMissionCompletion = (id: string) => {
    setMissions((prevMissions) =>
      prevMissions.map((mission) =>
        mission.id === id
          ? { ...mission, completed: !mission.completed }
          : mission
      )
    );
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: "#4CAF50",
    fontWeight: "bold",
  },
  missionText: {
    ...Typography.text.body,
  },
  missionCompleted: {
    textDecorationLine: "line-through",
    color: "gray",
  },
});
