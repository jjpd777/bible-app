import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StreakDisplayProps {
  streak: number;
}

export function StreakDisplay({ streak }: StreakDisplayProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prayer Streak</Text>
      <View style={styles.streakContainer}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>DAYS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  streakContainer: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#50C878',
  },
  streakLabel: {
    fontSize: 14,
    color: '#666',
    letterSpacing: 2,
  },
});
