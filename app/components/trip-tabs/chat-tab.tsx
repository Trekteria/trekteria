import { View, Text, StyleSheet, TextInput } from "react-native";
import { Typography } from "../../../constants/Typography";
import { Colors } from "../../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function ChatTab() {
     return (
          <View style={styles.container}>
               <Text style={styles.title}>AI Chat Assistant</Text>
               <View style={styles.chatContainer}>
                    <View style={styles.chatInputContainer}>
                         <TextInput
                              style={styles.chatInput}
                              placeholder="Ask me anything..."
                         />
                         <Ionicons name="send" style={styles.sendIcon} size={20} color={Colors.primary} />
                    </View>
               </View>
          </View>
     )
}


const styles = StyleSheet.create({
     container: {
          flex: 1,
          paddingHorizontal: 10,
          paddingBottom: 10,
     },

     title: {
          ...Typography.text.h3,
          textAlign: "center",
          fontSize: 16,
     },

     chatContainer: {
          flex: 1,
          padding: 15,
          backgroundColor: 'white',
          borderRadius: 30,
          marginTop: 15,
          boxShadow: "0px 0px 20px 0px rgba(0, 0, 0, 0.1)",
     },

     chatInputContainer: {
          position: "absolute",
          bottom: 10,
          left: 10,
          right: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: '#e0e0e0',
          borderRadius: 50,
     },

     chatInput: {
          flex: 1,
          padding: 10,
          borderRadius: 20,
          backgroundColor: 'white',
          paddingLeft: 15,
          ...Typography.text.body,
     },

     sendIcon: {
          padding: 10,
          borderRadius: 50,
     },

});