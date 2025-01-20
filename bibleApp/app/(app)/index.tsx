import { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Dimensions, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../../config/firebase';
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
import { VERSES } from '@/constants/verses';
import { Audio } from 'expo-av';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AudioProvider } from '@/contexts/AudioContext';
import { MusicControl } from '@/components/MusicControl';
import bibleData from '../../assets/bible/rv1909.json';

const extractVerseFromChapter = (content: string, verseNumber: number): string => {
  const verses = content.split(/(\d+)(?=[A-Z\s])/);
  const verseIndex = verses.findIndex((v) => v.trim() === verseNumber.toString());
  if (verseIndex !== -1 && verses[verseIndex + 1]) {
    return verses[verseIndex + 1].trim();
  }
  return '';
};

const getVerseFromReference = (verseObject: typeof VERSES[0]): { content: string; reference: string } => {
  const [book, chapter, verse] = verseObject.verse.split('.');
  
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


// Add this function to check storage contents
const checkStorageContents = async () => {
  try {
    console.log('Storage bucket:', storage.app.options.storageBucket);
    
    // Use simple path format instead of gs:// URL
    const storageRef = ref(storage, '/bible/newTestament');
    
    console.log('Checking path:', {
      bucket: storageRef._location.bucket,
      path: storageRef._location.path_,
      fullPath: storageRef.fullPath
    });
    
    const result = await listAll(storageRef);
    
    console.log('Full response:', JSON.stringify(result, null, 2));
    console.log('\nDetailed contents:');
    console.log('Items:', result.items.length);
    result.items.forEach((item, index) => {
      console.log(`File ${index + 1}:`, {
        name: item.name,
        fullPath: item.fullPath,
        bucket: item.bucket,
        parent: item.parent?.fullPath
      });
    });
    
    console.log('\nPrefixes:', result.prefixes.length);
    console.log('Checking path:', storageRef.fullPath);

    result.prefixes.forEach((prefix, index) => {
      console.log(`Folder ${index + 1}:`, {
        name: prefix.name,
        fullPath: prefix.fullPath,
        bucket: prefix.bucket,
        parent: prefix.parent?.fullPath
      });
    });
    
  } catch (error) {
    console.error('Error checking storage:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    console.error('Full error:', JSON.stringify(error, null, 2));
  }
};

// Add this function
const fetchTestAudio = async () => {
  try {
    // Use simple path format instead of gs:// URL
    const audioRef = ref(storage, 'bible/oldTestament/01_Gen001.mp3');
    
    console.log('Checking path:', {
      bucket: audioRef._location.bucket,
      path: audioRef._location.path_,
      fullPath: audioRef.fullPath
    });
    
    const url = await getDownloadURL(audioRef);
    console.log('Successfully got audio URL:', url);
    
  } catch (error) {
    console.error('Error fetching audio:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
  }
};

const AUDIO_FILES_TO_CACHE = [
  'bible/newTestament/66_Apo020.mp3',
  'bible/newTestament/66_Apo019.mp3',
  'bible/newTestament/66_Apo018.mp3'
];

const downloadAndCacheAudioFiles = async () => {
  try {
    // Create audio directory if it doesn't exist
    const audioDir = `${FileSystem.documentDirectory}audio/`;
    await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });

    for (const filePath of AUDIO_FILES_TO_CACHE) {
      const fileName = filePath.split('/').pop(); // Gets "66_Apo020.mp3" etc.
      const localPath = `${audioDir}${fileName}`;

      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        console.log(`File already cached: ${fileName}`);
        continue;
      }

      // Download file
      const audioRef = ref(storage, filePath);
      const url = await getDownloadURL(audioRef);
      
      console.log(`Downloading: ${fileName}`);
      await FileSystem.downloadAsync(url, localPath);
      console.log(`Successfully cached: ${fileName}`);
    }
  } catch (error) {
    console.error('Error caching audio files:', error);
  }
};

// Add these helper functions before the HomeScreen component
const getDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

