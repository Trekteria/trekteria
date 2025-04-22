import { Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

export interface Plan {
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
    tripFeatures?: string[];
  };
  summary: string;
  tripIds: string[]; // references to trip documents
  userId: string;
}

export interface Trip {
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
  tripType?: string;
  terrain?: string;
  createdAt: Timestamp; // Using Firestore Timestamp
  planId: string; // reference to the plan this trip belongs to
  bookmarked?: boolean;
  userId: string;
}
