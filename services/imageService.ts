import { checkImageRelevance } from "./geminiService";

const defaultTripImages = [
  "https://images.unsplash.com/photo-1676782778930-11b311ec5134?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1600284536251-8bb98db53468?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1605196560547-b2f7281b7355?auto=format&fit=crop&q=80&w=1000",
];

export const fetchUnsplashImage = async (
  query: string,
  trail: boolean = false
): Promise<string> => {
  if (!query) {
    console.error("Query is undefined or empty in fetchUnsplashImage");
    return defaultTripImages[0];
  }

  try {
    const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;
    if (!UNSPLASH_ACCESS_KEY) {
      console.error("Unsplash API key is not defined");
      return defaultTripImages[0];
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}&auto=format&fit=crop&q=80&w=1000`
    );

    if (!response.ok) {
      console.error(
        `Unsplash API error: ${response.status} ${response.statusText}`
      );
      return defaultTripImages[0];
    }

    const data = await response.json();

    // Check if we got results
    if (!data || !data.results || data.results.length === 0) {
      console.error("No results from Unsplash API for query:", query);
      return defaultTripImages[0];
    }

    const description = data.results[0]?.description || "";
    const altDescription = data.results[0]?.alt_description || "";

    let imageUrl = data.results[0]?.urls?.small;
    // If no URL was found, return a default image
    if (!imageUrl) {
      console.error(
        "No image URL found in Unsplash response for query:",
        query
      );
      return defaultTripImages[0];
    }

    if (trail) {
      try {
        const isRelevantString = await checkImageRelevance(
          description,
          altDescription
        );
        if (isRelevantString?.trim() === "False") {
          // If the image is not relevant, use a default image
          const randomIndex = Math.floor(
            Math.random() * defaultTripImages.length
          );
          imageUrl = defaultTripImages[randomIndex];
        }
      } catch (relevanceError) {
        console.error("Error checking image relevance:", relevanceError);
        // Continue with the image we found anyway
      }
    }

    return imageUrl;
  } catch (error) {
    console.error(`Error fetching image for query "${query}":`, error);
    // Return a default image if the fetch fails
    return defaultTripImages[0];
  }
};
