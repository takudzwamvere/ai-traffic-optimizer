import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Text, FlatList, ScrollView, StyleSheet } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const c = theme.colors;

  const handleClearOrigin = () => {
    setOriginQuery('');
    onUseMyLocation(); // Default back to GPS
  };

  const handleClearDestination = () => {
    setDestinationQuery('');
  };

  const activeSuggestions = focusedField === 'from' ? originSuggestions : destinationSuggestions;
  const activeHandler = focusedField === 'from' ? onOriginSelect : onDestinationSelect;

  const handleSearchPress = () => {
    setIsExpanded(false);
    onSearch();
  };

  return (
    <View style={[styles.container, { paddingTop: topInset + 10 }]}>
      
      {/* COLLAPSED VIEW */}
      {!isExpanded && (
        <TouchableOpacity 
          style={[styles.collapsedBar, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.9}
        >
          <Feather name="search" size={20} color={c.primary} style={{ marginRight: 12 }} />
          <Text style={[styles.collapsedText, { color: destinationQuery ? c.text : c.textMuted }]}>
            {destinationQuery || 'Where to?'}
          </Text>
          <View style={{ flex: 1 }} />
          <Feather name="chevron-down" size={20} color={c.textMuted} />
        </TouchableOpacity>
      )}

      {/* EXPANDED VIEW (Full Card) */}
      {isExpanded && (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {/* HEADER ROW WITH COLLAPSE BTN */}
          <View style={styles.cardHeader}>
            <Text style={[styles.cardHeaderTitle, { color: c.text }]}>Route Planner</Text>
            <TouchableOpacity onPress={() => setIsExpanded(false)} style={styles.collapseBtn}>
              <Feather name="chevron-up" size={22} color={c.textSub} />
            </TouchableOpacity>
          </View>

          {/* FROM INPUT */}
          <View style={styles.inputRow}>
            <View style={styles.dotContainer}>
              <View style={[styles.dot, { backgroundColor: c.primary }]} />
            </View>
            <TextInput
              style={[styles.input, { color: c.text, backgroundColor: c.surface }]}
              placeholder="From: My Location"
              placeholderTextColor={c.textMuted}
              value={originQuery}
              onChangeText={setOriginQuery}
              onFocus={() => setFocusedField('from')}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
            {originQuery.length > 0 ? (
              <TouchableOpacity onPress={handleClearOrigin} style={styles.iconBtn}>
                <Feather name="x" size={18} color={c.textMuted} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onUseMyLocation} style={styles.iconBtn}>
                <MaterialIcons name="my-location" size={18} color={c.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* CONNECTOR LINE */}
          <View style={styles.connectorRow}>
            <View style={[styles.connectorLine, { backgroundColor: c.border }]} />
            <TouchableOpacity onPress={onSwap} style={[styles.swapBtn, { backgroundColor: c.primaryLight }]}>
              <Feather name="repeat" size={16} color={c.primary} />
            </TouchableOpacity>
          </View>

          {/* TO INPUT */}
          <View style={styles.inputRow}>
            <View style={styles.dotContainer}>
              <View style={[styles.dot, { backgroundColor: c.danger }]} />
            </View>
            <TextInput
              style={[styles.input, { color: c.text, backgroundColor: c.surface }]}
              placeholder="To: Search destination..."
              placeholderTextColor={c.textMuted}
              value={destinationQuery}
              onChangeText={setDestinationQuery}
              onFocus={() => setFocusedField('to')}
              onSubmitEditing={handleSearchPress}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
            {destinationQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearDestination} style={styles.iconBtn}>
                <Feather name="x" size={18} color={c.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* SEARCH BUTTON */}
          <TouchableOpacity
            onPress={handleSearchPress}
            style={[styles.searchBtn, { backgroundColor: isConnected ? c.primary : c.textMuted }]}
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
      )}

      {/* AUTOCOMPLETE DROPDOWN */}
      {activeSuggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <FlatList
            data={activeSuggestions}
            keyExtractor={(item, index) => item.placeId || `${item.name}-${index}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.suggestionItem, { borderBottomColor: c.border }]}
                onPress={() => {
                  activeHandler(item);
                  setFocusedField(null);
                }}
              >
                <Feather name="map-pin" size={16} color={c.textSub} style={{ marginRight: 10 }} />
                <Text style={[styles.suggestionText, { color: c.text }]}>{item.name}</Text>
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
              style={[styles.recentChip, { backgroundColor: c.surface }]}
              onPress={() => onRecentSelect?.(item)}
            >
              <Feather name="clock" size={12} color={c.primary} />
              <Text style={[styles.recentChipText, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
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
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
  },
  collapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
  },
  collapsedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingLeft: 4,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  collapseBtn: {
    padding: 4,
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
