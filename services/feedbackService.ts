import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";

/**
 * Submit new feedback to Firestore
 */
export const submitFeedback = async (
  subject: string,
  message: string,
  category: string
): Promise<string> => {
  const userId = auth.currentUser?.uid;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const feedbackData = {
    userId,
    email: auth.currentUser?.email,
    subject: subject.trim(),
    message: message.trim(),
    createdAt: serverTimestamp(),
    category,
  };

  const docRef = await addDoc(collection(db, "feedback"), feedbackData);
  return docRef.id;
};
