import { Trail } from "../types/Types";
import { createTrip, createTrail, updateTrip } from "./firestoreService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timestamp } from "firebase/firestore";

/**
 * Fetch coordinates from OpenStreetMap API
 * @param name Trail name
 * @param location Trail location
 * @returns Object with latitude and longitude or null
 */
export const fetchCoordinates = async (
  name: string,
  location: string
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    console.log("Fetching coordinates for:", name + ", " + location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        name + ", " + location
      )}`
    );
    const data = await response.json();
    if (data && data[0]) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    } else {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          location
        )}`
      );
      const data = await response.json();
      if (data && data[0]) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};

/**
 * Parse the recommendation string into structured trail data
 * @param recommendationsString Raw string from Gemini API
 * @param userId Current user's ID
 * @returns Array of parsed Trail objects
 */
export const parseRecommendations = async (
  recommendationsString: string,
  userId: string
): Promise<Trail[]> => {
  if (!recommendationsString) return [];

  // Check if the string contains valid trail data (should contain '#' and '!')
  if (
    !recommendationsString.includes("#") ||
    !recommendationsString.includes("!")
  ) {
    console.error("Invalid recommendations format:", recommendationsString);
    return [];
  }

  // Split the string by '#' to get individual trails (ignoring empty first element if string starts with #)
  const trailStrings = recommendationsString.split("#").filter(Boolean);

  // Process each trail and fetch coordinates
  const trails = await Promise.all(
    trailStrings.map(async (trailString) => {
      // Split each trail string by the delimiters
      const parts = trailString.split(/[!@%]/);
      const name = parts[0] || "";
      const location = parts[1] || "";

      // Skip if this is an error message
      if (
        name.toLowerCase().includes("sorry") ||
        name.toLowerCase().includes("error")
      ) {
        console.error("Skipping invalid trail data:", name);
        return null;
      }

      // Fetch coordinates for the location
      const coordinates = await fetchCoordinates(name, location);

      // Calculate estimated time based on keyFeatures
      const keyFeatures = parts[2] || "";
      const facilities = parts[3] || "";

      // Extract features and facilities
      const highlightsArr = keyFeatures
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const amenitiesArr = facilities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      // Create a structured trail object
      return {
        name: name.trim(),
        location: location.trim(),
        description: `${keyFeatures}. Amenities include: ${facilities}`,
        difficulty: "", // To be filled if available
        length: 0, // To be filled if available
        elevation: 0, // To be filled if available
        estimatedTime: "", // To be filled if available
        activities: [], // To be filled if available
        amenities: amenitiesArr,
        coordinates,
        highlights: highlightsArr,
        trailType: "", // To be filled if available
        terrain: "", // To be filled if available
        createdAt: Timestamp.now(), // Using Firestore Timestamp
        tripId: "", // This will be set later when saving to Firestore
        bookmarked: false, // Default value for bookmarked field
        userId, // Set the userId
      } as Trail;
    })
  );

  // Filter out any null entries from invalid trails
  return trails.filter((trail): trail is Trail => trail !== null);
};

/**
 * Save a trip and its trails to Firestore and AsyncStorage
 * @param userId The ID of the current user
 * @param formData Form data from preferences
 * @param formattedSummary Text summary of preferences
 * @param trails Array of parsed trails
 * @returns The ID of the created trip
 */
export const saveTrip = async (
  userId: string,
  formData: any,
  formattedSummary: string,
  trails: Trail[]
): Promise<string> => {
  try {
    // Format the preferences data structure to match Firestore
    const preferences = {
      dateRange: formData[1]?.value || {},
      difficultyPreference: formData[4]?.value?.split(" - ")[0] || "",
      experienceLevel: formData[3]?.value || "",
      groupComposition: {
        adults: formData[2]?.value?.adults || 0,
        olderKids: formData[2]?.value?.olderKids || 0,
        pets: formData[2]?.value?.pets || 0,
        toddlers: formData[2]?.value?.toddlers || 0,
        youngKids: formData[2]?.value?.youngKids || 0,
      },
      hikeDuration: formData[5]?.value || "",
      location: formData[0]?.value?.location || "",
      mustHaves: formData[9]?.value || [],
      radius: formData[0]?.value?.radius || 25,
      sceneryPreferences: formData[6]?.value || [],
      terrainPreference: formData[7]?.value || "",
      timeOfDay: formData[10]?.value?.split(" - ")[0] || "",
      trailFeatures: formData[8]?.value || [],
    };

    // Create a new trip in Firestore
    const tripData = {
      createdAt: Timestamp.now(),
      preferences,
      summary: formattedSummary,
      userId,
      trailIds: [],
    };

    // Save the trip to Firestore
    const tripId = await createTrip(tripData);

    // Save each trail to Firestore with the tripId
    const trailIds = await Promise.all(
      trails.map(async (trail) => {
        const trailWithTripId = {
          ...trail,
          tripId,
          userId,
          createdAt: Timestamp.now(),
        };
        return await createTrail(trailWithTripId);
      })
    );

    // Update the trip with the trail IDs
    await updateTrip(tripId, { trailIds });

    // Save only the summary to AsyncStorage
    // This is non-Firestore data that we still need to persist
    await AsyncStorage.setItem("trailSummary", formattedSummary);

    // No need to store trails in AsyncStorage as Firestore persistence will handle this
    // Removed: await AsyncStorage.setItem("trailRecommendations", JSON.stringify(trails));
    // Removed: await AsyncStorage.setItem("parsedTrails", JSON.stringify(trails));

    // Instead, store a reference to the trip ID for easy access
    await AsyncStorage.setItem("lastTripId", tripId);

    return tripId;
  } catch (error) {
    console.error("Error saving trip and trails:", error);
    throw error;
  }
};

/**
 * Process recommendations from Gemini API
 * @param userId Current user ID
 * @param formData Raw form data
 * @param formattedSummary User's preferences summary (text)
 * @param recommendationsString Raw recommendations from Gemini API
 * @returns The ID of the created trip
 */
export const processRecommendations = async (
  userId: string,
  formData: any,
  formattedSummary: string,
  recommendationsString: string
): Promise<string> => {
  try {
    // Parse the recommendations
    const trails = await parseRecommendations(recommendationsString, userId);

    if (trails.length === 0) {
      throw new Error("No valid trail recommendations found");
    }

    // Save the trip and trails to Firestore and AsyncStorage
    const tripId = await saveTrip(userId, formData, formattedSummary, trails);

    return tripId;
  } catch (error) {
    console.error("Error processing recommendations:", error);
    throw error;
  }
};
