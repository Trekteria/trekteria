import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, ViewStyle, TextStyle, ImageBackground, ImageStyle } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Typography } from '../../constants/Typography';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trail as FirestoreTrail } from '@/types/Types';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';

// Define the Trail interface for type safety
interface Trail {
     name: string;
     location: string;
     keyFeatures: string;
     facilities: string;
     latitude?: number;
     longitude?: number;
     id?: string;
     bookmarked?: boolean;
}

// Sample trail images - in a real app, these could come from an API or be specific to each trail
const trailImages = [
     'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&q=80&w=1000',
     'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=1000'
];

export default function Result() {
     const router = useRouter();
     const { tripId: routeTripId } = useLocalSearchParams();
     const [loading, setLoading] = useState(true);
     const [parsedTrails, setParsedTrails] = useState<Trail[]>([]);
     const [summary, setSummary] = useState<string | null>(null);
     const [error, setError] = useState<string | null>(null);

     useEffect(() => {
          const loadData = async () => {
               setLoading(true);
               try {
                    // Get summary and error from AsyncStorage (these are still valid use cases for AsyncStorage)
                    const [summaryValue, errorValue, lastTripId] = await Promise.all([
                         AsyncStorage.getItem('trailSummary'),
                         AsyncStorage.getItem('trailError'),
                         AsyncStorage.getItem('lastTripId')
                    ]);

                    if (errorValue) {
                         setError(errorValue);
                         setLoading(false);
                         return;
                    }

                    if (summaryValue) {
                         setSummary(summaryValue);
                    }

                    // Determine which tripId to use - from route params or from AsyncStorage
                    const targetTripId = routeTripId ? String(routeTripId) : lastTripId;

                    // Fetch trails from Firestore
                    if (targetTripId) {
                         const user = auth.currentUser;
                         if (!user) {
                              setError("You must be logged in to view recommendations");
                              setLoading(false);
                              return;
                         }

                         // Query trails related to this trip
                         const trailsCollection = collection(db, "trails");
                         const trailsQuery = query(trailsCollection, where("tripId", "==", targetTripId));
                         const trailsSnapshot = await getDocs(trailsQuery);

                         const firestoreTrails: FirestoreTrail[] = [];
                         trailsSnapshot.forEach(doc => {
                              firestoreTrails.push({ id: doc.id, ...doc.data() } as FirestoreTrail);
                         });

                         // Convert Firestore trail format to the format expected by this component
                         const trailsForDisplay = firestoreTrails.map(trail => ({
                              id: trail.id,
                              name: trail.name,
                              location: trail.location,
                              keyFeatures: trail.highlights?.join(', ') || '',
                              facilities: trail.amenities?.join(', ') || '',
                              latitude: trail.coordinates?.latitude,
                              longitude: trail.coordinates?.longitude,
                              bookmarked: trail.bookmarked || false
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
                    console.error("Error loading data:", err);
                    setError("Failed to load recommendations. Please try again.");
               } finally {
                    setLoading(false);
               }
          };

          loadData();
     }, [routeTripId]);

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

     const handleBookmarkPress = async (trail: Trail, index: number) => {
          try {
               const user = auth.currentUser;
               if (!user) {
                    console.error("User must be logged in to bookmark trails");
                    return;
               }

               if (!trail.id) {
                    console.error("Trail ID is missing");
                    return;
               }

               // Get current bookmark state
               const isCurrentlyBookmarked = trail.bookmarked || false;

               // Update the trail document in Firestore
               const trailRef = doc(db, "trails", trail.id);
               await updateDoc(trailRef, {
                    bookmarked: !isCurrentlyBookmarked
               });

               // Update local state
               const updatedTrails = [...parsedTrails];
               updatedTrails[index] = {
                    ...trail,
                    bookmarked: !isCurrentlyBookmarked
               };
               setParsedTrails(updatedTrails);
          } catch (error) {
               console.error("Error updating bookmark status:", error);
          }
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

                              <View style={styles.bookmarkContainer}>
                                   <TouchableOpacity onPress={() => handleBookmarkPress(trail, index)}>
                                        <Ionicons
                                             name={trail.bookmarked ? "heart" : "heart-outline"}
                                             size={30}
                                             color="white"
                                        />
                                   </TouchableOpacity>
                              </View>

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

                    {routeTripId ? (
                         <>
                              <Text style={styles.title}>Your Saved Trip</Text>
                              <Text style={styles.secondTitle}>Trail Details</Text>
                         </>
                    ) : (
                         <>
                              <Text style={styles.title}>Handpicked for you -</Text>
                              <Text style={styles.secondTitle}>Select Your Trail!</Text>
                         </>
                    )}

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
          position: 'relative',
     } as ViewStyle,
     bookmarkContainer: {
          position: 'absolute',
          top: 10,
          right: 10,
          padding: 5,
          borderRadius: 10,
          zIndex: 10,
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
     dateContainer: {
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderRadius: 6,
          zIndex: 10,
     } as ViewStyle,
     dateText: {
          color: 'white',
          fontSize: 12,
          fontWeight: '500',
     } as TextStyle,
}); 