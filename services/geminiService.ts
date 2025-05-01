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

export const generateInfo = async (
  tripName: string,
  preferences: string
): Promise<string> => {
  if (!tripName) {
    console.error("Trip name is undefined or empty in generateInfo");
    return "#N/A#N/A#N/A#N/A#N/A#N/A";
  }

  try {
    // Initialize chat session
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Construct the prompt with the form summary
    const prompt = `
    Please provide me with some information about the trip ${tripName}.
    For context, here are my preferences: ${preferences}. 
    Return the information in this format:
    #address#description#mobileCellServiceConditions#parkWebsite#parkContact#difficultyLevel. Do not return anything else.

    Example format:
    #123 Main St, San Francisco, CA#This is a great park with a lot of activities for the whole family.#Generally good, but can be spotty in deeper canyon areas.#https://www.google.com#(123) 456-7890#Easy.

    Be careful to make sure that the name of the location is correct, that is actually exists, and the format is EXACTLY as shown in the example. The address should be the address of the park and phone number, and website should be correct. If you are not sure about the info, return "N/A" for that field.
    `;

    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    if (!response) {
      console.error(
        "Empty response from Gemini in generateInfo for trip:",
        tripName
      );
      return "#N/A#N/A#N/A#N/A#N/A#N/A";
    }

    console.log(`Trip Info from Gemini for trip "${tripName}":`, response);

    // Validate the response format
    if (!response.includes("#")) {
      console.error(
        "Invalid response format from Gemini in generateInfo:",
        response
      );
      return "#N/A#N/A#N/A#N/A#N/A#N/A";
    }

    return response;
  } catch (error) {
    console.error("Error generating trip info:", error);
    return "#N/A#N/A#N/A#N/A#N/A#N/A";
  }
};

export const generateSchedule = async (
  tripName: string,
  preferences: string
): Promise<string> => {
  if (!tripName) {
    console.error("Trip name is undefined or empty in generateSchedule");
    return "$Day1#Default Activity@9:00AM-5:00PM#Sleep@9:00PM-7:00AM$";
  }

  try {
    // Initialize chat session
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Construct the prompt with the form summary
    const prompt = `
    I want a detail plan for the trip that match my preferences. Each day should have balanced activities, fun, and relaxation.
    Return in this format: $Day1#activity1@startTime1-endTime1#activity2@startTime2-endTime2#Day2#activity1@startTime1-endTime1#activity2@startTime2-endTime2. Do not return anything else.   
    For example: $02/25/2025(Tue)#Drive from San Jose to Park@11:00AM-12:00PM#Check-in at the park office@12:00PM-1:00PM#Hike the main trail@1:00PM-3:00PM#Lunch at the park restaurant@3:00PM-4:00PM#Afternoon hike@4:00PM-6:00PM#Dinner at the park restaurant@6:00PM-7:00PM#Relax at the campsite@7:00PM-9:00PM#Sleep$Day2#Hike the main trail@1:00PM-3:00PM#Lunch at the park restaurant@3:00PM-4:00PM#Afternoon hike@4:00PM-6:00PM#Dinner at the park restaurant@6:00PM-7:00PM#Relax at the campsite@7:00PM-9:00PM#Sleep$Day3#Drive from Park to San Jose@1:00PM-3:00PM#Lunch at the park restaurant@3:00PM-4:00PM#Afternoon hike@4:00PM-6:00PM#Dinner at the park restaurant@6:00PM-7:00PM#Relax at the campsite@7:00PM-9:00PM#Sleep$
    Be careful to make sure that the name of the locations and activities are correct, that is actually exists, and the format is EXACTLY as shown in the example. Plan should carefully consider the weather, and the activities should be appropriate for the weather and user preferences.
    ---
    For context, here is my trip name: ${tripName}
    For context, here are my preferences: ${preferences}. 
    `;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    console.log("Raw response from Gemini for schedule:", response);

    if (!response) {
      console.error("No response received from Gemini for schedule");
      return "$Day1#Default Activity@9:00AM-5:00PM#Sleep@9:00PM-7:00AM$";
    }

    // Validate the response format
    if (
      !response.includes("$") ||
      !response.includes("#") ||
      !response.includes("@")
    ) {
      console.error(
        "Invalid response format from Gemini for schedule:",
        response
      );
      return "$Day1#Default Activity@9:00AM-5:00PM#Sleep@9:00PM-7:00AM$";
    }

    return response;
  } catch (error) {
    console.error("Error generating trip plan:", error);
    return "$Day1#Default Activity@9:00AM-5:00PM#Sleep@9:00PM-7:00AM$";
  }
};

