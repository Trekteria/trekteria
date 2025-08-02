import "react-native-get-random-values";
import { Trip } from "../types/Types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseConfig";
import {
  generateInfo,
  generateSchedule,
  generateTripMissions,
  generatePackingList,
} from "./geminiService";
import { fetchUnsplashImage } from "./imageService";
import { v4 as uuidv4 } from "uuid";

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
                    coordinates: null,
                  };
                }

                // Split by & to separate activity/time from coordinates
                const [activityTimeStr, coordinatesStr] = activity.split("&");

                const activityParts = activityTimeStr.split("@");
                const activityName =
                  activityParts[0]?.trim() || "Default activity";
                const timeRange = activityParts[1] || "9:00 AM-5:00 PM";
                const timeParts = timeRange.split("-");

                // Parse coordinates if they exist
                let coordinates = null;
                if (coordinatesStr && coordinatesStr.includes(",")) {
                  const [lat, lng] = coordinatesStr.split(",");
                  const latitude = parseFloat(lat?.trim());
                  const longitude = parseFloat(lng?.trim());

                  // Only include coordinates if they're valid numbers
                  if (!isNaN(latitude) && !isNaN(longitude)) {
                    coordinates = { latitude, longitude };
                  }
                }

                return {
                  activity: activityName,
                  startTime: timeParts[0]?.trim() || "9:00 AM",
                  endTime: timeParts[1]?.trim() || "5:00 PM",
                  coordinates,
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
        createdAt: new Date().toISOString(),
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
        chatHistory: [],
      } as Trip;
    })
  );

  // Filter out any null entries from invalid trips
  return trips.filter((trip): trip is Trip => trip !== null);
};

/**
 * Save a plan and its trips to Supabase and AsyncStorage
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
    // Format the preferences data structure to match our new schema
    const preferences = {
      dateRange: formData[1]?.value || {},
      location: {
        fromLocation: formData[0]?.value?.fromLocation || "",
        toLocation: formData[0]?.value?.toLocation || "",
        radius: formData[0]?.value?.radius || 25,
      },
      groupComposition: {
        adults: formData[2]?.value?.adults || 0,
        kids: formData[2]?.value?.kids || 0,
        toddlers: formData[2]?.value?.toddlers || 0,
        pets: formData[2]?.value?.pets || 0,
        wheelchairUsers: formData[2]?.value?.wheelchairUsers || 0,
        serviceAnimals: formData[2]?.value?.serviceAnimals || 0,
      },
      campingExperience: formData[3]?.value || "",
      campingType: formData[4]?.value ? formData[4].value.split(" - ")[0] : "",
      amenities: formData[5]?.value || [],
      activities: formData[6]?.value || [],
      mustHaves: formData[7]?.value || [],
      weatherPreference: formData[8]?.value
        ? formData[8].value.split(" - ")[0]
        : "",
    };

    // Calculate total group size for quick access
    const totalGroupSize = Object.values(preferences.groupComposition).reduce(
      (sum: number, count: number) => sum + count,
      0
    );

    // Calculate accessibility needs flag
    const hasAccessibilityNeeds =
      preferences.groupComposition.wheelchairUsers > 0 ||
      preferences.groupComposition.serviceAnimals > 0;

    // Fetch image URL for the plan using the destination location
    const imageUrl =
      (await fetchUnsplashImage(preferences.location.toLocation, false)) || "";

    // Generate a unique plan ID
    const planId = uuidv4();

    // Create a new plan in Supabase with optimized structure
    const planData = {
      plan_id: planId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      imageUrl,
      preferences,
      summary: formattedSummary,
      userId,
      tripIds: [],
      totalGroupSize,
    };

    // Save the plan to Supabase
    const { error: planError } = await supabase.from("plans").insert(planData);

    if (planError) throw planError;

    // Process trips in parallel with optimized data
    const tripPromises = trips.map(async (trip) => {
      const tripId = uuidv4();
      const welcomeMessage = {
        id: uuidv4(),
        text: `👋 Welcome to your trip to ${trip.name}! I'm your Trekteria AI assistant. I can help with trail recommendations, gear advice, safety tips, and anything else about your hiking adventure. What would you like to know?`,
        sender: "bot",
        timestamp: new Date().toISOString(),
      };

      const tripData = {
        trip_id: tripId,
        createdAt: new Date().toISOString(),
        planId,
        userId,
        bookmarked: false,
        name: trip.name,
        location: trip.location,
        coordinates: trip.coordinates,
        address: trip.address,
        description: trip.description,
        imageUrl: trip.imageUrl,
        dateRange: trip.dateRange,
        groupSize: totalGroupSize,
        difficultyLevel: trip.difficultyLevel,
        amenities: trip.amenities,
        highlights: trip.highlights,
        parkWebsite: trip.parkWebsite,
        cellService: trip.cellService,
        parkContact: trip.parkContact,
        schedule: trip.schedule,
        packingChecklist: trip.packingChecklist,
        missions: trip.missions,
        warnings: trip.warnings,
        thingsToKnow: trip.thingsToKnow,
        hasAccessibilityNeeds,
        chatHistory: [welcomeMessage],
      };

      const { error: tripError } = await supabase
        .from("trips")
        .insert(tripData);

      if (tripError) throw tripError;
      return tripId;
    });

    // Wait for all trips to be created
    const tripIds = await Promise.all(tripPromises);

    // Update the plan with the trip IDs
    const { error: updateError } = await supabase
      .from("plans")
      .update({
        tripIds,
        lastUpdated: new Date().toISOString(),
      })
      .eq("plan_id", planId);

    if (updateError) throw updateError;

    // Store only essential data in AsyncStorage
    await AsyncStorage.multiSet([
      ["tripSummary", formattedSummary],
      ["lastPlanId", planId],
      ["lastPlanGroupSize", totalGroupSize.toString()],
      ["lastPlanAccessibility", hasAccessibilityNeeds.toString()],
    ]);

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

    // Save the plan and trips to Supabase and AsyncStorage
    const planId = await savePlan(userId, formData, formattedSummary, trips);

    return planId;
  } catch (error) {
    console.error("Error processing recommendations:", error);
    throw error;
  }
};
