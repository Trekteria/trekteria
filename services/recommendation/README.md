# Recommendation Services

This folder contains the refactored recommendation service, broken down into focused, maintainable modules.

## Structure

- **`index.ts`** - Main orchestrator that exports all functions for backward compatibility
- **`coordinatesService.ts`** - Handles coordinate fetching from OpenStreetMap API
- **`parsingService.ts`** - Parses Gemini API recommendations into structured trip data
- **`placesService.ts`** - Google Places API integration and place data storage
- **`storageService.ts`** - Handles saving plans and trips to Supabase and AsyncStorage

## Usage

Import from the main module for all functionality:

```typescript
import {
  processRecommendations,
  parseRecommendations,
  savePlan,
  fetchCoordinates,
  searchAndStorePlace,
  searchAndStoreMultiplePlaces,
} from "@/services/recommendation";
```

## Benefits

1. **Separation of Concerns** - Each service has a single responsibility
2. **Maintainability** - Easier to find and modify specific functionality
3. **Testability** - Individual services can be tested in isolation
4. **Reusability** - Services can be used independently across the app
5. **Readability** - Smaller, focused files are easier to understand

## Dependencies

- `coordinatesService.ts` - No dependencies on other recommendation services
- `parsingService.ts` - Depends on coordinatesService and placesService
- `placesService.ts` - No dependencies on other recommendation services
- `storageService.ts` - No dependencies on other recommendation services
- `index.ts` - Orchestrates all services
