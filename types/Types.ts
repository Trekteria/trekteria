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
  createdAt: Timestamp; // Using Firestore Timestamp
  planId: string; // reference to the plan this trip belongs to
  bookmarked?: boolean;
  userId: string;
  name: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  groupSize?: number;
  hikingLevel?: string;
  amenities?: string[];
  highlights?: string[];
  parkWebsite?: string;
  cellService?: string;
  parkContact?: string;

  schedule: {
    day: number;
    date: string;
    activities: [
      {
        time: string;
        activity: string;
        description: string;
        trailDetails?: {
          trailName: string;
          distance: number;
          elevation: number;
          difficulty: string;
          coordinates: {
            latitude: number;
            longitude: number;
          };
          estimatedTime: string;
          features: string[];
          trailType: string;
          duration: string;
        };
      }
    ];
  }[];

  packingChecklist: {
    item: string;
    checked: boolean;
  }[];
  missions: {
    task: string;
    completed: boolean;
  }[];
  warnings?: string[];
  thingsToKnow?: string[];
}
