export interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

export interface Plan {
  id?: string;
  createdAt: string; // ISO string date
  lastUpdated?: string; // ISO string date
  imageUrl?: string;
  totalGroupSize?: number;
  preferences: {
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    location?: {
      fromLocation: string;
      toLocation: string;
      radius: number;
    };
    groupComposition?: {
      adults: number;
      kids: number;
      toddlers: number;
      pets: number;
      wheelchairUsers: number;
      serviceAnimals: number;
    };
    campingExperience?: string;
    campingType?: string;
    amenities?: string[];
    activities?: string[];
    mustHaves?: string[];
    weatherPreference?: string;
  };
  summary: string;
  tripIds: string[]; // references to trip documents
  userId: string;
}

export interface Trip {
  id?: string;
  createdAt: string; // ISO string date
  imageUrl?: string;
  planId: string; // reference to the plan this trip belongs to
  bookmarked?: boolean;
  userId: string;
  name: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  description?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  groupSize?: number;
  difficultyLevel?: string;
  amenities?: string[];
  highlights?: string[];
  parkWebsite?: string;
  cellService?: string;
  parkContact?: string;

  schedule: {
    day: number;
    date: string;
    activities: {
      startTime: string;
      endTime: string;
      activity: string;
    }[];
  }[];

  packingChecklist: {
    item: string;
    checked: boolean;
  }[];
  missions: {
    task: string;
    completed: boolean;
    points: number;
  }[];
  warnings?: string[];
  thingsToKnow?: string[];

  // Add chat history
  chatHistory?: {
    id: string;
    text: string;
    sender: "user" | "bot";
    timestamp: string; // ISO string date
  }[];
}

export interface Feedback {
  id?: string;
  userId: string;
  email?: string;
  subject: string;
  message: string;
  createdAt: string; // ISO string date
  category?: "bug" | "feature" | "improvement" | "other";
}
