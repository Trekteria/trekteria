import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, FlatList, Animated, Easing, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState, useEffect, useRef } from 'react';
import { auth, db } from '../../services/firebaseConfig';
import { doc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { Trip as TripType, Trail as TrailType } from '../../types/Types';
import { LinearGradient } from 'expo-linear-gradient';

// Define types for the data
interface Trail extends TrailType {
     image: string;
}

// Extend Trip type to include the image we'll add
interface Trip extends TripType {
     image: string;
}

// Placeholder image for trips and trails
const placeholderImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop';

// --- Reusable Jiggle Animation Hook ---
const useJiggleAnimation = (isEditing: boolean, maxDelayMs: number = 0) => {
     const rotation = useRef(new Animated.Value(0)).current;

     useEffect(() => {
          let animationSequence: Animated.CompositeAnimation | null = null;
          let isMounted = true; // Helper to prevent state updates on unmounted component

          if (isEditing) {
               const calculatedDelay = maxDelayMs > 0 ? Math.random() * maxDelayMs : 0;

               // Sequence: Delay -> Loop
               animationSequence = Animated.sequence([
                    Animated.delay(calculatedDelay), // Apply the random delay first
                    Animated.loop(
                         Animated.sequence([
                              Animated.timing(rotation, {
                                   toValue: 1.5,
                                   duration: 150,
                                   useNativeDriver: true,
                                   easing: Easing.out(Easing.ease),
                              }),
                              Animated.timing(rotation, {
                                   toValue: -1.5,
                                   duration: 150,
                                   useNativeDriver: true,
                                   easing: Easing.out(Easing.ease),
                              }),
                              // Add rotation back to 0 for smoother elastic loop
                              Animated.timing(rotation, {
                                   toValue: 0,
                                   duration: 150,
                                   useNativeDriver: true,
                                   easing: Easing.inOut(Easing.ease),
                              })
                         ]),
                    )
               ]);
               animationSequence.start();
          } else {
               // Stop any existing animation and reset smoothly
               rotation.stopAnimation(() => {
                    // Check if component is still mounted and not editing before resetting
                    if (isMounted && !isEditing) {
                         Animated.timing(rotation, {
                              toValue: 0,
                              duration: 150,
                              useNativeDriver: true,
                              easing: Easing.ease,
                         }).start();
                    }
               });
          }

          // Cleanup function to stop animation on unmount or when isEditing becomes false
          return () => {
               isMounted = false;
               animationSequence?.stop(); // Stop the sequence (delay or loop)
               rotation.stopAnimation(); // Ensure rotation itself stops
          };
     }, [isEditing, rotation]);

     const animatedStyle = {
          transform: [
               {
                    rotate: rotation.interpolate({
                         inputRange: [-1, 1],
                         outputRange: ['-1deg', '1deg'],
                    }),
               },
          ],
     };

     return animatedStyle;
};

// --- TrailBox Component ---
interface TrailBoxProps {
     item: Trail;
     trailDate: string;
     isEditing: boolean;
     onPress: (item: Trail) => void;
     onDelete: (id: string) => void;
     animationDelay?: number;
}

const TrailBox: React.FC<TrailBoxProps> = ({ item, trailDate, isEditing, onPress, onDelete, animationDelay = 0 }) => {
     const animatedStyle = useJiggleAnimation(isEditing, animationDelay);

     let dateText = 'No date';
     if (trailDate) {
          try {
               const dateObj = new Date(trailDate);
               dateText = dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
               });
          } catch (error) {
               dateText = trailDate; // Fallback to the raw date string if parsing fails
          }
     }

     return (
          <Animated.View style={[styles.animatedBox, animatedStyle]}>
               {isEditing && (
                    <TouchableOpacity
                         style={styles.deleteButton}
                         onPress={() => item.id && onDelete(item.id)}
                    >
                         <Ionicons name="remove-outline" size={28} color={Colors.black} />
                    </TouchableOpacity>
               )}
               <TouchableOpacity style={styles.tripBox} onPress={() => onPress(item)} disabled={isEditing}>
                    <Image source={{ uri: item.image }} style={styles.tripImage} />
                    <LinearGradient
                         colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,1)']}
                         style={styles.tripOverlay}
                         locations={[0, 0.4, 1]}
                    />
                    <View style={styles.dateContainer}>
                         <Text style={styles.dateText}>{dateText}</Text>
                    </View>
                    <View style={styles.tripInfo}>
                         <Text style={styles.tripName}>{item.name}</Text>
                         <View style={styles.tripMetaRow}>
                              <Text style={styles.tripDetails}>{item.location}</Text>
                         </View>
                    </View>
               </TouchableOpacity>
          </Animated.View>
     );
};

