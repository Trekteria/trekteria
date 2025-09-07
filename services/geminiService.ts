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

// Specify the model - using the correct Gemma model identifier
const model = genAI.getGenerativeModel({
  model: "gemma-3-27b-it",
});

// Configuration for the generative model - reduced temperature for more accurate responses
const generationConfig = {
  temperature: 0.1, // Reduced from 1.0 for more consistent, accurate responses
  topP: 0.8, // Reduced from 0.95 for more focused responses
  topK: 40, // Reduced from 64 for more predictable outputs
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// Safety settings to prevent harmful content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

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
      safetySettings,
      history: [],
    });

    // Construct the prompt with the form summary - improved prompt engineering
    const prompt = `
You are an expert camping and outdoor recreation assistant. Your task is to recommend 3 real, existing camping locations that match the user's preferences.

IMPORTANT REQUIREMENTS:
1. Only recommend REAL, VERIFIED camping locations that actually exist
2. Use exact, correct location names and addresses
3. Provide accurate information about facilities and features
4. If you're unsure about any details, use "N/A" instead of guessing

FORMAT REQUIREMENTS:
Return exactly in this format (no additional text):
#campsiteName1!location1@keyFeatures1%facilities1#campsiteName2!location2@keyFeatures2%facilities2#campsiteName3!location3@keyFeatures3%facilities3

Where:
- campsiteName: Official name of the campsite/park
- location: City, State format (e.g., "Yosemite Valley, CA")
- keyFeatures: 3 main attractions or features (short description)
- facilities: Top 3 available amenities (restrooms, water, etc.) (short description)

EXAMPLE:
#Yosemite Valley Campground!Yosemite Valley, CA@Stunning granite cliffs, waterfalls, wildlife viewing%Restrooms, potable water, picnic tables, fire rings#Joshua Tree National Park!Twentynine Palms, CA@Unique desert landscape, rock climbing, stargazing%Vault toilets, picnic tables, fire rings#Big Sur Campground!Big Sur, CA@Coastal views, redwood forests, hiking trails%Flush toilets, showers, store, restaurant

User preferences: ${formSummary}

Remember: Only provide real, verified locations with accurate information.
`;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    console.log("Response from Gemini:", response);

    // Validate response format
    if (!response || !response.includes("#") || !response.includes("!")) {
      console.error("Invalid response format from Gemini:", response);
      return "#N/A!N/A@N/A%N/A#N/A!N/A@N/A%N/A#N/A!N/A@N/A%N/A";
    }

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
    return "#N/A#N/A#N/A#N/A#N/A#N/A#N/A";
  }

  try {
    // Initialize chat session
    const chatSession = model.startChat({
      generationConfig,
      safetySettings,
      history: [],
    });

    // Construct the prompt with improved accuracy requirements
    const prompt = `
You are an expert camping and outdoor recreation assistant. Provide accurate information about the camping location: ${tripName}

IMPORTANT REQUIREMENTS:
1. Only provide VERIFIED, ACCURATE information
2. If you're unsure about any details, use "N/A" instead of guessing
3. Use real addresses, phone numbers, and websites when available
4. Provide realistic, practical information

FORMAT REQUIREMENTS:
Return exactly in this format (no additional text):
#address#description#mobileCellServiceConditions#parkWebsite#parkContact#difficultyLevel#warnings

Where:
- address: Actual address of the park/campsite
- description: Brief, accurate description of the location
- mobileCellServiceConditions: Realistic cell service conditions
- parkWebsite: Official website URL (or "N/A" if unknown)
- parkContact: Official phone number (or "N/A" if unknown)
- difficultyLevel: Easy/Moderate/Difficult based on terrain
- warnings: Real safety warnings or "N/A" if none

EXAMPLE FORMAT:
#123 Main St, Yosemite Valley, CA#Beautiful campground in Yosemite National Park with stunning views of Half Dome and waterfalls.#Generally good service, but can be spotty in canyon areas.#https://www.nps.gov/yose#(209) 372-0200#Easy#Watch for wildlife; bring bear-proof containers; check weather conditions.

User preferences: ${preferences}

Remember: Only provide verified, accurate information. Use "N/A" for unknown details.
`;

    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    if (!response) {
      console.error(
        "Empty response from Gemini in generateInfo for trip:",
        tripName
      );
      return "#N/A#N/A#N/A#N/A#N/A#N/A#N/A";
    }

    console.log(`Trip Info from Gemini for trip "${tripName}":`, response);

    // Validate the response format
    if (!response.includes("#")) {
      console.error(
        "Invalid response format from Gemini in generateInfo:",
        response
      );
      return "#N/A#N/A#N/A#N/A#N/A#N/A#N/A";
    }

    return response;
  } catch (error) {
    console.error("Error generating trip info:", error);
    return "#N/A#N/A#N/A#N/A#N/A#N/A#N/A";
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
      safetySettings,
      history: [],
    });

    // Construct the prompt with improved accuracy and realism
    const prompt = `
You are an expert camping and outdoor recreation planner. Create a realistic, practical schedule for the camping trip: ${tripName}

IMPORTANT REQUIREMENTS:
1. Create REALISTIC, ACHIEVABLE activities and timeframes
2. Consider typical camping logistics (setup, meals, rest)
3. Include appropriate breaks and transition times
4. Plan for 1-3 days maximum unless specified otherwise
5. Use realistic activity durations
6. For location-specific activities (hiking trails, viewpoints, attractions), provide accurate GPS coordinates

FORMAT REQUIREMENTS:
Return exactly in this format (no additional text):
$Day1#activity1@startTime1-endTime1&lat1,long1#activity2@startTime2-endTime2#activity3@startTime3-endTime3&lat3,long3$Day2#activity1@startTime1-endTime1&lat1,long1

Where:
- Day1, Day2, etc.: Day number or date
- activity: Realistic camping activity
- startTime-endTime: 24-hour format (e.g., 09:00AM-11:00AM)
- &lat,long: GPS coordinates for location-specific activities (use & separator)
- For campsite activities (meals, sleep, campfire), do NOT include coordinates
- For hiking trails, viewpoints, attractions, DO include accurate coordinates

EXAMPLE FORMAT:
$Day 1#Arrive and set up camp@10:00AM-11:30AM#Hike Mist Trail@12:00PM-2:00PM&37.7322,-119.5962#Lunch and rest@2:00PM-3:00PM#Visit Tunnel View@3:00PM-5:00PM&37.7156,-119.6763#Prepare dinner@5:00PM-6:00PM#Campfire and relaxation@6:00PM-9:00PM#Sleep@9:00PM-7:00AM$Day 2#Morning hike to Glacier Point@8:00AM-10:00AM&37.7281,-119.5739#Breakfast@10:00AM-11:00AM#Pack up camp@11:00AM-12:00PM#Depart@12:00PM-1:00PM

User preferences: ${preferences}

Remember: 
- Create practical, realistic schedules that campers can actually follow
- Include accurate GPS coordinates for trails, viewpoints, and attractions
- Do NOT include coordinates for general campsite activities
- Use real, verified coordinates when possible
- Do not include any extra text after the time range
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
      safetySettings,
      history: [],
    });

    // Construct the prompt with improved clarity and specificity
    const prompt = `