const updateShareStreak = async () => {
  try {
    // Get current streak data
    const streakData = await AsyncStorage.getItem('shareStreak');
    const parsedData = streakData ? JSON.parse(streakData) : {
      lastShareDate: null,
      dailyStreak: 0,
      totalShares: 0
    };

    const today = getDateKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

    // Update streak logic
    if (parsedData.lastShareDate === today) {
      // Already shared today, just increment total shares
      parsedData.totalShares += 1;
    } else if (parsedData.lastShareDate === yesterdayKey) {
      // Shared yesterday, increment streak and update date
      parsedData.dailyStreak += 1;
      parsedData.totalShares += 1;
      parsedData.lastShareDate = today;
    } else if (parsedData.lastShareDate !== today) {
      // Break in streak, reset to 1
      parsedData.dailyStreak = 1;
      parsedData.totalShares += 1;
      parsedData.lastShareDate = today;
    }

    // Save updated streak data
    await AsyncStorage.setItem('shareStreak', JSON.stringify(parsedData));
    return parsedData;
  } catch (error) {
    console.error('Error updating share streak:', error);
    return null;
  }
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
  const [dailyStreak, setDailyStreak] = useState(0);
  const [totalShares, setTotalShares] = useState(0);

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
    
    textOpacity.value = withTiming(0, {
      duration: 800,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    }, () => {
      runOnJS(updateVerseIndex)(direction);
      
      backgroundOpacity.value = withTiming(0, {
        duration: 1000,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      }, () => {
        runOnJS(setCurrentBackground)(newBackground);
        backgroundOpacity.value = withTiming(1, {
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        }, () => {
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
        url: imageURI,
      }, {
        dialogTitle: 'Share Bible Verse',
        tintColor: '#000000',
      });

      // Update streak after successful share
      const updatedStreak = await updateShareStreak();
      if (updatedStreak) {
        setDailyStreak(updatedStreak.dailyStreak);
        setTotalShares(updatedStreak.totalShares);
      }

      // Navigate to share-success screen
      router.push('/share-success');
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleFullPassagePress = () => {
    const [book, chapter, verse] = VERSES[currentVerseIndex].verse.split('.');
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

      const currentVerse = VERSES[currentVerseIndex];
      console.log('Attempting to fetch audio from:', currentVerse.audioPath);
      
      try {
        // Get the download URL for the audio file
        const url = await getDownloadURL(ref(storage, currentVerse.audioPath));
        console.log('Successfully got download URL:', url);
        
        // Load and play the audio
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        
        setSound(newSound);
        setIsPlaying(true);
        
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            setSound(null);
          }
        });
      } catch (error) {
        console.error('Error loading audio file:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        alert('Audio file not available');
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
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

  // Add this useEffect to load initial streak data
  useEffect(() => {
    const loadStreakData = async () => {
      try {
        const streakData = await AsyncStorage.getItem('shareStreak');
        if (streakData) {
          const { dailyStreak: streak, totalShares: shares } = JSON.parse(streakData);
          setDailyStreak(streak);
          setTotalShares(shares);
        }
      } catch (error) {
        console.error('Error loading streak data:', error);
      }
    };
    loadStreakData();
  }, []);

  // Add this to your component's useEffect to download files when app starts
  useEffect(() => {
    downloadAndCacheAudioFiles();
  }, []);

  const handleShareImage = async () => {
    try {
      // Generate dynamic paths (adjust these according to your needs)
      const imagePath = `imageAssets/image_${String(currentVerseIndex + 1).padStart(2, '0')}.jpg`;
      const imageDestination = `imageTest/verse_${Date.now()}.jpg`;
      const verse = `${verseOfDay.content} - ${verseOfDay.reference}`;

      // Build URL with query parameters
      const url = new URL('https://0cb3df08-f19f-4e55-add7-4513e781f46c-00-2lvwkm65uqcmj.spock.replit.dev/api/transfer');
      url.searchParams.append('imagePath', imagePath);
      url.searchParams.append('imageDestination', imageDestination);
      url.searchParams.append('verse', verse);

      // Call backend to process the image
      console.log("Calling backend with URL:", url.toString());
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log("Backend response:", data);

      if (!data.success) {
        throw new Error('Backend processing failed');
      }

      // Get Firebase download URL
      const imageRef = ref(storage, imageDestination);
      console.log('Attempting to download from Firebase:', imageDestination);
      
      const downloadURL = await getDownloadURL(imageRef);
      console.log('Got download URL:', downloadURL);

      // Create asset from URL
      const asset = await Asset.fromURI(downloadURL);
      console.log('Created asset:', asset);

      // Ensure we have a local URI
      await asset.downloadAsync();
      console.log('Asset downloaded to:', asset.localUri);

      // Check if sharing is available
      if (!(await Sharing.isAvailableAsync())) {
        alert("Sharing isn't available on your platform");
        return;
      }

      // Share the asset
      await Sharing.shareAsync(asset.localUri!, {
        mimeType: 'image/jpg',
        dialogTitle: 'Share Bible Verse Image',
        UTI: 'public.jpg' // for iOS
      });

      console.log('Share completed successfully');

    } catch (error) {
      console.error('Error in handleShareImage:', error);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      console.error('Full error:', JSON.stringify(error, null, 2));
      alert('Failed to share image. Please try again.');
    }
  };

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

          <TouchableOpacity 
            style={styles.devButton} 
            onPress={checkStorageContents}
          >
            <ThemedText style={styles.devButtonText}>C</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.streakButton} 
            onPress={() => router.push('/prayer-tracker')}
          >
            <Ionicons name="share-outline" size={24} color="#666666" />
            <ThemedText style={styles.profileNumber}>{dailyStreak}</ThemedText>
          </TouchableOpacity>

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

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleShareImage}
              >
                <Ionicons name="image-outline" size={24} color="#666666" />
                <ThemedText style={styles.menuText}>Share Image</ThemedText>
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
  profileNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666666',
  },
});
