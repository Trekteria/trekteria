import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "../../hooks/useColorScheme";
import { supabase } from "../../services/supabaseConfig";

export default function Signup() {
  const router = useRouter();

  // State variables to manage form inputs and visibility of passwords
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Get color scheme
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Function to handle user signup
  const handleSignup = async () => {
    // Validate that all fields are filled
    if (!firstname || !lastname || !email || !password || !confirmPassword) {
      Alert.alert("Error ✗", "Please fill in all fields.");
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      Alert.alert("Error ✗", "Passwords do not match.");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      Alert.alert("Error ✗", "Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      console.log('Starting signup process for email:', email.trim());
      
      // Sign up the user with Supabase using OTP verification
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            firstname: firstname.trim(),
            lastname: lastname.trim(),
          },
          // Use OTP verification instead of magic links
          emailRedirectTo: undefined,
        },
      });

      // Check for duplicate email error
      if (error) {
        if (
          error.message.toLowerCase().includes("user already registered") ||
          error.message.toLowerCase().includes("user already exists") ||
          error.message.toLowerCase().includes("email")
        ) {
          Alert.alert("You already have an account", "You already have an account, try logging in.");
          setLoading(false);
          return;
        }
        Alert.alert("Error ✗", error.message);
        setLoading(false);
        return;
      }

      console.log('Signup successful, user data:', data);

      if (data.user) {
        console.log('Creating user profile in database...');
        
        // Store user data in the users table
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            user_id: data.user.id,
            email: data.user.email,
            emailVerified: false,
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            ecoPoints: 0,
          }, {
            onConflict: 'user_id'
          });

        if (upsertError) {
          console.error("Error storing user data:", upsertError);
          Alert.alert("Error ✗", "Failed to create user profile. Please try again.");
          return;
        }

        console.log('User profile created successfully');

        // Check if email confirmation is required
        if (data.session === null) {
          console.log('Email confirmation required - redirecting to OTP verification');
          // Navigate to OTP verification screen
          router.replace(`/auth/verify-email?email=${encodeURIComponent(email.trim())}` as any);
        } else {
          console.log('No email confirmation required, user is already verified');
          router.replace('/(app)/home');
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert("Error ✗", "An error occurred during signup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to navigate back to the login screen
  const handleBackToLogin = () => {
    router.back();
  };

  // Toggle visibility of the password field
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle visibility of the confirm password field
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and App Name */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo-green.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: theme.primary }]}>Welcome to TrailMate</Text>
        </View>

        {/* Signup Form */}
        <View style={styles.form}>
          {/* First Name Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.borderColor,
                  color: theme.text,
                  backgroundColor: isDarkMode ? Colors.dark.card : 'white'
                }
              ]}
              placeholder="First Name"
              placeholderTextColor={theme.inactive}
              value={firstname}
              onChangeText={setFirstname}
            />
          </View>

          {/* Last Name Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.borderColor,
                  color: theme.text,
                  backgroundColor: isDarkMode ? Colors.dark.card : 'white'
                }
              ]}
              placeholder="Last Name"
              placeholderTextColor={theme.inactive}
              value={lastname}
              onChangeText={setLastname}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.borderColor,
                  color: theme.text,
                  backgroundColor: isDarkMode ? Colors.dark.card : 'white'
                }
              ]}
              placeholder="Email"
              placeholderTextColor={theme.inactive}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input with Toggle Visibility */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.passwordContainer,
              {
                borderColor: theme.borderColor,
                backgroundColor: isDarkMode ? Colors.dark.card : 'white'
              }
            ]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Password"
                placeholderTextColor={theme.inactive}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={togglePasswordVisibility}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input with Toggle Visibility */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.passwordContainer,
              {
                borderColor: theme.borderColor,
                backgroundColor: isDarkMode ? Colors.dark.card : 'white'
              }
            ]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.inactive}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={toggleConfirmPasswordVisibility}
              >
                <Feather
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={24}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.signupButton,
              { backgroundColor: theme.buttonBackground },
              loading && styles.buttonDisabled
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={[styles.signupButtonText, { color: theme.buttonText }]}>
              {loading ? "Creating Account..." : "Register"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer with Navigation to Login */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={[styles.footerText, { color: theme.inactive }]}>
              Already have an account?{" "}
              <Text style={[styles.loginText, { color: theme.primary }]}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles for the Signup screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 100,
    marginBottom: 50,
  },
  logo: {
    width: 70,
    height: 70,
  },
  appName: {
    ...Typography.text.h3,
    marginTop: 20,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 30,
    paddingVertical: 15,
    ...Typography.text.body,
  },
  passwordContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 100,
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 20,
    ...Typography.text.body,
  },
  eyeIcon: {
    paddingRight: 20,
  },
  signupButton: {
    padding: 20,
    borderRadius: 100,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    ...Typography.text.button,
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    ...Typography.text.bodySmall,
  },
  loginText: {
    ...Typography.text.link,
    fontWeight: "bold",
  },
});
