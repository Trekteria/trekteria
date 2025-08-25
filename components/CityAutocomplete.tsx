import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import citiesData from "../assets/data/uscities.json"; // adjust path

interface City {
  city: string;
  city_ascii: string;
  state_id: string;
  state_name: string;
  lat: number;
  lng: number;
  population: number;
  density: number;
  source: string;
  military: boolean;
  incorporated: boolean;
  timezone: string;
  ranking: number;
  zips: string;
  id: number;
}

interface CityAutocompleteProps {
  onSelect: (city: City) => void;
  placeholder?: string;
  style?: any;
  theme?: {
    text: string;
    background: string;
    card: string;
    borderColor: string;
  };
  onSuggestionsVisibilityChange?: (visible: boolean) => void;
}

export default function CityAutocomplete({ onSelect, placeholder = "Enter city", style, theme, onSuggestionsVisibilityChange }: CityAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = (text: string) => {
    setQuery(text);

    if (text.length < 2) {
      setResults([]);
      onSuggestionsVisibilityChange?.(false);
      return;
    }

    // Case-insensitive search by city name
    const filtered = (citiesData as City[])
      .filter((c) =>
        c.city.toLowerCase().startsWith(text.toLowerCase())
      )
      .sort((a, b) => b.population - a.population) // bigger cities first
      .slice(0, 10); // limit results

    setResults(filtered);
    onSuggestionsVisibilityChange?.(filtered.length > 0);
  };

  const handleSelect = (item: City) => {
    setQuery(`${item.city}, ${item.state_id}`);
    setResults([]);
    onSuggestionsVisibilityChange?.(false);
    if (onSelect) onSelect(item); // return full city object
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          {
            color: theme?.text || '#333',
            backgroundColor: theme?.card || '#fff',
            borderColor: theme?.borderColor || '#ccc',
          }
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme?.text ? `${theme.text}80` : '#999'}
        value={query}
        onChangeText={handleSearch}
      />

      {results.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={results}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.suggestion,
                  {
                    backgroundColor: theme?.card || '#fff',
                    borderBottomColor: theme?.borderColor || '#eee',
                  }
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text style={[
                  styles.suggestionText,
                  { color: theme?.text || '#333' }
                ]}>{item.city}, {item.state_id}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  input: {
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
    backgroundColor: 'transparent',
    fontSize: 16,
  },
  suggestion: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionText: {
    // Color will be set dynamically based on theme
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    marginTop: 4,
  },
});
