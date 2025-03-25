import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';

const drafts = [
     {
          id: '1',
          name: 'Beach Day',
          location: 'Santa Cruz',
          date: 'Mar 29, 2025',
          image: require('../../assets/images/icon.png'),
     },
     {
          id: '2',
          name: 'Mountain Hike',
          location: 'Lake Tahoe',
          date: 'Apr 3, 2025',
          image: require('../../assets/images/icon.png'),
     },
];

const previousTrips = [
     {
          id: '3',
          name: 'City Tour',
          location: 'San Francisco',
          date: 'Feb 10, 2025',
          image: require('../../assets/images/icon.png'),
     },
     {
          id: '4',
          name: 'Wine Country',
          location: 'Napa Valley',
          date: 'Jan 15, 2025',
          image: require('../../assets/images/icon.png'),
     },
];

export default function Home() {
     const router = useRouter();

     const goToSettings = () => router.push('/(app)/settings');
     const goToTripPlanning = () => router.push('/(app)/result');
     const goToTrip = (id: string) => router.push(`/(app)/result`);


     const renderTripBox = ({ item }: any) => (
          <TouchableOpacity style={styles.tripBox} onPress={() => goToTrip(item.id)}>
               <Image source={item.image} style={styles.tripImage} />
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


     return (
          <ScrollView contentContainerStyle={styles.container}>
               {/* Info Panel */}
               <View style={styles.infoPanel}>
                    <View>
                         <View style={styles.nameRow}>
                              <Text style={styles.username}>Hello, </Text>
                              <Text style={styles.username}>Aung</Text>
                         </View>
                         <View style={styles.ecoPointsRow}>
                              <Text style={styles.ecoPoints}>Eco-Points: </Text>
                              <Text style={styles.ecoPointsNum}>150</Text>
                         </View>

                    </View>
                    <TouchableOpacity onPress={goToSettings}>
                         <Ionicons name="settings-outline" size={28} color={'dark'} />
                    </TouchableOpacity>
               </View>

               {/* Plan a Trip Button */}
               <TouchableOpacity style={styles.planButton} onPress={goToTripPlanning}>
                    <View style={styles.planButtonContent}>
                         <Ionicons name="map-outline" size={19} color="#444" style={styles.planButtonIcon} />
                         <Text style={styles.planButtonText}>Plan a Trip</Text>
                    </View>
               </TouchableOpacity>

               {/* Drafts Section */}
               <Text style={styles.sectionTitle}>Drafts</Text>
               <FlatList
                    horizontal
                    data={drafts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTripBox}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 5 }}
               />

               <Text style={styles.sectionTitle}>Your Trips</Text>
               <FlatList
                    horizontal
                    data={previousTrips}
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
          ...Typography.text.h2,
          color: Colors.primary,
          fontSize: 35,
          fontWeight: '600',
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
          paddingVertical: 15,
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
          marginBottom: 15,
          marginTop: 10,
          fontSize: 25,
          textAlign: 'left',
          alignItems: 'flex-start',
          paddingLeft: 3,
          width: '90%',
     },
     tripBox: {
          width: 190,
          height: 200,
          margin: 10,
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
