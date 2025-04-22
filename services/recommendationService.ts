import { Trip } from "../types/Types";
import { createPlan, createTrip, updatePlan } from "./firestoreService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timestamp } from "firebase/firestore";
import { generateTrailMissions } from "./geminiService";

/**
 * Fetch coordinates from OpenStreetMap API
 * @param name Trip name
 * @param location Trip location
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
 * Parse the recommendation string into structured trip data
 * @param recommendationsString Raw string from Gemini API
 * @param userId Current user's ID
 * @returns Array of parsed Trip objects
 */
export const parseRecommendations = async (
  recommendationsString: string,
  userId: string
): Promise<Trip[]> => {
  if (!recommendationsString) return [];

  // Check if the string contains valid trip data (should contain '#' and '!')
  if (
    !recommendationsString.includes("#") ||
    !recommendationsString.includes("!")
  ) {
    console.error("Invalid recommendations format:", recommendationsString);
    return [];
  }

  // Split the string by '#' to get individual trips (ignoring empty first element if string starts with #)
  const tripStrings = recommendationsString.split("#").filter(Boolean);

  // Process each trip and fetch coordinates
  const trips = await Promise.all(
    tripStrings.map(async (tripString) => {
      // Split each trip string by the delimiters
      const parts = tripString.split(/[!@%]/);
      const name = parts[0] || "";
      const location = parts[1] || "";

      // Skip if this is an error message
      if (
        name.toLowerCase().includes("sorry") ||
        name.toLowerCase().includes("error")
      ) {
        console.error("Skipping invalid trip data:", name);
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

      // Generate missions based on the trail name
      const missionsString = await generateTrailMissions(name);
      const missionsArr = missionsString
        .split("#")
        .map((mission) => mission.trim());

      // Create a structured trip object
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
        tripType: "", // To be filled if available
        terrain: "", // To be filled if available
        createdAt: Timestamp.now(), // Using Firestore Timestamp
        planId: "", // This will be set later when saving to Firestore
        bookmarked: false, // Default value for bookmarked field
        userId, // Set the userId
        missions: missionsArr,
      } as Trip;
    })
  );

  // Filter out any null entries from invalid trips
  return trips.filter((trip): trip is Trip => trip !== null);
};

/**
 * Save a plan and its trips to Firestore and AsyncStorage
 * @param userId The ID of the current user
 * @param formData Form data from preferences
 * @param formattedSummary Text summary of preferences
 * @param trips Array of parsed trips
 * @returns The ID of the created plan
 */
export const savePlan = async (
  userId: string,
  formData: any,
  formattedSummary: string,
  trips: Trip[]
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
      tripFeatures: formData[8]?.value || [],
    };

    // Create a new plan in Firestore
    const planData = {
      createdAt: Timestamp.now(),
      preferences,
      summary: formattedSummary,
      userId,
      tripIds: [],
    };

    // Save the plan to Firestore
    const planId = await createPlan(planData);

    // Save each trip to Firestore with the planId
    const tripIds = await Promise.all(
      trips.map(async (trip) => {
        const tripWithPlanId = {
          ...trip,
          planId,
          userId,
          createdAt: Timestamp.now(),
        };
        return await createTrip(tripWithPlanId);
      })
    );

    // Update the plan with the trip IDs
    await updatePlan(planId, { tripIds });

    // Save only the summary to AsyncStorage
    // This is non-Firestore data that we still need to persist
    await AsyncStorage.setItem("tripSummary", formattedSummary);

    // No need to store trips in AsyncStorage as Firestore persistence will handle this
    // Removed: await AsyncStorage.setItem("tripRecommendations", JSON.stringify(trips));
    // Removed: await AsyncStorage.setItem("parsedTrips", JSON.stringify(trips));

    // Instead, store a reference to the plan ID for easy access
    await AsyncStorage.setItem("lastPlanId", planId);

    return planId;
  } catch (error) {
    console.error("Error saving plan and trips:", error);
    throw error;
  }
};

/**
 * Process recommendations from Gemini API
 * @param userId Current user ID
 * @param formData Raw form data
 * @param formattedSummary User's preferences summary (text)
 * @param recommendationsString Raw recommendations from Gemini API
 * @returns The ID of the created plan
 */
export const processRecommendations = async (
  userId: string,
  formData: any,
  formattedSummary: string,
  recommendationsString: string
): Promise<string> => {
  try {
    // Parse the recommendations
    const trips = await parseRecommendations(recommendationsString, userId);

    if (trips.length === 0) {
      throw new Error("No valid trip recommendations found");
    }

    // Save the plan and trips to Firestore and AsyncStorage
    const planId = await savePlan(userId, formData, formattedSummary, trips);

    return planId;
  } catch (error) {
    console.error("Error processing recommendations:", error);
    throw error;
  }
};
