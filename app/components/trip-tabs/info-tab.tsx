
import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const steps = [
  { instruction: "Drive from San Jose to Park", time: "11-12 PM" },
  { instruction: "Check-in at the park", time: "12-1 PM" },
  { instruction: "Lunch & Explore camping area", time: "1:30-3 PM" },
  { instruction: "Short sunset walk near campground", time: "3:30-5:30 PM" },
  { instruction: "Dinner & campfire relaxation", time: "6 PM" },
];

function InfoTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.dateText}>02/25/2025 (Tue)</Text>
          <View style={styles.divider} />

      <FlatList
        data={steps}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.stepContainer}>
            <View style={styles.iconColumn}>
              <Ionicons name="location-sharp" size={28} color="#2f4f2f" />

              {index !== steps.length - 1 && (
                <View style={styles.dottedLine} />
              )}
            </View>

            <View style={styles.instructionRow}>
              <Text style={styles.instructionText}>{item.instruction}</Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
  
  },
  dateText: {
    textAlign: "center",
//     fontWeight: "400",
    fontSize: 16,
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
     backgroundColor: "white",
     width: "100%",
     height: 50,
  },
  iconColumn: {
    alignItems: "center",
    width: 30,
    height: 50,
    backgroundColor: "white",
  },
//   dottedLine: {
//     width: 1,
//     flex: 1,
//     borderStyle: "dotted",
//     borderLeftWidth: 1,
//     borderColor: "#aaa",
//     backgroundColor: "black",
//   },
     dottedLine: {
          flex: 1,
          borderLeftWidth: 1,
          backgroundColor: "black",
     },
  instructionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 10,
    flex: 1,
  },
  instructionText: {
    fontSize: 15,
    fontWeight: "400",
    color: "#000",
    flex: 1,
    flexWrap: "wrap",
  },
  timeText: {
    fontSize: 13,
    color: "#777",
    marginLeft: 10,
    alignSelf: "flex-start",
  },
  divider: {
     height: 1,
     backgroundColor: "#ccc",
     marginBottom: 18,
   },
});

export default InfoTab;
