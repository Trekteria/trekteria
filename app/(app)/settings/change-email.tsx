import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Colors } from "../../../constants/Colors";
import { Typography } from "../../../constants/Typography";
import { auth } from "../../../services/firebaseConfig";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";

// Component for changing the user's email
export default function ChangeEmail() {
  const router = useRouter(); // Router for navigation
  const [newEmail, setNewEmail] = useState(""); // State to store the new email
  const [password, setPassword] = useState(""); // State to store the user's password
  const [loading, setLoading] = useState(false); // State to manage loading state

  // Function to handle email update
  const handleUpdateEmail = async () => {
    // Validate if the new email is provided
    if (!newEmail.trim()) {
      Alert.alert("Error", "New email is required.");
      return;
    }

    // Validate if the password is provided
    if (!password.trim()) {
      Alert.alert("Error", "Password is required for security verification.");
      return;
    }

    setLoading(true); // Set loading state to true
    try {
      const user = auth.currentUser; // Get the currently logged-in user
      if (!user || !user.email) {
        Alert.alert("Error", "No user is currently logged in.");
        setLoading(false);
        return;
      }

      // Re-authenticate the user with their current email and password
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Send a verification email to the new email address
      await verifyBeforeUpdateEmail(user, newEmail.trim());

      Alert.alert(
        "Verification Email Sent",
        "A verification email has been sent to your new email address. Please verify it by clicking the link in the email. After verification, sign back in to complete the process."
      );

      // Sign out the user after sending the verification email
      await auth.signOut();
      // Redirect the user to the login screen
      router.replace("/auth");
    } catch (error: any) {
      console.error("Error in email update process:", error);

      // Handle different error cases and display appropriate messages
      let errorMessage = "An unknown error occurred. Please try again.";
      if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage =
          "For security reasons, please sign out and sign in again before changing your email.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "The email address is not valid.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Hide the default header */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          {/* Back button to navigate to the previous screen */}
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={"black"} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Change Email</Text>
      </View>

      {/* Form Section */}
      <View style={styles.form}>
        {/* Input for new email */}
        <TextInput
          style={styles.input}
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="Enter your new email"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Input for password */}
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password for verification"
          placeholderTextColor="#666"
          secureTextEntry
        />

        {/* Button to trigger email update */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleUpdateEmail}
          disabled={loading} // Disable button while loading
        >
          <Text style={styles.buttonText}>
            {loading ? "Processing..." : "Update Email"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
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
    color: Colors.primary,
  },
  form: {
    width: "100%",
    gap: 20,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.inactive,
    borderRadius: 100,
    paddingHorizontal: 30,
    paddingVertical: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary,
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
    color: "white",
  },
});
