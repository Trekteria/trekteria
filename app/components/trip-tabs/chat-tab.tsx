import React, { useState, useEffect, useRef } from "react";
import {
     View,
     Text,
     TextInput,
     TouchableOpacity,
     StyleSheet,
     ScrollView,
     KeyboardAvoidingView,
     Platform,
     ActivityIndicator,
     Alert,
     Animated,
     Easing,
} from "react-native";
import { Typography } from "../../../constants/Typography";
import { Colors } from "../../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "../../../hooks/useColorScheme";
import { supabase } from "../../../services/supabaseConfig";
import { generateChatResponse } from "../../../services/geminiService";
import { v4 as uuidv4 } from 'uuid';
import { trackScreen, trackEvent } from "../../../services/analyticsService";

// Message type definition
interface Message {
     id: string;
     text: string;
     sender: "user" | "bot";
     timestamp: string;
}

// Props type definition
interface ChatTabProps {
     tripId: string;
}

// TypingBubble component
const TypingBubble = () => {
     const [dots] = useState([
          new Animated.Value(0),
          new Animated.Value(0),
          new Animated.Value(0),
     ]);

     useEffect(() => {
          const animations = dots.map((dot, index) =>
               Animated.sequence([
                    Animated.delay(index * 200),
                    Animated.loop(
                         Animated.sequence([
                              Animated.timing(dot, {
                                   toValue: 1,
                                   duration: 600,
                                   easing: Easing.inOut(Easing.ease),
                                   useNativeDriver: true,
                              }),
                              Animated.timing(dot, {
                                   toValue: 0,
                                   duration: 600,
                                   easing: Easing.inOut(Easing.ease),
                                   useNativeDriver: true,
                              }),
                         ])
                    ),
               ])
          );

          Animated.parallel(animations).start();

          return () => {
               animations.forEach(anim => anim.stop());
          };
     }, []);

     return (
          <View style={styles.typingContainer}>
               {dots.map((dot, index) => (
                    <Animated.View
                         key={index}
                         style={[
                              styles.typingDot,
                              {
                                   transform: [
                                        {
                                             translateY: dot.interpolate({
                                                  inputRange: [0, 1],
                                                  outputRange: [0, -12],
                                             }),
                                        },
                                   ],
                              },
                         ]}
                    />
               ))}
          </View>
     );
};

