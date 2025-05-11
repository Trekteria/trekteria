import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { Trip } from "../types/Types";

export type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Timestamp;
};

/**
 * Save a chat message to the trip's chatHistory
 * @param tripId - The ID of the trip this message belongs to
 * @param message - The message object to save
 * @returns The ID of the newly created message
 */
export const saveChatMessage = async (
  tripId: string,
  message: Omit<ChatMessage, "id" | "timestamp">
): Promise<string> => {
  try {
    const tripRef = doc(db, "trips", tripId);
    const messageId = Date.now().toString(); // Generate a unique ID

    const newMessage: ChatMessage = {
      id: messageId,
      ...message,
      timestamp: Timestamp.now(),
    };

    // Update the trip document by adding the new message to chatHistory
    await updateDoc(tripRef, {
      chatHistory: arrayUnion(newMessage),
    });

    return messageId;
  } catch (error) {
    console.error("Error saving chat message:", error);
    throw error;
  }
};

/**
 * Get all chat messages for a specific trip
 * @param tripId - The ID of the trip to get messages for
 * @returns Array of chat messages sorted by timestamp
 */
export const getChatMessages = async (
  tripId: string
): Promise<ChatMessage[]> => {
  try {
    const tripRef = doc(db, "trips", tripId);
    const tripDoc = await getDoc(tripRef);

    if (!tripDoc.exists()) {
      throw new Error("Trip not found");
    }

    const tripData = tripDoc.data() as Trip;
    const messages = tripData.chatHistory || [];

    // Sort messages by timestamp
    return messages.sort(
      (a, b) => a.timestamp.toMillis() - b.timestamp.toMillis()
    );
  } catch (error) {
    console.error("Error getting chat messages:", error);
    throw error;
  }
};
