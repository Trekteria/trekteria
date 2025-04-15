import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../../services/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

// Main authentication screen component
export default function AuthIndex() {
  const router = useRouter(); // Router for navigation
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const [email, setEmail] = useState(""); // State to store email input
  const [password, setPassword] = useState(""); // State to store password input

  // Handles user login
  const handleLogin = async () => {
    const trimmedEmail = email.trim(); // Trim whitespace from email
    if (!trimmedEmail || !password) {
      alert("Please enter both email and password."); // Alert if fields are empty
      return;
    }

    try {
      console.log("Attempting to log in with email:", email);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      const user = userCredential.user;

      // Check if the user's email is verified
      if (user.emailVerified) {
        // Update Firestore with email verification status
        await updateDoc(doc(db, "users", user.uid), {
          email: user.email,
          emailVerified: true,
        });
        console.log("User logged in:", user);
        router.replace("/(app)/home"); // Navigate to home screen
      } else {
        alert("Please verify your email before logging in."); // Alert if email is not verified
      }
    } catch (error) {
      handleFirebaseError(error); // Handle Firebase errors
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
      await sendPasswordResetEmail(auth, trimmedEmail);
      alert(
        "A password reset email has been sent to your email address. Please check your inbox."
      );
    } catch (error: any) {
      console.error("Error sending password reset email:", error.message);
      if (error.code === "auth/user-not-found") {
        alert("No user found with this email address.");
      } else if (error.code === "auth/invalid-email") {
        alert("Invalid email format.");
      } else {
        alert("An error occurred. Please try again.");
      }
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
    <View style={styles.container}>
      {/* Logo and app name */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo-green.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Welcome to TrailMate</Text>
      </View>

      {/* Login form */}
      <View style={styles.form}>
        {/* Email input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.inactive}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password input with visibility toggle */}
        <View style={styles.inputContainer}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={Colors.inactive}
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
                color={Colors.black}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot password link */}
        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={handleForgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Forgot your Password?</Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>

        {/* Divider for social login */}
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        {/* Social login buttons */}
        <TouchableOpacity style={styles.socialButton}>
          <FontAwesome
            name="google"
            size={24}
            color={Colors.black}
            style={styles.socialIcon}
          />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton}>
          <FontAwesome
            name="apple"
            size={24}
            color={Colors.black}
            style={styles.socialIcon}
          />
          <Text style={styles.socialButtonText}>Continue with Apple</Text>
        </TouchableOpacity>

        {/* Registration link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Not a member? </Text>
          <TouchableOpacity onPress={handleSignup}>
            <Text style={styles.registerLink}>Register now</Text>
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
    backgroundColor: "white",
    padding: 20,
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
    color: Colors.primary,
    marginTop: 20,
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
    borderColor: Colors.inactive,
    borderRadius: 100,
    paddingHorizontal: 30,
    paddingVertical: 20,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.inactive,
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
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    padding: 20,
    borderRadius: 100,
    alignItems: "center",
    marginBottom: 15,
  },
  loginButtonText: {
    ...Typography.text.button,
    color: "white",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.inactive,
  },
  dividerText: {
    marginHorizontal: 10,
    color: Colors.inactive,
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
    borderColor: Colors.inactive,
  },
  socialIcon: {
    marginRight: 10,
  },
  socialButtonText: {
    ...Typography.text.body,
    color: Colors.black,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    ...Typography.text.body,
    color: Colors.inactive,
  },
  registerLink: {
    ...Typography.text.body,
    color: Colors.primary,
  },
});
