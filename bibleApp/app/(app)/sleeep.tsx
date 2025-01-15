import { useState, useEffect } from 'react';
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
  const { isPlaying, playVerse, pauseVerse, getPosition } = useVerseAudio();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(async () => {
        const position = await getPosition();
        setProgress(position / 1000);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlayPress = async () => {
    if (isPlaying) {
      await pauseVerse();
    } else {
      await playVerse(VERSES[0].audio);
    }
  };

  return (
    <View style={styles.textContainer}>
      <View style={styles.textOverlay}>
        <ThemedText style={styles.verseText}>
          {VERSES[0].text}
        </ThemedText>
      </View>
      
      <View style={styles.playbackCard}>
        <ThemedText style={styles.reference}>
          {VERSES[0].verse}
        </ThemedText>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: `${Math.min((progress / 30) * 100, 100)}%` }]} />
        </View>
        <TouchableOpacity 
          style={styles.playButton} 
          onPress={handlePlayPress}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={24} 
            color="#000000" 
          />
        </TouchableOpacity>
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
    marginBottom: 20,
  },
  verseText: {
    color: '#ffffff',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  playbackCard: {
    backgroundColor: '#F4D03F',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
  },
  reference: {
    color: '#000000',
    fontSize: 18,
    fontStyle: 'italic',
  },
  playButton: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 25,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    flex: 1,
    marginHorizontal: 15,
  },
  progress: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
});
