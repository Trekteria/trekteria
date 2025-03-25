import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../constants/firebaseConfig";
import * as Google from "expo-auth-session/providers/google";

export default function AuthIndex() {
     const router = useRouter();
     const [showPassword, setShowPassword] = useState(false);
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');

     const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
          clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
          redirectUri: "https://auth.expo.io/@aungbobo/trail-mate",
     });

     console.log("Redirect URI:", request?.redirectUri);

     useEffect(() => {
          if (response?.type === "success") {
               const { id_token } = response.params;

               // Create a Firebase credential with the Google ID token
               const credential = GoogleAuthProvider.credential(id_token);

               // Sign in with Firebase
               signInWithCredential(auth, credential)
                    .then((userCredential) => {
                         console.log("Google Sign-In successful:", userCredential.user);
                         router.replace("/(app)/home");
                    })
                    .catch((error) => {
                         console.error("Error with Google Sign-In:", error.message);
                         alert(error.message);
                    });
          }
     }, [response]);

     const handleLogin = async () => {
          if (!email || !password) {
               alert("Please enter both email and password.");
               return;
          }

          try {
               console.log("Attempting to log in with email:", email);
               const userCredential = await signInWithEmailAndPassword(auth, email, password);
               const user = userCredential.user;

               console.log("User logged in:", user);
               router.replace("/(app)/home");
          } catch (error) {
               handleFirebaseError(error);
          }
     };

     const handleSignup = () => {
          router.push('/auth/signup');
     };

     const togglePasswordVisibility = () => {
          setShowPassword(!showPassword);
     };

     return (
          <View style={styles.container}>
               <View style={styles.logoContainer}>
                    <Image
                         source={require('../../assets/images/logo-green.png')}
                         style={styles.logo}
                         resizeMode="contain"
                    />
                    <Text style={styles.appName}>Welcome to TrailMate</Text>
               </View>

               <View style={styles.form}>
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

                    <View style={styles.inputContainer}>
                         <View style={styles.passwordContainer}>
                              <TextInput
                                   style={styles.passwordInput}
                                   placeholder="Password"
                                   placeholderTextColor={Colors.inactive}
                                   secureTextEntry={!showPassword}
                                   value={password}
                                   onChangeText={setPassword}
                              />
                              <TouchableOpacity
                                   style={styles.eyeIcon}
                                   onPress={togglePasswordVisibility}
                              >
                                   <Ionicons
                                        name={showPassword ? "eye-off" : "eye"}
                                        size={24}
                                        color={Colors.black}
                                   />
                              </TouchableOpacity>
                         </View>
                    </View>

                    <TouchableOpacity style={styles.forgotPassword}>
                         <Text style={styles.forgotPasswordText}>Forgot your Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                         <Text style={styles.loginButtonText}>Log In</Text>
                    </TouchableOpacity>

                    <View style={styles.dividerContainer}>
                         <View style={styles.divider} />
                         <Text style={styles.dividerText}>or</Text>
                         <View style={styles.divider} />
                    </View>

                    <TouchableOpacity style={styles.socialButton} onPress={() => promptAsync()}>
                         <FontAwesome name="google" size={24} color={Colors.black} style={styles.socialIcon} />
                         <Text style={styles.socialButtonText}>Continue with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.socialButton}>
                         <FontAwesome name="apple" size={24} color={Colors.black} style={styles.socialIcon} />
                         <Text style={styles.socialButtonText}>Continue with Apple</Text>
                    </TouchableOpacity>

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

const handleFirebaseError = (error: any) => {
    if (error.code === "auth/invalid-email") {
        alert("Invalid email format.");
    } else if (error.code === "auth/invalid-credential") {
        alert("Invalid credentials. Please check your email and password.");
    } else {
        alert(error.message);
    }
};

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: 'white',
          padding: 20,
     },
     logoContainer: {
          alignItems: 'center',
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
          fontWeight: '500',
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
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: Colors.inactive,
          borderRadius: 100,
          alignItems: 'center',
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
          alignSelf: 'center',
          marginBottom: 20,
     },
     forgotPasswordText: {
          fontSize: 14,
     },
     loginButton: {
          backgroundColor: Colors.primary,
          padding: 20,
          borderRadius: 100,
          alignItems: 'center',
          marginBottom: 15,
     },
     loginButtonText: {
          ...Typography.text.button,
          color: 'white',
     },
     dividerContainer: {
          flexDirection: 'row',
          alignItems: 'center',
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
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
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
          flexDirection: 'row',
          justifyContent: 'center',
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