import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '../../constants/Typography';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
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

type TravelerGroup = {
     label: string;
     subtitle: string;
     count: number;
};

type Question = {
     id: number;
     type: 'text' | 'date' | 'number' | 'select' | 'multiselect';
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
     const [currentQuestion, setCurrentQuestion] = useState(0);
     const [dateRange, setDateRange] = useState<DateRange>({
          startDate: null,
          endDate: null,
     });
     const [formData, setFormData] = useState<Question[]>([
          {
               id: 1,
               type: 'text',
               question: 'Where would you like to go?',
               value: '',
               icon: 'location-outline',
          },
          {
               id: 2,
               type: 'date',
               question: 'When are you planning to go?',
               value: { startDate: null, endDate: null },
               icon: 'calendar-clear-outline',
          },
          {
               id: 3,
               type: 'number',
               question: "Who's joining you on the trails?",
               value: {
                    adults: 1,
                    olderKids: 0,
                    youngKids: 0,
                    toddlers: 0,
                    pets: 0
               },
               icon: 'people-outline',
               groups: [
                    { label: 'Adults', subtitle: 'Ages 13 or above', count: 1 },
                    { label: 'Older kids', subtitle: 'Ages 9 - 12', count: 0 },
                    { label: 'Young kids', subtitle: 'Ages 5 - 8', count: 0 },
                    { label: 'Toddlers', subtitle: 'Ages 0 - 4', count: 0 },
                    { label: 'Pets', subtitle: '', count: 0 },
               ]
          },
          {
               id: 4,
               type: 'select',
               question: "What's your hiking experience?",
               options: ['First-timer', 'Done a few trails', 'Regular hiker', 'Trail expert'],
               value: '',
               icon: 'compass-outline',
          },
          {
               id: 5,
               type: 'select',
               question: 'What difficulty level do you prefer?',
               options: ['Easy - Gentle paths, perfect for relaxing', 'Moderate - Some hills, nice workout', 'Difficult - Challenging climbs ahead', 'Expert - Serious elevation gain'],
               value: '',
               icon: 'trending-up-outline',
          },
          {
               id: 6,
               type: 'select',
               question: 'How long do you wanna hike?',
               options: ['1-2 hours', '2-4 hours', '4-6 hours', '6+ hours'],
               value: '',
               icon: 'time-outline',
          },
          {
               id: 7,
               type: 'multiselect',
               question: 'What kind of scenery do you enjoy?',
               options: ['Epic viewpoints', 'Lakes and waterfalls', 'Wildlife spotting', 'Cool rock formations', 'Dense forest trails', 'Historical sites', 'Other'],
               value: [],
               icon: 'heart-outline',
          },
          {
               id: 8,
               type: 'select',
               question: 'Preferred terrian?',
               options: ['Flat', 'Hilly', 'Mountainous', 'Other'],
               value: '',
               icon: 'map-outline',
          },
          {
               id: 9,
               type: 'multiselect',
               question: 'Are you looking for trails with:',
               options: ['Camping areas', 'Mountain biking acccess', 'Snow trails', 'Other'],
               value: [],
               icon: 'trail-sign-outline',
          },
          {
               id: 10,
               type: 'multiselect',
               question: 'Any must-haves for your trail?',
               options: ['Well-marked paths', 'Cell service', 'Easy parking', 'Restrooms nearby', 'Pet-friendly', 'Shaded trails', 'Other'],
               value: [],
               icon: 'shield-outline',
          },
          {
               id: 11,
               type: 'select',
               question: 'Best time of the day for you?',
               options: ['Early bird - Catch the sunrise', 'Morning - Beat the crowds', 'Afternoon - When it warms up', 'Evening - Chase the sunset'],
               value: '',
               icon: 'sunny-outline',
          },
     ]);

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
          formData.forEach((_, index) => {
               progressSegments[index].value = withTiming(
                    index <= currentQuestion ? 1 : 0,
                    {
                         duration: 300,
                         easing: Easing.bezier(0.4, 0, 0.2, 1),
                    }
               );
          });
     }, [currentQuestion]);

     const handleClose = () => {
          router.back();
     };

     const handleNext = () => {
          if (currentQuestion < formData.length - 1) {
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
               const formattedData = formData.map((question) => {
                    if (question.type === 'select' && question.value === 'Other') {
                         return {
                              ...question,
                              value: question.otherValue
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
                    return question;
               });
               console.log('Form submitted:', formattedData.map((question) => question.value));
               router.push('/(app)/result');
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
               <View style={styles.calendarContainer}>
                    <Calendar
                         minDate={new Date().toISOString().split('T')[0]}
                         markingType="period"
                         markedDates={getMarkedDates()}
                         onDayPress={onDayPress}
                         theme={{
                              calendarBackground: 'white',
                              textSectionTitleColor: '#666',
                              selectedDayBackgroundColor: Colors.primary,
                              selectedDayTextColor: 'white',
                              todayTextColor: Colors.primary,
                              dayTextColor: '#2d4150',
                              textDisabledColor: '#d9e1e8',
                              dotColor: Colors.primary,
                              monthTextColor: Colors.black,
                              indicatorColor: Colors.primary,
                              textDayFontSize: 16,
                              textMonthFontSize: 16,
                              textDayHeaderFontSize: 14,
                         }}
                    />
                    <View style={styles.dateRangeInfo}>
                         <Text style={styles.dateRangeText}>
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
               case 'text':
                    return (
                         <TextInput
                              style={styles.input}
                              value={question.value}
                              onChangeText={updateValue}
                              placeholder="Enter city, region, or park name"
                              placeholderTextColor={Colors.inactive}
                         />
                    );
               case 'date':
                    return renderDateRange();
               case 'number':
                    if (question.groups) {
                         return (
                              <View style={styles.groupsContainer}>
                                   {question.groups.map((group, index) => (
                                        <View key={index} style={styles.groupItem}>
                                             <View style={styles.groupInfo}>
                                                  <Text style={styles.groupLabel}>{group.label}</Text>
                                                  {group.subtitle && (
                                                       <Text style={styles.groupSubtitle}>{group.subtitle}</Text>
                                                  )}
                                             </View>
                                             <View style={styles.groupControls}>
                                                  <TouchableOpacity
                                                       style={styles.numberButton}
                                                       onPress={() => {
                                                            const newGroups = [...question.groups!];
                                                            newGroups[index].count = Math.max(0, group.count - 1);
                                                            const newValue = newGroups.reduce((acc, g) => ({
                                                                 ...acc,
                                                                 [g.label.toLowerCase().replace(' ', '')]: g.count
                                                            }), {});
                                                            updateValue(newValue);
                                                       }}>
                                                       <Ionicons name="remove" size={18} color={Colors.black} />
                                                  </TouchableOpacity>
                                                  <Text style={styles.numberText}>{group.count}</Text>
                                                  <TouchableOpacity
                                                       style={styles.numberButton}
                                                       onPress={() => {
                                                            const newGroups = [...question.groups!];
                                                            newGroups[index].count = group.count + 1;
                                                            const newValue = newGroups.reduce((acc, g) => ({
                                                                 ...acc,
                                                                 [g.label.toLowerCase().replace(' ', '')]: g.count
                                                            }), {});
                                                            updateValue(newValue);
                                                       }}>
                                                       <Ionicons name="add" size={18} color={Colors.black} />
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
                                   style={styles.numberButton}
                                   onPress={() => updateValue(Math.max(1, question.value - 1))}>
                                   <Ionicons name="remove" size={24} color={Colors.black} />
                              </TouchableOpacity>
                              <Text style={styles.numberText}>{question.value}</Text>
                              <TouchableOpacity
                                   style={styles.numberButton}
                                   onPress={() => updateValue(question.value + 1)}>
                                   <Ionicons name="add" size={24} color={Colors.black} />
                              </TouchableOpacity>
                         </View>
                    );
               case 'select':
                    return (
                         <View style={styles.optionsContainer}>
                              {question.options?.map((option) => (
                                   <TouchableOpacity
                                        key={option}
                                        style={[
                                             styles.optionButton,
                                             question.value === option && styles.selectedOption,
                                        ]}
                                        onPress={() => updateValue(option)}>
                                        <Text
                                             style={[
                                                  styles.optionText,
                                                  question.value === option && styles.selectedOptionText,
                                             ]}>
                                             {option}
                                        </Text>
                                   </TouchableOpacity>
                              ))}
                              {question.value === 'Other' && (
                                   <TextInput
                                        style={styles.otherInput}
                                        value={question.otherValue}
                                        onChangeText={(text) => {
                                             const newFormData = [...formData];
                                             newFormData[currentQuestion].otherValue = text;
                                             setFormData(newFormData);
                                        }}
                                        placeholder="Please specify"
                                        placeholderTextColor={Colors.inactive}
                                        multiline
                                        numberOfLines={3}
                                   />
                              )}
                         </View>
                    );
               case 'multiselect':
                    return (
                         <View style={styles.optionsContainer}>
                              {question.options?.map((option) => (
                                   <TouchableOpacity
                                        key={option}
                                        style={[
                                             styles.optionButton,
                                             question.value.includes(option) && styles.selectedOption,
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
                                                  question.value.includes(option) && styles.selectedOptionText,
                                             ]}>
                                             {option}
                                        </Text>
                                   </TouchableOpacity>
                              ))}
                              {question.value.includes('Other') && (
                                   <TextInput
                                        style={styles.otherInput}
                                        value={question.otherValue}
                                        onChangeText={(text) => {
                                             const newFormData = [...formData];
                                             newFormData[currentQuestion].otherValue = text;
                                             setFormData(newFormData);
                                        }}
                                        placeholder="Please specify"
                                        placeholderTextColor={Colors.inactive}
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
               // For the groups/number question, check if any count is > 0
               const values = Object.values(value);
               return values.some(v => typeof v === 'number' ? v > 0 : !!v);
          }
          return !!value;
     };

     const getProgressSegmentStyle = (index: number) => {
          return useAnimatedStyle(() => {
               const backgroundColor = interpolateColor(
                    progressSegments[index].value,
                    [0, 1],
                    ['#E0E0E0', Colors.primary]
               );

               return {
                    flex: 1,
                    height: '100%',
                    borderRadius: 2,
                    backgroundColor,
               };
          });
     };

     return (
          <SafeAreaView style={styles.safeArea}>
               <KeyboardAvoidingView
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
               >
                    <View style={styles.container}>
                         <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                              <Ionicons name="close" size={35} color={Colors.black} />
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
                                        },
                                   ]}
                              />
                              {formData.map((_, index) => (
                                   <Animated.View
                                        key={index}
                                        style={getProgressSegmentStyle(index)}
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
                                             color={Colors.primary}
                                        />
                                   </View>
                                   <Text style={styles.questionText}>{formData[currentQuestion].question}</Text>
                                   <View style={styles.questionContainer}>
                                        {renderQuestion()}
                                   </View>

                                   <View style={[
                                        styles.navigationContainer,
                                        currentQuestion === 0 && styles.navigationContainerFirstQuestion
                                   ]}>
                                        {currentQuestion > 0 && (
                                             <TouchableOpacity style={styles.navButton} onPress={handlePrevious}>
                                                  <Text style={styles.navButtonText}>Back</Text>
                                             </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                             style={[
                                                  styles.navButton,
                                                  currentQuestion === 0 && styles.navButtonFirstQuestion
                                             ]}
                                             onPress={handleNext}
                                        >
                                             <Text style={styles.navButtonText}>
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
     );
}

const styles = StyleSheet.create({
     safeArea: {
          flex: 1,
          backgroundColor: 'white',
     },
     container: {
          flex: 1,
          backgroundColor: 'white',
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
          color: Colors.primary,
          textAlign: 'center',
          marginBottom: 30,
     },
     input: {
          width: '100%',
          height: 50,
          borderWidth: 0.5,
          borderColor: Colors.inactive,
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
     optionButton: {
          paddingVertical: 15,
          paddingHorizontal: 20,
          borderRadius: 100,
          borderWidth: 0.5,
          borderColor: Colors.inactive,
          alignItems: 'flex-start',
     },
     selectedOption: {
          backgroundColor: Colors.primary,
          borderColor: Colors.primary,
     },
     optionText: {
          fontSize: 16,
          color: Colors.black,
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
          color: Colors.black,
          ...Typography.text.body,
     },
     calendarContainer: {
          width: '100%',
          backgroundColor: 'white',
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#E0E0E0',
     },
     dateRangeInfo: {
          padding: 15,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          alignItems: 'center',
     },
     dateRangeText: {
          fontSize: 16,
          color: Colors.black,
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
          borderBottomColor: '#E0E0E0',
     },
     groupInfo: {
          flex: 1,
     },
     groupLabel: {
          ...Typography.text.h4,
          color: Colors.black,
     },
     groupSubtitle: {
          ...Typography.text.caption,
          color: Colors.inactive,
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
          borderColor: Colors.inactive,
          backgroundColor: 'white',
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
          backgroundColor: Colors.primary,
          borderRadius: 2,
          left: 0,
     },
     otherInput: {
          width: '100%',
          minHeight: 100,
          borderWidth: 0.5,
          borderColor: Colors.inactive,
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
}); 