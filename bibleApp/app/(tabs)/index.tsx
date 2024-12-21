import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

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

  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = 100;

  const navigateVerse = (direction: 'next' | 'prev') => {
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentVerseIndex + 1) % VERSES.length;
    } else {
      newIndex = (currentVerseIndex - 1 + VERSES.length) % VERSES.length;
    }
    setCurrentVerseIndex(newIndex);
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(navigateVerse)('next');
      } else if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(navigateVerse)('prev');
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
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
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.textContainer, animatedStyle]}>
          <ThemedText style={styles.verseText}>{verseOfDay.content}</ThemedText>
          <ThemedText style={styles.reference}>{verseOfDay.reference}</ThemedText>
        </Animated.View>
      </GestureDetector>

      <ThemedView style={styles.navigationContainer}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateVerse('prev')}
        >
          <Ionicons name="chevron-back" size={32} color="gray" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateVerse('next')}
        >
          <Ionicons name="chevron-forward" size={32} color="gray" />
        </TouchableOpacity>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  verseText: {
    fontSize: 28,
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    fontFamily: 'System',
  },
  reference: {
    fontSize: 20,
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  navButton: {
    padding: 16,
  },
});
