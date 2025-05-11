import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Animated, KeyboardAvoidingView, Platform } from "react-native";
import { Typography } from "../../../constants/Typography";
import { Colors } from "../../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { generateChatResponse } from "../../../services/geminiService";

// Message type for the chat
type Message = {
     id: string;
     text: string;
     sender: "user" | "bot";
};

// Loading bubble animation component
const TypingIndicator = () => {
     // Create animated values for each dot
     const [dot1] = useState(new Animated.Value(0));
     const [dot2] = useState(new Animated.Value(0));
     const [dot3] = useState(new Animated.Value(0));

     // Animation function for a single dot
     const animateDot = (dot: Animated.Value, delay: number) => {
          Animated.sequence([
               // Move up
               Animated.timing(dot, {
                    toValue: 1,
                    duration: 300,
                    delay,
                    useNativeDriver: true,
               }),
               // Move down
               Animated.timing(dot, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
               }),
          ]).start();
     };

     // Start and loop the animation
     useEffect(() => {
          const animate = () => {
               animateDot(dot1, 0);
               animateDot(dot2, 150);
               animateDot(dot3, 300);

               // Restart animation after all dots complete
               setTimeout(animate, 1200);
          };

          animate();

          return () => {
               // Cleanup animations on unmount
               dot1.stopAnimation();
               dot2.stopAnimation();
               dot3.stopAnimation();
          };
     }, []);

     // Interpolate values for the dots' translateY
     const dot1TranslateY = dot1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
     });

     const dot2TranslateY = dot2.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
     });

     const dot3TranslateY = dot3.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
     });

     return (
          <View style={[styles.messageBubble, styles.botMessage, styles.loadingBubble]}>
               <View style={styles.dotsContainer}>
                    <Animated.View
                         style={[
                              styles.dot,
                              { transform: [{ translateY: dot1TranslateY }] }
                         ]}
                    />
                    <Animated.View
                         style={[
                              styles.dot,
                              { transform: [{ translateY: dot2TranslateY }] }
                         ]}
                    />
                    <Animated.View
                         style={[
                              styles.dot,
                              { transform: [{ translateY: dot3TranslateY }] }
                         ]}
                    />
               </View>
          </View>
     );
};

export default function ChatTab() {
     const [messages, setMessages] = useState<Message[]>([
          {
               id: "1",
               text: "👋 Hi there! I'm your TrailMate AI assistant. I can help with trail recommendations, gear advice, safety tips, and anything else about your hiking adventure. What would you like to know?",
               sender: "bot",
          },
     ]);
     const [inputText, setInputText] = useState("");
     const [isLoading, setIsLoading] = useState(false);
     const flatListRef = useRef<FlatList>(null);

     // Scroll to bottom when messages change or when loading state changes
     useEffect(() => {
          if (flatListRef.current) {
               setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
               }, 100);
          }
     }, [messages, isLoading]);

     const handleSend = async () => {
          if (inputText.trim() === "" || isLoading) return;

          const userMessage: Message = {
               id: Date.now().toString(),
               text: inputText.trim(),
               sender: "user",
          };

          setMessages(prevMessages => [...prevMessages, userMessage]);
          setInputText("");

          // Set loading state and scroll to bottom to show the typing indicator
          setIsLoading(true);

          // Small delay to ensure the FlatList updates before scrolling
          setTimeout(() => {
               flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);

          try {
               // Get only the relevant conversation history
               // Skip the welcome message if it's the first one
               const conversationHistory = messages.length > 1 || messages[0].sender === "user"
                    ? messages.map(msg => ({
                         role: msg.sender === "user" ? "user" : "model" as "user" | "model",
                         text: msg.text,
                    }))
                    : [];

               // Add the current user message to history
               conversationHistory.push({
                    role: "user" as "user" | "model",
                    text: userMessage.text,
               });

               // Get response from Gemini
               const response = await generateChatResponse(userMessage.text, conversationHistory);

               const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: response,
                    sender: "bot",
               };

               setMessages(prevMessages => [...prevMessages, botMessage]);
          } catch (error) {
               console.error("Error getting chat response:", error);
               const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: "Sorry, I'm having trouble connecting right now. Please try again later.",
                    sender: "bot",
               };
               setMessages(prevMessages => [...prevMessages, errorMessage]);
          } finally {
               setIsLoading(false);
          }
     };

     const renderMessage = ({ item }: { item: Message }) => {
          const isUserMessage = item.sender === "user";
          const messageStyle = isUserMessage ? styles.userMessage : styles.botMessage;
          const textStyle = [
               styles.messageText,
               isUserMessage ? styles.userMessageText : styles.botMessageText
          ];

          return (
               <View style={[styles.messageBubble, messageStyle]}>
                    <Text style={textStyle}>
                         {item.text}
                    </Text>
               </View>
          );
     };

     return (
          <KeyboardAvoidingView
               style={styles.container}
               behavior={Platform.OS === "ios" ? "padding" : undefined}
               keyboardVerticalOffset={100}
          >
               <Text style={styles.title}>AI Chat Assistant</Text>
               <View style={styles.chatContainer}>
                    <FlatList
                         ref={flatListRef}
                         data={messages}
                         renderItem={renderMessage}
                         keyExtractor={item => item.id}
                         contentContainerStyle={styles.messagesContainer}
                         ListFooterComponent={isLoading ? <TypingIndicator /> : null}
                    />

                    <View style={styles.chatInputContainer}>
                         <TextInput
                              style={styles.chatInput}
                              placeholder="Ask me anything..."
                              value={inputText}
                              onChangeText={setInputText}
                              onSubmitEditing={handleSend}
                              returnKeyType="send"
                              multiline
                         />
                         <TouchableOpacity
                              style={styles.sendButton}
                              onPress={handleSend}
                              disabled={isLoading || inputText.trim() === ""}
                         >
                              <Ionicons
                                   name="send"
                                   style={styles.sendIcon}
                                   size={20}
                                   color={inputText.trim() === "" ? Colors.inactive : Colors.primary}
                              />
                         </TouchableOpacity>
                    </View>
               </View>
          </KeyboardAvoidingView>
     );
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

     messagesContainer: {
          paddingBottom: 60,
     },

     messageBubble: {
          maxWidth: '80%',
          padding: 12,
          borderRadius: 20,
          marginVertical: 5,
     },

     userMessage: {
          backgroundColor: Colors.primary,
          alignSelf: 'flex-end',
          borderBottomRightRadius: 5,
     },

     botMessage: {
          backgroundColor: '#f0f0f0',
          alignSelf: 'flex-start',
          borderBottomLeftRadius: 5,
     },

     messageText: {
          ...Typography.text.body,
          fontSize: 15,
          lineHeight: 25,
     },

     userMessageText: {
          color: 'white',
          lineHeight: 25,
     },

     botMessageText: {
          color: '#333333',
          lineHeight: 25,
     },

     loadingContainer: {
          position: 'absolute',
          bottom: 70,
          left: 0,
          right: 0,
          alignItems: 'center',
     },

     loadingBubble: {
          padding: 14,
          width: 70,
          marginVertical: 10,
          alignSelf: 'flex-start',
     },

     dotsContainer: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          height: 12,
     },

     dot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: '#666',
          marginHorizontal: 3,
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
          backgroundColor: 'white',
     },

     chatInput: {
          flex: 1,
          padding: 10,
          borderRadius: 100,
          backgroundColor: 'transparent',
          paddingLeft: 15,
          maxHeight: 100,
          ...Typography.text.body,
     },

     sendButton: {
          padding: 5,
     },

     sendIcon: {
          padding: 10,
          borderRadius: 50,
     },
});