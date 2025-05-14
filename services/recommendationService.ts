import { Trip } from "../types/Types";
import { createPlan, createTrip, updatePlan } from "./firestoreService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timestamp } from "firebase/firestore";
import {
  generateInfo,
  generateSchedule,
  generateTripMissions,
  generatePackingList,
} from "./geminiService";
import { fetchUnsplashImage } from "./imageService";

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
 * @param formattedSummary Text summary of preferences
 * @param formData Raw form data
 * @returns Array of parsed Trip objects
 */
export const parseRecommendations = async (
  recommendationsString: string,
  userId: string,
  formattedSummary: string,
  formData: any
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

      // Generate info based on the trip name
      const infoString = await generateInfo(name, formattedSummary);

      // Add null checks to prevent "Cannot read property 'split' of undefined" errors
      if (!infoString) {
        console.error("generateInfo returned undefined for:", name);
        return null;
      }

      const infoParts = infoString.split("#");
      const address = infoParts[1]?.trim() || "N/A";
      const description = infoParts[2]?.trim() || "N/A";
      const cellService = infoParts[3]?.trim() || "N/A";
      const parkWebsite = infoParts[4]?.trim() || "N/A";
      const parkContact = infoParts[5]?.trim() || "N/A";
      const difficultyLevel = infoParts[6]?.trim() || "N/A";
      const warningsString = infoParts[7]?.trim() || "";

      // Process warnings into an array
      const warningsArr = warningsString
        ? warningsString
            .split(";")
            .map((warning) => warning.trim())
            .filter(Boolean)
        : [];

      // Generate schedule based on the trip name
      const scheduleString = await generateSchedule(name, formattedSummary);

      // Add null check for schedule
      if (!scheduleString) {
        console.error("generateSchedule returned undefined for:", name);
        return null;
      }

      const scheduleArr = scheduleString
        .split("$")
        .filter((day) => day && day.trim()) // Ensure day is not null/undefined and not empty
        .map((dayBlock, index) => {
          // Ensure the day block has the expected format
          if (!dayBlock.includes("#")) {
            return null;
          }

          const dayParts = dayBlock.split("#");
          const day = dayParts[0]?.trim() || "Day1";
          const activities = dayParts.slice(1).filter(Boolean);

          // Calculate the date based on startDate in dateRange
          const startDate = formData[1]?.value?.startDate
            ? new Date(formData[1]?.value?.startDate)
            : new Date();

          // Add index days to the start date to get the current day's date
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + index);

          return {
            day: index + 1, // Sequential day number starting from 1
            date: currentDate.toISOString().split("T")[0],
            activities: activities
              .map((activity) => {
                // Ensure activity has expected format
                if (
                  !activity ||
                  !activity.includes("@") ||
                  !activity.includes("-")
                ) {
                  return {
                    activity: "Error parsing activity",
                    startTime: "invalid",
                    endTime: "invalid",
                  };
                }

                const activityParts = activity.split("@");
                const activityName =
                  activityParts[0]?.trim() || "Default activity";
                const timeRange = activityParts[1] || "9:00 AM-5:00 PM";
                const timeParts = timeRange.split("-");

                return {
                  activity: activityName,
                  startTime: timeParts[0]?.trim() || "9:00 AM",
                  endTime: timeParts[1]?.trim() || "5:00 PM",
                };
              })
              .filter(
                (activity) =>
                  activity.activity !== "Default activity" &&
                  activity.activity !== "Error parsing activity"
              ),
          };
        })
        .filter(Boolean); // Filter out null entries

      // Generate missions based on the trip name
      const missionsString = await generateTripMissions(name, formattedSummary);

      // Add null check for missions and include points based on mission index
      const missionsArr = missionsString
        ? missionsString.split("#").map((mission, index) => ({
            task: mission?.trim() || "Explore the area",
            completed: false,
            points: (index + 1) * 5, // 5, 10, 15, 20, 25 points
          }))
        : [{ task: "Explore the area", completed: false, points: 5 }];

      // Generate packing list based on the trip name
      const packingListString = await generatePackingList(
        name,
        formattedSummary
      );

      // Add null check for packing list
      const packingChecklistArr = packingListString
        ? packingListString.split("#").map((item) => ({
            item: item?.trim() || "Essential item",
            checked: false,
          }))
        : [{ item: "Water bottle", checked: false }];

      // Fetch image URL for the trip
      const imageUrl = (await fetchUnsplashImage(name, true)) || "";

      // Create a structured trip object
      return {
        createdAt: Timestamp.now(),
        planId: "",
        bookmarked: false,
        userId,
        name: name.trim(),
        location: location.trim(),
        coordinates,
        address: address,
        description: description,
        imageUrl: imageUrl,
        dateRange: formData[1]?.value || {
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
        },
        groupSize: 1,
        difficultyLevel: difficultyLevel,
        amenities: amenitiesArr,
        highlights: highlightsArr,
        parkWebsite: parkWebsite,
        cellService: cellService,
        parkContact: parkContact,

        schedule: scheduleArr,
        packingChecklist: packingChecklistArr,
        missions: missionsArr,
        warnings: warningsArr,
        thingsToKnow: [],
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
    // Log the entire formData structure
    console.log("Form Data Structure:", JSON.stringify(formData, null, 2));
    console.log("Date Range from formData:", formData[1]?.value);

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

    // Fetch image URL for the plan
    const imageUrl =
      (await fetchUnsplashImage(formData[0]?.value?.location, false)) || "";

    // Create a new plan in Firestore
    const planData = {
      createdAt: Timestamp.now(),
      imageUrl,
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
    const trips = await parseRecommendations(
      recommendationsString,
      userId,
      formattedSummary,
      formData
    );

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
