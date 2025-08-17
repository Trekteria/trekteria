/**
 * Service for fetching coordinates from various geocoding APIs
 */

/**
 * Fetch coordinates from OpenStreetMap API
 * @param name Trip name
 * @param location Trip location
 * @returns Object with latitude and longitude or null
 */
export const fetchCoordinates = async (
  name: string,
  location: string
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    console.log("Fetching coordinates for:", name + ", " + location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        name + ", " + location
      )}`
    );
    const data = await response.json();
    if (data && data[0]) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    } else {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          location
        )}`
      );
      const data = await response.json();
      if (data && data[0]) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};