You are an expert outdoor education and environmental science specialist. Create 5 engaging, educational missions for the camping trip: ${tripName}

MISSION REQUIREMENTS:
1. Each mission should be educational and environmentally focused
2. Missions should be achievable for typical campers
3. Start with easiest missions and gradually increase difficulty
4. Include a relevant emoji at the start of each mission
5. Make missions specific to the trip location when possible
6. Focus on environmental learning and conservation

FORMAT REQUIREMENTS:
Return exactly in this format (no additional text):
mission1#mission2#mission3#mission4#mission5

Where each mission:
- Starts with a relevant emoji
- Is a clear, actionable instruction
- Is educational and environmentally focused
- Is achievable for the average camper

EXAMPLE FORMAT:
🌿 Identify and photograph 5 different plant species along the trail#📊 Count and record wildlife sightings during your hike#♻️ Collect and properly dispose of any litter you find#🌱 Learn about local invasive species and how to identify them#📝 Document the weather conditions and their impact on the environment

User preferences: ${preferences}

Remember: Create educational, achievable missions that enhance the camping experience and environmental awareness.
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
    return "💧 Water bottle#🥾 Hiking boots#🧴 Sunscreen#🎒 Backpack#🕶️ Sunglasses#📷 Camera";
  }

  try {
    // Initialize chat session
    const chatSession = model.startChat({
      generationConfig,
      safetySettings,
      history: [],
    });

    // Construct the prompt with improved specificity and realism focus
    const prompt = `
You are an expert outdoor gear specialist. Create a practical packing list for the camping trip: ${tripName}

PACKING LIST REQUIREMENTS:
1. Include 10-15 essential items for this specific trip
2. Focus on practical, realistic items that campers actually need and use
3. Consider the trip location, weather, and user preferences
4. Include items that are commonly used and readily available
5. Start with the most essential items first
6. Include a relevant emoji for each item
7. Prioritize functionality and practicality over specialty items

FORMAT REQUIREMENTS:
Return exactly in this format (no additional text):
item1#item2#item3#item4#item5#item6#item7#item8#item9#item10

Where each item:
- Starts with a relevant emoji
- Is a practical, essential camping item
- Is commonly used and readily available
- Is specific to the trip needs and conditions

EXAMPLE FORMAT:
💧 Water bottle#🥾 Hiking boots#🧴 Sunscreen#🎒 Backpack#🕶️ Sunglasses#📷 Camera#🔦 Flashlight#🧥 Jacket#🍽️ Food and snacks#🛏️ Sleeping bag

User preferences: ${preferences}

Remember: Create a practical, realistic packing list with items that campers will actually use and need for this specific trip.
`;

    // Send the prompt to Gemini
    const result = await chatSession.sendMessage(prompt);
    const response = result.response.text();

    const validateResponse = (
      response: string | undefined,
      tripName: string,
      defaultResponse: string,
      logPrefix: string
    ): string => {
      if (!response) {
        console.error(
          `Empty response from Gemini in ${logPrefix} for trip:`,
          tripName
        );
        return defaultResponse;
      }

      console.log(`${logPrefix} from Gemini for trip "${tripName}":`, response);

      if (!response.includes("#")) {
        console.error(
          `Invalid response format from Gemini in ${logPrefix}:`,
          response
        );
        return defaultResponse;
      }

      return response;
    };

    const defaultPackingList =
      "💧 Water bottle#🥾 Hiking boots#🧴 Sunscreen#🎒 Backpack#🕶️ Sunglasses#📷 Camera";

    return validateResponse(
      response,
      tripName,
      defaultPackingList,
      "generatePackingList"
    );
  } catch (error) {
    console.error("Error generating packing items:", error);
    return "💧 Water bottle#🥾 Hiking boots#🧴 Sunscreen#🎒 Backpack#🕶️ Sunglasses#📷 Camera";
  }
};

