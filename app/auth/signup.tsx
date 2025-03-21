import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../constants/firebaseConfig";

export default function Signup() {
     const router = useRouter();
     const [showPassword, setShowPassword] = useState(false);
     const [showConfirmPassword, setShowConfirmPassword] = useState(false);
     const [firstname, setFirstname] = useState("");
     const [lastname, setLastname] = useState("");
     const [email, setEmail] = useState("");
     const [password, setPassword] = useState("");
     const [confirmPassword, setConfirmPassword] = useState("");

     const handleSignup = async () => {
          if (!firstname || !lastname || !email || !password || !confirmPassword) {
               alert("Please fill in all fields.");
               return;
          }

          if (password !== confirmPassword) {
               alert("Passwords do not match.");
               return;
          }

          try {
               // Create a new user with Firebase Authentication
               const userCredential = await createUserWithEmailAndPassword(auth, email, password);
               const user = userCredential.user;

               // Store additional user data in Firestore
               await setDoc(doc(db, "users", user.uid), {
                    firstname,
                    lastname,
                    email,
               });

               console.log("User created and data saved:", user.uid);

               // Navigate to the home screen
               router.replace("/(app)/home");
          } catch (error) {
               if (error instanceof Error) {
                    console.error("Error signing up:", error.message);
                    alert(error.message); // Show an error message to the user
               } else {
                    console.error("Error signing up:", error);
                    alert("An unknown error occurred."); // Fallback for unknown error types
               }
          }
          
     };

     const handleBackToLogin = () => {
          router.back();
     };

     const togglePasswordVisibility = () => {
          setShowPassword(!showPassword);
     };

     const toggleConfirmPasswordVisibility = () => {
          setShowConfirmPassword(!showConfirmPassword);
     };

     return (
          <KeyboardAvoidingView
               style={{ flex: 1 }}
               behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
               <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
               >
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
                                   placeholder="First Name"
                                   placeholderTextColor={Colors.inactive}
                                   autoCapitalize="words"
                                   value={firstname}
                                   onChangeText={setFirstname}
                              />
                         </View>

                         <View style={styles.inputContainer}>
                              <TextInput
                                   style={styles.input}
                                   placeholder="Last Name"
                                   placeholderTextColor={Colors.inactive}
                                   autoCapitalize="words"
                                   value={lastname}
                                   onChangeText={setLastname}
                              />
                         </View>

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
                                        <Feather
                                             name={showPassword ? "eye-off" : "eye"}
                                             size={24}
                                             color={Colors.black}
                                        />
                                   </TouchableOpacity>
                              </View>
                         </View>

                         <View style={styles.inputContainer}>
                              <View style={styles.passwordContainer}>
                                   <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Confirm Password"
                                        placeholderTextColor={Colors.inactive}
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
                                             color={Colors.black}
                                        />
                                   </TouchableOpacity>
                              </View>
                         </View>

                         <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
                              <Text style={styles.signupButtonText}>Register</Text>
                         </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                         <TouchableOpacity onPress={handleBackToLogin}>
                              <Text style={styles.footerText}>
                                   Already have an account? <Text style={styles.loginText}>Log In</Text>
                              </Text>
                         </TouchableOpacity>
                    </View>
               </ScrollView>
          </KeyboardAvoidingView>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: 'white',
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
     contentContainer: {
          padding: 20,
          paddingBottom: 40,
     },
     header: {
          marginTop: 60,
          marginBottom: 40,
     },
     title: {
          ...Typography.text.h2,
          marginBottom: 10,
     },
     subtitle: {
          ...Typography.text.h4,
          color: Colors.inactive,
     },
     form: {
          marginBottom: 30,
     },
     inputContainer: {
          marginBottom: 20,
     },
     label: {
          ...Typography.text.bodySmall,
          marginBottom: 8,
          fontWeight: '500',
     },
     input: {
          borderWidth: 1,
          borderColor: Colors.inactive,
          borderRadius: 100,
          paddingHorizontal: 30,
          paddingVertical: 15,
          ...Typography.text.body,
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
          ...Typography.text.body,
     },
     eyeIcon: {
          paddingRight: 20,
     },
     signupButton: {
          backgroundColor: Colors.primary,
          padding: 20,
          borderRadius: 100,
          alignItems: 'center',
          marginTop: 10,
     },
     signupButtonText: {
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
          ...Typography.text.bodySmall,
          color: Colors.inactive,
          marginHorizontal: 10,
     },
     socialButton: {
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: Colors.inactive,
          borderRadius: 100,
          padding: 15,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 15,
     },
     socialIcon: {
          marginRight: 10,
     },
     socialButtonText: {
          ...Typography.text.body,
          fontWeight: '500',
     },
     footer: {
          alignItems: 'center',
          marginTop: 20,
     },
     footerText: {
          ...Typography.text.bodySmall,
          color: Colors.inactive,
     },
     loginText: {
          ...Typography.text.link,
          color: Colors.primary,
          fontWeight: 'bold',
     },
});