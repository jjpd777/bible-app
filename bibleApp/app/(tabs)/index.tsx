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
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AudioProvider } from '@/contexts/AudioContext';
import { MusicControl } from '@/components/MusicControl';
import bibleData from '../../assets/bible/rv1909.json';

// List of verses covering both Old and New Testament with correct Spanish Bible book codes
const VERSES = [
  'GEN.1.1',    // Genesis 1:1
  'PSA.23.1',   // Psalms 23:1 (changed from SAL to PSA)
  'PRO.3.5',    // Proverbs 3:5 (correct)
  'ISA.40.31',  // Isaiah 40:31 (correct)
  'JER.29.11',  // Jeremiah 29:11 (correct)
  'MAT.11.28',  // Matthew 11:28 (correct)
  'JHN.3.16',   // John 3:16 (changed from JUA to JHN)
  'ROM.8.28',   // Romans 8:28 (correct)
  'PHP.4.13',   // Philippians 4:13 (changed from FIL to PHP)
  'REV.21.4'    // Revelation 21:4 (changed from APO to REV)
];

const extractVerseFromChapter = (content: string, verseNumber: number): string => {
  const verses = content.split(/(\d+)(?=[A-Z\s])/);
  const verseIndex = verses.findIndex((v) => v.trim() === verseNumber.toString());
  if (verseIndex !== -1 && verses[verseIndex + 1]) {
    return verses[verseIndex + 1].trim();
  }
  return '';
};

const getVerseFromReference = (reference: string): { content: string; reference: string } => {
  const [book, chapter, verse] = reference.split('.');
  
  try {
    console.log('Looking for:', { book, chapter, verse }); // Debug log
    console.log('Available books:', Object.keys(bibleData.books)); // Debug log
    
    const chapterContent = bibleData.books[book].chapters[chapter].content;
    const verseName = `${bibleData.books[book].name} ${chapter}:${verse}`;
    const verseContent = extractVerseFromChapter(chapterContent, parseInt(verse));
    
    return {
      content: verseContent,
      reference: verseName
    };
  } catch (error) {
    console.error('Error finding verse:', error);
    console.error('Book data:', bibleData.books[book]); // Debug log
    return { content: '', reference: '' };
  }
};

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

  const router = useRouter();

  const navigateVerse = async (direction: 'next' | 'prev') => {
    setIsTransitioning(true);
    opacity.value = withTiming(0, { 
      duration: 1200
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
    opacity.value = withTiming(1, { 
      duration: 1500
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
        translateX.value = event.translationX * 0.8;
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
        translateX.value = withTiming(0, { 
          duration: 800
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    const loadVerse = () => {
      try {
        const verse = getVerseFromReference(VERSES[currentVerseIndex]);
        setVerseOfDay(verse);
      } catch (error) {
        console.error('Error loading verse:', error);
      }
    };

    loadVerse();
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
