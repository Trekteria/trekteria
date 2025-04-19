import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState, useEffect } from 'react';
import { auth, db } from '../../services/firebaseConfig';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
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

export default function Home() {
     const router = useRouter();
     const [userName, setUserName] = useState('');
     const [trips, setTrips] = useState<Trip[]>([]);
     const [trails, setTrails] = useState<Trail[]>([]);
     const [trailDates, setTrailDates] = useState<{ [trailId: string]: string }>({});

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
          }, [])
     );

     const goToSettings = () => router.push('/(app)/settings');
     const goToTripPlanning = () => router.push('/(app)/preferences');
     const goToTrip = (id: string) => router.push({
          pathname: '/(app)/result',
          params: { tripId: id }
     });

     const EmptyTripsComponent = () => (
          <View style={styles.emptyContainer}>
               <Ionicons name="map-outline" size={40} color={Colors.primary} style={styles.emptyIcon} />
               <Text style={styles.emptyText}>No items found</Text>
               <Text style={styles.emptySubtext}>Start planning your first adventure!</Text>
          </View>
     );

     const renderTrailBox = ({ item }: { item: Trail }) => {
          // Get the date from trailDates map
          let dateText = 'No date';
          const trailDate = trailDates[item.id || ''];

          if (trailDate) {
               try {
                    const dateObj = new Date(trailDate);
                    dateText = dateObj.toLocaleDateString('en-US', {
                         month: 'long',
                         day: 'numeric',
                         year: 'numeric'
                    });
               } catch (error) {
                    dateText = trailDate;
               }
          }

          return (
               <TouchableOpacity style={styles.tripBox} onPress={() => handleTrailPress(item)}>
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
          );
     };

     const renderTripBox = ({ item }: { item: Trip }) => {
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
                    dateText = item.preferences.dateRange.startDate;
               }
          }

          return (
               <TouchableOpacity style={styles.tripBox} onPress={() => goToTrip(item.id || '')}>
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
                         {/* <Text style={styles.tripName}>{item.summary || 'Unnamed Trip'}</Text> */}
                         <View style={styles.tripMetaRow}>
                              <Text style={styles.tripLocation}>{location}</Text>
                         </View>
                    </View>
               </TouchableOpacity>
          );
     };

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
               <Text style={styles.sectionTitle}>Your Trails</Text>
               <FlatList
                    horizontal
                    data={trails}
                    keyExtractor={(item) => item.id || String(Math.random())}
                    renderItem={renderTrailBox}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tripList}
                    ListEmptyComponent={EmptyTripsComponent}
               />

               {/* Your Trips Section */}
               <Text style={styles.sectionTitle}>Your Trips</Text>
               <FlatList
                    horizontal
                    data={trips}
                    keyExtractor={(item) => item.id || String(Math.random())}
                    renderItem={renderTripBox}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tripList}
                    ListEmptyComponent={EmptyTripsComponent}
               />
          </ScrollView>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: 'white',
          paddingTop: 80,
          justifyContent: 'center',
          alignItems: 'center',
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

          // Shadow for iOS
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,

          // Shadow for Android
          elevation: 5,
     },

     planButtonContent: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
     },

     planButtonIcon: {
          marginRight: 8, // spacing between text and icon
     },

     planButtonText: {
          ...Typography.text.button,
          color: '#444', // dark gray text
          fontWeight: '500', // thinner text
          fontSize: 18,
     },

     sectionTitle: {
          ...Typography.text.h3,
          marginBottom: 10,
          marginTop: 10,
          fontSize: 25,
          textAlign: 'left',
          alignItems: 'flex-start',
          paddingLeft: 3,
          width: '90%',
     },
     tripList: {
          paddingLeft: 10,
          minWidth: '100%',
          flexDirection: 'row',
          justifyContent: 'flex-start',
     },
     tripBox: {
          width: 240,
          height: 240,
          margin: 10,
          marginRight: 25,
          borderRadius: 15,
          overflow: 'hidden',
          backgroundColor: 'lightGray',
          boxShadow: '0 8px 20px 0 rgba(0, 0, 0, 0.3)',
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
     },
     tripName: {
          ...Typography.text.h3,
          color: 'white',
          marginBottom: 5,
     },
     tripDetails: {
          ...Typography.text.caption,
          color: 'white',
     },

     dateContainer: {
          position: 'absolute',
          top: 0,
          right: 0,
          backgroundColor: 'white',
          borderBottomLeftRadius: 10,
          padding: 5,
     },
     dateText: {
          color: 'black',
          fontSize: 12,
          fontWeight: '500',
     },

     emptyContainer: {
          width: '100%',
          height: 240,
          marginVertical: 10,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
     },
     emptyIcon: {
          marginBottom: 15,
     },
     emptyText: {
          ...Typography.text.h3,
          color: Colors.primary,
          marginBottom: 5,
          textAlign: 'center',
     },
     emptySubtext: {
          ...Typography.text.body,
          color: '#666',
          textAlign: 'center',
     },
});
