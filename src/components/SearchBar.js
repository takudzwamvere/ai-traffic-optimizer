import React from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Text, FlatList, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function SearchBar({ 
  destinationQuery, 
  setDestinationQuery, 
  suggestions, 
  setSuggestions, 
  setRoutes, 
  setIsSheetVisible, 
  handleSearch, 
  loading,
  departureTime,
  setDepartureTime,
  topInset = 50 // Default fallback
}) {
  
  const handleClear = () => {
    setDestinationQuery('');
    setSuggestions([]);
    setRoutes([]);
    setIsSheetVisible(false);
  };

  return (
    <View style={[styles.uiLayer]}>
      <View style={[styles.searchWrapper, { paddingTop: topInset + 10 }]}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#555" style={{marginLeft: 15}} />
          <TextInput 
            style={styles.input}
            placeholder="Search destination..."
            placeholderTextColor={COLORS.placeholder}
            value={destinationQuery}
            onChangeText={setDestinationQuery}
            onSubmitEditing={() => handleSearch()}
          />
          {destinationQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Feather name="x" size={20} color={COLORS.border} style={{marginRight: 10}} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleSearch()} style={styles.searchButton}>
            {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : <Feather name="arrow-right" size={20} color="white" />}
          </TouchableOpacity>
        </View>

        {/* Time Selector */}
        <View style={styles.timeContainer}>
          {['NOW', 'MORNING', 'EVENING'].map((time) => (
             <TouchableOpacity 
               key={time} 
               style={[styles.timeButton, departureTime === time && styles.timeButtonActive]}
               onPress={() => setDepartureTime(time)}
             >
               <Text style={[styles.timeText, departureTime === time && styles.timeTextActive]}>
                 {time === 'NOW' ? 'Now' : time === 'MORNING' ? 'AM Peak' : 'PM Peak'}
               </Text>
             </TouchableOpacity>
          ))}
        </View>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.name}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionItem} onPress={() => {
                // The parent's setDestinationQuery is called inside handleSearch wrapper usually, but here we invoke explicit logic
                 handleSearch({lat: item.lat, lon: item.lon}, item.name);
              }}>
                <Feather name="map-pin" size={18} color="#666" style={{marginRight: 10}} />
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  uiLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  searchWrapper: { paddingHorizontal: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 30, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, height: 55, padding: 4 },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 10, color: COLORS.text },
  searchButton: { width: 48, height: 48, backgroundColor: COLORS.text, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  suggestionsContainer: { marginHorizontal: 20, marginTop: 8, backgroundColor: 'white', borderRadius: 20, elevation: 5, maxHeight: 220, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  suggestionText: { fontSize: 15, color: COLORS.text },

  timeContainer: { flexDirection: 'row', marginTop: 10, justifyContent: 'center' },
  timeButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'white', marginHorizontal: 5, elevation: 3 },
  timeButtonActive: { backgroundColor: COLORS.primary },
  timeText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  timeTextActive: { color: 'white' },
});
