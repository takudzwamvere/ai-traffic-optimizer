import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Text, FlatList, ScrollView, StyleSheet } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function RoutePlanner({
  originQuery,
  setOriginQuery,
  destinationQuery,
  setDestinationQuery,
  originSuggestions,
  destinationSuggestions,
  onOriginSelect,
  onDestinationSelect,
  onUseMyLocation,
  onSwap,
  onSearch,
  loading,
  isConnected,
  topInset = 0,
  recentSearches = [],
  onRecentSelect,
}) {
  const [focusedField, setFocusedField] = useState(null); // 'from' | 'to' | null

  const handleClearOrigin = () => {
    setOriginQuery('');
    onUseMyLocation(); // Default back to GPS
  };

  const handleClearDestination = () => {
    setDestinationQuery('');
  };

  const activeSuggestions = focusedField === 'from' ? originSuggestions : destinationSuggestions;
  const activeHandler = focusedField === 'from' ? onOriginSelect : onDestinationSelect;

  return (
    <View style={[styles.container, { paddingTop: topInset + 10 }]}>
      <View style={styles.card}>
        {/* FROM INPUT */}
        <View style={styles.inputRow}>
          <View style={styles.dotContainer}>
            <View style={[styles.dot, { backgroundColor: '#007AFF' }]} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="From: My Location"
            placeholderTextColor="#999"
            value={originQuery}
            onChangeText={setOriginQuery}
            onFocus={() => setFocusedField('from')}
          />
          {originQuery.length > 0 ? (
            <TouchableOpacity onPress={handleClearOrigin} style={styles.iconBtn}>
              <Feather name="x" size={18} color="#999" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onUseMyLocation} style={styles.iconBtn}>
              <MaterialIcons name="my-location" size={18} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* CONNECTOR LINE */}
        <View style={styles.connectorRow}>
          <View style={styles.connectorLine} />
          {/* SWAP BUTTON */}
          <TouchableOpacity onPress={onSwap} style={styles.swapBtn}>
            <Feather name="repeat" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* TO INPUT */}
        <View style={styles.inputRow}>
          <View style={styles.dotContainer}>
            <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="To: Search destination..."
            placeholderTextColor="#999"
            value={destinationQuery}
            onChangeText={setDestinationQuery}
            onFocus={() => setFocusedField('to')}
            onSubmitEditing={onSearch}
          />
          {destinationQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearDestination} style={styles.iconBtn}>
              <Feather name="x" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* SEARCH BUTTON */}
        <TouchableOpacity
          onPress={onSearch}
          style={[styles.searchBtn, (!isConnected) && styles.searchBtnDisabled]}
          disabled={!isConnected}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="navigation" size={18} color="#fff" />
              <Text style={styles.searchBtnText}>Find Routes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* AUTOCOMPLETE DROPDOWN */}
      {activeSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={activeSuggestions}
            keyExtractor={(item) => item.name}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => {
                  activeHandler(item);
                  setFocusedField(null);
                }}
              >
                <Feather name="map-pin" size={16} color="#666" style={{ marginRight: 10 }} />
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* RECENT SEARCHES */}
      {recentSearches.length > 0 && activeSuggestions.length === 0 && destinationQuery.length === 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.recentRow}
          contentContainerStyle={{ gap: 8 }}
        >
          {recentSearches.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.recentChip}
              onPress={() => onRecentSelect?.(item)}
            >
              <Feather name="clock" size={12} color="#007AFF" />
              <Text style={styles.recentChipText} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  dotContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  iconBtn: {
    padding: 8,
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
    height: 28,
  },
  connectorLine: {
    width: 2,
    height: 28,
    backgroundColor: '#E0E0E0',
    marginRight: 'auto',
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 10,
    gap: 8,
  },
  searchBtnDisabled: {
    backgroundColor: '#B0B0B0',
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  recentRow: {
    marginTop: 8,
    maxHeight: 36,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    gap: 5,
  },
  recentChipText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    maxWidth: 120,
  },
});
