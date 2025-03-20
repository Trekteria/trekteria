import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Typography } from '../../constants/Typography';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { generateTrailRecommendations } from '@/services/geminiService';

export default function Result() {
     const router = useRouter();
     const params = useLocalSearchParams();
     const [loading, setLoading] = useState(false);
     const [recommendations, setRecommendations] = useState<string | null>(null);
     const [summary, setSummary] = useState<string | null>(null);
     const [error, setError] = useState<string | null>(null);

     useEffect(() => {
          // If we have params, decode and set them
          if (params.summary) {
               setSummary(decodeURIComponent(params.summary as string));
          }

          if (params.recommendations) {
               setRecommendations(decodeURIComponent(params.recommendations as string));
          } else if (params.error) {
               setError(params.error as string);
          } else if (params.summary && !params.recommendations && !params.error) {
               // If we have a summary but no recommendations, generate them
               generateRecommendations(decodeURIComponent(params.summary as string));
          }
     }, [params]);

     const generateRecommendations = async (formSummary: string) => {
          setLoading(true);
          try {
               const result = await generateTrailRecommendations(formSummary);
               setRecommendations(result);
          } catch (err) {
               console.error("Error generating recommendations:", err);
               setError("Failed to generate trail recommendations. Please try again.");
          } finally {
               setLoading(false);
          }
     };

     const handleClose = () => {
          router.push('/(app)/home');
     };

     const handleRetry = () => {
          if (summary) {
               generateRecommendations(summary);
          }
     };

     return (
          <SafeAreaView style={styles.safeArea}>
               <View style={styles.container}>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                         <Ionicons name="close" size={40} color={Colors.black} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Handpicked for you -</Text>
                    <Text style={styles.secondTitle}>Select Your Trail!</Text>

                    <ScrollView
                         style={styles.scrollView}
                         contentContainerStyle={styles.scrollContent}
                         showsVerticalScrollIndicator={false}
                    >

                         {loading ? (
                              <View style={styles.loadingContainer}>
                                   <ActivityIndicator size="large" color={Colors.primary} />
                                   <Text style={styles.loadingText}>Generating trail recommendations...</Text>
                              </View>
                         ) : error ? (
                              <View style={styles.errorContainer}>
                                   <Text style={styles.errorText}>{error}</Text>
                                   <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                                        <Text style={styles.retryButtonText}>Retry</Text>
                                   </TouchableOpacity>
                              </View>
                         ) : recommendations ? (
                              <View style={styles.section}>
                                   <Text style={styles.sectionTitle}>Suggested Trails</Text>
                                   <Text style={styles.recommendationsText}>{recommendations}</Text>
                              </View>
                         ) : null}
                    </ScrollView>
               </View>
          </SafeAreaView>
     );
}

const styles = StyleSheet.create({
     safeArea: {
          flex: 1,
          backgroundColor: 'white',
     } as ViewStyle,
     container: {
          flex: 1,
          backgroundColor: 'white',
          paddingHorizontal: 20,
     } as ViewStyle,
     scrollView: {
          flex: 1,
     } as ViewStyle,
     scrollContent: {
          paddingTop: 20,
     } as ViewStyle,
     closeButton: {
          zIndex: 10,
          marginBottom: 20,
     } as ViewStyle,
     title: {
          ...Typography.text.h2,
          marginBottom: 5,
          color: Colors.primary,
          textAlign: 'left',
     } as TextStyle,
     secondTitle: {
          ...Typography.text.h1,
          fontWeight: 'thin',
          color: Colors.primary,
          marginBottom: 20,
          textAlign: 'left',
     } as TextStyle,
     section: {
          marginBottom: 30,
          padding: 15,
          backgroundColor: '#f5f5f5',
          borderRadius: 10,
     } as ViewStyle,
     sectionTitle: {
          ...Typography.text.h3,
          marginBottom: 10,
     } as TextStyle,
     text: {
          ...Typography.text.body,
          lineHeight: 22,
     } as TextStyle,
     recommendationsText: {
          ...Typography.text.body,
          lineHeight: 24,
     } as TextStyle,
     loadingContainer: {
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
     } as ViewStyle,
     loadingText: {
          ...Typography.text.body,
          marginTop: 10,
          color: Colors.inactive,
     } as TextStyle,
     errorContainer: {
          padding: 20,
          alignItems: 'center',
     } as ViewStyle,
     errorText: {
          ...Typography.text.body,
          color: 'red',
          marginBottom: 15,
          textAlign: 'center',
     } as TextStyle,
     retryButton: {
          backgroundColor: Colors.primary,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
     } as ViewStyle,
     retryButtonText: {
          ...Typography.text.button,
          color: 'white',
     } as TextStyle,
}); 