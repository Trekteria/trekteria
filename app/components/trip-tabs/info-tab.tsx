import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Linking, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useColorScheme } from "../../../hooks/useColorScheme";
import { Colors } from "../../../constants/Colors";
import { Typography } from "../../../constants/Typography";

interface InfoTabProps {
  tripId?: string;
  tripData?: any;
}

const getDisplayUrl = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return hostname.replace("www.", "");
  } catch {
    return url;
  }
};

const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
if (!apiKey) {
  throw new Error(
    "EXPO_PUBLIC_GEMINI_API_KEY is not defined in environment variables"
  );
}

export default function InfoTab({ tripId, tripData }: InfoTabProps) {
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme];

  const [tripInfo, setTripInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    const fetchTripInfo = async () => {
      setLoading(true);
      try {
        let currentTripId = tripId;

        if (!currentTripId && tripData?.id) {
          currentTripId = tripData.id;
        }

        if (!currentTripId) {
          const storedTripId = await AsyncStorage.getItem("selectedTripId");
          if (storedTripId) currentTripId = storedTripId;
        }

        if (tripData) {
          setTripInfo(tripData);
        } else if (currentTripId) {
          const tripDoc = await getDoc(doc(db, "trips", currentTripId));
          if (tripDoc.exists()) {
            setTripInfo(tripDoc.data());
          } else {
            setError("Trip not found.");
          }
        } else {
          setError("No trip ID available.");
        }
      } catch (err) {
        console.error("Error loading trip info:", err);
        setError("Failed to load trip info.");
      } finally {
        setLoading(false);
      }
    };

    fetchTripInfo();
  }, [tripId, tripData]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!tripInfo?.coordinates.latitude || !tripInfo?.coordinates.longitude) return;

      const lat = tripInfo.coordinates.latitude;
      const lon = tripInfo.coordinates.longitude;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();

        setWeather({
          temperature: `${Math.round(data.main.temp)}°F`,
          status: data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1),
          precipitation: data.rain?.["1h"] ? `${data.rain["1h"]} mm` : "0 mm",
          high: `${Math.round(data.main.temp_max)}°F`,
          low: `${Math.round(data.main.temp_min)}°F`,
          feels_like: `${Math.round(data.main.feels_like)}°F`,
          humidity: `${data.main.humidity}%`,
          seaLevel: `${data.main.sea_level} Ft`,
          sunrise,
          sunset,
        });
      } catch (error) {
        console.error("Failed to fetch weather:", error);
      }
    };

    fetchWeather();
  }, [tripInfo]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading trip info...</Text>
      </View>
    );
  }

  if (error || !tripInfo) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error || "No trip data available."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.tripName, { color: theme.text }]}>{tripInfo.name}</Text>
      <Text style={[styles.subheader, { color: theme.icon }]}>
        <Ionicons name="star" size={12} color={theme.tint} />{" "}
        {tripInfo.difficultyLevel?.slice(0, -1)} | {tripInfo.location}
      </Text>

      <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={[styles.label, { color: theme.icon }]}>Contact</Text>
          <Text style={[styles.value, { color: theme.text }]}>{tripInfo.parkContact}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={[styles.label, { color: theme.icon }]}>Website</Text>
          <TouchableOpacity onPress={() => Linking.openURL(tripInfo.parkWebsite)}>
            <Text style={[styles.linkText, { color: theme.tint }]}>
              {getDisplayUrl(tripInfo.parkWebsite)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.icon }]}>Cell Service</Text>
        <Text style={[styles.bodyText, { color: theme.text }]}>{tripInfo.cellService}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.icon }]}>Summary</Text>
        <Text style={[styles.bodyText, { color: theme.text }]}>{tripInfo.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.icon }]}>Amenities</Text>
        <Text style={[styles.bodyText, { color: theme.text }]}>
          {Array.isArray(tripInfo.amenities)
            ? tripInfo.amenities
              .map((item: string) => item.charAt(0).toUpperCase() + item.slice(1))
              .join(", ")
            : "N/A"}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.icon }]}>Highlights</Text>
        <Text style={[styles.bodyText, { color: theme.text }]}>
          {Array.isArray(tripInfo.highlights)
            ? tripInfo.highlights
              .map((item: string) => item.charAt(0).toUpperCase() + item.slice(1))
              .join(", ")
            : "N/A"}
        </Text>
      </View>

      {/* Weather Conditions Section */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.icon }]}>
          Conditions <Ionicons name="cloud-outline" size={12} color={theme.icon} />
        </Text>

        <Text style={[styles.tempText, { color: theme.text }]}>{weather?.temperature ?? "--"}</Text>

        <View style={styles.conditionsRow}>
          <Text style={[styles.bodyText, { color: theme.text }]}>{weather?.status ?? "--"}</Text>
        </View>

        <View style={styles.conditionsRow}>
          <Text style={[styles.bodyText, { color: theme.text }]}>Humidity: {weather?.humidity ?? "--"}</Text>
          <Text style={[styles.bodyText, { color: theme.text }]}>
            <Ionicons name="water-outline" size={14} color={theme.text} /> Precipitation: {weather?.precipitation ?? "--"}
          </Text>
        </View>

        <View style={styles.conditionsRow}>
          <Text style={[styles.bodyText, { color: theme.text }]}>H: {weather?.high ?? "--"} | L: {weather?.low ?? "--"}</Text>
          <Text style={[styles.bodyText, { color: theme.text }]}>
            <Ionicons name="sunny-outline" size={14} color={theme.text} /> Sunrise: {weather?.sunrise ?? "--"}
          </Text>
        </View>

        <View style={styles.conditionsRow}>
          <Text style={[styles.bodyText, { color: theme.text }]}>Sea Level: {weather?.seaLevel ?? "--"}</Text>
          <Text style={[styles.bodyText, { color: theme.text }]}>
            <Ionicons name="partly-sunny-outline" size={14} color={theme.text} /> Sunset: {weather?.sunset ?? "--"}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    ...Typography.text.bodySmall,
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
  tripName: {
    ...Typography.text.h3,
    textAlign: "center",
  },
  subheader: {
    ...Typography.text.caption,
    textAlign: "center",
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  gridItem: {
    width: "47%",
    marginBottom: 5,
  },
  section: {
    marginTop: 10,
    marginBottom: 5,
  },
  label: {
    ...Typography.text.caption,
    fontWeight: "500",
    marginBottom: 4,
    marginTop: 4,
  },
  value: {
    ...Typography.text.body,
  },
  bodyText: {
    ...Typography.text.body,
    marginTop: 4,
    lineHeight: 22,
  },
  linkText: {
    ...Typography.text.link,
  },
  tempText: {
    ...Typography.text.h2,
    marginVertical: 4,
  },
  conditionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