export const generateTripMissions = async (
  tripName: string,
  preferences: string
): Promise<string> => {
  if (!tripName) {
    console.error("Trip name is undefined or empty in generateTripMissions");
    return "🗺️ Explore the main trail#📸 Take photos of wildlife#🌱 Learn about local plants#♻️ Practice Leave No Trace principles#🌄 Watch the sunrise/sunset";
  }

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
    For context, here are my preferences: ${preferences}. 
    `;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    if (!response) {
      console.error(
        "Empty response from Gemini in generateTripMissions for trip:",
        tripName
      );
      return "🗺️ Explore the main trail#📸 Take photos of wildlife#🌱 Learn about local plants#♻️ Practice Leave No Trace principles#🌄 Watch the sunrise/sunset";
    }

    console.log(`Trip Missions from Gemini for trip "${tripName}":`, response);

    // Validate the response format
    if (!response.includes("#")) {
      console.error(
        "Invalid response format from Gemini in generateTripMissions:",
        response
      );
      return "🗺️ Explore the main trail#📸 Take photos of wildlife#🌱 Learn about local plants#♻️ Practice Leave No Trace principles#🌄 Watch the sunrise/sunset";
    }

    return response;
  } catch (error) {
    console.error("Error generating trip missions:", error);
    return "🗺️ Explore the main trail#📸 Take photos of wildlife#🌱 Learn about local plants#♻️ Practice Leave No Trace principles#🌄 Watch the sunrise/sunset";
  }
};

export const generatePackingList = async (
  tripName: string,
  preferences: string
): Promise<string> => {
  if (!tripName) {
    console.error("Trip name is undefined or empty in generatePackingList");
    return "💧 Water bottle (stay hydrated)#🥾 Hiking boots (for comfortable walking)#🧢 Hat (sun protection)#🕶️ Sunglasses (eye protection)#🧴 Sunscreen (skin protection)#🔦 Flashlight (for darkness)#🧰 First aid kit (for emergencies)";
  }

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
    For context, here are my preferences: ${preferences}. 
    `;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    if (!response) {
      console.error(
        "Empty response from Gemini in generatePackingList for trip:",
        tripName
      );
      return "💧 Water bottle (stay hydrated)#🥾 Hiking boots (for comfortable walking)#🧢 Hat (sun protection)#🕶️ Sunglasses (eye protection)#🧴 Sunscreen (skin protection)#🔦 Flashlight (for darkness)#🧰 First aid kit (for emergencies)";
    }

    console.log(`Packing items from Gemini for trip "${tripName}":`, response);

    // Validate the response format
    if (!response.includes("#")) {
      console.error(
        "Invalid response format from Gemini in generatePackingList:",
        response
      );
      return "💧 Water bottle (stay hydrated)#🥾 Hiking boots (for comfortable walking)#🧢 Hat (sun protection)#🕶️ Sunglasses (eye protection)#🧴 Sunscreen (skin protection)#🔦 Flashlight (for darkness)#🧰 First aid kit (for emergencies)";
    }

    return response;
  } catch (error) {
    console.error("Error generating packing items:", error);
    return "💧 Water bottle (stay hydrated)#🥾 Hiking boots (for comfortable walking)#🧢 Hat (sun protection)#🕶️ Sunglasses (eye protection)#🧴 Sunscreen (skin protection)#🔦 Flashlight (for darkness)#🧰 First aid kit (for emergencies)";
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
};
