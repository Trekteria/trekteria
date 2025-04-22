import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// Get the API key from environment variables
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    "EXPO_PUBLIC_GEMINI_API_KEY is not defined in environment variables"
  );
}

const genAI = new GoogleGenerativeAI(apiKey);

// Specify the model
const model = genAI.getGenerativeModel({
  model: "gemma-3-27b-it",
});

// Configuration for the generative model
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

/**
 * Generate hiking trip recommendations based on user preferences
 *
 * @param formSummary - Summary of user's hiking preferences from the form
 * @returns A promise that resolves to the generated trip recommendations
 */
export const generateTripRecommendations = async (
  formSummary: string
): Promise<string> => {
  try {
    // Initialize chat session
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Construct the prompt with the form summary
    const prompt = `
    I want a list of the best trips that match my preferences. Each trip should provide a cool and unique experience.  
    For each trip, return in this format: #name1!location1@keyFeatures1%facilities1#name2!location2@keyFeatures2%facilities2#name3!location3@keyFeatures3%facilities3. Do not return anything else.   
    Return the top 3.   
    Be careful to make sure that the name of the location is correct, that is actually exists, and the format is EXACTLY as shown in the example. The location should be city, state (e.g. "San Francisco, CA"). Name should be the name of the park. Do not specify the trip name.
    ---
    For context, here are some of my preferences: ${formSummary}
    `;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    console.log("Response from Gemini:", response);

    return response;
  } catch (error) {
    console.error("Error generating trip recommendations:", error);
    return "Sorry, I couldn't generate trip recommendations at this time. Please try again later.";
  }
};

export const generateTripMissions = async (
  tripName: string
): Promise<string> => {
  try {
    // Initialize chat session
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Construct the prompt with the form summary
    const prompt = `
    I want a list of the best 5 missions that match my preferences. Each mission should:
    - Be related to the environmental science
    - Help the traveler learn about or contribute to the local environment
    - Be easy, achievable and engaging
    - Include a short, engaging emoji at the start
    - Be unique and not repetitive based on the trip
    - Be formatted as a simple, direct instruction (e.g. "🗑️ Pick up 3 pieces of litter and log it.")
    Return ONLY a string with 5 missions, seperated by #. Do not return anything else.
    Example format: mission1#mission2#mission3#mission4#mission5;
    ---
    For context, here is my trip name: ${tripName}
    `;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    console.log(`Trip Missions from Gemini for trip "${tripName}":`, response);

    return response;
  } catch (error) {
    console.error("Error generating trip missions:", error);
    return "Sorry, I couldn't generate trip missions at this time. Please try again later.";
  }
};
