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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Typography } from "../../../constants/Typography";
import { Colors } from "../../../constants/Colors";
import { db } from "../../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

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

  // New state for CRUD operations
  const [newItemText, setNewItemText] = useState("");
  const [editingItem, setEditingItem] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Ref to hold the current trip ID
  const currentTripIdRef = useRef<string>("");

  // Fetch packing items from Firestore or tripData
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
      // Update local state immediately for better UX
      setPackingItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );

      // Get current trip ID from ref or other sources
      let currentTripId = currentTripIdRef.current;

      if (!currentTripId) {
        currentTripId = tripId || tripData?.id;

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

      const tripRef = doc(db, "trips", currentTripId);
      const tripDoc = await getDoc(tripRef);

      if (tripDoc.exists()) {
        const tripData = tripDoc.data();

        if (
          tripData.packingChecklist &&
          Array.isArray(tripData.packingChecklist)
        ) {
          const updatedPackingItems = tripData.packingChecklist.map(
            (item: any) =>
              item.id === id
                ? { ...item, checked: !item.checked } // Toggle checked status using item.id
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

  // Handle adding a new packing item
  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    try {
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

      // Update Firestore
      await updatePackingListInFirestore(updatedItems);

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
      await updatePackingListInFirestore(updatedItems);

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
              const updatedItems = packingItems.filter(
                (item) => item.id !== id
              );
              setPackingItems(updatedItems);
              await updatePackingListInFirestore(updatedItems);
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  // Helper function to update Firestore
  const updatePackingListInFirestore = async (
    items: Array<{ id: string; title: string; checked: boolean }>
  ) => {
    // Try to get trip ID from multiple sources to ensure we have one
    let currentTripId = currentTripIdRef.current;

    if (!currentTripId) {
      currentTripId = tripId || tripData?.id;

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

    const tripRef = doc(db, "trips", currentTripId);
    const tripDoc = await getDoc(tripRef);

    if (tripDoc.exists()) {
      // Format items to match Firestore schema
      const firestoreItems = items.map((item) => ({
        id: item.id,
        item: item.title, // Using 'item' field for compatibility
        checked: item.checked,
      }));

      await updateDoc(tripRef, {
        packingChecklist: firestoreItems,
      });

      console.log("Updated packing list in Firestore");
    } else {
      throw new Error("Trip document not found");
    }
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
      <View style={styles.header}>
        <Text style={styles.title}>Packing Checklist</Text>
        <TouchableOpacity style={styles.editButton} onPress={toggleEditMode}>
          <Text style={styles.editButtonText}>
            {isEditing ? "Done" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

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
                  <Ionicons name="pencil" size={18} color="#555" />
                </TouchableOpacity>
                <Text style={styles.packingText}>{item.title}</Text>
                <TouchableOpacity
                  style={styles.deleteIcon}
                  onPress={() => handleDeleteItem(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            ) : (
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
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No packing items available. Add some items using the field below.
          </Text>
        }
      />

      {/* Add new item section */}
      <View style={styles.addItemContainer}>
        <TextInput
          style={styles.input}
          value={newItemText}
          onChangeText={setNewItemText}
          placeholder="Add new packing item..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddItem}
          disabled={!newItemText.trim()}
        >
          <Ionicons
            name="add-circle"
            size={36}
            color={newItemText.trim() ? Colors.primary : "#ccc"}
          />
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Item</Text>

            <TextInput
              style={styles.modalInput}
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
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsModalVisible(false);
                  setEditingItem(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  !editingItem?.title.trim() && styles.disabledButton,
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
    color: Colors.primary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginBottom: 18,
  },
  packingItemRow: {
    marginBottom: 20,
  },
  packingItem: {
    flexDirection: "row",
    alignItems: "center",
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
    borderColor: "#555",
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
    marginBottom: 20,
  },
  addItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
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
    backgroundColor: "white",
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
    borderColor: "#ccc",
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
    backgroundColor: "#f0f0f0",
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
});
