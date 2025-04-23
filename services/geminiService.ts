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

export const generateInfo = async (tripName: string): Promise<string> => {
  try {
    // Initialize chat session
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Construct the prompt with the form summary
    const prompt = `
    Please provide me with some information about the trip ${tripName}.

    Return the information in this format:
    #address#description#mobileCellServiceConditions#parkWebsite#parkContact#difficultyLevel. Do not return anything else.

    Example format:
    #123 Main St, San Francisco, CA#This is a great park with a lot of activities for the whole family.#Generally good, but can be spotty in deeper canyon areas.#https://www.google.com#(123) 456-7890#Easy.

    Be careful to make sure that the name of the location is correct, that is actually exists, and the format is EXACTLY as shown in the example. The address should be the address of the park and phone number, and website should be correct. If you are not sure about the info, return "N/A" for that field.
    `;

    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    console.log(`Trip Info from Gemini for trip "${tripName}":`, response);

    return response;
  } catch (error) {
    console.error("Error generating trip info:", error);
    return "Sorry, I couldn't generate trip info at this time. Please try again later.";
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


export const generatePackingList = async (
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
    I want a list of 7 essential packing items that match my preferences. Each item should:
    - Be necessary and enhance the experience for this specific trip
    - Be practical, easy to carry, and realistically useful
    - Be simple and compact
    - Include a short, relevant emoji at the start
    - Include only item name and concise description of purpose
    - First item to include: 💧 Water bottle (stay hydrated)
    Return ONLY a string with 7 packing items, seperated by #. Do not return anything else.
    Example format: item1#item2#item3#item4#item5#item6#item7;
    ---
    For context, here is my trip name: ${tripName}
    `;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    console.log(`Packing items from Gemini for trip "${tripName}":`, response);

    return response;
  } catch (error) {
    console.error("Error generating packing items:", error);
    return "Sorry, I couldn't generate packing items at this time. Please try again later.";
  }
};

export const checkImageRelevance = async (
  description: string,
  altDescription: string
): Promise<string> => {
  try {
    // Initialize chat session
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Construct the prompt with the image description
    const prompt = `
    You are a helpful assistant that evaluates image descriptions. Given a text description, determine whether it is relevant to outdoor trail-related topics such as hiking, nature trips, mountains, lakes, ocean, sky, or wildlife. Return your result "True" or "False". Do not return anything else.
    For your context, here is the text description: ${description} ${altDescription}
    `;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    return response;
  } catch (error) {
    console.error("Error checking image relevance:", error);
    return "Sorry, I couldn't check the image relevance at this time. Please try again later.";
  }
}