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
    const prompt = `
    I want a list of the best trails that match my preferences. Each trail should provide a cool and unique experience.  
    For each trail, return in this format: #name1!location1@keyFeatures1%facilities1#name2!location2@keyFeatures2%facilities2#name3!location3@keyFeatures3%facilities3. Do not return anything else.   
    Return the top 3.   
    Be careful to make sure that the name of the location is correct, that is actually exists, and the format is EXACTLY as shown in the example. .The location should be city, state (e.g. "San Francisco, CA"). Name should be the name of the park. Do not specify the trail name.
    ---
    For context, here are some of my preferences: ${formSummary}
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
