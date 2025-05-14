import React, { useState } from 'react';
import {
     View,
     Text,
     StyleSheet,
     TouchableOpacity,
     SafeAreaView,
     TextInput,
     Alert,
     ActivityIndicator,
     KeyboardAvoidingView,
     Platform,
     TouchableWithoutFeedback,
     Keyboard,
     ScrollView
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { Typography } from '../../../constants/Typography';
import { useColorScheme } from '../../../hooks/useColorScheme';
import DropDownPicker from 'react-native-dropdown-picker';
import { submitFeedback } from '../../../services/feedbackService';

export default function FeedbackPage() {
     const router = useRouter();
     const { colorScheme } = useColorScheme();
     const isDarkMode = colorScheme === 'dark';
     const theme = isDarkMode ? Colors.dark : Colors.light;

     const [subject, setSubject] = useState('');
     const [message, setMessage] = useState('');
     const [isSubmitting, setIsSubmitting] = useState(false);
     const [open, setOpen] = useState(false);
     const [category, setCategory] = useState('bug');
     const [items, setItems] = useState([
          { label: 'Bug Report', value: 'bug' },
          { label: 'Feature Request', value: 'feature' },
          { label: 'Improvement', value: 'improvement' },
          { label: 'Other', value: 'other' }
     ]);

     const handleSubmit = async () => {
          // Validate inputs
          if (!subject.trim() || !message.trim()) {
               Alert.alert('Error', 'Please fill out all fields');
               return;
          }

          setIsSubmitting(true);
          try {
               await submitFeedback(subject, message, category);

               Alert.alert(
                    'Thank You!',
                    'Your feedback has been submitted successfully.',
                    [{ text: 'OK', onPress: () => router.back() }]
               );
          } catch (error) {
               console.error('Error submitting feedback:', error);
               Alert.alert('Error', 'Failed to submit feedback. Please try again later.');
          } finally {
               setIsSubmitting(false);
          }
     };

     return (
          <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
               <Stack.Screen
                    options={{
                         headerShown: false,
                    }}
               />
               <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1 }}>
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
                              <Text style={[styles.title, { color: theme.primary }]}>Feedback</Text>
                         </View>

                         <KeyboardAvoidingView
                              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                              style={styles.keyboardAvoidingView}
                         >
                              <ScrollView
                                   contentContainerStyle={styles.scrollViewContent}
                                   keyboardShouldPersistTaps="handled"
                              >
                                   <View style={styles.form}>
                                        <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                                        <DropDownPicker
                                             open={open}
                                             value={category}
                                             items={items}
                                             setOpen={setOpen}
                                             setValue={setCategory}
                                             setItems={setItems}
                                             style={[
                                                  styles.dropdown,
                                                  {
                                                       borderColor: theme.borderColor,
                                                       backgroundColor: isDarkMode ? Colors.dark.card : 'white'
                                                  }
                                             ]}
                                             textStyle={{ color: theme.text }}
                                             dropDownContainerStyle={[
                                                  styles.dropdownListContainer,
                                                  {
                                                       borderColor: theme.borderColor,
                                                       backgroundColor: isDarkMode ? Colors.dark.card : 'white',
                                                       borderWidth: 1
                                                  }
                                             ]}
                                             placeholderStyle={{ color: theme.inactive }}
                                             ArrowUpIconComponent={() => (
                                                  <Ionicons name="chevron-up" size={16} color={isDarkMode ? Colors.white : '#000'} />
                                             )}
                                             ArrowDownIconComponent={() => (
                                                  <Ionicons name="chevron-down" size={16} color={isDarkMode ? Colors.white : '#000'} />
                                             )}
                                             TickIconComponent={() => (
                                                  <Ionicons name="checkmark" size={16} color={isDarkMode ? Colors.white : '#000'} />
                                             )}
                                             zIndex={3000}
                                             listMode="SCROLLVIEW"
                                             maxHeight={200}
                                             autoScroll
                                        />

                                        <Text style={[styles.label, { color: theme.text, marginTop: 10 }]}>Subject</Text>
                                        <TextInput
                                             style={[
                                                  styles.input,
                                                  {
                                                       borderColor: theme.borderColor,
                                                       color: theme.text,
                                                       backgroundColor: isDarkMode ? Colors.dark.card : 'white'
                                                  }
                                             ]}
                                             placeholder="Enter subject"
                                             placeholderTextColor={theme.inactive}
                                             value={subject}
                                             onChangeText={setSubject}
                                        />

                                        <Text style={[styles.label, { color: theme.text }]}>Message</Text>
                                        <TextInput
                                             style={[
                                                  styles.textArea,
                                                  {
                                                       borderColor: theme.borderColor,
                                                       color: theme.text,
                                                       backgroundColor: isDarkMode ? Colors.dark.card : 'white'
                                                  }
                                             ]}
                                             placeholder="Tell us more about your feedback, suggestions, or report issues..."
                                             placeholderTextColor={theme.inactive}
                                             value={message}
                                             onChangeText={setMessage}
                                             multiline
                                             textAlignVertical="top"
                                        />

                                        <TouchableOpacity
                                             style={[
                                                  styles.button,
                                                  { backgroundColor: theme.buttonBackground },
                                                  isSubmitting && styles.buttonDisabled
                                             ]}
                                             onPress={handleSubmit}
                                             disabled={isSubmitting}
                                        >
                                             {isSubmitting ? (
                                                  <ActivityIndicator color="#fff" />
                                             ) : (
                                                  <Text style={[styles.buttonText, { color: theme.buttonText }]}>
                                                       Submit Feedback
                                                  </Text>
                                             )}
                                        </TouchableOpacity>
                                   </View>
                              </ScrollView>
                         </KeyboardAvoidingView>
                    </View>
               </TouchableWithoutFeedback>
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
     keyboardAvoidingView: {
          flex: 1,
     },
     scrollViewContent: {
          flexGrow: 1,
          paddingBottom: 40,
     },
     form: {
          width: "100%",
          gap: 20,
          padding: 20,
     },
     header: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 30,
     },
     title: {
          ...Typography.text.h1,
     },
     label: {
          ...Typography.text.body,
     },
     dropdown: {
          borderWidth: 1,
          borderRadius: 100,
          paddingHorizontal: 25,
          paddingVertical: 5,
          zIndex: 3000,
     },
     dropdownListContainer: {
          borderRadius: 20,
     },
     input: {
          borderWidth: 1,
          borderRadius: 100,
          paddingHorizontal: 30,
          paddingVertical: 20,
          fontSize: 16,
     },
     textArea: {
          borderWidth: 1,
          borderRadius: 20,
          paddingHorizontal: 20,
          paddingVertical: 20,
          fontSize: 16,
          minHeight: 150,
     },
     button: {
          padding: 20,
          borderRadius: 100,
          alignItems: 'center',
          marginTop: 30,
     },
     buttonDisabled: {
          opacity: 0.7,
     },
     buttonText: {
          ...Typography.text.button,
     },
}); 