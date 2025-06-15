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
}

const TripBox: React.FC<TripBoxProps> = ({
  item,
  tripDate,
  onPress,
  onDelete,
  theme,
}) => {
  let dateText = "No date";
  if (tripDate?.startDate) {
    dateText = formatDateRange(tripDate.startDate, tripDate.endDate);
  }

  return (
    <View style={styles.animatedBox}>
      <TouchableOpacity
        style={[styles.deleteButton]}
        onPress={() => item.id && onDelete(item.id)}
      >
        <Ionicons name="heart" size={30} color={Colors.white} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.planBox}
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
      </TouchableOpacity>
    </View>
  );
};

// --- PlanBox Component ---
interface PlanBoxProps {
  item: Plan;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  theme: any;
}

const PlanBox: React.FC<PlanBoxProps> = ({
  item,
  onPress,
  onDelete,
  theme,
}) => {
  const location = item.preferences?.location || "No location";
  let dateText = "No date";
  if (item.preferences?.dateRange?.startDate) {
    dateText = formatDateRange(
      item.preferences.dateRange.startDate,
      item.preferences.dateRange.endDate
    );
  }

  return (
    <View style={styles.animatedBox}>
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: theme.background }]}
        onPress={() => item.id && onDelete(item.id)}
      >
        <Ionicons name="trash" size={28} color={theme.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.planBox}
        onPress={() => onPress(item.id || "")}
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
      </TouchableOpacity>
    </View>
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
  const [activeTab, setActiveTab] = useState('favorites');

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

  // Replace fetchUserData with Supabase implementation
  const fetchUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('firstname')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setUserName(data.firstname || 'User');
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Replace fetchPlans with Supabase implementation
  const fetchPlans = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user) {
        const { data: plansList, error: plansError } = await supabase
          .from('plans')
          .select('*')
          .eq('userId', user.id);

        if (plansError) throw plansError;

        if (plansList) {
          // Transform the data to match the Plan interface
          const transformedPlans = plansList.map(plan => ({
            id: plan.plan_id,
            ...plan,
            image: plan.imageUrl || placeholderImage,
          })) as Plan[];

          // Sort plans by date (oldest first)
          const sortedPlans = transformedPlans.sort((a, b) => {
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
  };

  const fetchTrips = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user) {
        // Fetch bookmarked trips for the current user
        const { data: tripsList, error: tripsError } = await supabase
          .from('trips')
          .select('*')
          .eq('userId', user.id)
          .eq('bookmarked', true);

        if (tripsError) throw tripsError;

        if (tripsList) {
          const transformedTrips = tripsList.map(trip => ({
            id: trip.trip_id,
            ...trip,
            image: trip.imageUrl || placeholderImage,
          })) as Trip[];

          // Fetch dates from plans
          const { data: plansList, error: plansError } = await supabase
            .from('plans')
            .select('plan_id, preferences, tripIds')
            .eq('userId', user.id);

          if (plansError) throw plansError;

          // Create dates mapping
          const dates: { [tripId: string]: { startDate: string; endDate?: string } } = {};
          if (plansList) {
            plansList.forEach(plan => {
              if (plan.tripIds && plan.preferences?.dateRange?.startDate) {
                plan.tripIds.forEach((tripId: string) => {
                  dates[tripId] = {
                    startDate: plan.preferences.dateRange.startDate,
                    endDate: plan.preferences.dateRange.endDate
                  };
                });
              }
            });
          }

          setTripDates(dates);

          // Sort trips by date
          const sortedTrips = transformedTrips.sort((a, b) => {
            const dateA = dates[a.id || ""]?.startDate
              ? new Date(dates[a.id || ""]?.startDate).getTime()
              : 0;
            const dateB = dates[b.id || ""]?.startDate
              ? new Date(dates[b.id || ""]?.startDate).getTime()
              : 0;
            return dateA - dateB;
          });

          setTrips(sortedTrips);
        }
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  // Update the useFocusEffect to use fetchUserData instead of fetchUserName
  useFocusEffect(
    useCallback(() => {
      fetchUserData(); // Replace fetchUserName with fetchUserData
      fetchTrips();
      fetchPlans();
    }, [])
  );

  const goToSettings = () => router.push("/(app)/settings");
  const goToTripPlanning = () => router.push("/(app)/preferences");
  const goToTrip = (id: string) =>
    router.push({
      pathname: "/(app)/result",
      params: { planId: id },
    });

  // Replace handleDeleteTrip with Supabase implementation
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

  // Replace handleDeletePlan with Supabase implementation
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

              // 4. Update local plans state
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
      <Text style={[styles.emptyText, { color: isDarkMode ? '#FFFFFF' : theme.text }]}>No items found</Text>
      <Text style={[styles.emptySubtext, { color: isDarkMode ? '#FFFFFF' : theme.text }]}>
        Start planning your first adventure!
      </Text>
    </View>
  );

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
                    onPress={handleTripPress}
                    onDelete={handleDeleteTrip}
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
                    onPress={goToTrip}
                    onDelete={handleDeletePlan}
                    theme={theme}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={EmptyPlansComponent}
              />
            )}
          </ScrollView>
        </View>
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
    right: 30,
    zIndex: 1,
    padding: 8,
    borderRadius: 100,
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