export default function ChatTab({ tripId }: ChatTabProps) {
     const [messages, setMessages] = useState<Message[]>([]);
     const [newMessage, setNewMessage] = useState("");
     const [loading, setLoading] = useState(true);
     const [sending, setSending] = useState(false);
     const [isGenerating, setIsGenerating] = useState(false);
     const [tripDetails, setTripDetails] = useState<any>(null);
     const scrollViewRef = useRef<ScrollView>(null);
     const { effectiveColorScheme } = useColorScheme();
     const isDarkMode = effectiveColorScheme === 'dark';
     const theme = isDarkMode ? Colors.dark : Colors.light;

     // Track tab view
     useEffect(() => {
          trackScreen('trip_chat_tab');
          trackEvent('trip_chat_tab_viewed', {
               trip_id: tripId,
               category: 'trip_interaction'
          });
     }, [tripId]);

     // Load trip details and chat messages
     useEffect(() => {
          const loadData = async () => {
               try {
                    // Get current user
                    const { data: { user }, error: userError } = await supabase.auth.getUser();
                    if (userError) throw userError;

                    if (!user) {
                         throw new Error("User not authenticated");
                    }

                    // Fetch trip data including chat history
                    const { data: trip, error: tripError } = await supabase
                         .from('trips')
                         .select('*')
                         .eq('trip_id', tripId)
                         .single();

                    if (tripError) throw tripError;

                    if (trip) {
                         setTripDetails({
                              name: trip.name,
                              location: trip.location,
                              dateRange: trip.dateRange,
                              description: trip.description,
                              difficultyLevel: trip.difficultyLevel,
                              warnings: trip.warnings
                         });
                         if (trip.chatHistory) {
                              setMessages(trip.chatHistory);
                         }
                    }
               } catch (error) {
                    console.error("Error loading messages:", error);
                    Alert.alert("Error", "Failed to load chat messages");
               } finally {
                    setLoading(false);
               }
          };

          loadData();
     }, [tripId]);

     // Save a new message
     const saveMessage = async (message: Message) => {
          try {
               // Get current user
               const { data: { user }, error: userError } = await supabase.auth.getUser();
               if (userError) throw userError;

               if (!user) {
                    throw new Error("User not authenticated");
               }

               // First fetch current chat history
               const { data: currentTrip, error: fetchError } = await supabase
                    .from('trips')
                    .select('chatHistory')
                    .eq('trip_id', tripId)
                    .single();

               if (fetchError) throw fetchError;

               const updatedChatHistory = [...(currentTrip?.chatHistory || []), message];

               // Update trip's chat history
               const { error: updateError } = await supabase
                    .from('trips')
                    .update({
                         chatHistory: updatedChatHistory
                    })
                    .eq('trip_id', tripId);

               if (updateError) throw updateError;

               // Update local state
               setMessages(updatedChatHistory);
          } catch (error) {
               console.error("Error saving message:", error);
               throw error;
          }
     };

     // Handle sending a new message
     const handleSend = async () => {
          if (!newMessage.trim()) return;

          setSending(true);
          try {
               const userMessage: Message = {
                    id: uuidv4(),
                    text: newMessage.trim(),
                    sender: "user",
                    timestamp: new Date().toISOString()
               };

               // Track message sent
               trackEvent('trip_chat_message_sent', {
                    trip_id: tripId,
                    message_length: userMessage.text.length,
                    category: 'trip_interaction'
               });

               // Save user message
               await saveMessage(userMessage);

               // Clear input and show typing indicator
               setNewMessage("");
               setIsGenerating(true);

               // Auto-scroll to bottom
               scrollViewRef.current?.scrollToEnd({ animated: true });

               // Convert messages to the format expected by generateChatResponse
               const chatHistory = messages.map(msg => ({
                    role: msg.sender === "user" ? "user" as const : "model" as const,
                    text: msg.text
               }));

               // Generate AI response
               const aiResponse = await generateChatResponse(
                    userMessage.text,
                    chatHistory,
                    tripDetails
               );

               // Create and save bot message
               const botMessage: Message = {
                    id: uuidv4(),
                    text: aiResponse,
                    sender: "bot",
                    timestamp: new Date().toISOString()
               };

               await saveMessage(botMessage);

               // Track AI response received
               trackEvent('trip_chat_ai_response_received', {
                    trip_id: tripId,
                    response_length: aiResponse.length,
                    category: 'ai_interaction'
               });

               // Auto-scroll to bottom again after bot response
               scrollViewRef.current?.scrollToEnd({ animated: true });
          } catch (error) {
               console.error("Error sending message:", error);
               trackEvent('trip_chat_error', {
                    trip_id: tripId,
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    category: 'ai_interaction'
               });
               Alert.alert("Error", "Failed to send message");
          } finally {
               setSending(false);
               setIsGenerating(false);
          }
     };

     if (loading) {
          return (
               <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.text }]}>Loading chat...</Text>
               </View>
          );
     }

     return (
          <KeyboardAvoidingView
               behavior={Platform.OS === "ios" ? "padding" : "height"}
               style={[styles.container, { backgroundColor: theme.background }]}
               keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
               <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
               >
                    {messages.map((message) => (
                         <View
                              key={message.id}
                              style={[
                                   styles.messageWrapper,
                                   message.sender === "user"
                                        ? styles.userMessageWrapper
                                        : styles.botMessageWrapper,
                              ]}
                         >
                              <View
                                   style={[
                                        styles.message,
                                        message.sender === "user"
                                             ? [styles.userMessage, { backgroundColor: theme.primary }]
                                             : [styles.botMessage, { backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5' }],
                                   ]}
                              >
                                   <Text
                                        style={[
                                             styles.messageText,
                                             { color: message.sender === "user" ? "white" : theme.text },
                                        ]}
                                   >
                                        {message.text}
                                   </Text>
                              </View>
                         </View>
                    ))}
                    {isGenerating && (
                         <View style={[styles.messageWrapper, styles.botMessageWrapper]}>
                              <View
                                   style={[
                                        styles.message,
                                        styles.botMessage,
                                        { backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5' },
                                   ]}
                              >
                                   <TypingBubble />
                              </View>
                         </View>
                    )}
               </ScrollView>

               <View style={[styles.inputContainer, { backgroundColor: theme.background }]}>
                    <TextInput
                         style={[
                              styles.input,
                              {
                                   backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5',
                                   color: theme.text,
                              },
                         ]}
                         value={newMessage}
                         onChangeText={setNewMessage}
                         placeholder="Type a message..."
                         placeholderTextColor={theme.icon}
                         multiline
                    />
                    <TouchableOpacity
                         style={[
                              styles.sendButton,
                              { backgroundColor: theme.primary },
                              sending && styles.sendingButton,
                         ]}
                         onPress={handleSend}
                         disabled={sending || !newMessage.trim()}
                    >
                         {sending ? (
                              <ActivityIndicator size="small" color="white" />
                         ) : (
                              <Ionicons name="send" size={24} color="white" />
                         )}
                    </TouchableOpacity>
               </View>
          </KeyboardAvoidingView>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
     },
     loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
     },
     loadingText: {
          ...Typography.text.body,
          marginTop: 10,
     },
     messagesContainer: {
          flex: 1,
          padding: 10,
     },
     messagesContent: {
          flexGrow: 1,
          paddingBottom: 10,
     },
     messageWrapper: {
          marginVertical: 5,
          maxWidth: "80%",
     },
     userMessageWrapper: {
          alignSelf: "flex-end",
     },
     botMessageWrapper: {
          alignSelf: "flex-start",
     },
     message: {
          padding: 10,
          borderRadius: 20,
     },
     userMessage: {
          borderBottomRightRadius: 2,
     },
     botMessage: {
          borderBottomLeftRadius: 2,
     },
     messageText: {
          ...Typography.text.body,
          fontSize: 16,
     },
     inputContainer: {
          flexDirection: "row",
          padding: 10,
          alignItems: "flex-end",
     },
     input: {
          flex: 1,
          borderRadius: 20,
          paddingHorizontal: 15,
          paddingTop: 10,
          paddingBottom: 10,
          marginRight: 10,
          maxHeight: 100,
          ...Typography.text.body,
     },
     sendButton: {
          width: 45,
          height: 45,
          borderRadius: 22.5,
          justifyContent: "center",
          alignItems: "center",
     },
     sendingButton: {
          opacity: 0.7,
     },
     typingContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 6,
     },
     typingDot: {
          width: 10,
          height: 10,
          borderRadius: 100,
          backgroundColor: '#8E8E93',
          marginHorizontal: 4,
     },
});