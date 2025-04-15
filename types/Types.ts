import { Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

export interface Trip {
  id?: string;
  createdAt: Timestamp; // Using Firestore Timestamp instead of number
  preferences: {
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    difficultyPreference?: string;
    experienceLevel?: string;
    groupComposition?: {
      adults: number;
      olderKids: number;
      pets: number;
      toddlers: number;
      youngKids: number;
    };
    hikeDuration?: string;
    location?: string;
    mustHaves?: string[];
    radius?: number;
    sceneryPreferences?: string[];
    terrainPreference?: string;
    timeOfDay?: string;
    trailFeatures?: string[];
  };
  summary: string;
  trailIds: string[]; // references to trail documents
  userId: string;
}

export interface Trail {
  id?: string;
  name: string;
  location: string;
  description?: string;
  difficulty?: string;
  length?: number;
  elevation?: number;
  estimatedTime?: string;
  activities?: string[];
  amenities?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  highlights?: string[];
  trailType?: string;
  terrain?: string;
  createdAt: Timestamp; // Using Firestore Timestamp
  tripId: string; // reference to the trip this trail belongs to
}
