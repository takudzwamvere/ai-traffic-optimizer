import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import DeparturePlanner from './DeparturePlanner';
import TrafficForecastSummary from './TrafficForecastSummary';
import TrafficTrendIndicator from './TrafficTrendIndicator';

export default function RouteBottomSheet({ 
  selectedRoute, 
  isSheetVisible, 
  isSheetExpanded, 
  toggleSheet, 
  routes, 
  handleRouteSelect,
  departureMins,
  onDepartureChange,
  weather,
  children,
}) {

  if (!isSheetVisible || !selectedRoute) return null;

  // Get prediction data for the current time tab (now vs departure)
  // We use the departure offset to pick the right prediction bucket
  const getBestBucket = (route) => {
    if (!route.predictions) return { formattedDuration: route.formattedDuration };
    // Map departureMins to the closest pre-computed bucket (0, 15, 30)
    if (departureMins <= 7)  return route.predictions[0];
    if (departureMins <= 22) return route.predictions[15];
    return route.predictions[30];
  };

  const currentData = getBestBucket(selectedRoute);

  // Compute trend: compare the color at "now" vs color at "departure"
  const nowColor = selectedRoute.predictions?.[0]?.color || selectedRoute.uiColor;
  const futureColor = currentData?.color || selectedRoute.uiColor;

  return (
    <View style={[styles.bottomSheet, { height: isSheetExpanded ? '70%' : 250 }]}>
      
      {/* CLICKABLE HEADER */}
      <TouchableOpacity onPress={toggleSheet} activeOpacity={0.9} style={styles.headerArea}>
        <View style={styles.sheetHandle} />
        
        {/* HEADER CARD */}
        <View style={styles.mainCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeInfo}>
              {/* Route Label Row */}
              <View style={{ flexDirection:'row', alignItems:'center', flexWrap: 'wrap', gap: 6 }}>
                <Text style={[styles.cardTitle, { color: selectedRoute.uiColor }]}>{selectedRoute.uiLabel}</Text>
                <View style={styles.dotSeparator}/>
                <Text style={styles.cardReason}>{selectedRoute.uiReason}</Text>
                {selectedRoute.corridorName && (
                  <Text style={styles.corridorName}>{selectedRoute.corridorName}</Text>
                )}
              </View>

              {/* Trend Indicator row */}
              <View style={{ marginTop: 4 }}>
                <TrafficTrendIndicator
                  nowColor={nowColor}
                  futureColor={futureColor}
                  departureMins={departureMins}
                />
              </View>
              
              {/* ETA and Distance */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <Text style={styles.duration}>{currentData.formattedDuration}</Text>
                <Text style={styles.distance}> {selectedRoute.distanceKm} km</Text>
                {departureMins > 0 && (
                  <Text style={styles.departureTag}> · Dep. +{departureMins}m</Text>
                )}
              </View>
            </View>
            
            {/* TOGGLE CHEVRON */}
            <View style={styles.toggleButton}>
              <Feather 
                name={isSheetExpanded ? "chevron-down" : "chevron-up"} 
                size={28} 
                color={COLORS.primary} 
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* EXPANDED CONTENT */}
      {isSheetExpanded && (
        <ScrollView style={styles.expandedContent} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.separator} />

          {/* DEPARTURE PLANNER */}
          <DeparturePlanner
            departureMins={departureMins}
            onDepartureChange={onDepartureChange}
          />

          {/* AI TRAFFIC FORECAST SUMMARY */}
          <TrafficForecastSummary
            routes={routes}
            departureMins={departureMins}
            weather={weather}
          />

          <Text style={styles.sectionTitle}>
            Alternative Routes {departureMins === 0 ? '(Current)' : `(Dep. +${departureMins} min)`}
          </Text>
          
          {/* ROUTE ALTERNATIVES */}
          {routes.map((route, index) => {
            const isSelected = selectedRoute === route;
            const rData = getBestBucket(route);
            
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.altRouteCard, isSelected && { backgroundColor: COLORS.grayLight, borderColor: COLORS.border, borderWidth: 1 }]}
                onPress={() => handleRouteSelect(route)}
              >
                <View style={styles.routeRow}>
                  <View>
                    <Text style={[styles.altDuration, { color: isSelected ? COLORS.text : '#666' }]}>{rData.formattedDuration}</Text>
                    <Text style={styles.altDistance}>{route.distanceKm} km</Text>
                  </View>
                  <View style={{ alignItems:'flex-end' }}>
                    <Text style={[styles.altLabel, { color: route.uiColor }]}>{route.uiLabel}</Text>
                    {route.corridorName && (
                      <Text style={styles.altCorridorName}>{route.corridorName}</Text>
                    )}
                    {isSelected && <Feather name="check" size={16} color={COLORS.text} style={{ marginTop: 4 }} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Road Conditions Panel (injected as children) */}
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', 
    borderTopLeftRadius: 25, borderTopRightRadius: 25,
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    overflow: 'hidden'
  },
  headerArea: { width: '100%', backgroundColor: 'white', paddingBottom: 15 },
  sheetHandle: { width: 50, height: 5, backgroundColor: COLORS.grayMedium, borderRadius: 10, alignSelf: 'center', marginTop: 12, marginBottom: 10 },

  mainCard: { paddingHorizontal: 20 },
  dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#999' },
  cardTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  cardReason: { fontSize: 13, color: '#666', fontWeight: '500' },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeInfo: { flex: 1 },
  duration: { fontSize: 30, fontWeight: '300', color: '#222', letterSpacing: -1 },
  distance: { fontSize: 16, color: '#777', fontWeight: '400', marginBottom: 4 },
  departureTag: { fontSize: 13, color: '#007AFF', fontWeight: '600' },

  toggleButton: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: '#F5F7FA', 
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 10
  },

  expandedContent: { flex: 1, paddingHorizontal: 20 },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#444', marginBottom: 15, marginTop: 10 },
  
  altRouteCard: { padding: 16, backgroundColor: '#fff', borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  altDuration: { fontSize: 18, fontWeight: '600' },
  altDistance: { fontSize: 13, color: '#888', marginTop: 2 },
  altLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  corridorName: { fontSize: 11, color: '#007AFF', fontWeight: '600', marginLeft: 8 },
  altCorridorName: { fontSize: 10, color: '#007AFF', fontWeight: '500', marginTop: 2 },
});