// --- TripBox Component ---
interface TripBoxProps {
     item: Trip;
     isEditing: boolean;
     onPress: (id: string) => void;
     onDelete: (id: string) => void;
     animationDelay?: number;
}

const TripBox: React.FC<TripBoxProps> = ({ item, isEditing, onPress, onDelete, animationDelay = 0 }) => {
     const animatedStyle = useJiggleAnimation(isEditing, animationDelay);

     const location = item.preferences?.location || 'No location';
     let dateText = 'No date';
     if (item.preferences?.dateRange?.startDate) {
          try {
               const dateObj = new Date(item.preferences.dateRange.startDate);
               dateText = dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
               });
          } catch (error) {
               dateText = item.preferences.dateRange.startDate; // Fallback
          }
     }

     return (
          <Animated.View style={[styles.animatedBox, animatedStyle]}>
               {isEditing && (
                    <TouchableOpacity
                         style={styles.deleteButton}
                         onPress={() => item.id && onDelete(item.id)}
                    >
                         <Ionicons name="remove-outline" size={28} color={Colors.black} />
                    </TouchableOpacity>
               )}
               <TouchableOpacity style={styles.tripBox} onPress={() => onPress(item.id || '')} disabled={isEditing}>
                    <Image source={{ uri: item.image }} style={styles.tripImage} />
                    <LinearGradient
                         colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,1)']}
                         style={styles.tripOverlay}
                         locations={[0, 0.5, 1]}
                    />
                    <View style={styles.dateContainer}>
                         <Text style={styles.dateText}>{dateText}</Text>
                    </View>
                    <View style={styles.tripInfo}>
                         <View style={styles.tripMetaRow}>
                              <Text style={styles.tripLocation}>{location}</Text>
                         </View>
                    </View>
               </TouchableOpacity>
          </Animated.View>
     );
};

