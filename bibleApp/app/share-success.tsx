import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import React, { useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function ShareSuccessScreen() {
  useEffect(() => {
    // Automatically return to home after 2 seconds
    const timer = setTimeout(() => {
      router.back();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        entering={FadeIn.duration(400)}
        style={styles.content}
      >
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>¡Gracias por compartir!</Text>
        <Text style={styles.subtitle}>Sigues bendiciendo a otros</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.primary,
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
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
}); 