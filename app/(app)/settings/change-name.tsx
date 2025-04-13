import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import { Typography } from '../../../constants/Typography';
import { useState, useEffect } from 'react';
import { auth, db } from '../../../services/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function ChangeName() {
     const router = useRouter();
     const [firstName, setFirstName] = useState('');
     const [lastName, setLastName] = useState('');
     const [loading, setLoading] = useState(false);

     useEffect(() => {
          const fetchUserData = async () => {
               const user = auth.currentUser;
               if (user) {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                         const userData = userDoc.data();
                         setFirstName(userData.firstname || '');
                         setLastName(userData.lastname || '');
                    }
               }
          };
          fetchUserData();
     }, []);

     const handleUpdateName = async () => {
          if (!firstName.trim()) {
               Alert.alert('Error', 'First name is required');
               return;
          }

          setLoading(true);
          try {
               const user = auth.currentUser;
               if (user) {
                    await updateDoc(doc(db, "users", user.uid), {
                         firstname: firstName.trim(),
                         lastname: lastName.trim()
                    });
                    Alert.alert('Success', 'Name updated successfully');
                    router.back();
               }
          } catch (error) {
               Alert.alert('Error', 'Failed to update name. Please try again.');
          } finally {
               setLoading(false);
          }
     };

     return (
          <SafeAreaView style={styles.safeArea}>
               <Stack.Screen options={{
                    headerShown: false
               }} />
               {/* Header */}
               <View style={styles.headerContainer}>
                    <View style={styles.header}>
                         <TouchableOpacity onPress={() => router.back()}>
                              <Ionicons name="chevron-back" size={28} color={'black'} />
                         </TouchableOpacity>
                    </View>
                    <Text style={styles.title}>Change Name</Text>
               </View>

               <View style={styles.form}>
                    <TextInput
                         style={styles.input}
                         value={firstName}
                         onChangeText={setFirstName}
                         placeholder="Enter your first name"
                         placeholderTextColor="#666"
                    />

                    <TextInput
                         style={styles.input}
                         value={lastName}
                         onChangeText={setLastName}
                         placeholder="Enter your last name"
                         placeholderTextColor="#666"
                    />

                    <TouchableOpacity
                         style={[styles.button, loading && styles.buttonDisabled]}
                         onPress={handleUpdateName}
                         disabled={loading}
                    >
                         <Text style={styles.buttonText}>
                              {loading ? 'Updating...' : 'Update Name'}
                         </Text>
                    </TouchableOpacity>
               </View>
          </SafeAreaView>
     );
}

const styles = StyleSheet.create({
     safeArea: {
          flex: 1,
          backgroundColor: 'white',
     },
     headerContainer: {
          padding: 20,
     },
     header: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 30,
     },
     title: {
          ...Typography.text.h1,
          color: Colors.primary,
     },
     form: {
          width: '100%',
          gap: 20,
          padding: 20,
     },
     label: {
          ...Typography.text.body,
          marginBottom: 8,
          color: '#333',
     },
     input: {
          borderWidth: 1,
          borderColor: Colors.inactive,
          borderRadius: 100,
          paddingHorizontal: 30,
          paddingVertical: 20,
          fontSize: 16,
     },
     button: {
          backgroundColor: Colors.primary,
          padding: 20,
          borderRadius: 100,
          alignItems: 'center',
          marginTop: 30,
     },
     buttonDisabled: {
          opacity: 0.7,
     },
     buttonText: {
          ...Typography.text.button,
          color: 'white',
     },
}); 