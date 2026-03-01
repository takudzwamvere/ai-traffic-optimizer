import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const QUICK_OPTIONS = [
  { label: 'Leave Now', offset: 0 },
  { label: '+10 min', offset: 10 },
  { label: '+20 min', offset: 20 },
  { label: '+45 min', offset: 45 },
];

/**
 * DeparturePlanner
 * 
 * Allows the user to select a future departure time.
 * Reuses the existing calculateSegmentSpeed() engine via timeOffset.
 * No new API calls — all predictions are computed locally.
 */
export default function DeparturePlanner({ departureMins, onDepartureChange }) {
  const [customVisible, setCustomVisible] = useState(false);
  const [customHours, setCustomHours] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');

  const handleCustomSubmit = () => {
    const h = parseInt(customHours) || 0;
    const m = parseInt(customMinutes) || 0;
    const totalMins = h * 60 + m;
    if (totalMins > 0) {
      onDepartureChange(totalMins);
    }
    setCustomVisible(false);
    setCustomHours('');
    setCustomMinutes('');
  };

  const isCustomActive = !QUICK_OPTIONS.some(o => o.offset === departureMins) && departureMins > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Feather name="clock" size={14} color="#555" />
        <Text style={styles.sectionLabel}>Departure Time</Text>
      </View>

      <View style={styles.pillRow}>
        {QUICK_OPTIONS.map(opt => {
          const isActive = departureMins === opt.offset;
          return (
            <TouchableOpacity
              key={opt.offset}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onDepartureChange(opt.offset)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Custom time button */}
        <TouchableOpacity
          style={[styles.pill, isCustomActive && styles.pillActive]}
          onPress={() => setCustomVisible(true)}
          activeOpacity={0.75}
        >
          <Feather
            name="edit-2"
            size={12}
            color={isCustomActive ? '#fff' : '#007AFF'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.pillText, isCustomActive && styles.pillTextActive]}>
            {isCustomActive ? `+${departureMins}m` : 'Custom'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Time Picker Modal */}
      <Modal
        visible={customVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomVisible(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setCustomVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Custom Departure</Text>
            <Text style={styles.modalSubtitle}>How far in the future do you plan to leave?</Text>
            <View style={styles.timeInputRow}>
              <View style={styles.timeInputGroup}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  value={customHours}
                  onChangeText={setCustomHours}
                  maxLength={2}
                />
                <Text style={styles.timeLabel}>hours</Text>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeInputGroup}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  maxLength={2}
                />
                <Text style={styles.timeLabel}>minutes</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleCustomSubmit}>
              <Text style={styles.confirmBtnText}>Set Departure Time</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCustomVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 0.3,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F0F5FF',
    borderWidth: 1,
    borderColor: '#D8E4FF',
  },
  pillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  pillTextActive: {
    color: '#fff',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7B9A',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  timeInputGroup: {
    alignItems: 'center',
    gap: 6,
  },
  timeInput: {
    width: 80,
    height: 56,
    backgroundColor: '#F5F7FF',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    borderWidth: 2,
    borderColor: '#D8E4FF',
  },
  timeLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 20,
  },
  confirmBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
});
