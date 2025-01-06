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
      await Share.share({
        message: `${verseOfDay.content} - ${verseOfDay.reference}`,
      });
    } catch (error) {
      console.error(error);
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
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to save the image!');
        return;
      }

      if (!viewRef.current) {
        alert('View not ready for capture');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const imageURI = await captureRef(viewRef, {
        format: 'jpg',
        quality: 0.9,
        result: 'file'
      });

      await MediaLibrary.saveToLibraryAsync(imageURI);
      alert('Image saved to camera roll! You can now share it on Instagram.');
    } catch (error) {
      console.error('Error creating Instagram image:', error);
      alert('Failed to create image: ' + error.message);
    }
  };

  const handleSaveBackground = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to save the image!');
        return;
      }

      // Get the current background from our static array
      const currentImageIndex = backgroundImages.images.indexOf(currentBackground);
      console.log('Current image index:', currentImageIndex);

      // Get the asset module ID
      const assetModule = backgroundImages.images[currentImageIndex];
      console.log('Asset module:', assetModule);

      // Resolve the asset source to get the URI
      const source = Image.resolveAssetSource(assetModule);
      console.log('Source:', source);

      // Download the file to local filesystem first
      const localUri = FileSystem.cacheDirectory + `image_${currentImageIndex + 1}.jpg`;
      await FileSystem.downloadAsync(source.uri, localUri);
      console.log('Downloaded to:', localUri);

      // Now save from the local filesystem
      await MediaLibrary.saveToLibraryAsync(localUri);
      alert('Background image saved to camera roll!');
    } catch (error) {
      console.error('Error saving background:', error);
      alert('Failed to save background: ' + error.message);
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

  return (
    <AudioProvider>
      <GestureHandlerRootView style={styles.container}>
        <TouchableOpacity 
          style={styles.devButton} 
          onPress={resetOnboarding}
        >
          <ThemedText style={styles.devButtonText}>Reset Onboarding</ThemedText>
        </TouchableOpacity>

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

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleFullPassagePress}
              >
                <Ionicons name="book-outline" size={24} color="#666666" />
                <ThemedText style={styles.menuText}>Full Passage</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleInstagramShare}
              >
                <Ionicons name="logo-instagram" size={24} color="#666666" />
                <ThemedText style={styles.menuText}>Instagram</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleSaveBackground}
              >
                <Ionicons name="image-outline" size={24} color="#666666" />
                <ThemedText style={styles.menuText}>Save Background</ThemedText>
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
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#ff000033',
    padding: 8,
    borderRadius: 8,
    zIndex: 999,
  },
  devButtonText: {
    fontSize: 12,
    color: '#ff0000',
  },
});
