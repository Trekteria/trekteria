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

export default function ChangeName() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('firstname, lastname')
            .eq('user_id', user.id)
            .single();

          if (error) throw error;
          if (data) {
            setFirstName(data.firstname || "");
            setLastName(data.lastname || "");
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert("Error", "Failed to fetch user data");
      }
    };
    fetchUserData();
  }, []);

  const handleUpdateName = async () => {
    if (!firstName.trim()) {
      Alert.alert("Error", "First name is required");
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            firstname: firstName.trim(),
            lastname: lastName.trim(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
        Alert.alert("Success ✓", "Name updated successfully");
        router.back();
      }
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert("Error ✗", "Failed to update name. Please try again.");
    } finally {
      setLoading(false);
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
            loading && styles.buttonDisabled
          ]}
          onPress={handleUpdateName}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            {loading ? "Updating..." : "Update Name"}
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
