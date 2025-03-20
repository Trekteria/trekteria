import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// Get the API key from environment variables
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey as string);

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
 * Generate hiking trail recommendations based on user preferences
 *
 * @param formSummary - Summary of user's hiking preferences from the form
 * @returns A promise that resolves to the generated trail recommendations
 */
export const generateTrailRecommendations = async (
  formSummary: string
): Promise<string> => {
  try {
    // Initialize chat session
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Construct the prompt with the form summary
    const prompt = `I'm planning a hiking trip with these preferences: ${formSummary}
    
    Please recommend 2-3 suitable trails based on these preferences. For each trail include:
    1. Trail name and location
    2. Difficulty level and length
    3. Key features that match my preferences
    4. Brief description of what I can expect
    5. Any tips based on my group composition and experience level
    `;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    return response;
  } catch (error) {
    console.error("Error generating trail recommendations:", error);
    return "Sorry, I couldn't generate trail recommendations at this time. Please try again later.";
  }
};
