import { useState, useEffect, useRef } from 'react';
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
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import { VERSE_AUDIO_FILES } from '@/utils/audioImports';
import { Audio } from 'expo-av';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AudioProvider } from '@/contexts/AudioContext';
import { MusicControl } from '@/components/MusicControl';
import bibleData from '../../assets/bible/rv1909.json';

// List of verses covering both Old and New Testament with correct Spanish Bible book codes
const VERSES = [
  'PSA.23.1',
  'PSA.34.1',
  'PSA.46.10',
  'ISA.26.3',
  'ISA.41.1',

  'MAT.11.28',
  'JHN.14.1',
  'JHN.16.4',
  'ROM.8.28',
  'PHP.4.13',
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

// Add background images with static requires
const backgroundImages = {
  images: [
    require('../../assets/backgrounds/image_01.jpg'),
    require('../../assets/backgrounds/image_02.jpg'),
    require('../../assets/backgrounds/image_03.jpg'),
    require('../../assets/backgrounds/image_04.jpg'),
    require('../../assets/backgrounds/image_05.jpg'),
    require('../../assets/backgrounds/image_06.jpg'),
    require('../../assets/backgrounds/image_07.jpg'),
    require('../../assets/backgrounds/image_08.jpg'),
    require('../../assets/backgrounds/image_09.jpg'),
    require('../../assets/backgrounds/image_10.jpg'),
    require('../../assets/backgrounds/image_11.jpg'),
    require('../../assets/backgrounds/image_12.jpg'),
    require('../../assets/backgrounds/image_13.jpg'),
    require('../../assets/backgrounds/image_14.jpg'),
    require('../../assets/backgrounds/image_15.jpg'),
    require('../../assets/backgrounds/image_16.jpg'),
    require('../../assets/backgrounds/image_17.jpg'),
    require('../../assets/backgrounds/image_18.jpg'),
    require('../../assets/backgrounds/image_19.jpg'),
    require('../../assets/backgrounds/image_20.jpg')
  ]
};

const getRandomBackground = () => {
  const randomIndex = Math.floor(Math.random() * backgroundImages.images.length);
  return backgroundImages.images[randomIndex];
};

export default function HomeScreen() {
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [verseOfDay, setVerseOfDay] = useState({
    content: '',
    reference: ''
  });
  const [currentBackground, setCurrentBackground] = useState(getRandomBackground());
  const [nextBackground, setNextBackground] = useState(currentBackground);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isTimerMenuVisible, setIsTimerMenuVisible] = useState(false);

  const backgroundOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  
  const SWIPE_THRESHOLD = 100;
  const VERTICAL_SWIPE_THRESHOLD = -50;

  const router = useRouter();

  const viewRef = useRef(null);

  const navigateVerse = async (direction: 'next' | 'prev') => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    // Prepare next background
    const newBackground = getRandomBackground();
    setNextBackground(newBackground);
    
    // 1. Fade out text
    textOpacity.value = withTiming(0, {
      duration: 800,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    }, () => {
      // Update verse index here, when text is invisible
      runOnJS(updateVerseIndex)(direction);
      
      // 2. Fade out current background
      backgroundOpacity.value = withTiming(0, {
        duration: 1000,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      }, () => {
        // 3. Switch backgrounds and start fade in
        runOnJS(setCurrentBackground)(newBackground);
        backgroundOpacity.value = withTiming(1, {
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        }, () => {
          // 4. Fade in text
          textOpacity.value = withTiming(1, {
            duration: 800,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          }, () => {
            runOnJS(setIsTransitioning)(false);
          });
        });
      });
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
  };

  const handleShare = async () => {
    try {
      // Capture the current view
      const imageURI = await captureRef(viewRef, {
        format: 'jpg',
        quality: 0.8,
      });

      // Share both the image and text
      await Share.share({
        message: `${verseOfDay.content} - ${verseOfDay.reference}`,
        url: imageURI, // This will attach the image
      }, {
        // Specify dialogTitle for Android
        dialogTitle: 'Share Bible Verse',
        // Define which sharing options to show
        tintColor: '#000000',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleFullPassagePress = () => {
    const [book, chapter, verse] = VERSES[currentVerseIndex].split('.');
    router.push({
      pathname: 'bible',
      params: {
        initialBook: book,
        initialChapter: chapter,
        initialVerse: verse
      }
    });
  };

  const handleInstagramShare = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;

      // Create a temporary view with both image and text
      const imageRef = useRef(null);
      
      // Capture the composed view
      const imageURI = await captureRef(imageRef, {
        format: 'jpg',
        quality: 1,
        result: 'file'
      });

      await MediaLibrary.saveToLibraryAsync(imageURI);
      alert('Image saved!');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSaveBackground = async () => {
    try {
      console.log('Attempting to save background image...');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to save the image!');
        return;
      }

      // Get the raw background image file
      const assetPath = Image.resolveAssetSource(currentBackground).uri;
      console.log('Asset path:', assetPath);
      
      // Add extension since we know these are JPG files in assets/backgrounds
      const finalPath = assetPath + '.jpg';
      console.log('Final path with extension:', finalPath);
      
      await MediaLibrary.saveToLibraryAsync(finalPath);
      alert('Background image saved to camera roll!');
    } catch (error) {
      console.error('Error saving background:', error);
      alert('Failed to save background: ' + error.message);
    }
  };

  // Add function to get available voices (useful for debugging)
  const logAvailableVoices = async () => {
    const voices = await Speech.getAvailableVoicesAsync();
    console.log('Available voices:', voices);
  };

  // Optional: Call this in useEffect to see available voices
  useEffect(() => {
    logAvailableVoices();
  }, []);

  const handlePlayVerse = async () => {
    try {
      if (isPlaying) {
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
        setIsPlaying(false);
        setSound(null);
        return;
      }

      // Convert verse reference to audio key format
      const [book, chapter] = VERSES[currentVerseIndex].split('.');
      let audioKey = '';
      
      // Map the book codes to match audio file naming
      const bookMap: { [key: string]: string } = {
        'PSA': 'SAL',
        'JHN': 'JUAN',
        'PHP': 'FIL'
      };
      
      const mappedBook = bookMap[book] || book;
      audioKey = `${mappedBook}${chapter.padStart(3, '0')}`;

      const audioFile = VERSE_AUDIO_FILES[audioKey as keyof typeof VERSE_AUDIO_FILES];
      if (!audioFile) {
        console.error('Audio file not found for:', audioKey);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(audioFile);
      setSound(newSound);
      setIsPlaying(true);
      
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      setSound(null);
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

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
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

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'false');
      router.replace('/onboarding');  // Update this line
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <AudioProvider>
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.topButtonsContainer}>
          <TouchableOpacity 
            style={styles.devButton} 
            onPress={resetOnboarding}
          >
            <ThemedText style={styles.devButtonText}>R</ThemedText>
          </TouchableOpacity>
{/* 
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-circle-outline" size={48} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.streakButton} 
            onPress={() => router.push('/prayer-tracker')}
          >
            <Ionicons name="hand-left-outline" size={24} color="#666666" />
            <ThemedText style={styles.profileNumber}>22</ThemedText>
          </TouchableOpacity> */}

        </View>

        <View style={styles.musicControlWrapper}>
          <MusicControl />
        </View>

        {/* Background layer with cross-fade */}
        <View style={StyleSheet.absoluteFill}>
          <Animated.Image
            source={nextBackground}
            style={[styles.backgroundImage]}
            resizeMode="cover"
          />
          <Animated.Image
            source={currentBackground}
            style={[
              styles.backgroundImage, 
              backgroundStyle
            ]}
            resizeMode="cover"
          />
        </View>

        {/* Text content with fade */}
        <GestureDetector gesture={gesture}>
          <Animated.View 
            ref={viewRef}
            style={[
              styles.textContainer,
              styles.pageContainer,
              textStyle
            ]}
          >
            <View style={styles.textOverlay}>
              <ThemedText style={styles.verseText}>
                {verseOfDay.content}
              </ThemedText>
              <ThemedText style={styles.reference}>
                {verseOfDay.reference}
              </ThemedText>
              <TouchableOpacity 
                style={styles.playButton} 
                onPress={handlePlayVerse}
              >
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={24} 
                  color="#ffffff" 
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </GestureDetector>

        {isMenuVisible && (
          <Animated.View 
            style={styles.menuContainer}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
          >
            <View style={styles.menuCard}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={24} color="#666666" />
                <ThemedText style={styles.menuText}>Share</ThemedText>
              </TouchableOpacity>

              {/* <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleFullPassagePress}
              >
                <Ionicons name="book-outline" size={24} color="#666666" />
                <ThemedText style={styles.menuText}>Full Passage!?</ThemedText>
              </TouchableOpacity> */}

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {}}
              >
                <Ionicons name="moon-outline" size={24} color="#666666" />
                <ThemedText style={styles.menuText}>Sleep Timer</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {}}
              >
                <Ionicons name="heart-outline" size={24} color="#666666" />
                <ThemedText style={styles.menuText}>Love</ThemedText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </GestureHandlerRootView>
    </AudioProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  musicControlWrapper: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 999,
    backgroundColor: '#ffffff66',
    padding: 16,
    borderRadius: 40,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 20,
  },
  pageContainer: {
    backfaceVisibility: 'hidden',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  verseText: {
    fontSize: 28,
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 20,
    color: '#ffffff',
    fontFamily: 'System',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  reference: {
    fontSize: 20,
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    padding: 20,
  },
  menuCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
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
  devButton: {
    backgroundColor: '#ff000033',
    padding: 8,
    borderRadius: 8,
  },
  devButtonText: {
    fontSize: 12,
    color: '#ff0000',
  },
  playButton: {
    marginTop: 20,
    alignSelf: 'center',
    backgroundColor: '#00000033',
    padding: 12,
    borderRadius: 30,
  },
  topButtonsContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    gap: 10,
  },
  streakButton: {
    backgroundColor: '#ffffff66',
    padding: 16,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileButton: {
    backgroundColor: '#ffffff66',
    padding: 16,
    borderRadius: 40,
  },
  profileNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666666',
  },
});
