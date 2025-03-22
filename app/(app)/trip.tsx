import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Typography } from '../../constants/Typography';
import { Colors } from '../../constants/Colors';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

function Trip() {
     const { trail } = useLocalSearchParams();
     const router = useRouter();
     const trailData = JSON.parse(trail as string);

     // Default coordinates (you might want to replace these with actual trail coordinates)
     const initialRegion = {
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
     };

     const openDirections = () => {
          const { latitude, longitude } = initialRegion;
          const label = encodeURIComponent(trailData.name);

          const scheme = Platform.select({
               ios: 'maps:',
               android: 'geo:',
          });
          const url = Platform.select({
               ios: `${scheme}${latitude},${longitude}?q=${label}`,
               android: `${scheme}${latitude},${longitude}?q=${label}`,
          });
          Linking.openURL(url!);
     };

     return (
          <>
               <Stack.Screen options={{ headerShown: false }} />
               <View style={styles.container}>
                    <MapView
                         style={styles.map}
                         initialRegion={initialRegion}
                         showsCompass={true}
                         showsScale={true}
                         mapPadding={{ top: 80, right: 20, bottom: 0, left: 20 }}
                    >
                         <Marker
                              coordinate={{
                                   latitude: initialRegion.latitude,
                                   longitude: initialRegion.longitude,
                              }}
                              title={trailData.name}
                              description={trailData.location}
                         />
                    </MapView>
                    <View style={styles.topBar}>
                         <TouchableOpacity
                              style={styles.backButton}
                              onPress={() => router.back()}
                         >
                              <Ionicons name="close" size={30} color="black" />
                         </TouchableOpacity>

                         <TouchableOpacity
                              style={styles.trailNameContainer}
                         >
                              <Text style={styles.trailName}>{trailData.name}</Text>
                         </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                         style={styles.directionsButton}
                         onPress={openDirections}
                    >
                         <Ionicons name="navigate" size={24} color="white" />
                         <Text style={styles.directionsButtonText}>Get Directions</Text>
                    </TouchableOpacity>
               </View>
          </>
     )
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: 'white',
     },
     title: {
          ...Typography.text.h1,
          marginBottom: 10,
     },
     map: {
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height,
     },
     topBar: {
          width: '100%',
          position: 'absolute',
          top: 70,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          zIndex: 1,
     },
     backButton: {
          backgroundColor: 'white',
          padding: 10,
          borderRadius: 30,
          shadowColor: '#000',
          shadowOffset: {
               width: 0,
               height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
     },
     trailNameContainer: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '70%',
          height: '100%',
          backgroundColor: 'white',
          borderRadius: 30,
          shadowColor: '#000',
          shadowOffset: {
               width: 0,
               height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
     },
     trailName: {
          ...Typography.text.h4,
          textAlign: 'center',
          color: Colors.primary,
     },
     directionsButton: {
          position: 'absolute',
          bottom: 40,
          left: 20,
          right: 20,
          backgroundColor: '#007AFF',
          padding: 18,
          borderRadius: 30,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          shadowColor: '#000',
          shadowOffset: {
               width: 0,
               height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
          zIndex: 1,
     },
     directionsButtonText: {
          ...Typography.text.h4,
          color: 'white',
          fontWeight: 'bold',
     }
});

export default Trip;