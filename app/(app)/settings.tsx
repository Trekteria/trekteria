
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={'black'} />
          </TouchableOpacity>
 
        </View>

        <Text style={styles.title}>Settings</Text>

        {/* Preferences Section */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Temperature</Text>
          <Text style={styles.value}>°F</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Unit</Text>
          <Text style={styles.value}>Imperial</Text>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionHeader}>Account</Text>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/result')}>
          <Text style={styles.label}>Change name</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/result')}>
          <Text style={styles.label}>Change email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/result')}>
          <Text style={styles.label}>Change password</Text>
        </TouchableOpacity>

        {/* Support Section */}
        <Text style={styles.sectionHeader}>Support</Text>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/result')}>
          <Text style={styles.label}>Share with friends</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/result')}>
          <Text style={styles.label}>Feedback</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/result')}>
          <Text style={styles.label}>Rate on App Store</Text>
        </TouchableOpacity>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => router.push('/result')}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* Footer Version */}
        <Text style={styles.version}>23.6.2</Text>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
     safeArea: {
       flex: 1,
       backgroundColor: '#F8F8F8',
     },
     container: {
       padding: 20,
       backgroundColor: 'white',
       flexGrow: 1,
     },
     header: {
       flexDirection: 'row',
       alignItems: 'center',
       marginBottom: 30,
     },
     title: {
       ...Typography.text.h1, // 42px, Montserrat, medium weight
       color: '#3C5A40',
     },
     sectionHeader: {
       ...Typography.text.h2, // 25px, Montserrat
       marginTop: 20,
       marginBottom: 10,
     },
     row: {
       borderBottomWidth: 1,
       borderBottomColor: '#E0E0E0',
       paddingVertical: 15,
       flexDirection: 'row',
       justifyContent: 'space-between',
     },
     label: {
       ...Typography.text.body, // 16px, OpenSans
     },
     value: {
       ...Typography.text.body, // same as label, but with gray override
       color: 'gray',
     },
     logoutButton: {
       marginTop: 30,
       backgroundColor: '#3C5A40',
       paddingVertical: 16,
       borderRadius: 100,
       alignItems: 'center',
     },
     logoutText: {
       ...Typography.text.button, // 18px, Montserrat, bold
     },
     version: {
       ...Typography.text.caption, // 12px, OpenSans
       textAlign: 'center',
       marginTop: 20,
     },
   });
   