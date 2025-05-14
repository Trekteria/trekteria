import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Animated, KeyboardAvoidingView, Platform } from "react-native";
import { Typography } from "../../../constants/Typography";
import { Colors } from "../../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { generateChatResponse } from "../../../services/geminiService";
import { saveChatMessage, getChatMessages, ChatMessage as FirestoreChatMessage } from "../../../services/chatService";
import { useColorScheme } from "../../../hooks/useColorScheme";
import { getCachedChatMessages, cacheChatMessage, getPendingChatMessages, markChatMessageAsSynced } from '../../../services/cacheService';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

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
     const { colorScheme } = useColorScheme();
     const isDarkMode = colorScheme === 'dark';
     const theme = isDarkMode ? Colors.dark : Colors.light;

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
          <View style={[styles.messageBubble, styles.botMessage, styles.loadingBubble, { backgroundColor: isDarkMode ? '#444' : '#f0f0f0' }]}>
               <View style={styles.dotsContainer}>
                    <Animated.View
                         style={[
                              styles.dot,
                              {
                                   transform: [{ translateY: dot1TranslateY }],
                                   backgroundColor: isDarkMode ? '#999' : '#666'
                              }
                         ]}
                    />
                    <Animated.View
                         style={[
                              styles.dot,
                              {
                                   transform: [{ translateY: dot2TranslateY }],
                                   backgroundColor: isDarkMode ? '#999' : '#666'
                              }
                         ]}
                    />
                    <Animated.View
                         style={[
                              styles.dot,
                              {
                                   transform: [{ translateY: dot3TranslateY }],
                                   backgroundColor: isDarkMode ? '#999' : '#666'
                              }
                         ]}
                    />
               </View>
          </View>
     );
};

interface ChatTabProps {
     tripId: string;
}

