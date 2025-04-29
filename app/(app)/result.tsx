import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Typography } from "../../constants/Typography";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trip as FirestoreTrip } from "@/types/Types";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../../services/firebaseConfig";
import { checkImageRelevance } from "@/services/geminiService";

// Define the Trip interface for type safety
interface Trip {
  name: string;
  location: string;
  keyFeatures: string;
  facilities: string;
  latitude?: number;
  longitude?: number;
  id?: string;
  bookmarked?: boolean;
}

const defaultTripImages = [
  "https://images.unsplash.com/photo-1676782778930-11b311ec5134?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1600284536251-8bb98db53468?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1605196560547-b2f7281b7355?auto=format&fit=crop&q=80&w=1000",
];

export default function Result() {
  const router = useRouter();
  const { planId: routePlanId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [parsedTrips, setParsedTrips] = useState<Trip[]>([]);
  const [tripImages, setTripImages] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryValue, errorValue, lastPlanId] = await Promise.all([
          AsyncStorage.getItem("tripSummary"),
          AsyncStorage.getItem("tripError"),
          AsyncStorage.getItem("lastPlanId"),
        ]);

        if (errorValue) {
          setError(errorValue);
          setLoading(false);
          return;
        }

        if (summaryValue) {
          setSummary(summaryValue);
        }

        const targetPlanId = routePlanId ? String(routePlanId) : lastPlanId;

        if (targetPlanId) {
          const user = auth.currentUser;
          if (!user) {
            setError("You must be logged in to view recommendations");
            setLoading(false);
            return;
          }

          const tripsCollection = collection(db, "trips");
          const tripsQuery = query(
            tripsCollection,
            where("planId", "==", targetPlanId)
          );
          const tripsSnapshot = await getDocs(tripsQuery);

          const firestoreTrips: FirestoreTrip[] = [];
          tripsSnapshot.forEach((doc) => {
            firestoreTrips.push({ id: doc.id, ...doc.data() } as FirestoreTrip);
          });

          const tripsForDisplay = firestoreTrips.map((trip) => ({
            id: trip.id,
            name: trip.name,
            location: trip.location,
            keyFeatures: trip.highlights?.join(", ") || "",
            facilities: trip.amenities?.join(", ") || "",
            latitude: trip.coordinates?.latitude,
            longitude: trip.coordinates?.longitude,
            bookmarked: trip.bookmarked || false,
          }));

          if (tripsForDisplay.length === 0) {
            setError("No valid trip recommendations found. Please try again.");
          } else {
            setParsedTrips(tripsForDisplay);

            // Fetch images for each trip
            const imagePromises = tripsForDisplay.map((trip) =>
              fetchUnsplashImage(trip.name)
            );
            const images = await Promise.all(imagePromises);
            setTripImages(images);
          }
        } else {
          setError("No trip recommendations found. Please try again.");
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load recommendations. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [routePlanId]);

  const fetchUnsplashImage = async (query: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}&auto=format&fit=crop&q=80&w=1000`
      );

      const data = await response.json();
      const description = data.results[0]?.description || "";
      const altDescription = data.results[0]?.alt_description || "";
      const isRelevantString = await checkImageRelevance(
        description,
        altDescription
      );
      let imageUrl = data.results[0]?.urls?.small || ""; // Default to Unsplash image URL
      if (isRelevantString.trim() === "True") {
      } else if (isRelevantString.trim() === "False") {
        // If the image is not relevant, cycle through default images sequentially
        let currentIndex = tripImages.length % defaultTripImages.length; // Calculate the index based on the current number of trip images
        imageUrl = defaultTripImages[currentIndex]; // Use the image at the calculated index
        tripImages.push(imageUrl); // Add the selected image to the tripImages array to track usage
      }
      return imageUrl;
    } catch (error) {
      console.error(`Error fetching image for query "${query}":`, error);
      return ""; // Return an empty string if the image fetch fails
    }
  };

  const handleClose = () => {
    router.push("/(app)/home");
  };

  const handleRetry = () => {
    AsyncStorage.removeItem("tripError")
      .then(() => {
        router.push("/(app)/preferences");
      })
      .catch((err: any) => console.error("Error clearing error state:", err));
  };

  const handleTripPress = (trip: Trip) => {
    router.push({
      pathname: "/trip",
      params: { trip: JSON.stringify(trip) },
    });
  };

  const handleBookmarkPress = async (trip: Trip, index: number) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("User must be logged in to bookmark trips");
        return;
      }

      if (!trip.id) {
        console.error("Trip ID is missing");
        return;
      }

      const isCurrentlyBookmarked = trip.bookmarked || false;

      const tripRef = doc(db, "trips", trip.id);
      await updateDoc(tripRef, {
        bookmarked: !isCurrentlyBookmarked,
      });

      const updatedTrips = [...parsedTrips];
      updatedTrips[index] = {
        ...trip,
        bookmarked: !isCurrentlyBookmarked,
      };
      setParsedTrips(updatedTrips);
    } catch (error) {
      console.error("Error updating bookmark status:", error);
    }
  };

  const renderTripCard = (trip: Trip, index: number) => {
    const defaultImage =
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=1000"; // Fallback image URL for duplicates

    // Track used image URLs to avoid duplicates
    const usedImages = new Set<string>();

    // Ensure no duplicate background images
    let backgroundImage = tripImages[index] || defaultImage;
    if (usedImages.has(backgroundImage)) {
      backgroundImage = defaultImage; // Use default image if duplicate is found
    } else {
      usedImages.add(backgroundImage); // Add to the set of used images
    }

    return (
      <TouchableOpacity
        key={index}
        style={styles.tripCard}
        onPress={() => handleTripPress(trip)}
      >
        <ImageBackground
          source={{ uri: backgroundImage }}
          style={{ width: "100%", height: "100%", justifyContent: "flex-end" }}
          imageStyle={{ borderRadius: 15 }}
        >
          <View style={styles.cardOverlay}>
            <View style={styles.bookmarkContainer}>
              <TouchableOpacity
                onPress={() => handleBookmarkPress(trip, index)}
              >
                <Ionicons
                  name={trip.bookmarked ? "heart" : "heart-outline"}
                  size={30}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.tripName}>{trip.name}</Text>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={18} color="white" />
                <Text style={styles.detailText}>{trip.location}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="leaf-outline" size={18} color="white" />
                <Text style={styles.detailText}>{trip.keyFeatures}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="white"
                />
                <Text style={styles.detailText}>{trip.facilities}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={40} color={Colors.black} />
        </TouchableOpacity>

        {routePlanId ? (
          <>
            <Text style={styles.title}>Your Saved Trip</Text>
            <Text style={styles.secondTitle}>Trip Details</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Handpicked for you -</Text>
            <Text style={styles.secondTitle}>Select Your Trip!</Text>
          </>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>
                Loading your trip recommendations...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : parsedTrips.length > 0 ? (
            <View style={styles.tripsContainer}>
              {parsedTrips.map(renderTripCard)}
            </View>
          ) : summary ? (
            <View style={styles.section}>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  closeButton: {
    zIndex: 10,
    marginBottom: 20,
  },
  title: {
    ...Typography.text.h2,
    marginBottom: 5,
    color: Colors.primary,
    textAlign: "left",
  },
  secondTitle: {
    ...Typography.text.h1,
    fontWeight: "thin",
    color: Colors.primary,
    textAlign: "left",
  },
  section: {
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  sectionTitle: {
    ...Typography.text.h3,
    marginBottom: 10,
  },
  text: {
    ...Typography.text.body,
    lineHeight: 22,
  },
  summaryText: {
    ...Typography.text.body,
    lineHeight: 24,
    color: Colors.black,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    ...Typography.text.body,
    marginTop: 10,
    color: Colors.inactive,
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    ...Typography.text.body,
    color: "red",
    marginBottom: 15,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    ...Typography.text.button,
    color: "white",
  },
  tripsContainer: {
    marginBottom: 30,
  },
  tripCard: {
    marginBottom: 10,
    borderRadius: 20,
    overflow: "hidden",
    height: 210,
    elevation: 4,
  },
  cardOverlay: {
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    position: "relative",
  },
  bookmarkContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    borderRadius: 10,
    zIndex: 10,
  },
  tripName: {
    ...Typography.text.h2,
    color: "white",
  },
  detailsContainer: {
    marginTop: 5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
    gap: 5,
  },
  detailText: {
    ...Typography.text.body,
    color: "white",
    fontSize: 14,
    marginLeft: 10,
  },
  dateContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    zIndex: 10,
  },
  dateText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
});
