import { supabase } from "./supabaseConfig";
import { v4 as uuidv4 } from "uuid";

/**
 * Submit new feedback to Supabase
 */
export const submitFeedback = async (
  subject: string,
  message: string,
  category: string
): Promise<string> => {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const feedbackData = {
      userId: user.id,
      email: user.email,
      subject: subject.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      category,
      feedback_id: uuidv4(), // Generate a UUID for the feedback_id
    };

    // Insert feedback into Supabase
    const { error } = await supabase.from("feedback").insert(feedbackData);

    if (error) throw error;

    return feedbackData.feedback_id;
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw error;
  }
};
