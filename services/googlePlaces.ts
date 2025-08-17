interface GooglePlacesSearchParams {
  textQuery: string;
  maxResultCount?: number;
}

interface GooglePlacesResponse {
  places?: Array<{
    id: string;
    displayName: {
      text: string;
      languageCode: string;
    };
    formattedAddress: string;
    shortFormattedAddress?: string;
    adrFormatAddress?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    viewport?: {
      low: {
        latitude: number;
        longitude: number;
      };
      high: {
        latitude: number;
        longitude: number;
      };
    };
    primaryType?: string;
    primaryTypeDisplayName?: string;
    rating?: number;
    userRatingCount?: number;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    plusCode?: {
      globalCode: string;
      compoundCode?: string;
    };
    googleMapsUri?: string;
    websiteUri?: string;
    businessStatus?: string;
    utcOffsetMinutes?: number;
    iconMaskBaseUri?: string;
    iconBackgroundColor?: string;
    editorialSummary?: {
      text: string;
      languageCode: string;
    };
    currentOpeningHours?: {
      openNow: boolean;
      periods?: Array<{
        open: {
          day: number;
          hour: number;
          minute: number;
        };
        close: {
          day: number;
          hour: number;
          minute: number;
        };
      }>;
      weekdayDescriptions?: string[];
    };
    regularOpeningHours?: {
      openNow: boolean;
      periods?: Array<{
        open: {
          day: number;
          hour: number;
          minute: number;
        };
        close: {
          day: number;
          hour: number;
          minute: number;
        };
      }>;
      weekdayDescriptions?: string[];
    };
    types?: string[];
    addressComponents?: Array<{
      longText: string;
      shortText: string;
      types: string[];
      languageCode: string;
    }>;
    reviews?: Array<{
      name: string;
      rating: number;
      relativePublishTimeDescription: string;
      publishTime: string;
      text: {
        text: string;
        languageCode: string;
      };
      originalText: {
        text: string;
        languageCode: string;
      };
      author: {
        displayName: string;
        uri?: string;
        photoUri?: string;
      };
      googleMapsUri?: string;
    }>;
    photos?: Array<{
      name: string;
      widthPx: number;
      heightPx: number;
      googleMapsUri?: string;
      flagContentUri?: string;
      authorAttributions?: Array<{
        displayName: string;
        uri?: string;
        photoUri?: string;
      }>;
    }>;
  }>;
}

class GooglePlacesService {
  private apiKey: string;
  private baseUrl = "https://places.googleapis.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for places using text query with comprehensive field mask
   * @param params - Search parameters
   * @returns Promise with places data
   */
  async searchPlaces(
    params: GooglePlacesSearchParams
  ): Promise<GooglePlacesResponse> {
    const { textQuery, maxResultCount = 1 } = params;

    try {
      const response = await fetch(`${this.baseUrl}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.adrFormatAddress,places.location,places.viewport,places.primaryType,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.internationalPhoneNumber,places.plusCode,places.googleMapsUri,places.websiteUri,places.businessStatus,places.utcOffsetMinutes,places.iconMaskBaseUri,places.iconBackgroundColor,places.editorialSummary,places.currentOpeningHours,places.regularOpeningHours,places.types,places.addressComponents,places.reviews,places.photos",
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Google Places API error: ${response.status} ${response.statusText}`
        );
      }

      const data: GooglePlacesResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error searching places:", error);
      throw error;
    }
  }

  /**
   * Search for a specific place by name
   * @param placeName - Name of the place to search for
   * @returns Promise with place data
   */
  async searchPlaceByName(placeName: string): Promise<GooglePlacesResponse> {
    return this.searchPlaces({
      textQuery: placeName,
      maxResultCount: 1,
    });
  }
}

// Export the service class and types
export { GooglePlacesService, GooglePlacesSearchParams, GooglePlacesResponse };

// Create and export a default instance (you'll need to provide the API key)
// export const googlePlacesService = new GooglePlacesService('YOUR_API_KEY_HERE');
