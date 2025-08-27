import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Alert,
  BackHandler,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState, useEffect, useRef } from "react";
import { Plan as PlanType, Trip as TripType } from "../../types/Types";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "../../hooks/useColorScheme";
import { deleteCachedTrailData, deleteCachedChatMessages } from '../../services/cacheService';
import DarkModeBackground from "../../components/DarkModeBackground";
import { supabase } from '../../services/supabaseConfig';
import { useUserStore } from '../../store/userStore';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useOfflineData } from '../../hooks/useOfflineData';

// Define types for the data
interface Trip extends TripType {
  image: string;
}

// Extend Plan type to include the image we'll add
interface Plan extends PlanType {
  image: string;
}

// Placeholder image for plans and trips
const placeholderImage =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop";

// --- TripBox Component ---
interface TripBoxProps {
  item: Trip;
  tripDate: { startDate: string; endDate?: string };
  onPress: (item: Trip) => void;
  onDelete: (id: string) => void;
  theme: any;
  isDeleting?: boolean;
  isExpired?: boolean;
}

const TripBox: React.FC<TripBoxProps> = ({
  item,
  tripDate,
  onPress,
  onDelete,
  theme,
  isDeleting = false,
  isExpired = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDeleting) {
      Animated.sequence([
        // Initial bounce effect
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 15,
          useNativeDriver: true,
        }),
        // Main delete animation with bounce and rotation
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 0,
            tension: 50,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -50,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [isDeleting]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg'],
  });

  let dateText = "No date";
  if (tripDate?.startDate) {
    dateText = formatDateRange(tripDate.startDate, tripDate.endDate);
  }

  return (
    <Animated.View
      style={[
        styles.animatedBox,
        {
          transform: [
            { scale: scaleAnim },
            { rotate: rotateInterpolate },
            { translateY: translateYAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.deleteButton]}
        onPress={() => item.id && onDelete(item.id)}
      >
        <Ionicons name="heart" size={30} color={Colors.white} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.planBox, { opacity: isExpired ? 0.5 : 1 }]}
        onPress={() => onPress(item)}
      >
        <Image source={{ uri: item.image }} style={styles.planImage} />
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0)", "rgba(0,0,0,0.7)", "rgba(0,0,0,1)"]}
          style={styles.planOverlay}
          locations={[0, 0.3, 0.5, 0.8, 1]}
        />
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{item.name}</Text>
          <View style={styles.planMetaRow}>
            <Text style={styles.planDetails}>{item.location}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{dateText}</Text>
          </View>
        </View>

        {/* Archived Overlay */}
        {isExpired && (
          <View style={styles.archivedOverlay}>
            <View style={styles.archivedBadge}>
              <Ionicons name="time-outline" size={24} color="#333" />
              <Text style={styles.archivedText}>Expired</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- PlanBox Component ---
interface PlanBoxProps {
  item: Plan;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  theme: any;
  isDeleting?: boolean;
  isExpired?: boolean;
}

const PlanBox: React.FC<PlanBoxProps> = ({
  item,
  onPress,
  onDelete,
  theme,
  isDeleting = false,
  isExpired = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isDeleting) {
      Animated.sequence([
        // Initial bounce effect
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 15,
          useNativeDriver: true,
        }),
        // Main delete animation with bounce and rotation
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 0,
            tension: 50,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -50,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [isDeleting]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-10deg'],
  });

  const location = item.preferences?.location || "No location";
  let dateText = "No date";
  if (item.preferences?.dateRange?.startDate) {
    dateText = formatDateRange(
      item.preferences.dateRange.startDate,
      item.preferences.dateRange.endDate
    );
  }

  return (
    <Animated.View
      style={[
        styles.animatedBox,
        {
          transform: [
            { scale: scaleAnim },
            { rotate: rotateInterpolate },
            { translateY: translateYAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.moreButton]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowDropdown(!showDropdown);
        }}
      >
        <Ionicons name="ellipsis-vertical" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {showDropdown && (
        <View style={[styles.dropdown]}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowDropdown(false);
              item.id && onDelete(item.id);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#FF4444" />
            <Text style={[styles.dropdownText, { color: '#FF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={[styles.planBox, { opacity: isExpired ? 0.5 : 1 }]}
        onPress={() => {
          if (showDropdown) {
            setShowDropdown(false);
          } else {
            onPress(item.id || "");
          }
        }}
      >
        <Image source={{ uri: item.image }} style={styles.planImage} />
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0)", "rgba(0,0,0,0.7)", "rgba(0,0,0,1)"]}
          style={styles.planOverlay}
          locations={[0, 0.3, 0.5, 0.8, 1]}
        />
        <View style={styles.planInfo}>
          <View style={styles.planMetaRow}>
            <Text style={styles.planLocation}>{item.preferences?.location?.toLocation || "No location"}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{dateText}</Text>
          </View>
        </View>

        {/* Archived Overlay */}
        {isExpired && (
          <View style={styles.archivedOverlay}>
            <View style={styles.archivedBadge}>
              <Ionicons name="time-outline" size={24} color="#333" />
              <Text style={styles.archivedText}>Expired</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- BottomTab Component ---
interface BottomTabProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onPress: () => void;
  theme: any;
  isDarkMode: boolean;
}

const BottomTab = ({ label, icon, isActive, onPress, theme, isDarkMode }: BottomTabProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0.6)).current;
  const labelOpacityAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const labelScaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.8)).current;

  // Animate when active state changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1 : 0.6,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(labelOpacityAnim, {
        toValue: isActive ? 1 : 0,
        duration: isActive ? 400 : 200,
        useNativeDriver: true,
      }),
      Animated.timing(labelScaleAnim, {
        toValue: isActive ? 1 : 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const handlePress = () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  // Dynamic background color for active tab
  const activeBgColor = isDarkMode ? '#3A3A3A' : '#ECECEC';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={[
        styles.bottomTabButton,
        isActive && { backgroundColor: activeBgColor },
      ]}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Animated.View style={styles.iconContainer}>
          {icon}
        </Animated.View>
        {isActive && (
          <Animated.View
            style={[
              styles.labelContainer,
              {
                opacity: labelOpacityAnim,
                transform: [{ scale: labelScaleAnim }],
              },
            ]}
          >
            <Text style={[styles.bottomTabText, { color: theme.text }]}>
              {label}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// --- Home Screen Component ---
export default function Home() {
  const router = useRouter();
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Zustand store
  const { firstName, ecoPoints, fetchUserData, userId } = useUserStore();
  const { getPlans, getTrips, getBookmarkedTrips, updateTripBookmark, isInitialized, pullData } = useOfflineData();

  // Network status
  const { isOnline } = useNetworkStatus();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripDates, setTripDates] = useState<{ [tripId: string]: { startDate: string; endDate?: string } }>({});
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Load saved tab preference on component mount
  useEffect(() => {
    const loadSavedTab = async () => {
      try {
        const savedTab = await AsyncStorage.getItem('activeTab');
        if (savedTab) {
          setActiveTab(savedTab);
        }
      } catch (error) {
        console.error('Error loading saved tab:', error);
      }
    };

    loadSavedTab();
  }, []);

  // Save tab preference whenever it changes
  useEffect(() => {
    const saveTabPreference = async () => {
      if (activeTab) {
        try {
          await AsyncStorage.setItem('activeTab', activeTab);
        } catch (error) {
          console.error('Error saving tab preference:', error);
        }
      }
    };

    saveTabPreference();
  }, [activeTab]);



  const handleTripPress = (trip: Trip) => {
    router.push({
      pathname: "/(app)/trip",
      params: {
        trip: JSON.stringify({
          trip_id: trip.id,
          name: trip.name,
          location: trip.location,
          keyFeatures: trip.highlights?.join(", ") || "",
          facilities: trip.amenities?.join(", ") || "",
          latitude: trip.coordinates?.latitude,
          longitude: trip.coordinates?.longitude,
          bookmarked: trip.bookmarked || false,
        }),
      },
    });
  };

  // Replace fetchPlans with Supabase implementation
  const fetchPlans = useCallback(async () => {
    try {
      if (userId) {
        const plansList = await getPlans(userId);

        if (plansList) {
          // Transform the data to match the Plan interface
          const transformedPlans = plansList.map(plan => ({
            ...plan,
            image: plan.imageUrl || placeholderImage,
          })) as Plan[];

          // Sort plans: non-expired first (oldest first), then expired (oldest first)
          const sortedPlans = transformedPlans.sort((a, b) => {
            const aExpired = isExpired(a.preferences?.dateRange?.startDate, a.preferences?.dateRange?.endDate);
            const bExpired = isExpired(b.preferences?.dateRange?.startDate, b.preferences?.dateRange?.endDate);

            // If one is expired and the other isn't, non-expired comes first
            if (aExpired !== bExpired) {
              return aExpired ? 1 : -1;
            }

            // If both have same expiry status, sort by date (oldest first)
            const dateA = a.preferences?.dateRange?.startDate
              ? new Date(a.preferences.dateRange.startDate).getTime()
              : 0;
            const dateB = b.preferences?.dateRange?.startDate
              ? new Date(b.preferences.dateRange.startDate).getTime()
              : 0;
            return dateA - dateB;
          });

          setPlans(sortedPlans);
        }
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  }, [userId, getPlans]);

  const fetchTrips = useCallback(async () => {
    try {
      if (userId) {
        const tripsList = await getBookmarkedTrips(userId);

        if (tripsList) {
          const transformedTrips = tripsList.map(trip => ({
            id: trip.id,
            ...trip,
            image: trip.imageUrl || placeholderImage,
          })) as Trip[];

          // Fetch dates from plans
          const plansList = await getPlans(userId);

          // Create dates mapping
          const dates: { [tripId: string]: { startDate: string; endDate?: string } } = {};
          if (plansList) {
            plansList.forEach(plan => {
              if (plan.tripIds && plan.preferences?.dateRange?.startDate) {
                plan.tripIds.forEach((tripId: string) => {
                  dates[tripId] = {
                    startDate: plan.preferences?.dateRange?.startDate || "",
                    endDate: plan.preferences?.dateRange?.endDate || ""
                  };
                });
              }
            });
          }

          setTripDates(dates);

          // Sort trips: non-expired first (oldest first), then expired (oldest first)
          const sortedTrips = transformedTrips.sort((a, b) => {
            const tripDateA = dates[a.id || ""];
            const tripDateB = dates[b.id || ""];

            const aExpired = isExpired(tripDateA?.startDate, tripDateA?.endDate);
            const bExpired = isExpired(tripDateB?.startDate, tripDateB?.endDate);

            // If one is expired and the other isn't, non-expired comes first
            if (aExpired !== bExpired) {
              return aExpired ? 1 : -1;
            }

            // If both have same expiry status, sort by date (oldest first)
            const dateA = tripDateA?.startDate
              ? new Date(tripDateA.startDate).getTime()
              : 0;
            const dateB = tripDateB?.startDate
              ? new Date(tripDateB.startDate).getTime()
              : 0;
            return dateA - dateB;
          });

          setTrips(sortedTrips);

          // Set default tab based on whether there are favorite trips (only if no saved preference)
          // if (activeTab === undefined) {
          //   setActiveTab(sortedTrips.length === 0 ? 'plans' : 'favorites');
          // }
        }
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  }, [userId, getBookmarkedTrips, getPlans]);

  // Update the useFocusEffect to use Zustand store
  useFocusEffect(
    useCallback(() => {
      fetchUserData(); // From Zustand store
      if (isInitialized) {
        fetchTrips();
        fetchPlans();
      }
    }, [fetchUserData, fetchPlans, fetchTrips, isInitialized])
  );

  const goToSettings = () => router.push("/(app)/settings");
  const goToTripPlanning = () => {
    if (isOnline) {
      router.push("/(app)/preferences");
    } else {
      Alert.alert("No internet connection", "Please check your internet connection and try again.");
    }
  };
  const goToTrip = (id: string) =>
    router.push({
      pathname: "/(app)/result",
      params: { planId: id },
    });

  // Animated tab change function
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;

    // Start fade out and slide animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: newTab === 'favorites' ? -20 : 20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Change tab after fade out
      setActiveTab(newTab);

      // Reset slide position and fade in
      slideAnim.setValue(newTab === 'favorites' ? 20 : -20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Replace handleDeleteTrip with Supabase implementation
  const handleDeleteTrip = async (tripId: string) => {

    if (!isOnline) {
      Alert.alert("No internet connection", "Please check your internet connection and try again.");
      return;
    }

    Alert.alert(
      "Remove Trip",
      "Are you sure you want to remove this trip from your favorites?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            // Add haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Start delete animation
            setDeletingItems(prev => new Set(prev).add(tripId));

            // Wait for animation to complete
            setTimeout(async () => {
              try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;

                if (!user) {
                  console.error("User must be logged in to remove trip from favorites");
                  return;
                }

                // Update the trip's bookmarked status in Supabase
                const { error: updateError } = await supabase
                  .from('trips')
                  .update({ bookmarked: false })
                  .eq('trip_id', tripId);

                if (updateError) throw updateError;

                // Pull data from Supabase
                await pullData(userId);

                // Update local trips state
                setTrips((prevTrips) =>
                  prevTrips.filter((trip) => trip.id !== tripId)
                );

                // Remove from deleting items
                setDeletingItems(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(tripId);
                  return newSet;
                });
              } catch (error) {
                console.error("Error removing trip from favorites:", error);
                Alert.alert("Error", "Could not remove trip from favorites.");
                // Remove from deleting items on error
                setDeletingItems(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(tripId);
                  return newSet;
                });
              }
            }, 1000);
          },
        },
      ]
    );
  };

  // Replace handleDeletePlan with Supabase implementation
  const handleDeletePlan = async (planId: string) => {
    if (!isOnline) {
      Alert.alert("No internet connection", "Please check your internet connection and try again.");
      return;
    }

    Alert.alert(
      "Delete Plan",
      "Are you sure you want to delete this plan and its associated trips? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Add haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Start delete animation
            setDeletingItems(prev => new Set(prev).add(planId));

            // Wait for animation to complete
            setTimeout(async () => {
              try {
                // 1. Fetch the plan to get tripIds
                const { data: plan, error: planError } = await supabase
                  .from('plans')
                  .select('tripIds')
                  .eq('plan_id', planId)
                  .single();

                if (planError) throw planError;

                if (plan && plan.tripIds) {
                  // 2. Delete associated trips
                  const { error: tripsError } = await supabase
                    .from('trips')
                    .delete()
                    .in('trip_id', plan.tripIds);

                  if (tripsError) throw tripsError;

                  // Delete cache for each trip
                  for (const tripId of plan.tripIds) {
                    await deleteCachedTrailData(tripId);
                    await deleteCachedChatMessages(tripId);
                  }

                  // Update local trips state
                  setTrips((prevTrips) =>
                    prevTrips.filter((trip) => !plan.tripIds.includes(trip.id || ""))
                  );
                }

                // 3. Delete the plan
                const { error: deletePlanError } = await supabase
                  .from('plans')
                  .delete()
                  .eq('plan_id', planId);

                if (deletePlanError) throw deletePlanError;

                // Pull data from Supabase
                await pullData(userId);

                // 4. Update local plans state
                setPlans((prevPlans) =>
                  prevPlans.filter((plan) => plan.id !== planId)
                );

                // Remove from deleting items
                setDeletingItems(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(planId);
                  return newSet;
                });
              } catch (error) {
                console.error("Error deleting plan and associated trips:", error);
                Alert.alert("Error", "Could not delete plan or its trips.");
                // Remove from deleting items on error
                setDeletingItems(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(planId);
                  return newSet;
                });
              }
            }, 1000);
          },
        },
      ]
    );
  };

  const EmptyPlansComponent = () => (
    <View style={[styles.emptyContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
      <Ionicons
        name="map-outline"
        size={35}
        color={Colors.inactive}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyText, { color: isDarkMode ? '#FFFFFF' : theme.text }]}>{activeTab === 'favorites' ? 'No favorite trips' : 'No plans yet'}</Text>
      <Text style={[styles.emptySubtext, { color: isDarkMode ? '#FFFFFF' : theme.text }]}>
        {activeTab === 'favorites' ? 'Add trips to your favorites to see them here.' : 'Start planning your first adventure!'}
      </Text>
    </View>
  );

  return (
    <DarkModeBackground>
      <View style={[styles.container, { paddingTop: 40, backgroundColor: isDarkMode ? 'transparent' : theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <Text style={[styles.greeting, { color: isDarkMode ? '#FFFFFF' : theme.primary }]}>Hello, {firstName}</Text>
          </View>
          <TouchableOpacity onPress={goToSettings}>
            <Ionicons name="settings-outline" size={32} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Plan a Trip Button */}
        <View style={{ width: '100%', paddingHorizontal: 20 }}>
          <TouchableOpacity
            style={[
              styles.planButton,
              {
                backgroundColor: isDarkMode ? '#FFFFFF17' : theme.background,
                opacity: isOnline ? 1 : 0.5,
              }
            ]}
            onPress={goToTripPlanning}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={isOnline ? theme.text : Colors.inactive}
            />
            <Text style={[
              styles.planButtonText,
              {
                color: isOnline ? theme.text : Colors.inactive
              }
            ]}>
              Plan a Trip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Content Area */}
          <Animated.View
            style={[
              styles.animatedContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'favorites' ? (
                <FlatList
                  horizontal
                  snapToInterval={Dimensions.get('window').width * 0.9 + 40}
                  decelerationRate="fast"
                  snapToAlignment="center"
                  data={trips}
                  keyExtractor={(item) => item.id || String(Math.random())}
                  renderItem={({ item, index }) => {
                    const tripDate = tripDates[item.id || ""] || { startDate: "" };
                    const itemExpired = isExpired(tripDate.startDate, tripDate.endDate);

                    return (
                      <TripBox
                        item={item}
                        tripDate={tripDate}
                        onPress={handleTripPress}
                        onDelete={handleDeleteTrip}
                        theme={theme}
                        isDeleting={deletingItems.has(item.id || "")}
                        isExpired={itemExpired}
                      />
                    );
                  }}
                  showsHorizontalScrollIndicator={false}
                  ListEmptyComponent={EmptyPlansComponent}
                />
              ) : activeTab === 'plans' ? (
                <FlatList
                  horizontal
                  snapToInterval={Dimensions.get('window').width * 0.9 + 40}
                  decelerationRate="fast"
                  snapToAlignment="center"
                  data={plans}
                  keyExtractor={(item) => item.id || String(Math.random())}
                  renderItem={({ item, index }) => {
                    const itemExpired = isExpired(
                      item.preferences?.dateRange?.startDate,
                      item.preferences?.dateRange?.endDate
                    );

                    return (
                      <PlanBox
                        item={item}
                        onPress={goToTrip}
                        onDelete={handleDeletePlan}
                        theme={theme}
                        isDeleting={deletingItems.has(item.id || "")}
                        isExpired={itemExpired}
                      />
                    );
                  }}
                  showsHorizontalScrollIndicator={false}
                  ListEmptyComponent={EmptyPlansComponent}
                />
              ) : null}
            </ScrollView>
          </Animated.View>
        </View>

        {/* Bottom Tab Bar */}
        <View style={[styles.bottomTabBar, { backgroundColor: isDarkMode ? '#232323' : theme.background }]}>
          <BottomTab
            label="Favorites"
            icon={<Ionicons name="heart-outline" size={28} color={theme.text} />}
            isActive={activeTab === 'favorites'}
            onPress={() => handleTabChange('favorites')}
            theme={theme}
            isDarkMode={isDarkMode}
          />
          <BottomTab
            label="My Plans"
            icon={<Ionicons name="map-outline" size={28} color={theme.text} />}
            isActive={activeTab === 'plans'}
            onPress={() => handleTabChange('plans')}
            theme={theme}
            isDarkMode={isDarkMode}
          />
        </View>
      </View>
    </DarkModeBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    ...Typography.text.h1,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    width: '100%',
    borderRadius: 100,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5.84,
  },
  planButtonText: {
    ...Typography.text.h4,
    marginLeft: 8,
  },
  mainContent: {
    flex: 1,
  },
  animatedContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  animatedBox: {
    flex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 30,
    zIndex: 1,
    padding: 8,
    borderRadius: 100,
  },
  moreButton: {
    position: 'absolute',
    top: 10,
    right: 30,
    zIndex: 1,
    padding: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    right: 25,
    zIndex: 2,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateContainer: {
    backgroundColor: '#DBDBDB30',
    width: '100%',
    paddingVertical: 20,
    borderRadius: 20,
    marginTop: 15,
  },
  dateText: {
    ...Typography.text.h3,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  emptyContainer: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.6,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    marginLeft: (Dimensions.get('window').width - Dimensions.get('window').width * 0.9) / 2,
    marginRight: 20,
  },
  emptyIcon: {
    marginBottom: 15,
  },
  emptyText: {
    ...Typography.text.h4,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    opacity: 0.5,
  },
  emptySubtext: {
    ...Typography.text.body,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.5,
  },
  planBox: {
    flex: 1,
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.62,
    borderRadius: 30,
    overflow: 'hidden',
    marginLeft: (Dimensions.get('window').width - Dimensions.get('window').width * 0.9) / 2,
    marginRight: 20,
  },
  planImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  planOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  planInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  planName: {
    ...Typography.text.h2,
    color: 'white',
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  planDetails: {
    ...Typography.text.body,
    color: 'white',
  },
  planLocation: {
    ...Typography.text.h2,
    color: 'white',
  },
  tabContainer: {
    display: 'none',
  },
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    marginBottom: 30,
    padding: 5,
    position: 'relative',
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTabText: {
    ...Typography.text.h4,
    color: '#fff',
  },
  archivedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 30,
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  archivedText: {
    ...Typography.text.h4,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
});

// Helper function to format dates
const formatDateRange = (startDate: string, endDate?: string) => {
  try {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    // If no end date or same day, just show one date
    if (!end || start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    // If different days, show date range
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  } catch (error) {
    return startDate; // Fallback to raw string if parsing fails
  }
};

// Helper function to check if a plan or trip is expired
const isExpired = (startDate?: string, endDate?: string) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  try {
    // If there's an end date, check if it has passed
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Set to end of day
      return end < now;
    }

    // If no end date, check if start date has passed
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(23, 59, 59, 999); // Set to end of day
      return start < now;
    }

    return false;
  } catch (error) {
    return false; // If date parsing fails, assume not expired
  }
};
