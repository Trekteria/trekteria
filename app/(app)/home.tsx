import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';

export default function Home() {
     const router = useRouter();

     const navigateToSettings = () => {
          router.push('/(app)/settings');
     };

     const navigateToResult = () => {
          router.push('/(app)/result');
     };

     const navigateToPreferences = () => {
          router.push('/(app)/preferences');
     };

     return (
          <View style={styles.container}>
               <Text style={styles.title}>Home Page</Text>

               <TouchableOpacity style={styles.button} onPress={navigateToSettings}>
                    <Text style={styles.buttonText}>Go to Settings</Text>
               </TouchableOpacity>

               <TouchableOpacity style={styles.button} onPress={navigateToResult}>
                    <Text style={styles.buttonText}>Go to Result</Text>
               </TouchableOpacity>

               <TouchableOpacity style={styles.button} onPress={navigateToPreferences}>
                    <Text style={styles.buttonText}>Go to Preferences</Text>
               </TouchableOpacity>
          </View>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: 'white',
          padding: 20,
          justifyContent: 'center',
          alignItems: 'center',
     },
     title: {
          ...Typography.text.h2,
          marginBottom: 30,
     },
     button: {
          backgroundColor: Colors.primary,
          padding: 20,
          borderRadius: 100,
          alignItems: 'center',
          width: '100%',
          marginBottom: 15,
     },
     buttonText: {
          ...Typography.text.button,
          color: 'white',
     },
}); 