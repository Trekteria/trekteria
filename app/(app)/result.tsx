import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, ViewStyle, TextStyle, ImageBackground, ImageStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '../../constants/Typography';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trail as FirestoreTrail } from '@/types/Types';

// Define the Trail interface for type safety
interface Trail {
     name: string;
     location: string;
     keyFeatures: string;
     facilities: string;
     latitude?: number;
     longitude?: number;
}

// Sample trail images - in a real app, these could come from an API or be specific to each trail
const trailImages = [
     'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=1000'
];

export default function Result() {
     const router = useRouter();
     const [loading, setLoading] = useState(true);
     const [parsedTrails, setParsedTrails] = useState<Trail[]>([]);
     const [summary, setSummary] = useState<string | null>(null);
     const [error, setError] = useState<string | null>(null);

     useEffect(() => {
          // Retrieve data from AsyncStorage
          const loadData = async () => {
               setLoading(true);
               try {
                    // Get summary, error, and parsed trails from AsyncStorage
                    const [summaryValue, errorValue, parsedTrailsValue] = await Promise.all([
                         AsyncStorage.getItem('trailSummary'),
                         AsyncStorage.getItem('trailError'),
                         AsyncStorage.getItem('parsedTrails')
                    ]);

                    if (errorValue) {
                         setError(errorValue);
                         setLoading(false);
                         return;
                    }

                    if (summaryValue) {
                         setSummary(summaryValue);
                    }

                    if (parsedTrailsValue) {
                         // Parse the JSON string into an array of Trail objects
                         const firestoreTrails = JSON.parse(parsedTrailsValue) as FirestoreTrail[];

                         // Convert Firestore trail format to the format expected by this component
                         const trailsForDisplay = firestoreTrails.map(trail => ({
                              name: trail.name,
                              location: trail.location,
                              keyFeatures: trail.highlights?.join(', ') || '',
                              facilities: trail.amenities?.join(', ') || '',
                              latitude: trail.coordinates?.latitude,
                              longitude: trail.coordinates?.longitude
                         }));

                         if (trailsForDisplay.length === 0) {
                              setError("No valid trail recommendations found. Please try again.");
                         } else {
                              setParsedTrails(trailsForDisplay);
                         }
                    } else {
                         setError("No trail recommendations found. Please try again.");
                    }
               } catch (err) {
                    console.error("Error loading data from AsyncStorage:", err);
                    setError("Failed to load recommendations. Please try again.");
               } finally {
                    setLoading(false);
               }
          };

          loadData();
     }, []);

     const handleClose = () => {
          router.push('/(app)/home');
     };

     const handleRetry = () => {
          // Clear any previous error before returning to preferences
          AsyncStorage.removeItem('trailError')
               .then(() => {
                    // Return to preferences page to try again
                    router.push('/(app)/preferences');
               })
               .catch((err: any) => console.error("Error clearing error state:", err));
     };

     const handleTrailPress = (trail: Trail) => {
          router.push({
               pathname: '/trip',
               params: { trail: JSON.stringify(trail) }
          });
     };

     // Render a trail card for each parsed trail
     const renderTrailCard = (trail: Trail, index: number) => {
          // Use a placeholder image from our array, cycling through them
          const backgroundImage = trailImages[index % trailImages.length];

          return (
               <TouchableOpacity key={index} style={styles.trailCard} onPress={() => handleTrailPress(trail)}>
                    <ImageBackground
                         source={{ uri: backgroundImage }}
                         style={{ width: '100%', height: '100%', justifyContent: 'flex-end' }}
                         imageStyle={{ borderRadius: 15 }}
                    >
                         <View style={styles.cardOverlay}>
                              <Text style={styles.trailName}>{trail.name}</Text>

                              <View style={styles.detailsContainer}>
                                   <View style={styles.detailRow}>
                                        <Ionicons name="location-outline" size={18} color="white" />
                                        <Text style={styles.detailText}>{trail.location}</Text>
                                   </View>

                                   <View style={styles.detailRow}>
                                        <Ionicons name="leaf-outline" size={18} color="white" />
                                        <Text style={styles.detailText}>{trail.keyFeatures}</Text>
                                   </View>

                                   <View style={styles.detailRow}>
                                        <Ionicons name="shield-checkmark-outline" size={18} color="white" />
                                        <Text style={styles.detailText}>{trail.facilities}</Text>
                                   </View>
                              </View>
                         </View>
                    </ImageBackground>
               </TouchableOpacity>
          );
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
                                   <Text style={styles.loadingText}>Loading your trail recommendations...</Text>
                              </View>
                         ) : error ? (
                              <View style={styles.errorContainer}>
                                   <Text style={styles.errorText}>{error}</Text>
                                   <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                                        <Text style={styles.retryButtonText}>Retry</Text>
                                   </TouchableOpacity>
                              </View>
                         ) : parsedTrails.length > 0 ? (
                              <View style={styles.trailsContainer}>
                                   {parsedTrails.map(renderTrailCard)}
                              </View>
                         ) : summary ? (
                              <View style={styles.section}>
                                   <Text style={styles.summaryText}>{summary}</Text>
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
          textAlign: 'left',
     } as TextStyle,
     section: {
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
     summaryText: {
          ...Typography.text.body,
          lineHeight: 24,
          color: Colors.black,
          marginBottom: 20,
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
     trailsContainer: {
          marginBottom: 30,
     } as ViewStyle,
     trailCard: {
          marginBottom: 10,
          borderRadius: 20,
          overflow: 'hidden',
          height: 210,
          elevation: 4,
     } as ViewStyle,
     cardOverlay: {
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: 20,
          borderBottomLeftRadius: 15,
          borderBottomRightRadius: 15,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
     } as ViewStyle,
     trailName: {
          ...Typography.text.h2,
          color: 'white',
     } as TextStyle,
     detailsContainer: {
          marginTop: 5,
     } as ViewStyle,
     detailRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: 3,
          gap: 5,
     } as ViewStyle,
     detailText: {
          ...Typography.text.body,
          color: 'white',
          fontSize: 14,
          marginLeft: 10,
     } as TextStyle,
}); 