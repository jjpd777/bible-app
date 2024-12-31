import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface PrayerButtonProps {
  onPress: () => void;
}

export function PrayerButton({ onPress }: PrayerButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>Mark Today's Prayer ✓</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#50C878',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
