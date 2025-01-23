import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import React, { useEffect, useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ShareSuccessScreen() {
  const [dailyStreak, setDailyStreak] = useState(0);
  const [totalShares, setTotalShares] = useState(0);

  useEffect(() => {
    // Load streak data from AsyncStorage
    const loadStreakData = async () => {
      try {
        const streakData = await AsyncStorage.getItem('shareStreak');
        if (streakData) {
          const { dailyStreak, totalShares } = JSON.parse(streakData);
          setDailyStreak(dailyStreak);
          setTotalShares(totalShares);
        }
      } catch (error) {
        console.error('Error loading streak data:', error);
      }
    };

    loadStreakData();

    // Auto-dismiss after 2 seconds
    const timer = setTimeout(() => {
      router.back();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/cross.png')}
        style={styles.crossImage}
      />
      <Animated.View 
        entering={FadeIn.duration(2000)}
        style={styles.content}
      >
        <Text style={styles.emoji}>🙌</Text>
        <Text style={styles.title}>¡Gracias por compartir!</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{dailyStreak}</Text>
            <Text style={styles.statLabel}>Días seguidos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalShares}</Text>
            <Text style={styles.statLabel}>Total compartido</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'black',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'black',
  },
  statLabel: {
    fontSize: 14,
    color: 'black',
    opacity: 0.9,
  },
  crossImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
    position: 'absolute',
    top: 120,
  },
}); 