import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";

export default function PackingTab() {
  const [packingItems, setPackingItems] = useState([
    { id: "1", title: "Comfortable hiking shoes", packed: false },
    {
      id: "2",
      title: "Light backpack (water, snacks, extra layers)",
      packed: false,
    },
    { id: "3", title: "Sunscreen", packed: false },
    { id: "4", title: "Hat", packed: false },
    { id: "5", title: "Sunglasses", packed: false },
    {
      id: "6",
      title: "Camera (for scenic viewpoints & waterfalls)",
      packed: false,
    },
    { id: "7", title: "Tent", packed: false },
  ]);

  const togglePackingItem = (id: string) => {
    setPackingItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, packed: !item.packed } : item
      )
    );
  };

  return (
    <View>
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
              {item.packed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text
              style={[
                styles.packingText,
                item.packed && styles.packingCompleted,
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
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
    marginBottom: 15,
  },
  checkboxCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkmark: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  packingText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  packingCompleted: {
    textDecorationLine: "line-through",
    color: "gray",
  },
});
