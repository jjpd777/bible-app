import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from 'react-native-reanimated';

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
  },
  {
    verse: "Salmos 23",
    text: "Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar; junto a aguas de reposo me pastoreará.",
    testament: "old",
    audio: VERSE_AUDIO_FILES['SAL023']
  }
];

function VerseDisplay() {
  const { isPlaying, playVerse, pauseVerse, getPosition } = useVerseAudio();
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const translateX = useSharedValue(0);

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

  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -50 && currentVerseIndex < VERSES.length - 1) {
        // Swipe left
        setCurrentVerseIndex(prev => prev + 1);
      } else if (e.translationX > 50 && currentVerseIndex > 0) {
        // Swipe right
        setCurrentVerseIndex(prev => prev - 1);
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePlayPress = async () => {
    if (isPlaying) {
      await pauseVerse();
    } else {
      await playVerse(VERSES[currentVerseIndex].audio);
    }
  };

  const handleLikePress = () => {
    setIsLiked(!isLiked);
  };

  const handleSharePress = async () => {
    try {
      await Share.share({
        message: `${VERSES[0].verse}\n${VERSES[0].text}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const goToNextVerse = () => {
    if (currentVerseIndex < VERSES.length - 1) {
      setCurrentVerseIndex(prev => prev + 1);
    }
  };

  const goToPreviousVerse = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(prev => prev - 1);
    }
  };

  return (
    <View style={styles.textContainer}>
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          onPress={goToPreviousVerse} 
          style={styles.navButton}
          disabled={currentVerseIndex === 0}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.textOverlay}>
          <ThemedText style={styles.verseText}>
            {VERSES[currentVerseIndex].text}
          </ThemedText>
        </View>

        <TouchableOpacity 
          onPress={goToNextVerse} 
          style={styles.navButton}
          disabled={currentVerseIndex === VERSES.length - 1}
        >
          <Ionicons name="chevron-forward" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.playbackCard}>
        <View style={styles.leftSection}>
          <ThemedText style={styles.reference}>
            {VERSES[currentVerseIndex].verse}
          </ThemedText>
          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: `${Math.min((progress / 30) * 100, 100)}%` }]} />
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={handleLikePress} style={styles.iconButton}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color="#000000" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handlePlayPress} style={styles.playButton}>
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={24} 
              color="#000000" 
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSharePress} style={styles.iconButton}>
            <Ionicons 
              name="share-outline" 
              size={24} 
              color="#000000" 
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
          <View style={styles.textOverlay}>
        <ThemedText style={styles.verseText}>
          {"HELLO"}
        </ThemedText>
      </View>
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
    width: '80%',
  },
  leftSection: {
    marginBottom: 10,
  },
  reference: {
    color: '#000000',
    fontSize: 18,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginBottom: 10,
  },
  progress: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  iconButton: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 25,
  },
  playButton: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 25,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
  },
});
