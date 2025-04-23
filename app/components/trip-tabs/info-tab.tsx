import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";

const tripInfo = {
  name: "Fort Point",
  rating: 4.7,
  difficulty: "Moderate",
  state: "State",
  distance: "3.9 mi",
  duration: "2 hours",
  elevation: "1000 ft",
  type: "Loop",
  summary:
    "Uvas Canyon is a very beautiful park. Fascinating with vibrant scenes and diverse eco system.",
  hours: "5 am | 9 pm",
  conditions: {
    temperature: "72°F",
    status: "Cloudy",
    high: "50",
    low: "30",
    uv: "0 | Low",
    precipitation: "2%",
    sunrise: "5:00 am",
    sunset: "5:50 pm",
  },
};

// function InfoTab({ tripData }: InfoTabProps) {
//   // Use tripData if provided, otherwise fall back to default
//   const tripInfo = tripData || defaultTripInfo;
function InfoTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.tripName}>{tripInfo.name}</Text>
      <Text style={styles.subheader}>
        <Ionicons name="star" size={12} color="#2f4f2f" /> {tripInfo.rating} |{" "}
        {tripInfo.difficulty} | {tripInfo.state}
      </Text>

      <View style={styles.divider} />

      {/* Grid Section */}
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>{tripInfo.distance}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Duration</Text>
          <Text style={styles.value}>{tripInfo.duration}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Elevation</Text>
          <Text style={styles.value}>{tripInfo.elevation}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{tripInfo.type}</Text>
        </View>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Summary</Text>
        <Text style={styles.paragraph}>{tripInfo.summary}</Text>
      </View>

      {/*  Hour Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Hours</Text>
        <Text style={styles.value}>{tripInfo.hours}</Text>
      </View>

      {/* Conditions Section */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Conditions <Ionicons name="cloud-outline" size={12} color="gray" />
        </Text>
        <Text style={styles.tempText}>{tripInfo.conditions.temperature}</Text>

        <View style={styles.conditionsRow}>
          <Text style={styles.tempValue}>{tripInfo.conditions.status}</Text>

          <Text style={styles.tempValue}>
            <Ionicons name="water-outline" size={12} color="black" />
            Precipitation: {tripInfo.conditions.precipitation}
          </Text>
        </View>
        <View style={styles.conditionsRow}>
          <Text style={styles.tempValue}>
            H: {tripInfo.conditions.high} | L: {tripInfo.conditions.low}
          </Text>
          <Text style={styles.tempValue}>
            <Ionicons name="sunny-outline" size={12} color="black" />
            Sunrise: {tripInfo.conditions.sunrise}
          </Text>
        </View>
        <View style={styles.conditionsRow}>
          <Text style={styles.tempValue}>UV: {tripInfo.conditions.uv}</Text>
          <Text style={styles.tempValue}>
            <Ionicons name="partly-sunny-outline" size={12} color="black" />
            Sunset : {tripInfo.conditions.sunset}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  tripName: {
    fontSize: 16,
    textAlign: "center",
  },
  subheader: {
    fontSize: 12,
    textAlign: "center",
    color: "gray",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 10,
  },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "white",
  },
  gridItem: {
    width: "47%",
    marginBottom: 5,
  },

  section: {
    marginTop: 10,
    backgroundColor: "white",
  },

  label: {
    fontSize: 12,
    color: "gray",
    marginBottom: 4,
    marginTop: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: "500",
  },

  paragraph: {
    color: "#333",
    fontSize: 13,
    marginTop: 4,
  },

  tempText: {
    fontSize: 22,
    fontWeight: "500",
    marginVertical: 4,
  },
  tempValue: {
    fontSize: 12,
    color: "black",
  },
  conditionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
});

export default InfoTab;
