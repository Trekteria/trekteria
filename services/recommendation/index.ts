/**
 * Main recommendation service orchestrator
 * This service coordinates all recommendation-related operations
 */

import "react-native-get-random-values";
import { parseRecommendations } from "./parsingService";
import { savePlan } from "./storageService";

// Re-export all services for backward compatibility
export { fetchCoordinates } from "./coordinatesService";
export { parseRecommendations } from "./parsingService";
export { savePlan } from "./storageService";
export {
  searchAndStorePlace,
  searchAndStoreMultiplePlaces,
  searchPlaceInDatabase,
} from "./placesService";

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
