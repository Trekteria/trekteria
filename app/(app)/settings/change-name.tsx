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
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "../../../hooks/useColorScheme";
import { supabase } from '../../../services/supabaseConfig';
import { useUserStore } from '../../../store';

export default function ChangeName() {
  const router = useRouter();
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Zustand store
  const { firstName: storeFirstName, lastName: storeLastName, updateUserName, isLoading, error, clearError } = useUserStore();

  // Local state for form inputs
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Initialize form inputs with store values
  useEffect(() => {
    setFirstName(storeFirstName);
    setLastName(storeLastName);
  }, [storeFirstName, storeLastName]);

  // Clear any errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleUpdateName = async () => {
    if (!firstName.trim()) {
      Alert.alert("Error", "First name is required");
      return;
    }

    try {
      await updateUserName(firstName, lastName);
      Alert.alert("Success ✓", "Name updated successfully");
      router.back();
    } catch (error) {
      Alert.alert("Error ✗", "Failed to update name. Please try again.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: theme.primary }]}>Change Name</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.borderColor,
              color: theme.text,
              backgroundColor: isDarkMode ? Colors.dark.card : 'white'
            }
          ]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          placeholderTextColor={theme.inactive}
        />

        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.borderColor,
              color: theme.text,
              backgroundColor: isDarkMode ? Colors.dark.card : 'white'
            }
          ]}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          placeholderTextColor={theme.inactive}
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.buttonBackground },
            isLoading && styles.buttonDisabled
          ]}
          onPress={handleUpdateName}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            {isLoading ? "Updating..." : "Update Name"}
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
  label: {
    ...Typography.text.body,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 30,
    paddingVertical: 20,
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
});
