import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import {
  getActiveCorridors,
  saveCustomCorridors,
  KNOWN_CORRIDORS
} from '../data/corridors';

export default function RouteCalibrationScreen({ visible, onClose }) {
  const { theme } = useTheme();
  const c = theme.colors;

  // Local state for the editable corridors
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Custom Calibration Form state
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newTypical, setNewTypical] = useState('5');
  const [newPeak, setNewPeak] = useState('7');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (visible) {
      // Load current active corridors
      const active = getActiveCorridors();
      // Deep copy to local state for editing
      setCorridors(JSON.parse(JSON.stringify(active)));
      setShowAddForm(false);
    }
  }, [visible]);

  // Adjust duration of a specific route
  const adjustDuration = (corridorIdx, routeIdx, field, delta) => {
    setCorridors(prev => {
      const copy = [...prev];
      const route = copy[corridorIdx].routes[routeIdx];
      const newVal = Math.max(1, (route[field] || 5) + delta);
      route[field] = newVal;
      return copy;
    });
  };

  // Reset a single corridor to default
  const resetCorridor = (origin, destination, corridorIdx) => {
    const defaultCorridor = KNOWN_CORRIDORS.find(c =>
      c.origin.toLowerCase() === origin.toLowerCase() &&
      c.destination.toLowerCase() === destination.toLowerCase()
    );

    if (defaultCorridor) {
      setCorridors(prev => {
        const copy = [...prev];
        copy[corridorIdx] = JSON.parse(JSON.stringify(defaultCorridor));
        return copy;
      });
    } else {
      // If it was a user-added corridor (not in defaults), delete it
      setCorridors(prev => prev.filter((_, idx) => idx !== corridorIdx));
    }
  };

  // Add custom calibration
  const handleAddCustom = () => {
    if (!newOrigin.trim() || !newDestination.trim() || !newRouteName.trim() || !newKeywords.trim()) {
      Alert.alert('Required Fields', 'Please fill in all fields to add a custom calibration.');
      return;
    }

    const typicalVal = parseInt(newTypical);
    const peakVal = parseInt(newPeak);
    if (isNaN(typicalVal) || typicalVal <= 0 || isNaN(peakVal) || peakVal <= 0) {
      Alert.alert('Invalid Duration', 'Typical and peak durations must be positive numbers.');
      return;
    }

    const keywordsArray = newKeywords.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    const newCorridor = {
      origin: newOrigin.trim(),
      destination: newDestination.trim(),
      routes: [
        {
          name: newRouteName.trim(),
          viaRoads: keywordsArray,
          typicalMinutes: typicalVal,
          peakMinutes: peakVal,
          description: `Custom user-defined override via ${newRouteName.trim()}`,
        }
      ]
    };

    setCorridors(prev => {
      // Check if corridor already exists
      const matchIdx = prev.findIndex(c =>
        c.origin.toLowerCase() === newCorridor.origin.toLowerCase() &&
        c.destination.toLowerCase() === newCorridor.destination.toLowerCase()
      );

      const copy = [...prev];
      if (matchIdx !== -1) {
        // Append route to existing
        copy[matchIdx].routes.push(newCorridor.routes[0]);
      } else {
        copy.push(newCorridor);
      }
      return copy;
    });

    // Reset form
    setNewOrigin('');
    setNewDestination('');
    setNewRouteName('');
    setNewKeywords('');
    setNewTypical('5');
    setNewPeak('7');
    setShowAddForm(false);
    Alert.alert('Success', 'Custom route calibration added!');
  };

  // Save all calibrations
  const handleSave = async () => {
    setLoading(true);
    try {
      // Find the differences between KNOWN_CORRIDORS and current corridors state
      // to only save the overrides.
      const overrides = [];

      corridors.forEach(curr => {
        const defaultCorridor = KNOWN_CORRIDORS.find(c =>
          c.origin.toLowerCase() === curr.origin.toLowerCase() &&
          c.destination.toLowerCase() === curr.destination.toLowerCase()
        );

        if (!defaultCorridor) {
          // This is a completely custom user-added corridor
          overrides.push(curr);
        } else {
          // Check if typical/peak times of default routes are modified
          const changedRoutes = [];
          curr.routes.forEach(cr => {
            const defRoute = defaultCorridor.routes.find(r => r.name === cr.name);
            if (!defRoute || defRoute.typicalMinutes !== cr.typicalMinutes || defRoute.peakMinutes !== cr.peakMinutes) {
              changedRoutes.push(cr);
            }
          });

          if (changedRoutes.length > 0) {
            overrides.push({
              ...curr,
              routes: changedRoutes
            });
          }
        }
      });

      await saveCustomCorridors(overrides);
      Alert.alert('Success', 'Route calibrations saved successfully!');
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to save calibrations. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: c.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: c.textSub }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>Route Calibration</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Text style={[styles.saveText, { color: c.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.subtitle, { color: c.textSub }]}>
            Calibrate travel times (in minutes) for known route corridors to fix inaccurate system defaults.
          </Text>

          {corridors.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.textMuted }]}>No route corridors configured.</Text>
          ) : (
            corridors.map((corridor, corridorIdx) => (
              <View key={`${corridor.origin}-${corridor.destination}`} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <Feather name="navigation" size={16} color={c.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                      {corridor.origin}
                    </Text>
                  </View>
                  <View style={styles.titleRow}>
                    <Feather name="map-pin" size={16} color={COLORS.warning} style={{ marginRight: 6 }} />
                    <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                      {corridor.destination}
                    </Text>
                  </View>
                </View>

                <View style={styles.routesList}>
                  {corridor.routes.map((route, routeIdx) => (
                    <View key={route.name} style={[styles.routeItem, { borderBottomColor: c.border }]}>
                      <View style={styles.routeHeader}>
                        <Text style={[styles.routeName, { color: c.text }]}>{route.name}</Text>
                        {route.description && (
                          <Text style={[styles.routeDesc, { color: c.textMuted }]} numberOfLines={1}>
                            {route.description}
                          </Text>
                        )}
                      </View>

                      {/* Control Panel for typical and peak times */}
                      <View style={styles.controlsRow}>
                        {/* Typical time stepper */}
                        <View style={styles.stepperContainer}>
                          <Text style={[styles.stepperLabel, { color: c.textSub }]}>Typical</Text>
                          <View style={styles.stepperInputGroup}>
                            <TouchableOpacity
                              style={[styles.stepBtn, { backgroundColor: c.primaryLight }]}
                              onPress={() => adjustDuration(corridorIdx, routeIdx, 'typicalMinutes', -1)}
                            >
                              <Feather name="minus" size={14} color={c.primary} />
                            </TouchableOpacity>
                            <Text style={[styles.stepperValue, { color: c.text }]}>{route.typicalMinutes}m</Text>
                            <TouchableOpacity
                              style={[styles.stepBtn, { backgroundColor: c.primaryLight }]}
                              onPress={() => adjustDuration(corridorIdx, routeIdx, 'typicalMinutes', 1)}
                            >
                              <Feather name="plus" size={14} color={c.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Peak time stepper */}
                        <View style={styles.stepperContainer}>
                          <Text style={[styles.stepperLabel, { color: c.textSub }]}>Peak</Text>
                          <View style={styles.stepperInputGroup}>
                            <TouchableOpacity
                              style={[styles.stepBtn, { backgroundColor: c.primaryLight }]}
                              onPress={() => adjustDuration(corridorIdx, routeIdx, 'peakMinutes', -1)}
                            >
                              <Feather name="minus" size={14} color={c.primary} />
                            </TouchableOpacity>
                            <Text style={[styles.stepperValue, { color: c.text }]}>{route.peakMinutes}m</Text>
                            <TouchableOpacity
                              style={[styles.stepBtn, { backgroundColor: c.primaryLight }]}
                              onPress={() => adjustDuration(corridorIdx, routeIdx, 'peakMinutes', 1)}
                            >
                              <Feather name="plus" size={14} color={c.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Reset button */}
                <TouchableOpacity
                  style={[styles.resetBtn, { borderTopColor: c.border }]}
                  onPress={() => resetCorridor(corridor.origin, corridor.destination, corridorIdx)}
                >
                  <Feather name="rotate-ccw" size={14} color={c.textSub} style={{ marginRight: 6 }} />
                  <Text style={[styles.resetBtnText, { color: c.textSub }]}>Reset Corridor to Defaults</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* ADD CUSTOM CALIBRATION FORM */}
          {showAddForm ? (
            <View style={[styles.addCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.addCardHeader}>
                <Text style={[styles.addCardTitle, { color: c.text }]}>New Custom Calibration</Text>
                <TouchableOpacity onPress={() => setShowAddForm(false)}>
                  <Feather name="x" size={20} color={c.textSub} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: c.textSub }]}>Origin Location Name</Text>
                <TextInput
                  style={[styles.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }]}
                  placeholder="e.g. NUST University"
                  placeholderTextColor={c.textMuted}
                  value={newOrigin}
                  onChangeText={setNewOrigin}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: c.textSub }]}>Destination Location Name</Text>
                <TextInput
                  style={[styles.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }]}
                  placeholder="e.g. Bulawayo City Hall"
                  placeholderTextColor={c.textMuted}
                  value={newDestination}
                  onChangeText={setNewDestination}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: c.textSub }]}>Route Via Name</Text>
                <TextInput
                  style={[styles.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }]}
                  placeholder="e.g. via Cecil Ave"
                  placeholderTextColor={c.textMuted}
                  value={newRouteName}
                  onChangeText={setNewRouteName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: c.textSub }]}>Route Match Keywords (comma separated)</Text>
                <TextInput
                  style={[styles.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }]}
                  placeholder="e.g. cecil, fife"
                  placeholderTextColor={c.textMuted}
                  value={newKeywords}
                  onChangeText={setNewKeywords}
                />
                <Text style={styles.hint}>Match route if road names contain any of these keywords.</Text>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: c.textSub }]}>Typical Min</Text>
                  <TextInput
                    style={[styles.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }]}
                    keyboardType="number-pad"
                    value={newTypical}
                    onChangeText={setNewTypical}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: c.textSub }]}>Peak Min</Text>
                  <TextInput
                    style={[styles.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }]}
                    keyboardType="number-pad"
                    value={newPeak}
                    onChangeText={setNewPeak}
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.addButton, { backgroundColor: c.primary }]} onPress={handleAddCustom}>
                <Text style={styles.addButtonText}>Add Route Override</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.showAddBtn, { borderColor: c.primary, borderStyle: 'dashed' }]}
              onPress={() => setShowAddForm(true)}
            >
              <Feather name="plus" size={16} color={c.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.showAddBtnText, { color: c.primary }]}>Add Custom Corridor Override</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cancelBtn: { padding: 8, marginLeft: -8 },
  cancelText: { fontSize: 16 },
  saveBtn: { padding: 8, marginRight: -8, minWidth: 50, alignItems: 'center' },
  saveText: { fontSize: 16, fontWeight: '700' },

  content: { padding: 20 },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  routesList: {
    marginTop: 8,
  },
  routeItem: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 12,
  },
  routeHeader: {
    marginBottom: 8,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  routeDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stepperContainer: {
    flex: 1,
    marginRight: 12,
  },
  stepperLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  stepperInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: '700',
    width: 44,
    textAlign: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  showAddBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  showAddBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  addCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  addCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  hint: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 4,
  },
  addButton: {
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
