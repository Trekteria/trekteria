import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "../../hooks/useColorScheme";
import { trackScreen, trackEvent } from '../../services/analyticsService';
import { supabase } from '../../services/supabaseConfig';

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [email, setEmail] = useState("");
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    trackScreen('auth_verify_email');
    // Get email from params if available
    if (params.email) {
      setEmail(params.email as string);
    }
  }, [params.email]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to go to previous input
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: otpString,
        type: 'email'
      });

      if (error) {
        console.error("OTP verification error:", error);
        Alert.alert("Error", error.message);
        return;
      }

      trackEvent('email_verification_success', {
        method: 'otp',
        screen: 'auth_verify_email',
        category: 'authentication'
      });

      Alert.alert(
        "Success", 
        "Your email has been verified successfully! You can now log in.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/auth")
          }
        ]
      );
    } catch (error) {
      console.error("OTP verification error:", error);
      Alert.alert("Error", "An error occurred while verifying your email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setResendLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        console.error("Resend OTP error:", error);
        Alert.alert("Error", error.message);
        return;
      }

      // Clear OTP fields
      setOtp(["", "", "", "", "", ""]);
      Alert.alert("Success", "A new verification code has been sent to your email.");
    } catch (error) {
      console.error("Resend OTP error:", error);
      Alert.alert("Error", "An error occurred while sending the verification code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToAuth = () => {
    router.replace("/auth");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo-green.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.appName, { color: theme.primary }]}>Verify Email</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.description, { color: theme.text }]}>
          Please enter the 6-digit code below.
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpBox,
                {
                  borderColor: theme.borderColor,
                  color: theme.text,
                  backgroundColor: isDarkMode ? Colors.dark.card : 'white'
                }
              ]}
              placeholder=""
              placeholderTextColor={theme.inactive}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.verifyButton, 
            { 
              backgroundColor: theme.buttonBackground,
              opacity: isLoading ? 0.7 : 1
            }
          ]}
          onPress={handleVerifyOTP}
          disabled={isLoading}
        >
          <Text style={[styles.verifyButtonText, { color: theme.buttonText }]}>
            {isLoading ? "Verifying..." : "Verify Email"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.resendButton,
            { opacity: resendLoading ? 0.7 : 1 }
          ]}
          onPress={handleResendOTP}
          disabled={resendLoading}
        >
          <Text style={[styles.resendButtonText, { color: theme.primary }]}>
            {resendLoading ? "Sending..." : "Resend Code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToAuth}
          onPress={handleBackToAuth}
        >
          <Text style={[styles.backToAuthText, { color: theme.text }]}>
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginTop: 20,
  },
  form: {
    marginBottom: 30,
  },
  description: {
    ...Typography.text.body,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  otpBox: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
  },
  verifyButton: {
    padding: 20,
    borderRadius: 100,
    alignItems: "center",
    marginBottom: 15,
    marginTop: 20,
  },
  verifyButtonText: {
    ...Typography.text.button,
  },
  resendButton: {
    alignSelf: "center",
    marginTop: 20,
    padding: 10,
  },
  resendButtonText: {
    ...Typography.text.body,
    textDecorationLine: "underline",
  },
  backToAuth: {
    alignSelf: "center",
    marginTop: 30,
  },
  backToAuthText: {
    fontSize: 16,
    textDecorationLine: "underline",
  },
}); 