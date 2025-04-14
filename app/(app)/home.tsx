import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { auth, db } from '../../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const yourTrails = [
     {
          id: '1',
          name: 'Beach Day',
          location: 'Santa Cruz',
          date: 'Mar 29, 2025',
          image: 'https://images.unsplash.com/photo-1647714851930-706e02436822?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
     },
     {
          id: '2',
          name: 'Mountain Hike',
          location: 'Lake Tahoe',
          date: 'Apr 3, 2025',
          image: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&q=80&w=1000',
     },
];

const yourTrips = [
     {
          id: '3',
          name: 'City Tour',
          location: 'San Francisco',
          date: 'Feb 10, 2025',
          image: 'https://images.unsplash.com/photo-1615289644696-4f9eb914f3bb?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
     },
     {
          id: '4',
          name: 'Wine Country',
          location: 'Napa Valley',
          date: 'Jan 15, 2025',
          image: 'https://images.unsplash.com/photo-1726142346171-fe754a65da8d?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
     },
];

export default function Home() {
     const router = useRouter();
     const [userName, setUserName] = useState('');

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

     useFocusEffect(
          useCallback(() => {
               fetchUserName();
          }, [])
     );

     const goToSettings = () => router.push('/(app)/settings');
     const goToTripPlanning = () => router.push('/(app)/preferences');
     const goToTrip = (id: string) => router.push(`/(app)/result`);

     const renderTrailBox = ({ item }: any) => (
          <TouchableOpacity style={styles.tripBox} onPress={() => goToTrip(item.id)}>
               <Image source={{ uri: item.image }} style={styles.tripImage} />
               <View style={styles.tripOverlay} />
               <View style={styles.tripInfo}>
                    <Text style={styles.tripName}>{item.name}</Text>
                    <View style={styles.tripMetaRow}>
                         <Text style={styles.tripDetails}>{item.location}</Text>
                         <Text style={styles.tripDetails}>{item.date}</Text>
                    </View>
               </View>
          </TouchableOpacity>
     );

     const renderTripBox = ({ item }: any) => (
          <TouchableOpacity style={styles.tripBox} onPress={() => goToTrip(item.id)}>
               <Image source={{ uri: item.image }} style={styles.tripImage} />
               <View style={styles.tripOverlay} />
               <View style={styles.tripInfo}>
                    <View style={styles.tripMetaRow}>
                         <Text style={styles.tripDetails}>{item.location}</Text>
                         <Text style={styles.tripDetails}>{item.date}</Text>
                    </View>
               </View>
          </TouchableOpacity>
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
               <Text style={styles.sectionTitle}>Your Trails</Text>
               <FlatList
                    horizontal
                    data={yourTrails}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTrailBox}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 5 }}
               />

               {/* Your Trips Section */}
               <Text style={styles.sectionTitle}>Your Trips</Text>
               <FlatList
                    horizontal
                    data={yourTrips}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTripBox}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 5 }}
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
     tripBox: {
          width: 220,
          height: 220,
          margin: 10,
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
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
     },
     tripInfo: {
          position: 'absolute',
          bottom: 10,
          left: 10,
          right: 10,
     },
     tripMetaRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 2,
     },


     tripName: {
          ...Typography.text.h3,
          color: 'white',
     },
     tripDetails: {
          ...Typography.text.caption,
          color: 'white',
     },
     tripList: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
     },
});
