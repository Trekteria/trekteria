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

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.titleContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={30} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primary }]}>Verification Code</Text>
        <Text style={[styles.description, { color: theme.text }]}>
          We have sent the verification code to your email address.
        </Text>
      </View>

      <View style={styles.form}>

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
            {resendLoading ? "Sending..." : "Resend new code"}
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
  closeButton: {
    zIndex: 10,
  },
  titleContainer: {
    marginTop: Dimensions.get('window').height * 0.05,
  },
  title: {
    ...Typography.text.h1,
    fontSize: 35,
    marginTop: 30,
  },
  form: {
    marginBottom: 30,
  },
  description: {
    ...Typography.text.body,
    marginTop: 10,
    marginBottom: 30,
    lineHeight: 22,
    opacity: 0.5,
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