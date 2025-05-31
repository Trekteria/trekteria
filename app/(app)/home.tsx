import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Animated,
  Easing,
  Alert,
  BackHandler,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState, useEffect, useRef } from "react";
import { auth, db } from "../../services/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { Plan as PlanType, Trip as TripType } from "../../types/Types";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "../../hooks/useColorScheme";
import { deleteCachedTrailData, deleteCachedChatMessages } from '../../services/cacheService';
import DarkModeBackground from "../../components/DarkModeBackground";

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

// --- Reusable Jiggle Animation Hook ---
const useJiggleAnimation = (isEditing: boolean, maxDelayMs: number = 0) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animationSequence: Animated.CompositeAnimation | null = null;
    let isMounted = true; // Helper to prevent state updates on unmounted component

    if (isEditing) {
      const calculatedDelay = maxDelayMs > 0 ? Math.random() * maxDelayMs : 0;

      // Sequence: Delay -> Loop
      animationSequence = Animated.sequence([
        Animated.delay(calculatedDelay), // Apply the random delay first
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotation, {
              toValue: 1.5,
              duration: 150,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease),
            }),
            Animated.timing(rotation, {
              toValue: -1.5,
              duration: 150,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease),
            }),
            // Add rotation back to 0 for smoother elastic loop
            Animated.timing(rotation, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
          ])
        ),
      ]);
      animationSequence.start();
    } else {
      // Stop any existing animation and reset smoothly
      rotation.stopAnimation(() => {
        // Check if component is still mounted and not editing before resetting
        if (isMounted && !isEditing) {
          Animated.timing(rotation, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
            easing: Easing.ease,
          }).start();
        }
      });
    }

    // Cleanup function to stop animation on unmount or when isEditing becomes false
    return () => {
      isMounted = false;
      animationSequence?.stop(); // Stop the sequence (delay or loop)
      rotation.stopAnimation(); // Ensure rotation itself stops
    };
  }, [isEditing, rotation]);

  const animatedStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [-1, 1],
          outputRange: ["-1deg", "1deg"],
        }),
      },
    ],
  };

  return animatedStyle;
};

// --- TripBox Component ---
interface TripBoxProps {
  item: Trip;
  tripDate: { startDate: string; endDate?: string };
  isEditing: boolean;
  onPress: (item: Trip) => void;
  onDelete: (id: string) => void;
  animationDelay?: number;
  theme: any;
}

const TripBox: React.FC<TripBoxProps> = ({
  item,
  tripDate,
  isEditing,
  onPress,
  onDelete,
  animationDelay = 0,
  theme,
}) => {
  const animatedStyle = useJiggleAnimation(isEditing, animationDelay);

  let dateText = "No date";
  if (tripDate?.startDate) {
    dateText = formatDateRange(tripDate.startDate, tripDate.endDate);
  }

  return (
    <Animated.View style={[styles.animatedBox, animatedStyle]}>
      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.background }]}
          onPress={() => item.id && onDelete(item.id)}
        >
          <Ionicons name="remove-outline" size={28} color={theme.text} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.planBox}
        onPress={() => onPress(item)}
        disabled={isEditing}
      >
        <Image source={{ uri: item.image }} style={styles.planImage} />
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.5)", "rgba(0,0,0,1)"]}
          style={styles.planOverlay}
          locations={[0, 0.4, 1]}
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
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- PlanBox Component ---
interface PlanBoxProps {
  item: Plan;
  isEditing: boolean;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  animationDelay?: number;
  theme: any;
}

const PlanBox: React.FC<PlanBoxProps> = ({
  item,
  isEditing,
  onPress,
  onDelete,
  animationDelay = 0,
  theme,
}) => {
  const animatedStyle = useJiggleAnimation(isEditing, animationDelay);

  const location = item.preferences?.location || "No location";
  let dateText = "No date";
  if (item.preferences?.dateRange?.startDate) {
    dateText = formatDateRange(
      item.preferences.dateRange.startDate,
      item.preferences.dateRange.endDate
    );
  }

  return (
    <Animated.View style={[styles.animatedBox, animatedStyle]}>
      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.background }]}
          onPress={() => item.id && onDelete(item.id)}
        >
          <Ionicons name="remove-outline" size={28} color={theme.text} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.planBox}
        onPress={() => onPress(item.id || "")}
        disabled={isEditing}
      >
        <Image source={{ uri: item.image }} style={styles.planImage} />
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.5)", "rgba(0,0,0,1)"]}
          style={styles.planOverlay}
          locations={[0, 0.5, 1]}
        />
        <View style={styles.planInfo}>
          <View style={styles.planMetaRow}>
            <Text style={styles.planLocation}>{item.preferences?.location?.toLocation || "No location"}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{dateText}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface TabProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  color?: string;
  theme: any;
}

