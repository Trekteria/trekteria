import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Linking, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

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

        // const kelvinToF = (k: number) => ((k - 273.15) * 9) / 5 + 32;

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
        <ActivityIndicator size="large" color="#2f4f2f" />
        <Text>Loading trip info...</Text>
      </View>
    );
  }

  if (error || !tripInfo) {
    return (
      <View style={styles.errorContainer}>
        <Text>{error || "No trip data available."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.tripName}>{tripInfo.name}</Text>
      <Text style={styles.subheader}>
        <Ionicons name="star" size={12} color="#2f4f2f" />{" "}
        {tripInfo.difficultyLevel?.slice(0, -1)} | {tripInfo.location}
      </Text>

      <View style={styles.divider} />

      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Contact</Text>
          <Text style={styles.value}>{tripInfo.parkContact}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Website</Text>
          <TouchableOpacity onPress={() => Linking.openURL(tripInfo.parkWebsite)}>
            <Text style={[styles.value, { color: "#42643D", textDecorationLine: "underline" }]}>
              {getDisplayUrl(tripInfo.parkWebsite)}
            </Text>
          </TouchableOpacity>
        </View>
        {/* <View style={styles.gridItem}>
          <Text style={styles.label}>Cell Service</Text>
          <Text style={styles.value}>{tripInfo.cellService}</Texts>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Hours</Text>
          <Text style={styles.value}>{tripInfo.hours}</Text>
        </View> */}
      </View>
    
      <View style={styles.section}>
          <Text style={styles.label}>Cell Service</Text>
          <Text style={styles.paragraph}>{tripInfo.cellService}</Text>
        </View>

      <View style={styles.section}>
        <Text style={styles.label}>Summary</Text>
        <Text style={styles.paragraph}>{tripInfo.description}</Text>
      </View>
{/* 
      <View style={styles.section}>
        <Text style={styles.label}>Amenities</Text>
        <Text style={styles.value}>
          {Array.isArray(tripInfo.amenities) ? tripInfo.amenities.join(", ") : "N/A"}
        </Text>
      </View> */}
      <View style={styles.section}>
        <Text style={styles.label}>Amenities</Text>
        <Text style={styles.value}>
          {Array.isArray(tripInfo.amenities)
            ? tripInfo.amenities
                .map((item: string) => item.charAt(0).toUpperCase() + item.slice(1))
                .join(", ")
            : "N/A"}
        </Text>
      </View>


      {/* <View style={styles.section}>
        <Text style={styles.label}>Highlights</Text>
        <Text style={styles.value}>
          {Array.isArray(tripInfo.highlights) ? tripInfo.highlights.join(", ") : "N/A"}
        </Text>
      </View> */}
      <View style={styles.section}>
        <Text style={styles.label}>Highlights</Text>
        <Text style={styles.value}>
          {Array.isArray(tripInfo.highlights)
            ? tripInfo.highlights
                .map((item: string) => item.charAt(0).toUpperCase() + item.slice(1))
                .join(", ")
            : "N/A"}
        </Text>
      </View>

      {/* Weather Conditions Section */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Conditions <Ionicons name="cloud-outline" size={12} color="gray" />
        </Text>

        <Text style={styles.tempText}>{weather?.temperature ?? "--"}</Text>

        <View style={styles.conditionsRow}>
          <Text style={styles.tempValue}>{weather?.status ?? "--"}</Text>
          {/* {weather?.icon && (
            <Image source={{uri: weather.icon }} style={{ width: 40, height: 40 }} />
          )} */}
        </View>

        <View style={styles.conditionsRow}>
          {/* <Text style={styles.tempValue}>Feels Like: {weather?.feels_like ?? "--"}</Text> */}
          <Text style={styles.tempValue}>Humidity: {weather?.humidity ?? "--"}</Text>
          <Text style={styles.tempValue}>
            <Ionicons name="water-outline" size={12} color="black" /> Precipitation: {weather?.precipitation ?? "--"}
          </Text>
        </View>

        <View style={styles.conditionsRow}>
          <Text style={styles.tempValue}>H: {weather?.high ?? "--"} | L: {weather?.low ?? "--"}</Text>
          <Text style={styles.tempValue}>
            <Ionicons name="sunny-outline" size={12} color="black" /> Sunrise: {weather?.sunrise ?? "--"}
          </Text>
        </View>

        <View style={styles.conditionsRow}>
          {/* <Text style={styles.tempValue}>Humidity: {weather?.humidity ?? "--"}</Text> */}
          <Text style={styles.tempValue}>Sea Level: {weather?.seaLevel ?? "--"}</Text>
          <Text style={styles.tempValue}>
            <Ionicons name="partly-sunny-outline" size={12} color="black" /> Sunset: {weather?.sunset ?? "--"}
          </Text>
        </View>

        {/* <View style={styles.conditionsRow}>
          <Text style={styles.tempValue}>Sea Level: {weather?.seaLevel ?? "--"}</Text>
        </View> */}
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    fontSize: 12,
    color: "black",
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
