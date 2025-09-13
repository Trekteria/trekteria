import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { useColorScheme } from "../../hooks/useColorScheme";
import { signInWithGoogle } from '../../services/googleAuth';
import { signInWithApple } from '../../services/appleAuth';
import { trackScreen, trackAuthEvent, trackEvent } from '../../services/analyticsService';
import { supabase } from '../../services/supabaseConfig';
import { useOfflineData } from '../../hooks/useOfflineData';
import * as AppleAuthentication from "expo-apple-authentication";

// Main authentication screen component
export default function AuthIndex() {
  const router = useRouter(); // Router for navigation
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const [email, setEmail] = useState(""); // State to store email input
  const [password, setPassword] = useState(""); // State to store password input
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const { pullData } = useOfflineData();

  // Track screen view
  useEffect(() => {
    trackScreen('auth_signin');
  }, []);

  // Handles user login
  const handleLogin = async () => {
    const trimmedEmail = email.trim(); // Trim whitespace from email
    if (!trimmedEmail || !password) {
      alert("Please enter both email and password."); // Alert if fields are empty
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (error) {
        console.error("Login error:", error.message);
        alert(error.message);
        return;
      }

      if (data.user) {
        // Check if email is verified in Supabase Auth
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user && user.email_confirmed_at) {
          // Update your users table
          await supabase
            .from('users')
            .update({ emailVerified: true })
            .eq('user_id', user.id);
        }

        // Pull data from Supabase to local SQLite
        try {
          await pullData(data.user.id);
        } catch (error) {
          console.error("Error pulling data:", error);
        }

        console.log("User logged in successfully:", data.user.email);
        router.replace('/(app)/home');
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login. Please try again.");
    }
  };

  // Handles forgot password
  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      alert("Please enter your email to reset your password.");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: 'https://www.trekteria.com/',
      });

      if (error) {
        console.error("Password reset error:", error.message);
        alert(error.message);
        return;
      }

      alert("Password reset instructions have been sent to your email.");
    } catch (error) {
      console.error("Password reset error:", error);
      alert("An error occurred while sending reset instructions. Please try again.");
    }
  };

  // Navigate to the signup screen
  const handleSignup = () => {
    router.push("/auth/signup");
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Logo and app name */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo-green.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.appName, { color: theme.primary }]}>Welcome to Trekteria</Text>
      </View>

      {/* Login form */}
      <View style={styles.form}>
        {/* Email input */}
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

        {/* Password input with visibility toggle */}
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
              secureTextEntry={!showPassword} // Toggle secure text entry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={togglePasswordVisibility}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"} // Icon changes based on visibility
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: theme.buttonBackground }]}
          onPress={handleLogin}
        >
          <Text style={[styles.loginButtonText, { color: theme.buttonText }]}>Log In</Text>
        </TouchableOpacity>

        {/* Forgot password link */}
        {/* <TouchableOpacity
          style={styles.forgotPassword}
          onPress={handleForgotPassword}
        >
          <Text style={[styles.forgotPasswordText, { color: theme.text }]}>Forgot your Password?</Text>
        </TouchableOpacity> */}

        {/* Divider for social login */}
        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: theme.inactive }]} />
          <Text style={[styles.dividerText, { color: theme.inactive }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: theme.inactive }]} />
        </View>

        {/* Social login buttons */}
        <TouchableOpacity
          style={[styles.socialButton, { borderColor: theme.borderColor }]}
          onPress={() => {
            trackEvent('google_signin_button_clicked', {
              method: 'google',
              screen: 'auth_signin',
              category: 'authentication'
            });
            signInWithGoogle();
          }}
        >
          <FontAwesome
            name="google"
            size={24}
            color={theme.text}
          />
          <Text style={[styles.socialButtonText, { color: theme.text }]}>Continue with Google</Text>
        </TouchableOpacity>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={isDarkMode ?
            AppleAuthentication.AppleAuthenticationButtonStyle.WHITE :
            AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          style={styles.appleButton}
          onPress={() => {
            trackEvent('apple_signin_button_clicked', {
              method: 'apple',
              screen: 'auth_signin',
              category: 'authentication'
            });
            signInWithApple();
          }}
        />

        {/* Registration link */}
        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: theme.inactive }]}>Not a member? </Text>
          <TouchableOpacity onPress={handleSignup}>
            <Text style={[styles.registerLink, { color: theme.primary }]}>Register now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Handle Firebase authentication errors
const handleFirebaseError = (error: any) => {
  if (error.code === "auth/invalid-email") {
    alert("Invalid email format.");
  } else if (error.code === "auth/invalid-credential") {
    alert("Invalid credentials. Please check your email and password.");
  } else {
    alert(error.message); // Display other error messages
  }
};

// Styles for the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: Dimensions.get('window').height * 0.08,
    marginBottom: 30,
  },
  logo: {
    width: 60,
    height: 60,
  },
  appName: {
    ...Typography.text.h3,
    marginTop: 10,
  },
  buttonContainer: {
    marginBottom: 50,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 30,
    paddingVertical: 20,
    fontSize: 16,
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
    fontSize: 16,
  },
  eyeIcon: {
    paddingRight: 20,
  },
  forgotPassword: {
    alignSelf: "center",
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  loginButton: {
    padding: 20,
    borderRadius: 100,
    alignItems: "center",
    marginBottom: 15,
    marginTop: 20,
  },
  loginButtonText: {
    ...Typography.text.button,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
  },
  socialButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    gap: 10,
    borderWidth: 1,
  },
  socialIcon: {
    marginRight: 10,
  },
  socialButtonText: {
    ...Typography.text.body,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: 15,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    ...Typography.text.body,
  },
  registerLink: {
    ...Typography.text.body,
  },
});
