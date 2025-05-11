import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { auth } from "../../services/firebaseConfig";
import { signOut } from "firebase/auth";
import { useColorScheme } from "../../hooks/useColorScheme";

export default function SettingsPage() {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/auth");
    } catch (error) {
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  // Get the appropriate theme colors
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={28}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: theme.primary }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
        {/* Preferences Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Preferences</Text>

        {/* Dark Mode Toggle */}
        <View style={[styles.row, { borderBottomColor: theme.borderColor }]}>
          <Text style={[styles.label, { color: theme.text }]}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleColorScheme}
            trackColor={{ false: "#767577", true: Colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>

        <View style={[styles.row, { borderBottomColor: theme.borderColor }]}>
          <Text style={[styles.label, { color: theme.text }]}>Temperature</Text>
          <Text style={[styles.value, { color: theme.icon }]}>°F</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: theme.borderColor }]}>
          <Text style={[styles.label, { color: theme.text }]}>Unit</Text>
          <Text style={[styles.value, { color: theme.icon }]}>Imperial</Text>
        </View>

        {/* Account Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Account</Text>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => router.push("/(app)/settings/change-name")}
        >
          <Text style={[styles.label, { color: theme.text }]}>Change name</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => router.push("/(app)/settings/change-email")}
        >
          <Text style={[styles.label, { color: theme.text }]}>Change email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => router.push("/(app)/settings/change-password")}
        >
          <Text style={[styles.label, { color: theme.text }]}>Change password</Text>
        </TouchableOpacity>

        {/* Support Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Support</Text>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => router.push("/result")}
        >
          <Text style={[styles.label, { color: theme.text }]}>Share with friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => router.push("/result")}
        >
          <Text style={[styles.label, { color: theme.text }]}>Feedback</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => router.push("/result")}
        >
          <Text style={[styles.label, { color: theme.text }]}>Rate on App Store</Text>
        </TouchableOpacity>

        {/* Log Out Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.buttonBackground }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutText, { color: theme.buttonText }]}>Log Out</Text>
        </TouchableOpacity>

        {/* Footer Version */}
        <Text style={[styles.version, { color: theme.icon }]}>1.0.0</Text>
      </ScrollView>
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
  container: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    ...Typography.text.h1, // 42px, Montserrat, medium weight
  },
  sectionHeader: {
    ...Typography.text.h2, // 25px, Montserrat
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    borderBottomWidth: 1,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    ...Typography.text.body, // 16px, OpenSans
  },
  value: {
    ...Typography.text.body, // same as label, but with gray override
  },
  logoutButton: {
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: "center",
  },
  logoutText: {
    ...Typography.text.button, // 18px, Montserrat, bold
  },
  version: {
    ...Typography.text.caption, // 12px, OpenSans
    textAlign: "center",
    marginTop: 20,
  },
});
