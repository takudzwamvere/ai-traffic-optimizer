import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function RouteBottomSheet({ 
  selectedRoute, 
  isSheetVisible, 
  isSheetExpanded, 
  toggleSheet, 
  routes, 
  handleRouteSelect 
}) {
  const [predictionTime, setPredictionTime] = React.useState(0); // 0, 15, 30

  if (!isSheetVisible || !selectedRoute) return null;

  // Helper to get data for current time
  const getData = (route) => route.predictions ? route.predictions[predictionTime] : { formattedDuration: route.formattedDuration };
  const currentData = getData(selectedRoute);

  return (
    <View style={[styles.bottomSheet, { height: isSheetExpanded ? '65%' : 240 }]}>
      
      {/* CLICKABLE HEADER */}
      <TouchableOpacity onPress={toggleSheet} activeOpacity={0.9} style={styles.headerArea}>
        <View style={styles.sheetHandle} />
        
        {/* PREDICTION TABS */}
        <View style={styles.tabContainer}>
           {[0, 15, 30].map(time => (
             <TouchableOpacity 
               key={time} 
               style={[styles.tab, predictionTime === time && styles.activeTab]}
               onPress={() => setPredictionTime(time)}
             >
               <Text style={[styles.tabText, predictionTime === time && styles.activeTabText]}>
                 {time === 0 ? 'Now' : `+${time} min`}
               </Text>
             </TouchableOpacity>
           ))}
        </View>

        <View style={styles.mainCard}>
          <View style={styles.routeRow}>
              <View style={styles.routeInfo}>
                {/* Route Info Row */}
                <View style={{flexDirection:'row', alignItems:'center'}}>
                  <Text style={[styles.cardTitle, {color: selectedRoute.uiColor}]}>{selectedRoute.uiLabel}</Text>
                  <View style={styles.dotSeparator}/>
                  <Text style={styles.cardReason}>{selectedRoute.uiReason}</Text>
                </View>
                
                {/* Time & Distance */}
                <View style={{flexDirection: 'row', alignItems: 'baseline', marginTop: 2}}>
                    <Text style={styles.duration}>{currentData.formattedDuration}</Text>
                    <Text style={styles.distance}> {selectedRoute.distanceKm} km</Text>
                </View>
              </View>
              
              {/* TOGGLE INDICATOR (Chevron) */}
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
      
      {/* SCROLLABLE CONTENT (Visible when expanded) */}
      {isSheetExpanded && (
         <ScrollView style={styles.expandedContent} contentContainerStyle={{paddingBottom: 40}}>
            <View style={styles.separator} />
            
            <Text style={styles.sectionTitle}>Alternative Routes ({predictionTime === 0 ? 'Current' : `In ${predictionTime} mins`})</Text>
            
            {routes.map((route, index) => {
                const isSelected = selectedRoute === route;
                const rData = getData(route);
                
                return (
                <TouchableOpacity 
                    key={index} 
                    style={[styles.altRouteCard, isSelected && {backgroundColor: COLORS.grayLight, borderColor: COLORS.border, borderWidth: 1}]}
                    onPress={() => handleRouteSelect(route)}
                >
                    <View style={styles.routeRow}>
                        <View>
                            <Text style={[styles.altDuration, {color: isSelected ? COLORS.text : '#666'}]}>{rData.formattedDuration}</Text>
                            <Text style={styles.altDistance}>{route.distanceKm} km</Text>
                        </View>
                        <View style={{alignItems:'flex-end'}}>
                            <Text style={[styles.altLabel, {color: route.uiColor}]}>{route.uiLabel}</Text>
                            {isSelected && <Feather name="check" size={16} color={COLORS.text} style={{marginTop:4}} />}
                        </View>
                    </View>
                </TouchableOpacity>
                );
            })}
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
  sheetHandle: { width: 50, height: 5, backgroundColor: COLORS.grayMedium, borderRadius: 10, alignSelf: 'center', marginTop: 12, marginBottom: 5 },
  
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F0F0F0', marginHorizontal: 5 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: 'white' },

  mainCard: { paddingHorizontal: 25 },
  dotSeparator: { width:4, height:4, borderRadius:2, backgroundColor:'#999', marginHorizontal:8 },
  cardTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  cardReason: { fontSize: 13, color: '#666', fontWeight: '500' },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeInfo: { flex: 1 },
  duration: { fontSize: 30, fontWeight: '300', color: '#222', letterSpacing: -1 },
  distance: { fontSize: 16, color: '#777', fontWeight: '400', marginBottom: 4 },
  
  toggleButton: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: '#F5F7FA', 
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 10
  },

  expandedContent: { flex: 1, paddingHorizontal: 25 },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#444', marginBottom: 15, marginTop: 5 },
  
  altRouteCard: { padding: 16, backgroundColor: '#fff', borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  altDuration: { fontSize: 18, fontWeight: '600' },
  altDistance: { fontSize: 13, color: '#888', marginTop: 2 },
  altLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }
});