export const generateChatResponse = async (
  message: string,
  chatHistory: { role: "user" | "model"; text: string }[] = [],
  tripDetails?: {
    name: string;
    location: string;
    dateRange?: { startDate: string; endDate: string };
    description?: string;
    difficultyLevel?: string;
    warnings?: string[];
  }
): Promise<string> => {
  try {
    // Initialize chat session with history
    // Gemini requires the first message to be from the user
    // If the first message is from model, we'll initialize without history
    // and handle the conversation manually
    let sanitizedHistory = [...chatHistory];

    // Remove model messages from the beginning until we find a user message
    while (
      sanitizedHistory.length > 0 &&
      sanitizedHistory[0].role === "model"
    ) {
      sanitizedHistory.shift();
    }

    // If we have no history left or empty history, don't use history
    const useHistory = sanitizedHistory.length > 0;

    // Create a system prompt to guide the model's behavior
    const systemPrompt = `
You are Trekteria AI, an expert camping and outdoor adventure assistant, who always follow eco-friendly and sustainable practices.
Follow these guidelines in your responses:
- Provide helpful, accurate information about camping, trails, and outdoor activities
- Be concise but informative, aim for responses under 250 words, and 100 words is ideal
- Emphasize safety and environmental responsibility in outdoor activities
- When appropriate, mention sustainable practices and Leave No Trace principles
- Focus on being practical and actionable
- If you don't know something, say so rather than making up information
- Personalize responses based on the user's preferences and experience level
- Use a friendly, encouraging tone
- Do not use bold text, or any other formatting
- Write in clean format, with proper spacing and punctuation
- Use emojis to make the response more engaging

${
  tripDetails
    ? `
Current Trip Information:
- Trip Name: ${tripDetails.name}
- Location: ${tripDetails.location}
${
  tripDetails.dateRange
    ? `- Dates: ${tripDetails.dateRange.startDate} to ${tripDetails.dateRange.endDate}`
    : ""
}
${tripDetails.description ? `- Description: ${tripDetails.description}` : ""}
${
  tripDetails.difficultyLevel
    ? `- Difficulty: ${tripDetails.difficultyLevel}`
    : ""
}
${
  tripDetails.warnings && tripDetails.warnings.length > 0
    ? `- Warnings: ${tripDetails.warnings.join(", ")}`
    : ""
}

Please tailor your responses to provide specific information relevant to this trip when appropriate. Do not include enter new lines at the end of your response.
`
    : ""
}

The user is planning a camping trip. Help them with their questions. If the user asks about the things that are not related to camping, please say "I'm sorry, I can't help with that."
`;

    // Inject the system prompt into the user's message
    const enhancedMessage = `${systemPrompt}\n\nUser question: ${message}`;

    const chatSession = model.startChat({
      generationConfig: {
        ...generationConfig,
        maxOutputTokens: 1024, // Using shorter responses for chat
      },
      history: useHistory
        ? sanitizedHistory.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.text }],
          }))
        : [],
    });

    // Send the enhanced message to Gemini
    const result = await chatSession.sendMessage(enhancedMessage);
    let response = result.response.text();

    console.log("Raw response from Gemini in chat:", response);

    if (!response) {
      console.error("Empty response from Gemini in chat");
      return "I'm sorry, I couldn't generate a response at this time. Please try again.";
    }

    return response;
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm sorry, I encountered an issue while processing your request. Please try again later.";
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
    You are a helpful assistant that evaluates image descriptions. Given a text description, determine whether it is relevant to outdoor trail-related topics such as camping, nature trips, mountains, lakes, ocean, sky, or wildlife. Return your result "True" or "False". Do not return anything else.
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
