import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '../../constants/Typography';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function Result() {
     const router = useRouter();

     const handleClose = () => {
          router.back();
     };

     return (
          <SafeAreaView style={styles.safeArea}>
               <View style={styles.container}>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                         <Ionicons name="close" size={35} color={Colors.black} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Result Page</Text>
               </View>
          </SafeAreaView>
     );
}

const styles = StyleSheet.create({
     safeArea: {
          flex: 1,
          backgroundColor: 'white',
     },
     container: {
          flex: 1,
          backgroundColor: 'white',
          padding: 20,
          justifyContent: 'center',
          alignItems: 'center',
     },
     closeButton: {
          position: 'absolute',
          top: 10,
          left: 10,
          padding: 10,
     },
     title: {
          ...Typography.text.h2,
     },
}); 