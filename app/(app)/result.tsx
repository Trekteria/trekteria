import { StyleSheet, View, Text } from 'react-native';
import { Typography } from '../../constants/Typography';

export default function Result() {
     return (
          <View style={styles.container}>
               <Text style={styles.title}>Result Page</Text>
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
     },
}); 