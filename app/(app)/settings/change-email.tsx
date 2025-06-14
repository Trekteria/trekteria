import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Colors } from "../../../constants/Colors";
import { Typography } from "../../../constants/Typography";
import { supabase } from "../../../services/supabaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "../../../hooks/useColorScheme";

// Component for changing the user's email
export default function ChangeEmail() {
  const router = useRouter(); // Router for navigation
  const [currentEmail, setCurrentEmail] = useState(""); // State to store current email
  const [newEmail, setNewEmail] = useState(""); // State to store the new email
  const [password, setPassword] = useState(""); // State to store the user's password
  const [loading, setLoading] = useState(false); // State to manage loading state
  const [initializing, setInitializing] = useState(true); // State to track initial loading
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Fetch current email on component mount
  useEffect(() => {
    const fetchCurrentEmail = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && user.email) {
          setCurrentEmail(user.email);
        }
      } catch (error) {
        console.error("Error fetching current email:", error);
      } finally {
        setInitializing(false);
      }
    };

    fetchCurrentEmail();
  }, []);

  // Function to handle email update
  const handleUpdateEmail = async () => {
    // Validate if the new email is provided
    if (!newEmail.trim()) {
      Alert.alert("Error ✗", "New email is required.");
      return;
    }

    // Check if new email is different from current email
    if (newEmail.trim() === currentEmail) {
      Alert.alert("Error ✗", "New email must be different from current email.");
      return;
    }

    // Validate if the password is provided
    if (!password.trim()) {
      Alert.alert("Error ✗", "Password is required for security verification.");
      return;
    }

    setLoading(true); // Set loading state to true
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Error ✗", "No user is currently logged in.");
        setLoading(false);
        return;
      }

      // Update the user's email using Supabase
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });

      if (error) {
        console.error("Error in email update process:", error);
        let errorMessage = "An unknown error occurred. Please try again.";

        if (error.message.includes("invalid")) {
          errorMessage = "The email address is not valid.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        Alert.alert("Error ✗", errorMessage);
      } else {
        Alert.alert(
          "Verification Email Sent ↗",
          "A verification email has been sent to your new email address. Please verify it by clicking the link in the email. After verification, sign back in to complete the process."
        );

        // Sign out the user after sending the verification email
        await supabase.auth.signOut();
        // Redirect the user to the login screen
        router.replace("/auth");
      }
    } catch (error: any) {
      console.error("Error in email update process:", error);
      Alert.alert("Error ✗", "An unknown error occurred. Please try again.");
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Show loading indicator while fetching the current email
  if (initializing) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading your information...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Hide the default header */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          {/* Back button to navigate to the previous screen */}
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: theme.primary }]}>Change Email</Text>
      </View>

      {/* Form Section */}
      <View style={styles.form}>
        {/* Display current email */}
        <View style={styles.currentEmailContainer}>
          <Text style={[styles.inputLabel, { color: theme.icon }]}>Current Email</Text>
          <View style={[styles.currentEmailBox, { backgroundColor: isDarkMode ? Colors.dark.card : '#f7f7f7', borderColor: theme.borderColor }]}>
            <Text style={[styles.currentEmailText, { color: theme.text }]}>{currentEmail}</Text>
          </View>
        </View>

        {/* Input for new email */}
        <View>
          <Text style={[styles.inputLabel, { color: theme.icon }]}>New Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.borderColor,
                color: theme.text,
                backgroundColor: isDarkMode ? Colors.dark.card : 'white'
              }
            ]}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="Enter your new email"
            placeholderTextColor={theme.inactive}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Input for password */}
        <View>
          <Text style={[styles.inputLabel, { color: theme.icon }]}>Password</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.borderColor,
                color: theme.text,
                backgroundColor: isDarkMode ? Colors.dark.card : 'white'
              }
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={theme.inactive}
            secureTextEntry
          />
        </View>

        {/* Button to trigger email update */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.buttonBackground },
            loading && styles.buttonDisabled
          ]}
          onPress={handleUpdateEmail}
          disabled={loading} // Disable button while loading
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            {loading ? "Processing..." : "Update Email"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.inputLabel, { color: theme.icon, textAlign: 'center', marginTop: 20 }]}>
          Note: You'll need to verify your new email address before the changes take effect.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    ...Typography.text.h1,
  },
  form: {
    width: "100%",
    gap: 20,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    paddingLeft: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 30,
    paddingVertical: 20,
    fontSize: 16,
  },
  currentEmailContainer: {
    marginBottom: 10,
  },
  currentEmailBox: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  currentEmailText: {
    fontSize: 16,
  },
  button: {
    padding: 20,
    borderRadius: 100,
    alignItems: "center",
    marginTop: 30,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...Typography.text.button,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