const VerticalTab = ({ label, isActive, onPress, color, theme }: TabProps) => (
  <TouchableOpacity
    style={[
      styles.tabButton,
      isActive && styles.activeTab
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.tabText,
        { color: isActive ? Colors.primary : theme.text },
        isActive && styles.activeTabText
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// --- Home Screen Component ---
export default function Home() {
  const router = useRouter();
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [userName, setUserName] = useState("");
  const [ecoPoints, setEcoPoints] = useState(0); // Add state for eco points
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripDates, setTripDates] = useState<{ [tripId: string]: { startDate: string; endDate?: string } }>({});
  const [isPlansEditing, setIsPlansEditing] = useState(false);
  const [isTripsEditing, setIsTripsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('favorites');

  const handleTripPress = (trip: Trip) => {
    router.push({
      pathname: "/(app)/trip",
      params: {
        trip: JSON.stringify({
          id: trip.id,
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

  // Replace fetchUserName with fetchUserData
  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.firstname);

        // Get eco points from Firestore
        const pointsValue =
          userData.ecoPoints !== undefined ? userData.ecoPoints : 0; // Fallback to 0 if ecoPoints is undefined

        setEcoPoints(pointsValue);
      }
    }
  };

  const fetchPlans = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const plansCollection = collection(db, "plans");
        // Only fetch plans associated with the current user
        const userPlansQuery = query(
          plansCollection,
          where("userId", "==", user.uid)
        );
        const plansSnapshot = await getDocs(userPlansQuery);
        const plansList = plansSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          image: doc.data().imageUrl || placeholderImage,
        })) as Plan[];

        // Sort plans by date (oldest first)
        const sortedPlans = plansList.sort((a, b) => {
          const dateA = a.preferences?.dateRange?.startDate
            ? new Date(a.preferences.dateRange.startDate).getTime()
            : 0;
          const dateB = b.preferences?.dateRange?.startDate
            ? new Date(b.preferences.dateRange.startDate).getTime()
            : 0;
          return dateA - dateB; // Descending order (oldest first)
        });

        setPlans(sortedPlans);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const fetchTrips = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        // Fetch trips that are bookmarked AND belong to the current user
        const tripsCollection = collection(db, "trips");
        const bookmarkedTripsQuery = query(
          tripsCollection,
          where("bookmarked", "==", true),
          where("userId", "==", user.uid)
        );
        const tripsSnapshot = await getDocs(bookmarkedTripsQuery);

        const tripsList = tripsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          image: doc.data().imageUrl || placeholderImage,
        })) as Trip[];

        // console.log("Bookmarked Trips:", tripsList);

        // Fetch dates for trips from plans collection
        const dates: { [tripId: string]: { startDate: string; endDate?: string } } = {};
        const plansCollection = collection(db, "plans");
        const userPlansQuery = query(
          plansCollection,
          where("userId", "==", user.uid)
        );
        const plansSnapshot = await getDocs(userPlansQuery);

        plansSnapshot.docs.forEach((planDoc) => {
          const planData = planDoc.data();
          if (planData.tripIds && planData.preferences?.dateRange?.startDate) {
            // For each trip ID in this plan, store both start and end dates
            planData.tripIds.forEach((tripId: string) => {
              dates[tripId] = {
                startDate: planData.preferences.dateRange.startDate,
                endDate: planData.preferences.dateRange.endDate
              };
            });
          }
        });

        setTripDates(dates);

        // Sort trips by date (oldest first)
        const sortedTrips = tripsList.sort((a, b) => {
          const dateA = dates[a.id || ""]?.startDate
            ? new Date(dates[a.id || ""]?.startDate).getTime()
            : 0;
          const dateB = dates[b.id || ""]?.startDate
            ? new Date(dates[b.id || ""]?.startDate).getTime()
            : 0;
          return dateA - dateB; // Descending order (oldest first)
        });

        setTrips(sortedTrips);
        // console.log("Sorted Trips:", sortedTrips);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      console.error("Error fetching plans:", error);
    }
  };

  // Update the useFocusEffect to use fetchUserData instead of fetchUserName
  useFocusEffect(
    useCallback(() => {
      fetchUserData(); // Replace fetchUserName with fetchUserData
      fetchTrips();
      fetchPlans();
      // Reset edit modes when screen focuses
      setIsPlansEditing(false);
      setIsTripsEditing(false);
    }, [])
  );

  const goToSettings = () => router.push("/(app)/settings");
  const goToTripPlanning = () => router.push("/(app)/preferences");
  const goToTrip = (id: string) =>
    router.push({
      pathname: "/(app)/result",
      params: { planId: id },
    });

  // --- Deletion Handlers ---
  const handleDeleteTrip = async (tripId: string) => {
    Alert.alert(
      "Remove Trip",
      "Are you sure you want to remove this trip from your favorites?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) {
                console.error("User must be logged in to remove trip from favorites");
                return;
              }

              // Update the trip's bookmarked status in Firestore
              const tripRef = doc(db, "trips", tripId);
              await updateDoc(tripRef, {
                bookmarked: false
              });

              // Update local trips state
              setTrips((prevTrips) =>
                prevTrips.filter((trip) => trip.id !== tripId)
              );
            } catch (error) {
              console.error("Error removing trip from favorites:", error);
              Alert.alert("Error", "Could not remove trip from favorites.");
            }
          },
        },
      ]
    );
  };

  // --- Plan Deletion Handler ---
  const handleDeletePlan = async (planId: string) => {
    Alert.alert(
      "Delete Plan",
      "Are you sure you want to delete this plan and its associated trips? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Fetch the plan document to get tripIds
              const planDocRef = doc(db, "plans", planId);
              const planDocSnap = await getDoc(planDocRef);

              if (planDocSnap.exists()) {
                const planData = planDocSnap.data();
                const tripIdsToDelete = planData.tripIds as
                  | string[]
                  | undefined;

                // 2. Delete associated trips if they exist
                if (tripIdsToDelete && Array.isArray(tripIdsToDelete)) {
                  const deletePromises = tripIdsToDelete.map((tripId) =>
                    deleteDoc(doc(db, "trips", tripId))
                  );
                  await Promise.all(deletePromises);

                  // --- Delete cache for each trip ---
                  for (const tripId of tripIdsToDelete) {
                    await deleteCachedTrailData(tripId);
                    await deleteCachedChatMessages(tripId);
                  }
                  // --- End cache deletion ---

                  // 3. Update local trips state
                  setTrips((prevTrips) =>
                    prevTrips.filter(
                      (trip) => !tripIdsToDelete.includes(trip.id || "")
                    )
                  );
                }
              }

              // 4. Delete the plan document itself
              await deleteDoc(planDocRef);

              // 5. Update local plans state
              setPlans((prevPlans) =>
                prevPlans.filter((plan) => plan.id !== planId)
              );
            } catch (error) {
              console.error("Error deleting plan and associated trips:", error);
              Alert.alert("Error", "Could not delete plan or its trips.");
            }
          },
        },
      ]
    );
  };

  const EmptyPlansComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="map-outline"
        size={35}
        color={Colors.inactive}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyText}>No items found</Text>
      <Text style={styles.emptySubtext}>
        Start planning your first adventure!
      </Text>
    </View>
  );

  const toggleEditMode = () => {
    if (activeTab === 'favorites') {
      setIsTripsEditing(!isTripsEditing);
    } else {
      setIsPlansEditing(!isPlansEditing);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <DarkModeBackground>
      <View style={[styles.container, { paddingTop: 40, backgroundColor: isDarkMode ? 'transparent' : theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <Text style={[styles.greeting, { color: isDarkMode ? '#FFFFFF' : theme.primary }]}>Hello, {userName}</Text>
          </View>
          <TouchableOpacity onPress={goToSettings}>
            <Ionicons name="settings-outline" size={32} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Plan a Trip Button */}
        <TouchableOpacity
          style={[styles.planButton, { backgroundColor: isDarkMode ? '#FFFFFF17' : theme.background }]}
          onPress={goToTripPlanning}
        >
          <Ionicons name="map-outline" size={20} color={theme.text} />
          <Text style={[styles.planButtonText, { color: theme.text }]}>Plan a Trip</Text>
        </TouchableOpacity>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Tab Buttons */}
          <View style={styles.tabContainer}>
            <VerticalTab
              label="Favorite Trips"
              isActive={activeTab === 'favorites'}
              onPress={() => setActiveTab('favorites')}
              color={Colors.primary}
              theme={theme}
            />
            <VerticalTab
              label="My Plans"
              isActive={activeTab === 'plans'}
              onPress={() => setActiveTab('plans')}
              color={theme.text}
              theme={theme}
            />
          </View>

          {/* Content Area */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'favorites' ? (
              <FlatList
                horizontal
                snapToInterval={Dimensions.get('window').width * 0.8}
                decelerationRate="fast"
                pagingEnabled
                data={trips}
                keyExtractor={(item) => item.id || String(Math.random())}
                renderItem={({ item, index }) => (
                  <TripBox
                    item={item}
                    tripDate={tripDates[item.id || ""] || { startDate: "" }}
                    isEditing={isTripsEditing}
                    onPress={handleTripPress}
                    onDelete={handleDeleteTrip}
                    animationDelay={index * 100}
                    theme={theme}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={EmptyPlansComponent}
              />
            ) : (
              <FlatList
                horizontal
                snapToInterval={Dimensions.get('window').width * 0.8}
                decelerationRate="fast"
                pagingEnabled
                data={plans}
                keyExtractor={(item) => item.id || String(Math.random())}
                renderItem={({ item, index }) => (
                  <PlanBox
                    item={item}
                    isEditing={isPlansEditing}
                    onPress={goToTrip}
                    onDelete={handleDeletePlan}
                    animationDelay={index * 100}
                    theme={theme}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={EmptyPlansComponent}
              />
            )}
          </ScrollView>
        </View>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: isDarkMode ? '#FFFFFF30' : theme.background }
          ]}
          onPress={toggleEditMode}
        >
          <Ionicons
            name={(activeTab === 'favorites' ? isTripsEditing : isPlansEditing) ? "checkmark-outline" : "pencil"}
            size={24}
            color={isDarkMode ? '#FFFFFF' : theme.primary}
          />
          <Text style={[styles.fabText, { color: isDarkMode ? '#FFFFFF' : theme.primary }]}>{isTripsEditing || isPlansEditing ? "Done" : "Edit"}</Text>
        </TouchableOpacity>
      </View>
    </DarkModeBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginHorizontal: 20,
    padding: 20,
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
    flexDirection: 'row',
  },
  tabContainer: {
    width: 60,
    paddingTop: Dimensions.get('window').height * 0.1,
    alignItems: 'center',
    gap: Dimensions.get('window').height * 0.1,
  },
  tabButton: {
    width: 200,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Dimensions.get('window').height * 0.05,
  },
  activeTab: {
    opacity: 1,
  },
  tabText: {
    ...Typography.text.h3,
    letterSpacing: 0.5,
    transform: [{ rotate: '-90deg' }],
    width: 150,
    textAlign: 'center',
  },
  activeTabText: {
    textDecorationLine: 'underline',
    textDecorationColor: Colors.primary,
    textDecorationStyle: 'solid',
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
    right: 10,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
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
    width: Dimensions.get('window').width * 0.85,
    height: Dimensions.get('window').height * 0.6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    marginRight: 20,
  },
  emptyIcon: {
    marginBottom: 15,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  planBox: {
    flex: 1,
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').height * 0.65,
    borderRadius: 30,
    overflow: 'hidden',
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
    height: '50%',
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
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5.84,
  },
  fabText: {
    ...Typography.text.h4,
    marginLeft: 8,
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
