import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Dimensions, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AudioProvider } from '@/contexts/AudioContext';
import { MusicControl } from '@/components/MusicControl';

// List of verses covering both Old and New Testament
const VERSES = [
  'GEN.1.1',  // "In the beginning God created..."
  'PSA.23.1', // "The Lord is my shepherd..."
  'PRO.3.5',  // "Trust in the Lord with all your heart..."
  'ISA.40.31', // "But those who hope in the Lord..."
  'JER.29.11', // "For I know the plans I have for you..."
  'MAT.11.28', // "Come to me, all you who are weary..."
  'JHN.3.16', // "For God so loved the world..."
  'ROM.8.28', // "And we know that in all things..."
  'PHP.4.13', // "I can do all things through Christ..."
  'REV.21.4'  // "He will wipe every tear..."
];

export default function HomeScreen() {
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [verseOfDay, setVerseOfDay] = useState({
    content: '',
    reference: ''
  });
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const SWIPE_THRESHOLD = 100;
  const VERTICAL_SWIPE_THRESHOLD = -50;

  const navigateVerse = async (direction: 'next' | 'prev') => {
    setIsTransitioning(true);
    // Even slower, more peaceful fade out
    opacity.value = withTiming(0, { 
      duration: 1200  // Increased from 800 to 1200
    }, () => {
      runOnJS(setIsTransitioning)(false);
      runOnJS(updateVerseIndex)(direction);
    });
  };

  const updateVerseIndex = (direction: 'next' | 'prev') => {
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentVerseIndex + 1) % VERSES.length;
    } else {
      newIndex = (currentVerseIndex - 1 + VERSES.length) % VERSES.length;
    }
    setCurrentVerseIndex(newIndex);
    // Slower, more meditative fade in
    opacity.value = withTiming(1, { 
      duration: 1500  // Increased from 1000 to 1500
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${verseOfDay.content} - ${verseOfDay.reference}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isTransitioning) {
        translateX.value = event.translationX * 0.8; // Added dampening factor
        if (event.translationY < VERTICAL_SWIPE_THRESHOLD && !isMenuVisible) {
          runOnJS(setIsMenuVisible)(true);
        }
        if (event.translationY > Math.abs(VERTICAL_SWIPE_THRESHOLD) && isMenuVisible) {
          runOnJS(setIsMenuVisible)(false);
        }
      }
    })
    .onEnd((event) => {
      if (!isTransitioning) {
        if (event.translationX < -SWIPE_THRESHOLD) {
          runOnJS(navigateVerse)('next');
        } else if (event.translationX > SWIPE_THRESHOLD) {
          runOnJS(navigateVerse)('prev');
        }
        // Even gentler return to center
        translateX.value = withTiming(0, { 
          duration: 800  // Increased from 600 to 800
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  // Updated extractVerseText function to handle HTML string
  const extractVerseText = (content: any) => {
    if (!content) {
      console.log('No content provided');
      return '';
    }

    // If content is a string, remove HTML tags and return the text
    if (typeof content === 'string') {
      // Remove HTML tags and clean up the text
      const textContent = content
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
        .replace(/data-[^=]+=["'][^"']*["']/g, '') // Remove data attributes
        .trim();

      console.log('Extracted text:', textContent);
      return textContent;
    }

    console.log('Unexpected content format:', content);
    return '';
  };

  useEffect(() => {
    const fetchVerse = async () => {
      try {
        const response = await fetch(
          `https://api.scripture.api.bible/v1/bibles/592420522e16049f-01/verses/${VERSES[currentVerseIndex]}`,
          {
            headers: {
              'api-key': 'a199ed5ad2b126cdc4b2630580930967',
            },
          }
        );
        const data = await response.json();
        
        setVerseOfDay({
          content: extractVerseText(data.data.content),
          reference: data.data.reference
        });
      } catch (error) {
        console.error('Error fetching verse:', error);
      }
    };

    fetchVerse();
  }, [currentVerseIndex]);

  return (
    <AudioProvider>
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.musicControlWrapper}>
          <MusicControl />
        </View>

        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.textContainer, animatedStyle]}>
            <ThemedText style={styles.verseText}>{verseOfDay.content}</ThemedText>
            <ThemedText style={styles.reference}>{verseOfDay.reference}</ThemedText>
          </Animated.View>
        </GestureDetector>

        {isMenuVisible && (
          <Animated.View 
            style={styles.menuOverlay}
            entering={FadeIn.duration(1200).delay(100)}
            exiting={FadeOut.duration(1200)}
          >
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="heart-outline" size={24} color="#666" />
              <ThemedText style={styles.menuText}>Like</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="#666" />
              <ThemedText style={styles.menuText}>Share</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="hand-right-outline" size={24} color="#666" />
              <ThemedText style={styles.menuText}>Devotional</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        )}
      </GestureHandlerRootView>
    </AudioProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  musicControlWrapper: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 999, // Ensure it's above other content
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  verseText: {
    fontSize: 28,
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333333',
    fontFamily: 'System',
  },
  reference: {
    fontSize: 20,
    textAlign: 'center',
    color: '#666666',
    fontWeight: '500',
  },
  menuOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    alignItems: 'center',
    padding: 10,
  },
  menuText: {
    marginTop: 5,
    fontSize: 12,
    color: '#666666',
  },
});
