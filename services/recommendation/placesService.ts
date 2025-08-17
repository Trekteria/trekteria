/**
 * Service for Google Places API integration and place data storage
 */

import { supabase } from "../supabaseConfig";
import { GooglePlacesService } from "../googlePlaces";

/**
 * Search for a place in the local database
 * @param placeName - Name of the place to search for
 * @returns Promise with the place data from database or null if not found
 */
export const searchPlaceInDatabase = async (
  placeName: string
): Promise<any | null> => {
  try {
    // Clean the place name for search - extract main place name before first comma
    const cleanPlaceName = placeName.split(",")[0].trim();
    const searchPattern = `%${cleanPlaceName}%`;

    // Search for places that contain the place name (case-insensitive)
    // Use separate queries to avoid parsing issues with commas in or() clause
    let places: any[] = [];

    // First try searching by name
    const { data: nameResults, error: nameError } = await supabase
      .schema("places")
      .from("places")
      .select("*")
      .ilike("name", searchPattern)
      .limit(1);

    if (!nameError && nameResults && nameResults.length > 0) {
      places = nameResults;
    } else {
      // If no results by name, try display_name
      const { data: displayResults, error: displayError } = await supabase
        .schema("places")
        .from("places")
        .select("*")
        .ilike("display_name", searchPattern)
        .limit(1);

      if (!displayError && displayResults && displayResults.length > 0) {
        places = displayResults;
      } else {
        // If still no results, try formatted_address
        const { data: addressResults, error: addressError } = await supabase
          .schema("places")
          .from("places")
          .select("*")
          .ilike("formatted_address", searchPattern)
          .limit(1);

        if (!addressError && addressResults && addressResults.length > 0) {
          places = addressResults;
        }
      }
    }

    if (places && places.length > 0) {
      console.log("Found place in database:", places[0].name);
      return places[0];
    }

    console.log("No matching place found in database for:", placeName);
    return null;
  } catch (error) {
    console.error("Error searching places in database:", error);
    return null;
  }
};

/**
 * Search for places using Google Places API and store in Supabase
 * @param placeName - Name of the place to search for
 * @returns Promise with the stored place data or null if not found
 */
