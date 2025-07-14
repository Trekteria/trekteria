import { create } from "zustand";
import { supabase } from "../services/supabaseConfig";

interface UserState {
  // User data
  firstName: string;
  lastName: string;
  fullName: string;
  ecoPoints: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUserData: () => Promise<void>;
  updateUserName: (firstName: string, lastName: string) => Promise<void>;
  updateEcoPoints: (points: number) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  firstName: "",
  lastName: "",
  fullName: "",
  ecoPoints: 0,
  isLoading: false,
  error: null,

  // Actions
  fetchUserData: async () => {
    set({ isLoading: true, error: null });

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user) {
        const { data, error } = await supabase
          .from("users")
          .select("firstname, lastname, ecoPoints")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          const firstName = data.firstname || "";
          const lastName = data.lastname || "";
          const fullName = `${firstName} ${lastName}`.trim() || "User";

          set({
            firstName,
            lastName,
            fullName,
            ecoPoints: data.ecoPoints || 0,
            isLoading: false,
            error: null,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      set({
        isLoading: false,
        error: "Failed to fetch user data",
      });
    }
  },

  updateUserName: async (firstName: string, lastName: string) => {
    set({ isLoading: true, error: null });

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user) {
        const { error } = await supabase
          .from("users")
          .update({
            firstname: firstName.trim(),
            lastname: lastName.trim(),
          })
          .eq("user_id", user.id);

        if (error) throw error;

        // Update local state
        const fullName = `${firstName} ${lastName}`.trim() || "User";
        set({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Error updating user name:", error);
      set({
        isLoading: false,
        error: "Failed to update name",
      });
      throw error; // Re-throw to allow component to handle
    }
  },

  updateEcoPoints: async (points: number) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user) {
        const { error } = await supabase
          .from("users")
          .update({ ecoPoints: Math.max(0, points) }) // Ensure points don't go below 0
          .eq("user_id", user.id);

        if (error) throw error;

        // Update local state
        set({ ecoPoints: Math.max(0, points) });
      }
    } catch (error) {
      console.error("Error updating eco points:", error);
      set({ error: "Failed to update eco points" });
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      firstName: "",
      lastName: "",
      fullName: "",
      ecoPoints: 0,
      isLoading: false,
      error: null,
    }),
}));
