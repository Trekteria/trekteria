/**
 * Service for parsing Gemini API recommendations into structured trip data
 */

import { Trip } from "../../types/Types";
import {
  generateInfo,
  generateSchedule,
  generateTripMissions,
  generatePackingList,
} from "../geminiService";
import { fetchUnsplashImage } from "../imageService";
import { fetchCoordinates } from "./coordinatesService";
import { searchAndStorePlace } from "./placesService";

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

      // ------ SEARCH DATABASE FIRST, THEN GOOGLE PLACES DATA ------
      const placesData = await searchAndStorePlace(name + ", " + location);

      // Use places data when available for more accurate information
      const finalCoordinates = {
        latitude: placesData?.latitude,
        longitude: placesData?.longitude,
      };
      const finalAddress = placesData?.formatted_address || address;
      const finalParkWebsite = placesData?.website_uri || parkWebsite;
      const finalParkContact =
        placesData?.international_phone ||
        placesData?.national_phone ||
        parkContact;

      // Create a structured trip object
      return {
        createdAt: new Date().toISOString(),
        planId: "",
        bookmarked: false,
        userId,
        name: name.trim(),
        location: location.trim(),
        coordinates: finalCoordinates,
        address: finalAddress,
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
        parkWebsite: finalParkWebsite,
        cellService: cellService,
        parkContact: finalParkContact,
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
