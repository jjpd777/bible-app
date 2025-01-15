import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/ThemedText';
import { MusicControl } from '@/components/MusicControl';
import { AudioProvider } from '@/contexts/AudioContext';
import { VerseAudioProvider, useVerseAudio } from '@/contexts/VerseAudioContext';
import { VERSE_AUDIO_FILES } from '@/utils/audioImports';

const VERSES = [
  {
    verse: "Salmos 34:8",
    text: "Gustad, y ved que es bueno Jehová; Dichoso el hombre que confía en él.",
    testament: "old",
    audio: VERSE_AUDIO_FILES['SAL034']
  }
];

function VerseDisplay() {
  const { isPlaying, playVerse, stopVerse } = useVerseAudio();

  const handlePlayPress = async () => {
    if (isPlaying) {
      await stopVerse();
    } else {
      console.log('Playing audio file:', VERSES[0].audio);
      await playVerse(VERSES[0].audio);
    }
  };

  return (
    <View style={styles.textContainer}>
      <View style={styles.textOverlay}>
        <ThemedText style={styles.verseText}>
          {VERSES[0].text}
        </ThemedText>
        <View style={styles.controlsRow}>
          <ThemedText style={styles.reference}>
            {VERSES[0].verse}
          </ThemedText>
          <TouchableOpacity 
            style={styles.playButton} 
            onPress={handlePlayPress}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={24} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <AudioProvider>
      <VerseAudioProvider>
        <GestureHandlerRootView style={styles.container}>
          <View style={styles.musicControlWrapper}>
            <MusicControl />
          </View>
          <VerseDisplay />
        </GestureHandlerRootView>
      </VerseAudioProvider>
    </AudioProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  musicControlWrapper: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  verseText: {
    color: '#ffffff',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  reference: {
    color: '#ffffff',
    fontSize: 18,
    fontStyle: 'italic',
    marginRight: 10,
  },
  playButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
});
