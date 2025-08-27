import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  ScrollView,
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
  onInputChange?: (text: string) => void; // Add callback for raw text input
  value?: string; // Add value prop to make component controlled
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

export default function CityAutocomplete({ onSelect, onInputChange, value, placeholder = "Enter city", style, theme, onSuggestionsVisibilityChange }: CityAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<City[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  const handleSearch = (text: string) => {
    setQuery(text);

    // Call onInputChange callback to allow parent component to handle raw text
    onInputChange?.(text);

    if (text.length < 1) {
      setResults([]);
      onSuggestionsVisibilityChange?.(false);
      return;
    }

    // Case-insensitive search by city name
    const filtered = (citiesData as City[])
      .filter((c) =>
        c.city.toLowerCase().includes(text.toLowerCase())
      )
      .sort((a, b) => b.population - a.population) // bigger cities first
      .slice(0, 50); // limit results

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
        <View style={[styles.suggestionsContainer, { backgroundColor: theme?.card || '#fff' }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {results.map((item, index) => (
              <>
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestion,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[
                    styles.suggestionText,
                    { color: theme?.text || '#333' }
                  ]}>{item.city}, {item.state_id}</Text>
                </TouchableOpacity>
                {index !== results.length - 1 && (
                  <View style={styles.divider} />
                )}
              </>
            ))}
          </ScrollView>
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
  },
  suggestionText: {
    // Color will be set dynamically based on theme
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    padding: 10,
    borderRadius: 20,
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
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    opacity: 0.1,
  },
});
