import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '../../constants/Typography';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, DateData } from 'react-native-calendars';
import { MarkedDates } from 'react-native-calendars/src/types';
import Animated, {
     useSharedValue,
     useAnimatedStyle,
     withTiming,
     withSpring,
     interpolate,
     interpolateColor,
     Easing,
     runOnJS
} from 'react-native-reanimated';
import { generateTripRecommendations } from '@/services/geminiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackScreen, trackPreferencesEvent, trackEvent } from '../../services/analyticsService';
import { processRecommendations } from '@/services/recommendationService';
import { supabase } from '@/services/supabaseConfig';
import { useColorScheme } from '../../hooks/useColorScheme';

type TravelerGroup = {
     label: string;
     subtitle: string;
     count: number;
};

type Question = {
     id: number;
     type: 'text' | 'date' | 'number' | 'select' | 'multiselect' | 'location';
     question: string;
     options?: string[];
     value: any;
     otherValue?: string;
     icon: keyof typeof Ionicons.glyphMap;
     groups?: TravelerGroup[];
};

type DateRange = {
     startDate: string | null;
     endDate: string | null;
};

export default function Preferences() {
     const router = useRouter();
     const { effectiveColorScheme } = useColorScheme();
     const isDarkMode = effectiveColorScheme === 'dark';
     const theme = isDarkMode ? Colors.dark : Colors.light;

     const [currentQuestion, setCurrentQuestion] = useState<number>(0);
     const [loading, setLoading] = useState<boolean>(false);
     const [success, setSuccess] = useState<boolean>(false);
     const [error, setError] = useState(false);
     const [dateRange, setDateRange] = useState<DateRange>({
          startDate: null,
          endDate: null,
     });

     // Clear previous storage data when component mounts
     useEffect(() => {
          AsyncStorage.multiRemove(['tripSummary', 'tripError', 'lastPlanId'])
               .catch((err: Error) => console.error("Error clearing previous data:", err));

          // Track screen view
          trackScreen('preferences');
          trackPreferencesEvent('preferences_viewed');
     }, []);

     const initialFormData: Question[] = [
          {
               id: 1,
               type: 'location',
               question: 'Where would you like to go camping?',
               value: { fromLocation: '', toLocation: '', radius: 25 },
               icon: 'location-outline',
          },
          {
               id: 2,
               type: 'date',
               question: 'When are you planning your camping trip?',
               value: { startDate: null, endDate: null },
               icon: 'calendar-clear-outline',
          },
          {
               id: 3,
               type: 'number',
               question: "Who's joining your camping trip?",
               value: {
                    adults: 1,
                    kids: 0,
                    toddlers: 0,
                    pets: 0,
                    wheelchairUsers: 0,
                    serviceAnimals: 0
               },
               icon: 'people-outline',
               groups: [
                    { label: 'Adults', subtitle: 'Ages 13 or above', count: 1 },
                    { label: 'Kids', subtitle: 'Ages 5 - 12', count: 0 },
                    { label: 'Toddlers', subtitle: 'Ages 0 - 4', count: 0 },
                    { label: 'Pets', subtitle: '', count: 0 },
                    { label: 'Wheelchair users', subtitle: 'Requires accessible facilities', count: 0 },
                    { label: 'Service animals', subtitle: 'Assistance animals', count: 0 }
               ]
          },
          {
               id: 4,
               type: 'select',
               question: "What's your camping experience level?",
               options: ['First-time camper', 'Camped a few times', 'Regular camper', 'Camping expert'],
               value: '',
               icon: 'footsteps-outline',
          },
          {
               id: 5,
               type: 'select',
               question: 'What type of camping do you prefer?',
               options: [
                    "Campground camping - Reserved sites with facilities",
                    "Car camping - Drive-up sites near parking",
                    "RV camping - Full hookups and amenities",
                    "Backpacking - Remote wilderness camping",
                    "Other"
               ],
               value: '',
               icon: 'car-outline',
          },
          {
               id: 6,
               type: 'multiselect',
               question: 'What camping amenities are important to you?',
               options: ['Restrooms', 'Showers', 'Drinking water', 'Fire pits', 'Picnic tables', 'Electric hookups', 'RV dump station', 'Camp store', 'Other'],
               value: [],
               icon: 'water-outline',
          },
          {
               id: 7,
               type: 'multiselect',
               question: 'What activities are you interested in while camping?',
               options: ['Hiking', 'Fishing', 'Swimming', 'Boating', 'Wildlife viewing', 'Photography', 'Stargazing', 'Other'],
               value: [],
               icon: 'trail-sign-outline',
          },
          {
               id: 8,
               type: 'multiselect',
               question: 'What are your must-haves for the campsite?',
               options: ['Shaded spots', 'Privacy from other campsites', 'Cell service', 'Pet-friendly', 'Accessible facilities', 'Quiet hours', 'Other'],
               value: [],
               icon: 'shield-outline',
          },
          {
               id: 9,
               type: 'select',
               question: "What weather conditions do you prefer for camping?",
               options: [
                    "Warm and sunny - 70-85°F (21-29°C)",
                    "Mild and pleasant - 60-75°F (15-24°C)",
                    "Cool and crisp - 45-65°F (7-18°C)",
                    "Cold weather - Below 45°F (7°C)",
                    "Other"
               ],
               value: '',
               icon: 'partly-sunny-outline',
          }
     ];

     const [formData, setFormData] = useState<Question[]>(initialFormData);

     const slideAnimation = useSharedValue(0);
     const progressAnimation = useSharedValue(0);
     const progressSegments = formData.map(() => useSharedValue(0));

     const setCurrentQuestionSafe = useCallback((index: number) => {
          setCurrentQuestion(index);
     }, []);

     useEffect(() => {
          // Animate progress bar
          progressAnimation.value = withTiming(currentQuestion / (formData.length - 1), {
               duration: 300,
               easing: Easing.bezier(0.4, 0, 0.2, 1),
          });

          // Animate each segment
          formData.forEach((_, index: number) => {
               progressSegments[index].value = withTiming(
                    index <= currentQuestion ? 1 : 0,
                    {
                         duration: 300,
                         easing: Easing.bezier(0.4, 0, 0.2, 1),
                    }
               );
          });
     }, [currentQuestion, formData.length, progressAnimation, progressSegments]);

     const handleClose = () => {
          router.back();
     };

     const handleNext = async () => {
          if (currentQuestion < formData.length - 1) {
               // Track progression through questions
               trackEvent('preferences_question_answered', {
                    question_number: currentQuestion + 1,
                    question_type: formData[currentQuestion].type,
                    question_text: formData[currentQuestion].question,
                    answer_value: formData[currentQuestion].value,
                    category: 'preferences'
               });

               slideAnimation.value = withTiming(-1, {
                    duration: 200,
                    easing: Easing.out(Easing.ease),
               }, () => {
                    runOnJS(setCurrentQuestionSafe)(currentQuestion + 1);
                    slideAnimation.value = 1;
                    slideAnimation.value = withSpring(0, {
                         damping: 20,
                         stiffness: 90,
                    });
               });
          } else {
               // Submit form
               setLoading(true);

               // Track form completion
               trackEvent('preferences_form_submitted', {
                    total_questions: formData.length,
                    completion_time_ms: Date.now(), // You can calculate actual time if needed
                    category: 'preferences'
               });

               try {
                    const formattedData = formData.map((question) => {
                         // Handle 'Other' values first
                         if (question.type === 'select' && question.value === 'Other') {
                              return {
                                   ...question,
                                   value: question.otherValue || ''
                              };
                         }
                         if (question.type === 'multiselect' && question.value.includes('Other')) {
                              const otherValues = [...question.value.filter((v: string) => v !== 'Other')];
                              if (question.otherValue) {
                                   otherValues.push(question.otherValue);
                              }
                              return {
                                   ...question,
                                   value: otherValues
                              };
                         }
                         // Special handling for group composition
                         if (question.type === 'number' && question.groups) {
                              const groupValue: Record<string, number> = {};
                              question.groups.forEach(group => {
                                   // Convert label to camelCase key
                                   const key = group.label
                                        .toLowerCase()
                                        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
                                   groupValue[key] = group.count;
                              });
                              return {
                                   ...question,
                                   value: groupValue
                              };
                         }
                         return question;
                    });

                    // Format the data into a readable string
                    const formatFormData = async () => {
                         let summary = '';

                         // Location and radius (Question 1)
                         const locationData = formattedData[0].value;
                         if (locationData.toLocation) {
                              if (locationData.fromLocation) {
                                   summary += `I would like to travel from ${locationData.fromLocation} to ${locationData.toLocation}`;
                              } else {
                                   summary += `I would like to go to ${locationData.toLocation}`;
                              }
                              summary += ` within ${locationData.radius} miles of the destination`;
                         }

                         // Date range (Question 2)
                         const dateInfo = formattedData[1].value;
                         if (dateInfo.startDate && dateInfo.endDate) {
                              const startDate = new Date(dateInfo.startDate).toLocaleDateString();
                              const endDate = new Date(dateInfo.endDate).toLocaleDateString();
                              summary += ` from ${startDate} to ${endDate}.`;
                         } else if (dateInfo.startDate) {
                              const startDate = new Date(dateInfo.startDate).toLocaleDateString();
                              summary += ` on ${startDate}.`;
                         } else {
                              summary += '.';
                         }

                         // Group composition (Question 3)
                         const groupInfo = formattedData[2].value;
                         const groupParts = [];

                         if (groupInfo.adults > 0) {
                              groupParts.push(`${groupInfo.adults} adult${groupInfo.adults > 1 ? 's' : ''}`);
                         }
                         if (groupInfo.kids > 0) {
                              groupParts.push(`${groupInfo.kids} kid${groupInfo.kids > 1 ? 's' : ''}`);
                         }
                         if (groupInfo.toddlers > 0) {
                              groupParts.push(`${groupInfo.toddlers} toddler${groupInfo.toddlers > 1 ? 's' : ''}`);
                         }
                         if (groupInfo.pets > 0) {
                              groupParts.push(`${groupInfo.pets} pet${groupInfo.pets > 1 ? 's' : ''}`);
                         }
                         if (groupInfo.wheelchairUsers > 0) {
                              groupParts.push(`${groupInfo.wheelchairUsers} wheelchair user${groupInfo.wheelchairUsers > 1 ? 's' : ''}`);
                         }
                         if (groupInfo.serviceAnimals > 0) {
                              groupParts.push(`${groupInfo.serviceAnimals} service animal${groupInfo.serviceAnimals > 1 ? 's' : ''}`);
                         }

                         if (groupParts.length > 0) {
                              summary += ` There will be ${groupParts.join(', ')}.`;
                         }

                         // Experience level (Question 4)
                         const experience = formattedData[3].value;
                         if (experience) {
                              summary += ` I am a ${experience.toLowerCase()}.`;
                         }

                         // Camping type preference (Question 5)
                         const campingType = formattedData[4].value;
                         if (campingType) {
                              const type = campingType.split(' - ')[0];
                              summary += ` I prefer ${type.toLowerCase()}.`;
                         }

                         // Amenities (Question 6)
                         const amenities = formattedData[5].value;
                         if (amenities && amenities.length > 0) {
                              summary += ` I need these amenities: ${amenities.join(', ')}.`;
                         }

                         // Activities (Question 7)
                         const activities = formattedData[6].value;
                         if (activities && activities.length > 0) {
                              summary += ` I'm interested in: ${activities.join(', ')}.`;
                         }

                         // Must-haves (Question 8)
                         const mustHaves = formattedData[7].value;
                         if (mustHaves && mustHaves.length > 0) {
                              summary += ` My must-haves are: ${mustHaves.join(', ')}.`;
                         }

                         // Weather preference (Question 9)
                         const weatherPreference = formattedData[8].value;
                         if (weatherPreference) {
                              const preferredWeather = weatherPreference.split(' - ')[0];
                              summary += ` I prefer camping in ${preferredWeather.toLowerCase()} weather conditions.`;
                         }

                         return summary;
                    };

                    // Handle the async formatFormData function
                    formatFormData().then(async formattedSummary => {
                         console.log('Form summary:', formattedSummary);

                         try {
                              // Generate trip recommendations here
                              const recommendations = await generateTripRecommendations(formattedSummary);

                              // Get current user ID from Supabase
                              const { data: { user }, error: userError } = await supabase.auth.getUser();
                              if (userError) throw userError;

                              if (!user) {
                                   throw new Error("User not authenticated");
                              }

                              // Process recommendations and save to Supabase and AsyncStorage
                              await processRecommendations(user.id, formattedData, formattedSummary, recommendations);

                              setSuccess(true);

                              // Navigate to results page
                              router.push({
                                   pathname: '/(app)/result'
                              });
                         } catch (error: any) {
                              console.error('Error generating recommendations:', error);
                              // Store the error and summary in AsyncStorage
                              await AsyncStorage.setItem('tripSummary', formattedSummary);
                              const errorMessage = error.toString().includes("429") || error.toString().includes("quota")
                                   ? "We're experiencing high demand right now. The trip recommendation service has reached its limit. Please try again later or contact support if this persists."
                                   : "Failed to generate trip recommendations. Please try again.";
                              await AsyncStorage.setItem('tripError', errorMessage);
                              // Clear any previous plan ID as this request failed
                              await AsyncStorage.removeItem('lastPlanId');

                              setError(true);

                              // Navigate to results page
                              router.push({
                                   pathname: '/(app)/result'
                              });
                         } finally {
                              setLoading(false);
                         }
                    });
               } catch (error) {
                    console.error("Error processing form:", error);
                    setLoading(false);
                    router.push('/(app)/result');
               }
          }
     };

     const handlePrevious = () => {
          if (currentQuestion > 0) {
               slideAnimation.value = withTiming(1, {
                    duration: 200,
                    easing: Easing.out(Easing.ease),
               }, () => {
                    runOnJS(setCurrentQuestionSafe)(currentQuestion - 1);
                    slideAnimation.value = -1;
                    slideAnimation.value = withSpring(0, {
                         damping: 20,
                         stiffness: 90,
                    });
               });
          }
     };

     const animatedContentStyle = useAnimatedStyle(() => {
          const translateX = interpolate(
               slideAnimation.value,
               [-1, 0, 1],
               [-300, 0, 300]
          );
          const opacity = interpolate(
               slideAnimation.value,
               [-1, 0, 1],
               [0, 1, 0]
          );
          return {
               transform: [{ translateX }],
               opacity,
          };
     });

     const updateValue = (value: any) => {
          const newFormData = [...formData];
          newFormData[currentQuestion].value = value;
          setFormData(newFormData);
     };

     const onDayPress = (day: DateData) => {
          if (!dateRange.startDate || dateRange.endDate) {
               // Start new range
               setDateRange({
                    startDate: day.dateString,
                    endDate: null,
               });
               updateValue({
                    startDate: day.dateString,
                    endDate: null,
               });
          } else {
               // Complete the range
               if (day.timestamp >= new Date(dateRange.startDate).getTime()) {
                    const newRange = {
                         startDate: dateRange.startDate,
                         endDate: day.dateString,
                    };
                    setDateRange(newRange);
                    updateValue(newRange);
               } else {
                    // Selected date is before start date, start new range
                    setDateRange({
                         startDate: day.dateString,
                         endDate: null,
                    });
                    updateValue({
                         startDate: day.dateString,
                         endDate: null,
                    });
               }
          }
     };

     const getMarkedDates = (): MarkedDates => {
          const marked: MarkedDates = {};

          if (dateRange.startDate) {
               marked[dateRange.startDate] = {
                    startingDay: true,
                    color: Colors.primary,
                    textColor: 'white',
               };

               if (dateRange.endDate) {
                    marked[dateRange.endDate] = {
                         endingDay: true,
                         color: Colors.primary,
                         textColor: 'white',
                    };

                    // Fill in all dates between start and end
                    let currentDate = new Date(dateRange.startDate);
                    const endDate = new Date(dateRange.endDate);
                    currentDate.setDate(currentDate.getDate() + 1);

                    while (currentDate < endDate) {
                         const dateString = currentDate.toISOString().split('T')[0];
                         marked[dateString] = {
                              color: Colors.primary,
                              textColor: 'white',
                         };
                         currentDate.setDate(currentDate.getDate() + 1);
                    }
               }
          }

          return marked;
     };

     const renderDateRange = () => {
          return (
               <View style={[styles.calendarContainer, { borderColor: theme.borderColor }]}>
                    <Calendar
                         minDate={new Date().toISOString().split('T')[0]}
                         markingType="period"
                         markedDates={getMarkedDates()}
                         onDayPress={onDayPress}
                         theme={{
                              calendarBackground: theme.background,
                              textSectionTitleColor: theme.icon,
                              selectedDayBackgroundColor: theme.primary,
                              selectedDayTextColor: 'white',
                              todayTextColor: theme.primary,
                              dayTextColor: theme.text,
                              textDisabledColor: theme.inactive || '#d9e1e8',
                              dotColor: theme.primary,
                              monthTextColor: theme.text,
                              indicatorColor: theme.primary,
                              textDayFontSize: 16,
                              textMonthFontSize: 16,
                              textDayHeaderFontSize: 14,
                              arrowColor: theme.text,
                         }}
                    />
                    <View style={[styles.dateRangeInfo, { borderTopColor: theme.borderColor }]}>
                         <Text style={[styles.dateRangeText, { color: theme.text }]}>
                              {dateRange.startDate ? (
                                   dateRange.endDate ? (
                                        `${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(
                                             dateRange.endDate
                                        ).toLocaleDateString()}`
                                   ) : (
                                        `Select end date`
                                   )
                              ) : (
                                   'Select start date'
                              )}
                         </Text>
                    </View>
               </View>
          );
     };

     const renderQuestion = () => {
          const question = formData[currentQuestion];
          switch (question.type) {
               case 'location':
                    return (
                         <View style={styles.locationContainer}>
                              <View style={[styles.locationInputWrapper, { borderColor: theme.borderColor }]}>
                                   <View style={[styles.locationInputContainer, { backgroundColor: theme.card }]}>
                                        <Ionicons name="locate-outline" size={20} color={theme.icon} style={styles.locationIcon} />
                                        <TextInput
                                             style={[styles.locationInput, {
                                                  color: theme.text,
                                                  borderColor: theme.borderColor,
                                                  backgroundColor: theme.card
                                             }]}
                                             value={question.value.fromLocation}
                                             onChangeText={(text) => {
                                                  const newValue = {
                                                       ...question.value,
                                                       fromLocation: text
                                                  };
                                                  updateValue(newValue);
                                             }}
                                             placeholder="Starting Location"
                                             placeholderTextColor={theme.inactive}
                                        />
                                   </View>
                                   <View style={[styles.locationDivider, { backgroundColor: theme.borderColor }]} />
                                   <View style={[styles.locationInputContainer, { backgroundColor: theme.card }]}>
                                        <Ionicons name="location-outline" size={20} color={theme.icon} style={styles.locationIcon} />
                                        <TextInput
                                             style={[styles.locationInput, {
                                                  color: theme.text,
                                                  borderColor: theme.borderColor,
                                                  backgroundColor: theme.card
                                             }]}
                                             value={question.value.toLocation}
                                             onChangeText={(text) => {
                                                  const newValue = {
                                                       ...question.value,
                                                       toLocation: text
                                                  };
                                                  updateValue(newValue);
                                             }}
                                             placeholder="Destination"
                                             placeholderTextColor={theme.inactive}
                                        />
                                   </View>
                              </View>
                              <View style={[styles.radiusContainer, { backgroundColor: theme.card, borderColor: theme.borderColor }]}>
                                   <View style={styles.radiusLabelContainer}>
                                        <Text style={[styles.radiusLabel, { color: theme.text }]}>Search radius</Text>
                                   </View>
                                   <View style={styles.radiusInputContainer}>
                                        <TouchableOpacity
                                             style={[styles.numberButton, {
                                                  borderColor: theme.borderColor,
                                                  backgroundColor: theme.background
                                             }]}
                                             onPress={() => {
                                                  const newValue = {
                                                       ...question.value,
                                                       radius: Math.max(5, question.value.radius - 5)
                                                  };
                                                  updateValue(newValue);
                                             }}>
                                             <Ionicons name="remove" size={16} color={theme.text} />
                                        </TouchableOpacity>
                                        <Text style={[styles.numberText, { color: theme.text }]}>{question.value.radius} mi</Text>
                                        <TouchableOpacity
                                             style={[styles.numberButton, {
                                                  borderColor: theme.borderColor,
                                                  backgroundColor: theme.background
                                             }]}
                                             onPress={() => {
                                                  const newValue = {
                                                       ...question.value,
                                                       radius: question.value.radius + 5
                                                  };
                                                  updateValue(newValue);
                                             }}>
                                             <Ionicons name="add" size={16} color={theme.text} />
                                        </TouchableOpacity>
                                   </View>
                              </View>
                         </View>
                    );
               case 'date':
                    return renderDateRange();
               case 'number':
                    if (question.groups) {
                         return (
                              <View style={styles.groupsContainer}>
                                   {question.groups.map((group, index) => (
                                        <View key={index} style={[styles.groupItem, { borderBottomColor: theme.borderColor }]}>
                                             <View style={styles.groupInfo}>
                                                  <Text style={[styles.groupLabel, { color: theme.text }]}>{group.label}</Text>
                                                  {group.subtitle && (
                                                       <Text style={[styles.groupSubtitle, { color: theme.icon }]}>{group.subtitle}</Text>
                                                  )}
                                             </View>
                                             <View style={styles.groupControls}>
                                                  <TouchableOpacity
                                                       style={[styles.numberButton, {
                                                            borderColor: theme.borderColor,
                                                            backgroundColor: theme.card
                                                       }]}
                                                       onPress={() => {
                                                            const newGroups = [...question.groups!];
                                                            newGroups[index].count = Math.max(0, group.count - 1);
                                                            const newValue = newGroups.reduce((acc, g) => ({
                                                                 ...acc,
                                                                 [g.label.toLowerCase().replace(' ', '')]: g.count
                                                            }), {});
                                                            updateValue(newValue);
                                                       }}>
                                                       <Ionicons name="remove" size={18} color={theme.text} />
                                                  </TouchableOpacity>
                                                  <Text style={[styles.numberText, { color: theme.text }]}>{group.count}</Text>
                                                  <TouchableOpacity
                                                       style={[styles.numberButton, {
                                                            borderColor: theme.borderColor,
                                                            backgroundColor: theme.card
                                                       }]}
                                                       onPress={() => {
                                                            const newGroups = [...question.groups!];
                                                            newGroups[index].count = group.count + 1;
                                                            const newValue = newGroups.reduce((acc, g) => ({
                                                                 ...acc,
                                                                 [g.label.toLowerCase().replace(' ', '')]: g.count
                                                            }), {});
                                                            updateValue(newValue);
                                                       }}>
                                                       <Ionicons name="add" size={18} color={theme.text} />
                                                  </TouchableOpacity>
                                             </View>
                                        </View>
                                   ))}
                              </View>
                         );
                    }
                    return (
                         <View style={styles.numberContainer}>
                              <TouchableOpacity
                                   style={[styles.numberButton, {
                                        borderColor: theme.borderColor,
                                        backgroundColor: theme.card
                                   }]}
                                   onPress={() => updateValue(Math.max(1, question.value - 1))}>
                                   <Ionicons name="remove" size={24} color={theme.text} />
                              </TouchableOpacity>
                              <Text style={[styles.numberText, { color: theme.text }]}>{question.value}</Text>
                              <TouchableOpacity
                                   style={[styles.numberButton, {
                                        borderColor: theme.borderColor,
                                        backgroundColor: theme.card
                                   }]}
                                   onPress={() => updateValue(question.value + 1)}>
                                   <Ionicons name="add" size={24} color={theme.text} />
                              </TouchableOpacity>
                         </View>
                    );
               case 'select':
                    const shouldUseColumns = question.options && question.options.length > 5;
                    return (
                         <View style={[
                              styles.optionsContainer,
                              shouldUseColumns && styles.optionsContainerTwoColumns
                         ]}>
                              {question.options?.map((option) => (
                                   <TouchableOpacity
                                        key={option}
                                        style={[
                                             styles.optionButton,
                                             shouldUseColumns && styles.optionButtonTwoColumns,
                                             { borderColor: theme.borderColor, backgroundColor: theme.card },
                                             question.value === option && [styles.selectedOption, { backgroundColor: theme.primary }],
                                        ]}
                                        onPress={() => updateValue(option)}>
                                        <Text
                                             style={[
                                                  styles.optionText,
                                                  { color: theme.text },
                                                  question.value === option && styles.selectedOptionText,
                                             ]}>
                                             {option}
                                        </Text>
                                   </TouchableOpacity>
                              ))}
                              {question.value === 'Other' && (
                                   <TextInput
                                        style={[styles.otherInput, {
                                             color: theme.text,
                                             borderColor: theme.borderColor,
                                             backgroundColor: theme.card
                                        }]}
                                        value={question.otherValue}
                                        onChangeText={(text) => {
                                             const newFormData = [...formData];
                                             newFormData[currentQuestion].otherValue = text;
                                             setFormData(newFormData);
                                        }}
                                        placeholder="Please specify"
                                        placeholderTextColor={theme.inactive}
                                        multiline
                                        numberOfLines={3}
                                   />
                              )}
                         </View>
                    );
               case 'multiselect':
                    const shouldUseColumnsMulti = question.options && question.options.length > 4;
                    return (
                         <View style={[
                              styles.optionsContainer,
                              shouldUseColumnsMulti && styles.optionsContainerTwoColumns
                         ]}>
                              {question.options?.map((option) => (
                                   <TouchableOpacity
                                        key={option}
                                        style={[
                                             styles.optionButton,
                                             shouldUseColumnsMulti && styles.optionButtonTwoColumns,
                                             { borderColor: theme.borderColor, backgroundColor: theme.card },
                                             question.value.includes(option) && [styles.selectedOption, { backgroundColor: theme.primary }],
                                        ]}
                                        onPress={() => {
                                             const newValue = question.value.includes(option)
                                                  ? question.value.filter((item: string) => item !== option)
                                                  : [...question.value, option];
                                             updateValue(newValue);
                                        }}>
                                        <Text
                                             style={[
                                                  styles.optionText,
                                                  { color: theme.text },
                                                  question.value.includes(option) && styles.selectedOptionText,
                                             ]}>
                                             {option}
                                        </Text>
                                   </TouchableOpacity>
                              ))}
                              {question.value.includes('Other') && (
                                   <TextInput
                                        style={[styles.otherInput, {
                                             color: theme.text,
                                             borderColor: theme.borderColor,
                                             backgroundColor: theme.card
                                        }]}
                                        value={question.otherValue}
                                        onChangeText={(text) => {
                                             const newFormData = [...formData];
                                             newFormData[currentQuestion].otherValue = text;
                                             setFormData(newFormData);
                                        }}
                                        placeholder="Please specify"
                                        placeholderTextColor={theme.inactive}
                                        multiline
                                        numberOfLines={3}
                                   />
                              )}
                         </View>
                    );
          }
     };

     const hasValue = (value: any, otherValue?: string): boolean => {
          if (value === null || value === undefined) return false;
          if (typeof value === 'string') {
               if (value === 'Other') return !!otherValue;
               return value.trim().length > 0;
          }
          if (typeof value === 'object') {
               if (Array.isArray(value)) {
                    if (value.includes('Other')) return !!otherValue;
                    return value.length > 0;
               }
               if ('startDate' in value && 'endDate' in value) return !!value.startDate && !!value.endDate;
               if ('fromLocation' in value && 'toLocation' in value) return !!value.toLocation.trim();
               // For the groups/number question, check if any count is > 0
               const values = Object.values(value);
               return values.some(v => typeof v === 'number' ? v > 0 : !!v);
          }
          return !!value;
     };

     // Pre-compute all animated styles for progress segments
     const progressSegmentStyles = formData.map((_, index) =>
          useAnimatedStyle(() => {
               const backgroundColor = interpolateColor(
                    progressSegments[index].value,
                    [0, 1],
                    [isDarkMode ? '#444444' : '#E0E0E0', theme.primary]
               );

               return {
                    flex: 1,
                    height: '100%',
                    borderRadius: 2,
                    backgroundColor,
               };
          })
     );

     return (
          <>
               {loading ? (
                    <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                         <ActivityIndicator size="large" color={theme.primary} />
                         <Text style={[styles.loadingText, { color: theme.primary }]}>Finding the perfect trips{'\n'}for your adventure... Hold tight!</Text>
                    </View>
               ) : (
                    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
                         <KeyboardAvoidingView
                              style={styles.keyboardAvoidingView}
                              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                         >
                              <View style={[styles.container, { backgroundColor: theme.background }]}>
                                   <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                                        <Ionicons name="close" size={35} color={theme.text} />
                                   </TouchableOpacity>

                                   <View style={styles.progressContainer}>
                                        <Animated.View
                                             style={[
                                                  styles.progressBar,
                                                  {
                                                       width: withSpring(
                                                            `${((currentQuestion + 1) / formData.length) * 100}%`,
                                                            {
                                                                 damping: 20,
                                                                 stiffness: 90,
                                                            }
                                                       ),
                                                       backgroundColor: theme.primary,
                                                  },
                                             ]}
                                        />
                                        {formData.map((_, index) => (
                                             <Animated.View
                                                  key={index}
                                                  style={progressSegmentStyles[index]}
                                             />
                                        ))}
                                   </View>

                                   <ScrollView
                                        style={styles.scrollView}
                                        contentContainerStyle={styles.scrollViewContent}
                                        keyboardShouldPersistTaps="handled"
                                        showsVerticalScrollIndicator={false}
                                   >
                                        <Animated.View style={[styles.contentContainer, animatedContentStyle]}>
                                             <View style={styles.iconContainer}>
                                                  <Ionicons
                                                       name={formData[currentQuestion].icon}
                                                       size={40}
                                                       color={theme.primary}
                                                  />
                                             </View>
                                             <Text style={[styles.questionText, { color: theme.primary }]}>{formData[currentQuestion].question}</Text>
                                             <View style={styles.questionContainer}>
                                                  {renderQuestion()}
                                             </View>

                                             <View style={[
                                                  styles.navigationContainer,
                                                  currentQuestion === 0 && styles.navigationContainerFirstQuestion
                                             ]}>
                                                  {currentQuestion > 0 && (
                                                       <TouchableOpacity style={styles.navButton} onPress={handlePrevious}>
                                                            <Text style={[styles.navButtonText, { color: theme.text }]}>Back</Text>
                                                       </TouchableOpacity>
                                                  )}
                                                  <TouchableOpacity
                                                       style={[
                                                            styles.navButton,
                                                            currentQuestion === 0 && styles.navButtonFirstQuestion
                                                       ]}
                                                       onPress={handleNext}
                                                  >
                                                       <Text style={[styles.navButtonText, { color: theme.text }]}>
                                                            {currentQuestion === formData.length - 1
                                                                 ? 'Finish'
                                                                 : hasValue(formData[currentQuestion].value, formData[currentQuestion].otherValue)
                                                                      ? 'Next'
                                                                      : 'Skip'
                                                            }
                                                       </Text>
                                                  </TouchableOpacity>
                                             </View>
                                        </Animated.View>
                                   </ScrollView>
                              </View>
                         </KeyboardAvoidingView>
                    </SafeAreaView>
               )}
          </>
     );
}

