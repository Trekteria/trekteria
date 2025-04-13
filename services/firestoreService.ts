import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { Trip, Trail } from "../types/Types";

/**
 * Create a new trip in Firestore
 * @param trip The trip data to create
 * @returns The ID of the created trip
 */
export const createTrip = async (trip: Omit<Trip, "id">): Promise<string> => {
  try {
    const tripRef = await addDoc(collection(db, "trips"), trip);
    return tripRef.id;
  } catch (error) {
    console.error("Error creating trip:", error);
    throw error;
  }
};

/**
 * Update an existing trip in Firestore
 * @param tripId The ID of the trip to update
 * @param tripData The trip data to update
 */
export const updateTrip = async (
  tripId: string,
  tripData: Partial<Trip>
): Promise<void> => {
  try {
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, tripData);
  } catch (error) {
    console.error("Error updating trip:", error);
    throw error;
  }
};

/**
 * Create a new trail in Firestore
 * @param trail The trail data to create
 * @returns The ID of the created trail
 */
export const createTrail = async (
  trail: Omit<Trail, "id">
): Promise<string> => {
  try {
    const trailRef = await addDoc(collection(db, "trails"), trail);
    return trailRef.id;
  } catch (error) {
    console.error("Error creating trail:", error);
    throw error;
  }
};

/**
 * Get a trip by ID
 * @param tripId The ID of the trip to get
 * @returns The trip data
 */
export const getTrip = async (tripId: string): Promise<Trip | null> => {
  try {
    const tripRef = doc(db, "trips", tripId);
    const tripSnap = await getDoc(tripRef);

    if (tripSnap.exists()) {
      return { id: tripSnap.id, ...tripSnap.data() } as Trip;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting trip:", error);
    throw error;
  }
};

/**
 * Get all trips for a user
 * @param userId The ID of the user
 * @returns Array of trips
 */
export const getUserTrips = async (userId: string): Promise<Trip[]> => {
  try {
    const tripsQuery = query(
      collection(db, "trips"),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(tripsQuery);

    const trips: Trip[] = [];
    querySnapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() } as Trip);
    });

    return trips;
  } catch (error) {
    console.error("Error getting user trips:", error);
    throw error;
  }
};

/**
 * Get all trails for a trip
 * @param tripId The ID of the trip
 * @returns Array of trails
 */
export const getTripTrails = async (tripId: string): Promise<Trail[]> => {
  try {
    const trailsQuery = query(
      collection(db, "trails"),
      where("tripId", "==", tripId)
    );
    const querySnapshot = await getDocs(trailsQuery);

    const trails: Trail[] = [];
    querySnapshot.forEach((doc) => {
      trails.push({ id: doc.id, ...doc.data() } as Trail);
    });

    return trails;
  } catch (error) {
    console.error("Error getting trip trails:", error);
    throw error;
  }
};

/**
 * Delete a trip and all its trails
 * @param tripId The ID of the trip to delete
 */
export const deleteTrip = async (tripId: string): Promise<void> => {
  try {
    // First, get all trails associated with the trip
    const trails = await getTripTrails(tripId);

    // Delete each trail
    const trailDeletions = trails.map((trail) => {
      if (trail.id) {
        return deleteDoc(doc(db, "trails", trail.id));
      }
    });

    // Wait for all trail deletions to complete
    await Promise.all(trailDeletions);

    // Then delete the trip
    await deleteDoc(doc(db, "trips", tripId));
  } catch (error) {
    console.error("Error deleting trip:", error);
    throw error;
  }
};