export default function ChatTab({ tripId }: ChatTabProps) {
     const [messages, setMessages] = useState<Message[]>([]);
     const [inputText, setInputText] = useState("");
     const [isLoading, setIsLoading] = useState(false);
     const [isInitialLoading, setIsInitialLoading] = useState(true);
     const flatListRef = useRef<FlatList>(null);
     const { colorScheme } = useColorScheme();
     const isDarkMode = colorScheme === 'dark';
     const theme = isDarkMode ? Colors.dark : Colors.light;

     // Load existing messages when component mounts
     useEffect(() => {
          const loadMessages = async () => {
               try {
                    // 1. Load from SQLite cache first
                    const cachedMessages = await getCachedChatMessages(tripId);
                    let localMessages: Message[] = [];
                    if (cachedMessages.length > 0) {
                         console.log('Chat messages loaded from CACHE for ChatTab:', tripId);
                         localMessages = cachedMessages.map(msg => ({
                              id: msg.message_id,
                              text: msg.text,
                              sender: msg.sender,
                         }));
                         setMessages(localMessages);
                    }

                    // 2. Fetch from Firestore and merge new messages
                    const firestoreMessages = await getChatMessages(tripId);
                    const newMessages: Message[] = [];
                    for (const msg of firestoreMessages) {
                         if (!cachedMessages.find(c => c.message_id === msg.id)) {
                              await cacheChatMessage(tripId, {
                                   message_id: msg.id,
                                   sender: msg.sender,
                                   text: msg.text,
                                   timestamp: msg.timestamp?.toMillis?.() || Date.now(),
                                   pending: false
                              });
                              newMessages.push({
                                   id: msg.id,
                                   text: msg.text,
                                   sender: msg.sender,
                              });
                         }
                    }
                    if (newMessages.length > 0) {
                         console.log('Chat messages loaded from FIRESTORE for ChatTab:', tripId);
                         setMessages([...localMessages, ...newMessages]);
                    } else if (localMessages.length === 0 && firestoreMessages.length === 0) {
                         // If no messages exist, add the welcome message
                         const welcomeMessage: Message = {
                              id: "welcome",
                              text: "👋 Hi there! I'm your TrailMate AI assistant. I can help with trail recommendations, gear advice, safety tips, and anything else about your hiking adventure. What would you like to know?",
                              sender: "bot",
                         };
                         await cacheChatMessage(tripId, {
                              message_id: welcomeMessage.id,
                              sender: welcomeMessage.sender,
                              text: welcomeMessage.text,
                              timestamp: Date.now(),
                              pending: false
                         });
                         setMessages([welcomeMessage]);
                    }
               } catch (error) {
                    console.error("Error loading messages:", error);
                    setMessages([{
                         id: "welcome",
                         text: "👋 Hi there! I'm your TrailMate AI assistant. I can help with trail recommendations, gear advice, safety tips, and anything else about your hiking adventure. What would you like to know?",
                         sender: "bot",
                    }]);
               } finally {
                    setIsInitialLoading(false);
               }
          };

          loadMessages();
     }, [tripId]);

     // Sync pending messages when online
     useEffect(() => {
          const unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
               if (state.isConnected) {
                    const pending = await getPendingChatMessages();
                    for (const msg of pending) {
                         try {
                              await saveChatMessage(msg.trip_id, {
                                   text: msg.text,
                                   sender: msg.sender,
                              });
                              await markChatMessageAsSynced(msg.message_id);
                         } catch (e) {
                              // If sync fails, keep as pending
                              console.error('Failed to sync pending chat message', msg, e);
                         }
                    }
               }
          });
          return () => unsubscribe();
     }, []);

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

          setMessages(prev => [...prev, userMessage]);
          setInputText("");

          // Save to SQLite cache immediately (pending if offline)
          const netState = await NetInfo.fetch();
          const isOnline = netState.isConnected;
          await cacheChatMessage(tripId, {
               message_id: userMessage.id,
               sender: userMessage.sender,
               text: userMessage.text,
               timestamp: Date.now(),
               pending: !isOnline
          });

          if (isOnline) {
               // Save user message to Firestore
               try {
                    await saveChatMessage(tripId, {
                         text: userMessage.text,
                         sender: userMessage.sender,
                    });
                    await markChatMessageAsSynced(userMessage.id);
               } catch (error) {
                    console.error("Error saving user message:", error);
               }
          }

          // Set loading state and scroll to bottom to show the typing indicator
          setIsLoading(true);

          // Small delay to ensure the FlatList updates before scrolling
          setTimeout(() => {
               flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);

          try {
               // Get only the relevant conversation history
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

               // Save bot message to Firestore
               try {
                    await saveChatMessage(tripId, {
                         text: botMessage.text,
                         sender: botMessage.sender,
                    });
               } catch (error) {
                    console.error("Error saving bot message:", error);
               }

               setMessages(prevMessages => [...prevMessages, botMessage]);
          } catch (error) {
               console.error("Error getting chat response:", error);
               const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: "Sorry, I'm having trouble connecting right now. Please try again later.",
                    sender: "bot",
               };

               // Save error message to Firestore
               try {
                    await saveChatMessage(tripId, {
                         text: errorMessage.text,
                         sender: errorMessage.sender,
                    });
               } catch (saveError) {
                    console.error("Error saving error message:", saveError);
               }

               setMessages(prevMessages => [...prevMessages, errorMessage]);
          } finally {
               setIsLoading(false);
          }
     };

     const renderMessage = ({ item }: { item: Message }) => {
          const isUserMessage = item.sender === "user";
          const messageStyle = [
               styles.messageBubble,
               isUserMessage ?
                    [styles.userMessage, { backgroundColor: theme.primary }] :
                    [styles.botMessage, { backgroundColor: isDarkMode ? '#444' : '#f0f0f0', borderBottomLeftRadius: 5 }]
          ];
          const textStyle = [
               styles.messageText,
               isUserMessage ?
                    [styles.userMessageText, { color: 'white' }] :
                    [styles.botMessageText, { color: theme.text }]
          ];

          return (
               <View style={messageStyle}>
                    <Text style={textStyle}>
                         {item.text}
                    </Text>
               </View>
          );
     };

     // Add loading indicator for initial load
     if (isInitialLoading) {
          return (
               <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background }]}>
                    <TypingIndicator />
               </View>
          );
     }

     return (
          <KeyboardAvoidingView
               style={[styles.container, { backgroundColor: theme.background }]}
               behavior={Platform.OS === "ios" ? "padding" : undefined}
               keyboardVerticalOffset={100}
          >
               <Text style={[styles.title, { color: theme.text }]}>AI Chat Assistant</Text>
               <View style={[styles.chatContainer, { backgroundColor: isDarkMode ? theme.card : 'white' }]}>
                    <FlatList
                         ref={flatListRef}
                         data={messages}
                         showsVerticalScrollIndicator={false}
                         renderItem={renderMessage}
                         keyExtractor={item => item.id}
                         contentContainerStyle={styles.messagesContainer}
                         ListFooterComponent={isLoading ? <TypingIndicator /> : null}
                    />

                    <View style={[
                         styles.chatInputContainer,
                         {
                              borderColor: theme.borderColor,
                              backgroundColor: isDarkMode ? Colors.dark.background : 'white'
                         }
                    ]}>
                         <TextInput
                              style={[styles.chatInput, { color: theme.text }]}
                              placeholder="Ask me anything..."
                              placeholderTextColor={theme.inactive}
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
                                   color={inputText.trim() === "" ? theme.inactive : theme.primary}
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
          alignSelf: 'flex-end',
          borderBottomRightRadius: 5,
     },

     botMessage: {
          alignSelf: 'flex-start',
     },

     messageText: {
          ...Typography.text.body,
          fontSize: 15,
          lineHeight: 25,
     },

     userMessageText: {
          lineHeight: 25,
     },

     botMessageText: {
          lineHeight: 25,
     },

     loadingContainer: {
          justifyContent: 'center',
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
          borderRadius: 50,
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