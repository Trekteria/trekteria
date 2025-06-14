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
import { supabase } from "../../../services/supabaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "../../../hooks/useColorScheme";

export default function ChangePassword() {
  const router = useRouter();

  // State variables to manage form inputs
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // States to manage password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Get color scheme
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Function to handle password change
  const handleChangePassword = async () => {
    // Validate input fields
    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmNewPassword.trim()
    ) {
      Alert.alert("Error ✗", "All fields are required.");
      return;
    }

    // Check if new passwords match
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error ✗", "New passwords do not match.");
      return;
    }

    // Ensure password meets minimum length requirement
    if (newPassword.length < 6) {
      Alert.alert("Error ✗", "Password must be at least 6 characters long.");
      return;
    }

    setLoading(true); // Show loading state
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Error ✗", "No user is currently logged in.");
        setLoading(false);
        return;
      }

      // Update the user's password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Error changing password:", error.message);
        let errorMessage = "An unknown error occurred. Please try again.";

        if (error.message.includes("weak")) {
          errorMessage = "The new password is too weak.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        Alert.alert("Error ✗", errorMessage);
      } else {
        Alert.alert("Success ✓", "Your password has been updated successfully.");
        router.back(); // Navigate back to the previous screen
      }
    } catch (error: any) {
      console.error("Error changing password:", error.message);
      Alert.alert("Error ✗", "An unknown error occurred. Please try again.");
    } finally {
      setLoading(false); // Reset loading state
    }
  };

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
        <Text style={[styles.title, { color: theme.primary }]}>Change Password</Text>
      </View>

      {/* Form Section */}
      <View style={styles.form}>
        {/* Current Password Input */}
        <View style={[
          styles.inputContainer,
          {
            borderColor: theme.borderColor,
            backgroundColor: isDarkMode ? Colors.dark.card : 'white'
          }
        ]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter your current password"
            placeholderTextColor={theme.inactive}
            secureTextEntry={!showCurrentPassword} // Toggle visibility
          />
          {/* Toggle visibility icon */}
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
          >
            <Ionicons
              name={showCurrentPassword ? "eye-off" : "eye"}
              size={24}
              color={theme.inactive}
            />
          </TouchableOpacity>
        </View>

        {/* New Password Input */}
        <View style={[
          styles.inputContainer,
          {
            borderColor: theme.borderColor,
            backgroundColor: isDarkMode ? Colors.dark.card : 'white'
          }
        ]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter your new password"
            placeholderTextColor={theme.inactive}
            secureTextEntry={!showNewPassword} // Toggle visibility
          />
          {/* Toggle visibility icon */}
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowNewPassword(!showNewPassword)}
          >
            <Ionicons
              name={showNewPassword ? "eye-off" : "eye"}
              size={24}
              color={theme.inactive}
            />
          </TouchableOpacity>
        </View>

        {/* Confirm New Password Input */}
        <View style={[
          styles.inputContainer,
          {
            borderColor: theme.borderColor,
            backgroundColor: isDarkMode ? Colors.dark.card : 'white'
          }
        ]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder="Confirm your new password"
            placeholderTextColor={theme.inactive}
            secureTextEntry={!showConfirmNewPassword} // Toggle visibility
          />
          {/* Toggle visibility icon */}
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
          >
            <Ionicons
              name={showConfirmNewPassword ? "eye-off" : "eye"}
              size={24}
              color={theme.inactive}
            />
          </TouchableOpacity>
        </View>

        {/* Change Password Button */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.buttonBackground },
            loading && styles.buttonDisabled
          ]} // Disable button when loading
          onPress={handleChangePassword}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            {loading ? "Updating..." : "Change Password"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  eyeIcon: {
    paddingLeft: 10,
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
});
