import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Typography } from "../../../constants/Typography";
import { Colors } from "../../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "../../../hooks/useColorScheme";
import { supabase } from "../../../services/supabaseConfig";
import { Trip } from "../../../types/Types";
import { trackScreen, trackEvent } from "../../../services/analyticsService";
import { useOfflineData } from "../../../hooks/useOfflineData";
import { useUserStore } from "../../../store";

// Add interface for component props
interface PackingTabProps {
  tripId: string;
  tripData: Trip;
}

interface PackingItem {
  item: string;
  checked: boolean;
}

export default function PackingTab({ tripId, tripData }: PackingTabProps) {
  const [packingItems, setPackingItems] = useState<
    { id: string; title: string; checked: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New state for CRUD operations
  const [newItemText, setNewItemText] = useState("");
  const [editingItem, setEditingItem] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { pullData } = useOfflineData();
  const { userId } = useUserStore();

  // Get the color scheme
  const { effectiveColorScheme } = useColorScheme();
  const isDarkMode = effectiveColorScheme === 'dark';
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Ref to hold the current trip ID
  const currentTripIdRef = useRef<string>("");

  // Track tab view
  useEffect(() => {
    trackScreen('trip_packing_tab');
    trackEvent('trip_packing_tab_viewed', {
      trip_id: tripId,
      category: 'trip_interaction'
    });
  }, [tripId]);

  // Fetch packing items from Supabase or tripData
  useEffect(() => {
    const fetchPackingItems = async () => {
      setLoading(true);
      try {
        let currentTripId = tripId;

        if (!currentTripId && tripData?.id) {
          currentTripId = tripData.id;
        }

        // Store currentTripId in ref as soon as we have it
        if (currentTripId) {
          currentTripIdRef.current = currentTripId;
        } else {
          const storedTripId = await AsyncStorage.getItem("selectedTripId");
          if (storedTripId) {
            currentTripId = storedTripId;
            currentTripIdRef.current = storedTripId; // Update ref here too
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
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .select('packingChecklist')
            .eq('trip_id', currentTripId)
            .single();

          if (tripError) {
            console.error("Error fetching trip data:", tripError);
            // If it's a "no rows" error, that's expected for new trips
            if (tripError.code === 'PGRST116') {
              setDefaultPackingItems();
            } else {
              setError("Failed to load packing items");
              setDefaultPackingItems();
            }
          } else if (tripData?.packingChecklist && Array.isArray(tripData.packingChecklist)) {
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
      { id: "1", title: "💧 Refillable Water bottle", checked: false },
      { id: "2", title: "🥾 Hiking boots", checked: false },
      { id: "3", title: "🧴 Mineral Sunscreen", checked: false },
      { id: "4", title: "🎒 Reusable Backpack", checked: false },
      { id: "5", title: "🕶️ Sunglasses (bamboo frame)", checked: false },
      { id: "6", title: "📷 Camera (capture memories)", checked: false },
    ]);
  };

  const togglePackingItem = async (id: string) => {
    try {
      const item = packingItems.find(item => item.id === id);
      const isChecking = !item?.checked;

      // Track packing item toggle
      trackEvent('packing_item_toggled', {
        trip_id: tripId,
        item_id: id,
        item_title: item?.title,
        is_checked: isChecking,
        category: 'trip_interaction'
      });

      // Update local state immediately for better UX
      setPackingItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );

      // Get current trip ID from ref or other sources
      let currentTripId = currentTripIdRef.current;

      if (!currentTripId) {
        currentTripId = tripId || tripData?.id || "";

        if (!currentTripId) {
          currentTripId = (await AsyncStorage.getItem("selectedTripId")) || "";
        }

        if (currentTripId) {
          currentTripIdRef.current = currentTripId;
        }
      }

      if (!currentTripId) {
        console.error("No trip ID available");
        return;
      }

      const updatedItems = packingItems.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );

      // Update Supabase with the new packing checklist
      await updatePackingListInSupabase(updatedItems);
    } catch (error) {
      console.error("Error toggling packing item:", error);
    }
  };

  // Handle adding a new packing item
  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    try {
      // Track item addition
      trackEvent('packing_item_added', {
        trip_id: tripId,
        item_title: newItemText.trim(),
        category: 'trip_interaction'
      });
      // Find the highest existing ID and increment by 1
      let maxId = 0;

      packingItems.forEach((item) => {
        // Try to convert ID to a number
        const numericId = parseInt(item.id);
        // Only update maxId if the conversion was successful and it's greater than current maxId
        if (!isNaN(numericId) && numericId > maxId) {
          maxId = numericId;
        }
      });

      // New ID will be the highest existing ID + 1
      const newId = (maxId + 1).toString();

      // Add item to local state
      const newItem = {
        id: newId,
        title: newItemText.trim(),
        checked: false,
      };

      const updatedItems = [...packingItems, newItem];
      setPackingItems(updatedItems);

      // Update Supabase
      await updatePackingListInSupabase(updatedItems);

      // Reset input
      setNewItemText("");
    } catch (error) {
      console.error("Error adding item:", error);
      Alert.alert("Error", "Failed to add new item");
    }
  };

  // Handle updating an existing item
  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.title.trim()) return;

    try {
      const updatedItems = packingItems.map((item) =>
        item.id === editingItem.id
          ? { ...item, title: editingItem.title.trim() }
          : item
      );

      setPackingItems(updatedItems);
      await updatePackingListInSupabase(updatedItems);

      // Close modal and reset
      setIsModalVisible(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
      Alert.alert("Error", "Failed to update item");
    }
  };

  // Handle deleting an item
  const handleDeleteItem = async (id: string) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to remove this item from your packing list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const itemToDelete = packingItems.find(item => item.id === id);

              // Track item deletion
              trackEvent('packing_item_deleted', {
                trip_id: tripId,
                item_id: id,
                item_title: itemToDelete?.title,
                category: 'trip_interaction'
              });

              const updatedItems = packingItems.filter(
                (item) => item.id !== id
              );
              setPackingItems(updatedItems);
              await updatePackingListInSupabase(updatedItems);
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  // Helper function to update Supabase
  const updatePackingListInSupabase = async (
    items: { id: string; title: string; checked: boolean }[]
  ) => {
    // Try to get trip ID from multiple sources to ensure we have one
    let currentTripId = currentTripIdRef.current;

    if (!currentTripId) {
      currentTripId = tripId || tripData?.id || "";

      if (!currentTripId) {
        try {
          currentTripId = (await AsyncStorage.getItem("selectedTripId")) || "";
        } catch (error) {
          console.error("Error getting trip ID from AsyncStorage:", error);
        }
      }

      // Update ref with the found ID
      if (currentTripId) {
        currentTripIdRef.current = currentTripId;
      }
    }

    if (!currentTripId) {
      console.error("No trip ID available");
      Alert.alert("Error", "Unable to save changes. Trip ID not found.");
      return;
    }

    // Format items to match Supabase schema
    const supabaseItems = items.map((item) => ({
      id: item.id,
      item: item.title, // Using 'item' field for compatibility
      checked: item.checked,
    }));

    const { error } = await supabase
      .from('trips')
      .update({ packingChecklist: supabaseItems })
      .eq('trip_id', currentTripId);

    if (error) {
      console.error("Error updating packing list in Supabase:", error);
      if (error.code === 'PGRST116') {
        // No rows were updated, which might mean the trip doesn't exist
        Alert.alert("Error", "Trip not found. Please refresh and try again.");
      } else {
        Alert.alert("Error", "Failed to save changes. Please try again.");
      }
      throw error;
    }

    await pullData(userId);

    console.log("Updated packing list in Supabase");
  };

  // Function to open edit modal
  const openEditModal = (item: { id: string; title: string }) => {
    setEditingItem({ id: item.id, title: item.title });
    setIsModalVisible(true);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // Add function to handle Amazon search
  const handleAmazonSearch = async (itemTitle: string) => {
    // Track Amazon search
    trackEvent('packing_item_amazon_search', {
      trip_id: tripId,
      item_title: itemTitle,
      category: 'trip_interaction'
    });

    // Remove emojis and clean the search term
    const searchTerm = itemTitle.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`;

    try {
      const canOpen = await Linking.canOpenURL(amazonUrl);
      if (canOpen) {
        await Linking.openURL(amazonUrl);
      } else {
        Alert.alert('Error', 'Unable to open Amazon');
      }
    } catch (error) {
      console.error('Error opening Amazon:', error);
      Alert.alert('Error', 'Failed to open Amazon');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.inactive }]}>Loading packing items...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: isDarkMode ? "#ff6b6b" : "red" }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Packing Checklist</Text>
        <TouchableOpacity style={styles.editButton} onPress={toggleEditMode}>
          <Text style={[styles.editButtonText, { color: theme.primary }]}>
            {isEditing ? "Done" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

      <FlatList
        data={packingItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.packingItemRow}>
            {isEditing ? (
              <View style={styles.editModeItem}>
                <TouchableOpacity
                  style={styles.editIcon}
                  onPress={() => openEditModal(item)}
                >
                  <Ionicons name="pencil" size={18} color={theme.inactive} />
                </TouchableOpacity>
                <Text style={[styles.packingText, { color: theme.text }]}>{item.title}</Text>
                <TouchableOpacity
                  style={styles.deleteIcon}
                  onPress={() => handleDeleteItem(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={isDarkMode ? "#ff6b6b" : "#ff3b30"} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.packingItemContainer}>
                <TouchableOpacity
                  style={styles.packingItem}
                  onPress={() => togglePackingItem(item.id)}
                >
                  <View style={[styles.checkboxCircle, { borderColor: theme.text }]}>
                    {item.checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text
                    style={[
                      styles.packingText,
                      { color: theme.text },
                      item.checked && [styles.packingCompleted, { color: theme.inactive }],
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.amazonLink}
                  onPress={() => handleAmazonSearch(item.title)}
                >
                  <Ionicons
                    name="cart-outline"
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.inactive }]}>
            No packing items available. Add some items using the field below.
          </Text>
        }
      />

      {/* Add new item section */}
      <View style={[styles.addItemContainer, { borderTopColor: theme.borderColor }]}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.borderColor,
              color: theme.text,
              backgroundColor: isDarkMode ? Colors.dark.card : Colors.light.background
            }
          ]}
          value={newItemText}
          onChangeText={setNewItemText}
          placeholder="Add new packing item..."
          placeholderTextColor={theme.inactive}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddItem}
          disabled={!newItemText.trim()}
        >
          <Ionicons
            name="add-circle"
            size={36}
            color={newItemText.trim() ? theme.primary : theme.inactive}
          />
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Item</Text>

            <TextInput
              style={[styles.modalInput, {
                borderColor: theme.borderColor,
                color: theme.text,
                backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background
              }]}
              value={editingItem?.title || ""}
              onChangeText={(text) =>
                setEditingItem((prev) =>
                  prev ? { ...prev, title: text } : null
                )
              }
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDarkMode ? "#333" : "#f0f0f0" }]}
                onPress={() => {
                  setIsModalVisible(false);
                  setEditingItem(null);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: theme.primary },
                  !editingItem?.title.trim() && [styles.disabledButton, { backgroundColor: theme.inactive }],
                ]}
                onPress={handleUpdateItem}
                disabled={!editingItem?.title.trim()}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    ...Typography.text.h3,
    fontSize: 16,
    flex: 1,
    textAlign: "center",
  },
  editButton: {
    paddingHorizontal: 10,
  },
  editButtonText: {
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginBottom: 18,
  },
  packingItemRow: {
    marginBottom: 20,
  },
  packingItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  packingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  editModeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  addItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginRight: 10,
  },
  addButton: {
    padding: 5,
  },
  editIcon: {
    padding: 5,
    marginRight: 5,
  },
  deleteIcon: {
    padding: 5,
    marginLeft: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    ...Typography.text.h3,
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButton: {
    marginRight: 10,
  },
  cancelButtonText: {
    color: "#333",
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  amazonLink: {
    padding: 8,
    marginLeft: 10,
  },
});
