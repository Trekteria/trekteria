import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Typography } from "../../../constants/Typography";
import { Colors } from "../../../constants/Colors";
import { db } from "../../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// Add interface for component props
interface PackingTabProps {
  tripId?: string;
  tripData?: any;
}

export default function PackingTab({ tripId, tripData }: PackingTabProps) {
  const [packingItems, setPackingItems] = useState<
    Array<{ id: string; title: string; checked: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch packing items from Firestore or tripData
  useEffect(() => {
    const fetchPackingItems = async () => {
      setLoading(true);
      try {
        let currentTripId = tripId;

        if (!currentTripId && tripData?.id) {
          currentTripId = tripData.id;
        }

        if (currentTripId) {
          await AsyncStorage.setItem("selectedTripId", currentTripId);
        } else {
          const storedTripId = await AsyncStorage.getItem("selectedTripId");
          if (storedTripId) {
            currentTripId = storedTripId;
          }
        }

        if (
          tripData?.packingChecklist &&
          Array.isArray(tripData.packingChecklist)
        ) {
          setPackingItems(
            tripData.packingChecklist.map((item: any, index: number) => ({
              id: item.id || String(index + 1),
              title: item.title || item.item || "Item " + (index + 1),
              checked: item.checked || false,
            }))
          );
          setLoading(false);
          return;
        }

        if (currentTripId) {
          const tripDoc = await getDoc(doc(db, "trips", currentTripId));
          if (tripDoc.exists()) {
            const tripData = tripDoc.data();
            if (
              tripData.packingChecklist &&
              Array.isArray(tripData.packingChecklist)
            ) {
              setPackingItems(
                tripData.packingChecklist.map((item: any, index: number) => ({
                  id: item.id || String(index + 1),
                  title: item.title || item.item || "Item " + (index + 1),
                  checked: item.checked || false,
                }))
              );
            } else {
              setDefaultPackingItems();
            }
          } else {
            setDefaultPackingItems();
          }
        } else {
          setDefaultPackingItems();
        }
      } catch (err) {
        console.error("Error fetching packing items:", err);
        setError("Failed to load packing items");
        setDefaultPackingItems();
      } finally {
        setLoading(false);
      }
    };

    fetchPackingItems();
  }, [tripId, tripData]);

  const setDefaultPackingItems = () => {
    setPackingItems([
      { id: "1", title: "💧 Water bottle (stay hydrated)", checked: false },
      { id: "2", title: "🥾 Hiking boots (for long walks)", checked: false },
      { id: "3", title: "🧴 Sunscreen (protect your skin)", checked: false },
      { id: "4", title: "🎒 Backpack (carry your essentials)", checked: false },
      { id: "5", title: "🕶️ Sunglasses (shield your eyes)", checked: false },
      { id: "6", title: "📷 Camera (capture memories)", checked: false },
    ]);
  };

  const togglePackingItem = async (id: string) => {
    try {
      // Update local state immediately for better UX
      setPackingItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );

      // Get current trip ID
      let currentTripId = tripId || tripData?.id;
      if (!currentTripId) {
        currentTripId = (await AsyncStorage.getItem("selectedTripId")) || "";
      }

      if (!currentTripId) {
        console.error("No trip ID available");
        return;
      }

      const tripRef = doc(db, "trips", currentTripId);
      const tripDoc = await getDoc(tripRef);

      if (tripDoc.exists()) {
        const tripData = tripDoc.data();

        if (
          tripData.packingChecklist &&
          Array.isArray(tripData.packingChecklist)
        ) {
          const updatedPackingItems = tripData.packingChecklist.map(
            (item: any, index: number) =>
              (index + 1).toString() === id
                ? { ...item, checked: !item.checked } // Toggle checked status
                : item
          );

          // Update Firestore with the new packing checklist
          await updateDoc(tripRef, {
            packingChecklist: updatedPackingItems,
          });

          console.log("Updated packing item status in Firestore");
        } else {
          console.error("Packing checklist not found in Firestore data");
        }
      } else {
        console.error("Trip document not found in Firestore");
      }
    } catch (error) {
      console.error("Error toggling packing item:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading packing items...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Packing Checklist</Text>
      <View style={styles.divider} />
      <FlatList
        data={packingItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.packingItem}
            onPress={() => togglePackingItem(item.id)}
          >
            <View style={styles.checkboxCircle}>
              {item.checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text
              style={[
                styles.packingText,
                item.checked && styles.packingCompleted,
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No packing items available for this trip.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    // paddingRight: 30,
  },
  title: {
    ...Typography.text.h3,
    marginBottom: 15,
    textAlign: "center",
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginBottom: 18,
  },
  packingItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkmark: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  packingText: {
    ...Typography.text.body,
    flex: 1,
    flexWrap: "wrap",
  },
  packingCompleted: {
    textDecorationLine: "line-through",
    color: "gray",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
  },
});