const styles = StyleSheet.create({
     safeArea: {
          flex: 1,
     },
     container: {
          flex: 1,
          padding: 20,
     },
     closeButton: {
          position: 'absolute',
          top: 10,
          left: 10,
          padding: 10,
          zIndex: 1,
     },
     progressContainer: {
          flexDirection: 'row',
          height: 4,
          marginTop: 60,
          marginBottom: 20,
          gap: 4,
     },
     progressSegment: {
          flex: 1,
          height: '100%',
          borderRadius: 2,
     },
     progressSegmentActive: {
          backgroundColor: Colors.primary,
     },
     progressSegmentInactive: {
          backgroundColor: '#E0E0E0',
     },
     contentContainer: {
          flex: 1,
          alignItems: 'center',
          paddingHorizontal: 20,
     },
     iconContainer: {
          width: 80,
          height: 80,
          justifyContent: 'center',
          alignItems: 'center',
     },
     questionText: {
          ...Typography.text.h3,
          textAlign: 'center',
          marginBottom: 30,
     },
     input: {
          width: '100%',
          height: 50,
          borderWidth: 0.5,
          borderRadius: 100,
          paddingHorizontal: 20,
          paddingVertical: 15,
          ...Typography.text.body,
     },
     numberContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 20,
     },
     optionsContainer: {
          width: '100%',
          gap: 20,
     },
     optionsContainerTwoColumns: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
     },
     optionButton: {
          paddingVertical: 15,
          paddingHorizontal: 20,
          borderRadius: 100,
          borderWidth: 0.5,
          alignItems: 'flex-start',
          justifyContent: 'center',
     },
     optionButtonTwoColumns: {
          width: '48%',
          paddingVertical: 12,
          paddingHorizontal: 15,
          minHeight: 50,
     },
     selectedOption: {
          borderColor: Colors.primary,
     },
     optionText: {
          fontSize: 16,
     },
     selectedOptionText: {
          color: 'white',
     },
     questionContainer: {
          width: '100%',
     },
     navigationContainer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 10,
          marginTop: 20,
          width: '100%',
     },
     navigationContainerFirstQuestion: {
          justifyContent: 'flex-end',
     },
     navButton: {
          paddingVertical: 20,
          borderRadius: 8,
          maxWidth: 160,
          alignItems: 'flex-end',
     },
     navButtonFirstQuestion: {
          alignItems: 'flex-end',
     },
     navButtonText: {
          ...Typography.text.body,
     },
     calendarContainer: {
          width: '100%',
          borderRadius: 30,
          overflow: 'hidden',
          borderWidth: 1,
     },
     dateRangeInfo: {
          padding: 15,
          borderTopWidth: 1,
          alignItems: 'center',
     },
     dateRangeText: {
          fontSize: 16,
     },
     groupsContainer: {
          width: '100%',
          gap: 20,
     },
     groupItem: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          paddingBottom: 20,
          borderBottomWidth: 1,
     },
     groupInfo: {
          flex: 1,
     },
     groupLabel: {
          ...Typography.text.h4,
     },
     groupSubtitle: {
          ...Typography.text.caption,
          marginTop: 4,
     },
     groupControls: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 20,
     },
     numberButton: {
          width: 30,
          height: 30,
          borderRadius: 15,
          borderWidth: 1,
          justifyContent: 'center',
          alignItems: 'center',
     },
     numberText: {
          ...Typography.text.h4,
          minWidth: 24,
          textAlign: 'center',
     },
     progressBar: {
          position: 'absolute',
          height: 4,
          borderRadius: 2,
          left: 0,
     },
     otherInput: {
          width: '100%',
          minHeight: 100,
          borderWidth: 0.5,
          borderRadius: 12,
          paddingHorizontal: 15,
          paddingVertical: 10,
          marginTop: 10,
          textAlignVertical: 'top',
          ...Typography.text.body,
     },
     keyboardAvoidingView: {
          flex: 1,
     },
     scrollView: {
          flex: 1,
     },
     scrollViewContent: {
          flexGrow: 1,
     },
     loadingContainer: {
          flex: 1,
          height: '100%',
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
          padding: 20,
     },
     loadingText: {
          ...Typography.text.h3,
          lineHeight: 30,
          textAlign: 'center',
     },
     locationContainer: {
          width: '100%',
          gap: 20,
     },
     locationInputWrapper: {
          width: '100%',
          borderRadius: 30,
          overflow: 'hidden',
          borderWidth: 1,
     },
     locationInputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 20,
     },
     locationIcon: {
          marginRight: 12,
     },
     locationInput: {
          flex: 1,
          fontSize: 16,
          padding: 0,
          ...Typography.text.body,
     },
     locationDivider: {
          height: 1,
          width: '100%',
          opacity: 0.5,
     },
     radiusContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 100,
          borderWidth: 1,
     },
     radiusLabelContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
     },
     radiusLabel: {
          ...Typography.text.body,
          fontSize: 15,
     },
     radiusInputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
     },
}); 