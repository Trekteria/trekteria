/**
 * Service for saving plans and trips to Supabase and AsyncStorage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabaseConfig";
import { fetchUnsplashImage } from "../imageService";
import { v4 as uuidv4 } from "uuid";
import { Trip } from "../../types/Types";

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