export const searchAndStorePlace = async (
  placeName: string
): Promise<any | null> => {
  // First, search in the local database
  const existingPlace = await searchPlaceInDatabase(placeName);
  if (existingPlace) {
    console.log("Using existing place data from database:", existingPlace.name);
    return existingPlace;
  }

  // If not found in database, proceed with Google Places API
  console.log(
    "Place not found in database, searching Google Places API for:",
    placeName
  );

  // Check if API key is available
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "";
  if (!apiKey) {
    console.log("No Google Places API key found, skipping place lookup");
    return null;
  }

  let place: any = null;

  try {
    const googlePlacesService = new GooglePlacesService(apiKey);
    const response = await googlePlacesService.searchPlaceByName(placeName);

    if (!response.places || response.places.length === 0) {
      console.log("No places found for:", placeName);
      return null;
    }

    place = response.places[0];

    // Check if place already exists in database
    try {
      const { data: existingPlace, error: checkError } = await supabase
        .schema("places")
        .from("places")
        .select("id")
        .eq("id", place.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error checking existing place:", checkError);
      }

      if (existingPlace) {
        console.log("Place already exists in database:", place.id);
        return existingPlace;
      }
    } catch (error) {
      console.log(
        "Error checking existing place, continuing with insert:",
        error
      );
    }

    // Prepare main place data with proper null handling and data type conversion
    const placeData = {
      id: place.id,
      name: place.displayName?.text || place.name || "Unknown Place",
      primary_type: place.primaryType || null,
      primary_type_display_name: place.primaryTypeDisplayName?.text || null,
      display_name: place.displayName?.text || place.name || "Unknown Place",
      rating: place.rating ? parseFloat(place.rating.toString()) : null,
      user_rating_count: place.userRatingCount
        ? parseInt(place.userRatingCount.toString())
        : null,
      national_phone: place.nationalPhoneNumber || null,
      international_phone: place.internationalPhoneNumber || null,
      formatted_address: place.formattedAddress || null,
      short_formatted_address: place.shortFormattedAddress || null,
      adr_format_address: place.adrFormatAddress || null,
      plus_code_global: place.plusCode?.globalCode || null,
      plus_code_compound: place.plusCode?.compoundCode || null,
      latitude: place.location?.latitude
        ? parseFloat(place.location.latitude.toString())
        : null,
      longitude: place.location?.longitude
        ? parseFloat(place.location.longitude.toString())
        : null,
      viewport_low_lat: place.viewport?.low?.latitude
        ? parseFloat(place.viewport.low.latitude.toString())
        : null,
      viewport_low_lng: place.viewport?.low?.longitude
        ? parseFloat(place.viewport.low.longitude.toString())
        : null,
      viewport_high_lat: place.viewport?.high?.latitude
        ? parseFloat(place.viewport.high.latitude.toString())
        : null,
      viewport_high_lng: place.viewport?.high?.longitude
        ? parseFloat(place.viewport.high.longitude.toString())
        : null,
      google_maps_uri: place.googleMapsUri || null,
      website_uri: place.websiteUri || null,
      business_status: place.businessStatus || null,
      utc_offset_minutes: place.utcOffsetMinutes
        ? parseInt(place.utcOffsetMinutes.toString())
        : null,
      icon_mask_base_uri: place.iconMaskBaseUri || null,
      icon_background_color: place.iconBackgroundColor || null,
      editorial_summary: place.editorialSummary?.text || null,
      current_open_now: place.currentOpeningHours?.openNow || false,
      regular_open_now: place.regularOpeningHours?.openNow || false,
      next_close_time: null, // This would need additional API call to get
    };

    // Insert main place data
    const { error: placeError } = await supabase
      .schema("places")
      .from("places")
      .insert(placeData);

    if (placeError) {
      console.error("Error inserting place:", placeError);
      console.error(
        "Place data that failed:",
        JSON.stringify(placeData, null, 2)
      );

      // Try to identify the specific issue
      if (placeError.code === "23502") {
        console.error("Missing required field - check database schema");
      } else if (placeError.code === "23514") {
        console.error(
          "Check constraint violation - data doesn't meet requirements"
        );
      } else if (placeError.code === "42P01") {
        console.error("Table doesn't exist - check table name");
      } else if (placeError.code === "42703") {
        console.error("Column doesn't exist - check column names");
      }

      // Don't throw error, just log it and continue
      console.log("Continuing without database storage...");
    }

    // Insert place types
    if (place.types && place.types.length > 0) {
      const placeTypes = place.types.map((type: string) => ({
        place_id: place.id,
        type,
      }));

      const { error: typesError } = await supabase
        .schema("places")
        .from("place_types")
        .insert(placeTypes);

      if (typesError) {
        console.error("Error inserting place types:", typesError);
      }
    }

    // Insert address components
    if (place.addressComponents && place.addressComponents.length > 0) {
      const addressComponents = place.addressComponents.map(
        (component: any) => ({
          place_id: place.id,
          long_text: component.longText,
          short_text: component.shortText,
          types: component.types,
          language_code: component.languageCode,
        })
      );

      const { error: addressError } = await supabase
        .schema("places")
        .from("place_address_components")
        .insert(addressComponents);

      if (addressError) {
        console.error("Error inserting address components:", addressError);
      }
    }

    // Insert regular opening hours periods
    if (place.regularOpeningHours?.periods) {
      const openingPeriods = place.regularOpeningHours.periods
        .filter((period: any) => period.open) // Only include periods with open time
        .map((period: any) => ({
          place_id: place.id,
          is_regular: true,
          open_day: period.open.day || 0,
          open_hour: period.open.hour || 0,
          open_minute: period.open.minute || 0,
          open_date: period.open.date
            ? `${period.open.date.year}-${String(
                period.open.date.month
              ).padStart(2, "0")}-${String(period.open.date.day).padStart(
                2,
                "0"
              )}`
            : null,
          close_day: period.close?.day || null,
          close_hour: period.close?.hour || null,
          close_minute: period.close?.minute || null,
          close_date: period.close?.date
            ? `${period.close.date.year}-${String(
                period.close.date.month
              ).padStart(2, "0")}-${String(period.close.date.day).padStart(
                2,
                "0"
              )}`
            : null,
        }));

      if (openingPeriods.length > 0) {
        const { error: hoursError } = await supabase
          .schema("places")
          .from("place_opening_periods")
          .insert(openingPeriods);

        if (hoursError) {
          console.error("Error inserting regular opening periods:", hoursError);
        }
      }
    }

    // Insert current opening hours periods
    if (place.currentOpeningHours?.periods) {
      const currentOpeningPeriods = place.currentOpeningHours.periods
        .filter((period: any) => period.open) // Only include periods with open time
        .map((period: any) => ({
          place_id: place.id,
          is_regular: false,
          open_day: period.open.day || 0,
          open_hour: period.open.hour || 0,
          open_minute: period.open.minute || 0,
          open_date: period.open.date
            ? `${period.open.date.year}-${String(
                period.open.date.month
              ).padStart(2, "0")}-${String(period.open.date.day).padStart(
                2,
                "0"
              )}`
            : null,
          close_day: period.close?.day || null,
          close_hour: period.close?.hour || null,
          close_minute: period.close?.minute || null,
          close_date: period.close?.date
            ? `${period.close.date.year}-${String(
                period.close.date.month
              ).padStart(2, "0")}-${String(period.close.date.day).padStart(
                2,
                "0"
              )}`
            : null,
        }));

      if (currentOpeningPeriods.length > 0) {
        const { error: currentHoursError } = await supabase
          .schema("places")
          .from("place_opening_periods")
          .insert(currentOpeningPeriods);

        if (currentHoursError) {
          console.error(
            "Error inserting current opening periods:",
            currentHoursError
          );
        }
      }
    }

    // Insert regular weekday descriptions
    if (place.regularOpeningHours?.weekdayDescriptions) {
      const weekdayDescriptions =
        place.regularOpeningHours.weekdayDescriptions.map(
          (description: string) => ({
            place_id: place.id,
            is_regular: true,
            description,
          })
        );

      const { error: weekdayError } = await supabase
        .schema("places")
        .from("place_weekday_descriptions")
        .insert(weekdayDescriptions);

      if (weekdayError) {
        console.error(
          "Error inserting regular weekday descriptions:",
          weekdayError
        );
      }
    }

    // Insert current weekday descriptions
    if (place.currentOpeningHours?.weekdayDescriptions) {
      const currentWeekdayDescriptions =
        place.currentOpeningHours.weekdayDescriptions.map(
          (description: string) => ({
            place_id: place.id,
            is_regular: false,
            description,
          })
        );

      const { error: currentWeekdayError } = await supabase
        .schema("places")
        .from("place_weekday_descriptions")
        .insert(currentWeekdayDescriptions);

      if (currentWeekdayError) {
        console.error(
          "Error inserting current weekday descriptions:",
          currentWeekdayError
        );
      }
    }

    // Insert reviews
    if (place.reviews && place.reviews.length > 0) {
      const reviews = place.reviews
        .filter((review: any) => {
          const hasText = review.text;
          const hasOriginalText = review.originalText;
          const hasAuthor = review.authorAttribution; // Fixed: Google Places API uses 'authorAttribution', not 'author'

          return hasText && hasOriginalText && hasAuthor;
        }) // Only include complete reviews
        .map((review: any) => ({
          place_id: place.id,
          review_name: review.name || null,
          rating: review.rating ? parseInt(review.rating.toString()) : null,
          relative_publish_time_desc:
            review.relativePublishTimeDescription || null,
          publish_time: review.publishTime || null,
          text: review.text?.text || null,
          original_text: review.originalText?.text || null,
          author_display_name: review.authorAttribution?.displayName || null,
          author_uri: review.authorAttribution?.uri || null,
          author_photo_uri: review.authorAttribution?.photoUri || null,
          google_maps_uri: review.googleMapsUri || null,
        }));

      if (reviews.length > 0) {
        const { error: reviewsError } = await supabase
          .schema("places")
          .from("place_reviews")
          .insert(reviews);

        if (reviewsError) {
          console.error("Error inserting reviews:", reviewsError);
        }
      }
    }

    // Insert photos
    if (place.photos && place.photos.length > 0) {
      const photos = place.photos
        .filter((photo: any) => photo.name && photo.widthPx && photo.heightPx) // Only include complete photos
        .map((photo: any) => ({
          place_id: place.id,
          photo_name: photo.name || null,
          width_px: photo.widthPx ? parseInt(photo.widthPx.toString()) : null,
          height_px: photo.heightPx
            ? parseInt(photo.heightPx.toString())
            : null,
          google_maps_uri: photo.googleMapsUri || null,
          flag_content_uri: photo.flagContentUri || null,
        }));

      const { error: photosError } = await supabase
        .schema("places")
        .from("place_photos")
        .insert(photos);

      if (photosError) {
        console.error("Error inserting photos:", photosError);
      }

      // Insert photo authors if available
      for (let i = 0; i < place.photos.length; i++) {
        const photo = place.photos[i];
        if (photo.authorAttributions && photo.authorAttributions.length > 0) {
          // Get the photo ID that was just inserted
          const { data: photoData } = await supabase
            .schema("places")
            .from("place_photos")
            .select("id")
            .eq("photo_name", photo.name)
            .eq("place_id", place.id)
            .single();

          if (photoData) {
            const photoAuthors = photo.authorAttributions
              .filter((author: any) => author.displayName) // Only include authors with names
              .map((author: any) => ({
                photo_id: photoData.id,
                display_name: author.displayName || null,
                uri: author.uri || null,
                photo_uri: author.photoUri || null,
              }));

            const { error: authorsError } = await supabase
              .schema("places")
              .from("place_photo_authors")
              .insert(photoAuthors);

            if (authorsError) {
              console.error("Error inserting photo authors:", authorsError);
            }
          }
        }
      }
    }

    console.log("Successfully stored place in database:", place.id);
    return placeData;
  } catch (error) {
    console.error("Error searching and storing place:", error);
    // Return the place data even if database insertion fails
    // This allows the trip creation to continue with the Google Places data
    console.log(
      "Returning place data despite database error for trip creation"
    );
    return place
      ? {
          id: place.id,
          name: place.displayName.text,
          formatted_address: place.formattedAddress,
          latitude: place.location?.latitude,
          longitude: place.location?.longitude,
          website_uri: place.websiteUri,
          national_phone: place.nationalPhoneNumber,
          international_phone: place.internationalPhoneNumber,
        }
      : null;
  }
};

/**
 * Search for multiple places and store them in Supabase
 * @param placeNames - Array of place names to search for
 * @returns Promise with array of stored place data
 */
export const searchAndStoreMultiplePlaces = async (
  placeNames: string[]
): Promise<any[]> => {
  try {
    const results = await Promise.allSettled(
      placeNames.map((placeName) => searchAndStorePlace(placeName))
    );

    const successfulResults = results
      .filter((result) => result.status === "fulfilled" && result.value)
      .map((result) => (result as PromiseFulfilledResult<any>).value);

    console.log(
      `Successfully stored ${successfulResults.length} out of ${placeNames.length} places`
    );
    return successfulResults;
  } catch (error) {
    console.error("Error searching and storing multiple places:", error);
    throw error;
  }
};