// --- Home Screen Component ---
export default function Home() {
     const router = useRouter();
     const [userName, setUserName] = useState('');
     const [trips, setTrips] = useState<Trip[]>([]);
     const [trails, setTrails] = useState<Trail[]>([]);
     const [trailDates, setTrailDates] = useState<{ [trailId: string]: string }>({});
     const [isTrailsEditing, setIsTrailsEditing] = useState(false);
     const [isTripsEditing, setIsTripsEditing] = useState(false);

     const handleTrailPress = (trail: Trail) => {
          router.push({
               pathname: '/(app)/trip',
               params: {
                    trail: JSON.stringify({
                         id: trail.id,
                         name: trail.name,
                         location: trail.location,
                         keyFeatures: trail.highlights?.join(', ') || '',
                         facilities: trail.amenities?.join(', ') || '',
                         latitude: trail.coordinates?.latitude,
                         longitude: trail.coordinates?.longitude,
                         bookmarked: trail.bookmarked || false
                    })
               }
          });
     };

     const fetchUserName = async () => {
          const user = auth.currentUser;
          if (user) {
               const userDoc = await getDoc(doc(db, "users", user.uid));
               if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUserName(userData.firstname);
               }
          }
     };

     const fetchTrips = async () => {
          try {
               const user = auth.currentUser;
               if (user) {
                    const tripsCollection = collection(db, "trips");
                    // Only fetch trips associated with the current user
                    const userTripsQuery = query(tripsCollection, where("userId", "==", user.uid));
                    const tripsSnapshot = await getDocs(userTripsQuery);
                    const tripsList = tripsSnapshot.docs.map(doc => ({
                         id: doc.id,
                         ...doc.data(),
                         image: placeholderImage // Using placeholder image
                    })) as Trip[];

                    // Sort trips by date (newest first)
                    const sortedTrips = tripsList.sort((a, b) => {
                         const dateA = a.preferences?.dateRange?.startDate ? new Date(a.preferences.dateRange.startDate).getTime() : 0;
                         const dateB = b.preferences?.dateRange?.startDate ? new Date(b.preferences.dateRange.startDate).getTime() : 0;
                         return dateB - dateA; // Descending order (newest first)
                    });

                    setTrips(sortedTrips);
               }
          } catch (error) {
               console.error("Error fetching trips:", error);
          }
     };

     const fetchTrails = async () => {
          try {
               const user = auth.currentUser;
               if (user) {
                    // Fetch trails that are bookmarked AND belong to the current user
                    const trailsCollection = collection(db, "trails");
                    const bookmarkedTrailsQuery = query(
                         trailsCollection,
                         where("bookmarked", "==", true),
                         where("userId", "==", user.uid)
                    );
                    const trailsSnapshot = await getDocs(bookmarkedTrailsQuery);

                    const trailsList = trailsSnapshot.docs.map(doc => ({
                         id: doc.id,
                         ...doc.data(),
                         image: placeholderImage // Using placeholder image
                    })) as Trail[];

                    console.log("Bookmarked Trails:", trailsList);

                    // Fetch dates for trails from trips collection
                    const dates: { [trailId: string]: string } = {};
                    const tripsCollection = collection(db, "trips");
                    const userTripsQuery = query(tripsCollection, where("userId", "==", user.uid));
                    const tripsSnapshot = await getDocs(userTripsQuery);

                    tripsSnapshot.docs.forEach(tripDoc => {
                         const tripData = tripDoc.data();
                         if (tripData.trailIds && tripData.preferences?.dateRange?.startDate) {
                              // For each trail ID in this trip
                              tripData.trailIds.forEach((trailId: string) => {
                                   dates[trailId] = tripData.preferences.dateRange.startDate;
                              });
                         }
                    });

                    setTrailDates(dates);

                    // Sort trails by date (newest first)
                    const sortedTrails = trailsList.sort((a, b) => {
                         const dateA = dates[a.id || ''] ? new Date(dates[a.id || '']).getTime() : 0;
                         const dateB = dates[b.id || ''] ? new Date(dates[b.id || '']).getTime() : 0;
                         return dateB - dateA; // Descending order (newest first)
                    });

                    setTrails(sortedTrails);
                    console.log("Sorted Trails:", sortedTrails);
               }
          } catch (error) {
               console.error("Error fetching trails:", error);
          }
     };

     useFocusEffect(
          useCallback(() => {
               fetchUserName();
               fetchTrips();
               fetchTrails();
               // Reset edit modes when screen focuses
               setIsTrailsEditing(false);
               setIsTripsEditing(false);
          }, [])
     );

     const goToSettings = () => router.push('/(app)/settings');
     const goToTripPlanning = () => router.push('/(app)/preferences');
     const goToTrip = (id: string) => router.push({
          pathname: '/(app)/result',
          params: { tripId: id }
     });

     // --- Deletion Handlers ---
     const handleDeleteTrail = async (trailId: string) => {
          Alert.alert(
               "Delete Trail",
               "Are you sure you want to delete this bookmarked trail?",
               [
                    { text: "Cancel", style: "cancel" },
                    {
                         text: "Delete", style: "destructive", onPress: async () => {
                              try {
                                   // Delete the trail document (or update bookmarked status)
                                   // Assuming deletion for now, adjust if only bookmark should be removed
                                   await deleteDoc(doc(db, "trails", trailId));
                                   setTrails(prevTrails => prevTrails.filter(trail => trail.id !== trailId));
                                   // Optionally, update trailDates if needed
                              } catch (error) {
                                   console.error("Error deleting trail:", error);
                                   Alert.alert("Error", "Could not delete trail.");
                              }
                         }
                    }
               ]
          );
     };

     const handleDeleteTrip = async (tripId: string) => {
          Alert.alert(
               "Delete Trip",
               "Are you sure you want to delete this trip and its associated trails? This action cannot be undone.",
               [
                    { text: "Cancel", style: "cancel" },
                    {
                         text: "Delete", style: "destructive", onPress: async () => {
                              try {
                                   // 1. Fetch the trip document to get trailIds
                                   const tripDocRef = doc(db, "trips", tripId);
                                   const tripDocSnap = await getDoc(tripDocRef);

                                   if (tripDocSnap.exists()) {
                                        const tripData = tripDocSnap.data();
                                        const trailIdsToDelete = tripData.trailIds as string[] | undefined;

                                        // 2. Delete associated trails if they exist
                                        if (trailIdsToDelete && Array.isArray(trailIdsToDelete)) {
                                             const deletePromises = trailIdsToDelete.map(trailId =>
                                                  deleteDoc(doc(db, "trails", trailId))
                                             );
                                             await Promise.all(deletePromises);

                                             // 3. Update local trails state
                                             setTrails(prevTrails =>
                                                  prevTrails.filter(trail => !trailIdsToDelete.includes(trail.id || ''))
                                             );
                                             // Also update trailDates if necessary (though deleted trails won't have dates anymore)
                                             setTrailDates(prevDates => {
                                                  const newDates = { ...prevDates };
                                                  trailIdsToDelete.forEach(id => delete newDates[id]);
                                                  return newDates;
                                             });
                                        }
                                   }

                                   // 4. Delete the trip document itself
                                   await deleteDoc(tripDocRef);

                                   // 5. Update local trips state
                                   setTrips(prevTrips => prevTrips.filter(trip => trip.id !== tripId));
                              } catch (error) {
                                   console.error("Error deleting trip and associated trails:", error);
                                   Alert.alert("Error", "Could not delete trip or its trails.");
                              }
                         }
                    }
               ]
          );
     };

     const EmptyTripsComponent = () => (
          <View style={styles.emptyContainer}>
               <Ionicons name="map-outline" size={35} color={Colors.inactive} style={styles.emptyIcon} />
               <Text style={styles.emptyText}>No items found</Text>
               <Text style={styles.emptySubtext}>Start planning your first adventure!</Text>
          </View>
     );

     return (
          <ScrollView contentContainerStyle={styles.container}>
               {/* Info Panel */}
               <View style={styles.infoPanel}>
                    <View>
                         <View style={styles.nameRow}>
                              <Text style={styles.username}>Hello, </Text>
                              <Text style={styles.username}>{userName}</Text>
                         </View>
                         <View style={styles.ecoPointsRow}>
                              <Text style={styles.ecoPoints}>Eco-Points: </Text>
                              <Text style={styles.ecoPointsNum}>150</Text>
                         </View>
                    </View>
                    <TouchableOpacity onPress={goToSettings}>
                         <Ionicons name="settings-outline" size={32} color={'dark'} />
                    </TouchableOpacity>
               </View>

               {/* Plan a Trip Button */}
               <TouchableOpacity style={styles.planButton} onPress={goToTripPlanning}>
                    <View style={styles.planButtonContent}>
                         <Ionicons name="map-outline" size={19} color="#444" style={styles.planButtonIcon} />
                         <Text style={styles.planButtonText}>Plan a Trip</Text>
                    </View>
               </TouchableOpacity>

               {/* Your Trails Section */}
               <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Favorite Trips</Text>
                    <TouchableOpacity onPress={() => setIsTrailsEditing(!isTrailsEditing)}>
                         <Text style={styles.editButtonText}>{isTrailsEditing ? 'Done' : 'Edit'}</Text>
                    </TouchableOpacity>
               </View>
               <FlatList
                    horizontal
                    data={trails}
                    keyExtractor={(item) => item.id || String(Math.random())}
                    renderItem={({ item }) => ( // Use the new TrailBox component
                         <TrailBox
                              item={item}
                              trailDate={trailDates[item.id || '']}
                              isEditing={isTrailsEditing}
                              onPress={handleTrailPress}
                              onDelete={handleDeleteTrail}
                              animationDelay={300} // Max 300ms random delay
                         />
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tripList}
                    ListEmptyComponent={EmptyTripsComponent}
               />

               {/* Your Trips Section */}
               <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Your Plans</Text>
                    <TouchableOpacity onPress={() => setIsTripsEditing(!isTripsEditing)}>
                         <Text style={styles.editButtonText}>{isTripsEditing ? 'Done' : 'Edit'}</Text>
                    </TouchableOpacity>
               </View>
               <FlatList
                    horizontal
                    data={trips}
                    keyExtractor={(item) => item.id || String(Math.random())}
                    renderItem={({ item }) => ( // Use the new TripBox component
                         <TripBox
                              item={item}
                              isEditing={isTripsEditing}
                              onPress={goToTrip}
                              onDelete={handleDeleteTrip}
                              animationDelay={300} // Max 300ms random delay
                         />
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tripList}
                    ListEmptyComponent={EmptyTripsComponent}
               />
          </ScrollView>
     );
}

const styles = StyleSheet.create({
     container: {
          flexGrow: 1,
          backgroundColor: 'white',
          paddingTop: 80,
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 20, // Add padding at the bottom
     },
     infoPanel: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          width: '90%',
     },
     nameRow: {
          flexDirection: 'row',
          alignItems: 'center',
     },
     username: {
          ...Typography.text.h1,
          color: Colors.primary,
     },
     ecoPointsRow: {
          flexDirection: 'row',
          alignItems: 'center',
     },
     ecoPoints: {
          ...Typography.text.caption,
          color: 'green',
          marginTop: 5,
          fontSize: 15,
     },
     ecoPointsNum: {
          color: 'green',
          marginTop: 5,
          fontSize: 15,
          fontWeight: '800',
     },
     planButton: {
          backgroundColor: 'white',
          paddingVertical: 20,
          borderRadius: 100,
          alignItems: 'center',
          marginBottom: 25,
          width: '90%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 5,
     },
     planButtonContent: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
     },
     planButtonIcon: {
          marginRight: 8,
     },
     planButtonText: {
          ...Typography.text.button,
          color: '#444',
          fontWeight: '500',
          fontSize: 18,
     },
     sectionHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '90%',
          paddingLeft: 3,
          marginBottom: 5,
          marginTop: 10, // Add margin top to separate sections
     },
     sectionTitle: {
          ...Typography.text.h3,
          fontSize: 25,
     },
     editButtonText: {
          ...Typography.text.button,
          color: Colors.inactive,
          fontSize: 16,
          fontWeight: '500',
          paddingLeft: 40,
          paddingVertical: 10,
     },
     tripList: {
          minWidth: '100%',
          minHeight: 260,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingHorizontal: 20,
     },
     animatedBox: {
          marginRight: 30,
          backgroundColor: 'transparent',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 10,
     },
     tripBox: {
          width: 240,
          height: 240,
          borderRadius: 15,
          overflow: 'hidden',
          backgroundColor: 'lightGray',
     },
     tripImage: {
          width: '100%',
          height: '100%',
          position: 'absolute',
     },
     tripOverlay: {
          ...StyleSheet.absoluteFillObject,
     },
     tripInfo: {
          position: 'absolute',
          bottom: 15,
          left: 15,
          right: 15,
     },
     tripMetaRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 2,
     },
     tripLocation: {
          ...Typography.text.h2,
          color: 'white',
          fontSize: 18,
          fontWeight: '600',
     },
     tripName: {
          ...Typography.text.h3,
          color: 'white',
          marginBottom: 5,
          fontWeight: '600',
     },
     tripDetails: {
          ...Typography.text.caption,
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 13,
     },
     dateContainer: {
          position: 'absolute',
          top: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderBottomLeftRadius: 10,
          paddingVertical: 4,
          paddingHorizontal: 8,
     },
     dateText: {
          color: '#333',
          fontSize: 11,
          fontWeight: '600',
     },
     emptyContainer: {
          width: '90%',
          height: 240,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          marginLeft: 10,
     },
     emptyIcon: {
          marginBottom: 15,
     },
     emptyText: {
          ...Typography.text.h3,
          color: Colors.inactive,
          marginBottom: 5,
          textAlign: 'center',
     },
     emptySubtext: {
          ...Typography.text.body,
          color: Colors.inactive,
          textAlign: 'center',
     },
     deleteButton: {
          position: 'absolute',
          top: -8,
          left: -8,
          zIndex: 10,
          backgroundColor: 'white',
          opacity: 0.8,
          borderRadius: 15,
          padding: 2,
     },
});
