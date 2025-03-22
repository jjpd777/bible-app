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
  withRepeat,
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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { Text } from 'react-native';
import { Colors } from '@/constants/Colors';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AudioProvider } from '@/contexts/AudioContext';
import { MusicControl } from '@/components/MusicControl';
import bibleData from '../../assets/bible/rv1909.json';

const getVerseFromReference = (verseObject: typeof VERSES[0]): { content: string; reference: string } => {
  const verseContent = verseObject.bibleText;
  const verseName = verseObject.verse;

  return {
    content: verseContent,
    reference: verseName
  };
};

// Add background images with static requires
const backgroundImages = {
  images: [
    require('../../assets/backgrounds/image_01.jpg'),
   
  ]
};

const getRandomBackground = () => {
  const randomIndex = Math.floor(Math.random() * backgroundImages.images.length);
  return backgroundImages.images[randomIndex];
};


const AUDIO_FILES_TO_CACHE = [
  'bib/66_Apo020.mp3',
  'bib/66_Apo019.mp3',
  'bib/66_Apo018.mp3'
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
    const streakData = await AsyncStorage.getItem('shareStreak');
    const parsedData = streakData ? JSON.parse(streakData) : {
      lastShareDate: null,
      dailyStreak: 0,
      totalShares: 0
    };

    console.log('Previous streak data:', parsedData);

    const today = getDateKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

    // Update streak logic
    if (parsedData.lastShareDate === today) {
      parsedData.totalShares += 1;
    } else if (parsedData.lastShareDate === yesterdayKey) {
      parsedData.dailyStreak += 1;
      parsedData.totalShares += 1;
      parsedData.lastShareDate = today;
    } else if (parsedData.lastShareDate !== today) {
      parsedData.dailyStreak = 1;
      parsedData.totalShares += 1;
      parsedData.lastShareDate = today;
    }

    console.log('Updated streak data:', parsedData);

    await AsyncStorage.setItem('shareStreak', JSON.stringify(parsedData));
    return parsedData;
  } catch (error) {
    console.error('Error updating share streak:', error);
    return null;
  }
};

// Add this type near the top of the file
type SavedVerse = {
  content: string;
  reference: string;
  timestamp: number;
};

// Add this function to fetch images from Firebase storage
const fetchImagesFromStorage = async () => {
  try {
    // Check if images are already cached
    const cachedImages = await AsyncStorage.getItem('cachedImageUrls');
    if (cachedImages) {
      const imageUrls = JSON.parse(cachedImages);
      console.log('Using cached image URLs:', imageUrls);
      
      // Incorporate cached images into backgroundImages
      backgroundImages.images.push(...imageUrls.map(url => ({ uri: url })));

      // Show notification
      return; // Exit the function if images are already cached
    }

    const imagesRef = ref(storage, 'imagesProd');
    const result = await listAll(imagesRef);
    
    const imageUrls = await Promise.all(result.items.map(item => getDownloadURL(item)));
    
    console.log('Fetched image URLs:', imageUrls);
    
    // Store image URLs in AsyncStorage
    await AsyncStorage.setItem('cachedImageUrls', JSON.stringify(imageUrls));

    // Incorporate fetched images into backgroundImages
    backgroundImages.images.push(...imageUrls.map(url => ({ uri: url })));

    
  } catch (error) {
    console.error('Error fetching images:', error);
  }
};

export default function HomeScreen() {
  const { trackEvent } = useAnalytics();
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const [savedPrayers, setSavedPrayers] = useState<{ text: string; timestamp: number; generatedAudioPath?: string; isBookmarked?: boolean }[]>([]);
  const [currentBackground, setCurrentBackground] = useState(getRandomBackground());
  const [nextBackground, setNextBackground] = useState(currentBackground);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isTimerMenuVisible, setIsTimerMenuVisible] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [totalShares, setTotalShares] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const backgroundOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  
  const SWIPE_THRESHOLD = 100;
  const VERTICAL_SWIPE_THRESHOLD = -50;

  const router = useRouter();

  const viewRef = useRef(null);

  // Add these shared values for the music control button animation
  const musicBar1Height = useSharedValue(14);
  const musicBar2Height = useSharedValue(20);
  const musicBar3Height = useSharedValue(10);

  // Separate state for verse audio and music player
  const [isVerseAudioPlaying, setIsVerseAudioPlaying] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Replace the musicTracks array with Firebase paths
  const musicTracks = [
    'music_files/soundtrack_01.mp3',
    'music_files/soundtrack_02.mp3',
    'music_files/soundtrack_03.mp3',
    'music_files/soundtrack_04.mp3',
    'music_files/soundtrack_05.mp3',
    'music_files/soundtrack_06.mp3',
    'music_files/soundtrack_07.mp3',
    'music_files/soundtrack_08.mp3',
    'music_files/soundtrack_09.mp3',
    'music_files/soundtrack_10.mp3',
    'music_files/soundtrack_11.mp3'
  ];

  const menuOpacity = useSharedValue(0);

  // Add new state for control panel visibility
  const [isMusicControlVisible, setIsMusicControlVisible] = useState(false);

  // Add new animated value for control panel
  const musicControlOpacity = useSharedValue(0);

  // Add new animated style
  const musicControlAnimatedStyle = useAnimatedStyle(() => ({
    opacity: musicControlOpacity.value,
  }));

  // Add new state for share icon
  const [isSharing, setIsSharing] = useState(false);

  // Add new shared value for timer menu animation
  const timerMenuOpacity = useSharedValue(0);

  // Add new animated style for timer menu
  const timerMenuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: timerMenuOpacity.value,
  }));

  // Add state to track selected timer
  const [selectedTimer, setSelectedTimer] = useState<number | null>(null);

  // Add new state for onboarding status
  const [hasOnboarded, setHasOnboarded] = useState(true);

  // Add these state variables
  const [preloadedImages, setPreloadedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Add state for saved prayers
  const [showPrayers, setShowPrayers] = useState(false);

  // Function to preload images from Firebase
  const preloadImagesFromFirebase = async () => {
    try {
      console.log("Starting to preload images from Firebase...");
      
      // Reference to the imagesProd folder
      const imagesRef = ref(storage, 'imagesProd');
      
      // List all items in the folder
      const result = await listAll(imagesRef);
      console.log(`Found ${result.items.length} images in storage`);
      
      // Get download URLs for all images
      const imageUrls = await Promise.all(
        result.items.map(item => getDownloadURL(item))
      );
      
      // Create image objects with the URLs
      const images = imageUrls.map(uri => ({ uri }));
      console.log(`Successfully preloaded ${images.length} images`);
      
      // Store the preloaded images
      setPreloadedImages(images);
      
      // Set initial background
      if (images.length > 0) {
        setCurrentBackground(images[0]);
        setNextBackground(images[0]); // Initialize both to the same image
      }
    } catch (error) {
      console.error('Error preloading images:', error);
    }
  };

  // Call this in useEffect to preload images when component mounts
  useEffect(() => {
    preloadImagesFromFirebase();
  }, []);

  // Add this function to save both verse and image indices
  const saveCurrentIndices = async (verseIndex: number, imageIndex: number) => {
    try {
      const indices = JSON.stringify({
        verseIndex,
        imageIndex
      });
      await AsyncStorage.setItem('lastIndices', indices);
    } catch (error) {
      console.error('Error saving indices:', error);
    }
  };

  // Modify navigateVerse to save both indices
  const navigatePrayer = async (direction: 'next' | 'prev') => {
    if (isTransitioning || preloadedImages.length === 0) return;
    setIsTransitioning(true);
    
    // Calculate next image index
    const nextIndex = (currentImageIndex + 1) % preloadedImages.length;
    setCurrentImageIndex(nextIndex);
    
    // Get the next image
    const newBackground = preloadedImages[nextIndex];
    setNextBackground(newBackground);
    
    // Start text fade out
    textOpacity.value = withTiming(0, {
      duration: 800,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    }, () => {
      // Update prayer index
      runOnJS(updatePrayerIndex)(direction);
      
      // Save both indices
      let newPrayerIndex;
      if (direction === 'next') {
        newPrayerIndex = (currentPrayerIndex + 1) % savedPrayers.length;
      } else {
        newPrayerIndex = (currentPrayerIndex - 1 + savedPrayers.length) % savedPrayers.length;
      }
      runOnJS(saveCurrentIndices)(newPrayerIndex, nextIndex);
      
      // Start background fade out
      backgroundOpacity.value = withTiming(0, {
        duration: 1000,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      }, () => {
        // Switch backgrounds
        runOnJS(setCurrentBackground)(newBackground);
        
        // Start background fade in
        backgroundOpacity.value = withTiming(1, {
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        }, () => {
          // Start text fade in
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

  // Replace the previous updateVerseIndex function with this simplified version
  // that doesn't save to AsyncStorage (since saveCurrentIndices handles that)
  const updatePrayerIndex = (direction: 'next' | 'prev') => {
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentPrayerIndex + 1) % savedPrayers.length;
    } else {
      newIndex = (currentPrayerIndex - 1 + savedPrayers.length) % savedPrayers.length;
    }
    setCurrentPrayerIndex(newIndex);
    
    // Stop any playing audio when changing prayers
    if (sound) {
      sound.stopAsync();
      sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
  };

  // Update the useEffect to load both verse and image indices
  useEffect(() => {
    const loadSavedIndices = async () => {
      try {
        const savedIndices = await AsyncStorage.getItem('lastIndices');
        if (savedIndices) {
          const { verseIndex, imageIndex } = JSON.parse(savedIndices);
          
          // Validate prayer index
          if (!isNaN(verseIndex) && verseIndex >= 0 && verseIndex < savedPrayers.length) {
            setCurrentPrayerIndex(verseIndex);
          }
          
          // Wait for preloaded images to be available
          if (preloadedImages.length > 0 && !isNaN(imageIndex) && imageIndex >= 0 && imageIndex < preloadedImages.length) {
            setCurrentImageIndex(imageIndex);
            setCurrentBackground(preloadedImages[imageIndex]);
            setNextBackground(preloadedImages[imageIndex]);
          }
        }
      } catch (error) {
        console.error('Error loading saved indices:', error);
      }
    };
    
    // Only try to load indices after images are preloaded
    if (preloadedImages.length > 0) {
      loadSavedIndices();
    }
  }, [preloadedImages, savedPrayers]);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      // Get the current image path
      let imagePath = 'imagesProd/image_01.jpg'; // Default fallback
      
      // If currentBackground has a uri (it's a Firebase image)
      if (currentBackground.uri) {
        // Extract the image number from the URL if possible
        const match = currentBackground.uri.match(/image_(\d+)\.jpg/);
        if (match && match[1]) {
          imagePath = `imagesProd/image_${match[1]}.jpg`;
        }
        console.log('Using current image path:', imagePath);
      }
      
      console.log('Image path for share request:', imagePath);
      
      const imageDestination = `imageTest/verse_${Date.now()}.jpg`;
      const verse = `${savedPrayers[currentPrayerIndex].text} - ${savedPrayers[currentPrayerIndex].reference}`;

      const prodBackend = true ? "https://bendiga-media-backend.replit.app" : "https://0cb3df08-f19f-4e55-add7-4513e781f46c-00-2lvwkm65uqcmj.spock.replit.dev"; 

      // Build URL with query parameters
      const url = new URL(`${prodBackend}/api/transfer`);
      url.searchParams.append('imagePath', imagePath);
      url.searchParams.append('imageDestination', imageDestination);
      url.searchParams.append('verse', verse);

      // Call backend to process the image
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error('Backend processing failed');
      }

      // Get Firebase download URL
      const imageRef = ref(storage, imageDestination);
      const downloadURL = await getDownloadURL(imageRef);

      // Create asset from URL
      const asset = await Asset.fromURI(downloadURL);
      await asset.downloadAsync();

      // Share the asset
      await Sharing.shareAsync(asset.localUri!, {
        mimeType: 'image/jpg',
        dialogTitle: 'Share Bible Verse Image',
        UTI: 'public.jpg'
      });

      // Update streak after successful share
      const updatedStreak = await updateShareStreak();
      if (updatedStreak) {
        setDailyStreak(updatedStreak.dailyStreak);
        setTotalShares(updatedStreak.totalShares);
      }

      // Set a timeout to reset the icon after 2 seconds
      setTimeout(() => {
        setIsSharing(false);
      }, 2000);

      // Navigate to share-success screen
      router.push('/share-success');

    } catch (error) {
      console.error('Error in handleShare:', error);
      alert('Failed to share image. Please try again.');
      setIsSharing(false);
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

  // Update the handleMusicControl function to track music playback
  const handleMusicControl = async (autoPlay = false) => {
    try {
      if (currentSound) {
        // Track stopping music
        if (trackEvent) {
          trackEvent('Background Music', {
            action: 'stop',
            track_index: currentTrackIndex,
            track_name: musicTracks[currentTrackIndex].split('/').pop() // Extract filename
          });
        }
        
        // Stop current track
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setIsMusicPlaying(false);
        
        // Hide panel
        musicControlOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(setIsMusicControlVisible)(false);
        });
        
        // If autoPlay is true, start the new track
        if (autoPlay) {
          setTimeout(() => playNewTrack(), 100);
        }
      } else {
        await playNewTrack();
        
        // Hide panel
        musicControlOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(setIsMusicControlVisible)(false);
        });
      }
    } catch (error) {
      console.error('Error in handleMusicControl:', error);
      
      // Track errors
      if (trackEvent) {
        trackEvent('Background Music', {
          action: 'error',
          error_message: error.message || 'Unknown error'
        });
      }
    }
  };

  // Update the playNewTrack function to track when a new track starts
  const playNewTrack = async () => {
    try {
      const audioRef = ref(storage, musicTracks[currentTrackIndex]);
      const url = await getDownloadURL(audioRef);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      
      // Set music volume to 50% lower (0.5)
      await newSound.setVolumeAsync(0.5);
      
      setCurrentSound(newSound);
      setIsMusicPlaying(true);
      
      // Track starting music
      if (trackEvent) {
        trackEvent('Background Music', {
          action: 'play',
          track_index: currentTrackIndex,
          track_name: musicTracks[currentTrackIndex].split('/').pop() // Extract filename
        });
      }

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsMusicPlaying(false);
          setCurrentSound(null);
          
          // Track when music completes naturally
          if (trackEvent) {
            trackEvent('Background Music', {
              action: 'complete',
              track_index: currentTrackIndex,
              track_name: musicTracks[currentTrackIndex].split('/').pop()
            });
          }
        }
      });
    } catch (error) {
      console.error('Error playing new track:', error);
      
      // Track errors
      if (trackEvent) {
        trackEvent('Background Music', {
          action: 'error',
          track_index: currentTrackIndex,
          error_message: error.message || 'Unknown error'
        });
      }
    }
  };

  // Update the verse audio handler
  const handlePlayPrayer = async () => {
    try {
      const currentPrayer = savedPrayers[currentPrayerIndex];
      
      if (isPlaying) {
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
        setIsPlaying(false);
        setSound(null);
        return;
      }

      if (!currentPrayer.generatedAudioPath) {
        alert('No audio available for this prayer');
        return;
      }
      
      console.log('Playing audio from local path:', currentPrayer.generatedAudioPath);
      
      // Simply use the local file path directly - no need for Firebase
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentPrayer.generatedAudioPath },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      
      // Track when audio starts playing
      if (trackEvent) {
        trackEvent('Prayer Audio', {
          action: 'play',
          prayer_id: currentPrayerIndex
        });
      }
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Error loading audio file:', error);
      alert('Audio file not available');
      setIsPlaying(false);
      setSound(null);
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isTransitioning) {
        translateX.value = event.translationX * 0.8;
      }
    })
    .onEnd((event) => {
      if (!isTransitioning) {
        if (event.translationX < -SWIPE_THRESHOLD) {
          runOnJS(navigatePrayer)('next');
        } else if (event.translationX > SWIPE_THRESHOLD) {
          runOnJS(navigatePrayer)('prev');
        }
        translateX.value = withTiming(0, { 
          duration: 800
        });
      }
    });

  const handleVersePress = () => {
    if (isMenuVisible) {
      menuOpacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setIsMenuVisible)(false);
      });
    } else {
      setIsMenuVisible(true);
      menuOpacity.value = withTiming(1, { duration: 200 });
    }
  };

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
  }));

  useEffect(() => {
    const loadPrayer = () => {
      try {
        const prayer = savedPrayers[currentPrayerIndex];
        setCurrentPrayerIndex(currentPrayerIndex);
      } catch (error) {
        console.error('Error loading prayer:', error);
      }
    };

    loadPrayer();
  }, [currentPrayerIndex, savedPrayers]);

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

  // Update the animation useEffect to use music state instead of verse state
  useEffect(() => {
    if (isMusicPlaying) {
      musicBar1Height.value = withRepeat(
        withSequence(
          withTiming(20, { duration: 500 }),
          withTiming(8, { duration: 500 })
        ),
        -1,
        true
      );
      
      musicBar2Height.value = withRepeat(
        withSequence(
          withTiming(12, { duration: 400 }),
          withTiming(24, { duration: 400 })
        ),
        -1,
        true
      );
      
      musicBar3Height.value = withRepeat(
        withSequence(
          withTiming(18, { duration: 600 }),
          withTiming(6, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      musicBar1Height.value = withTiming(14);
      musicBar2Height.value = withTiming(20);
      musicBar3Height.value = withTiming(10);
    }
  }, [isMusicPlaying]);

  // Cleanup effect for music player
  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [currentSound]);

  const animatedMusicBar1Style = useAnimatedStyle(() => ({
    height: musicBar1Height.value,
  }));

  const animatedMusicBar2Style = useAnimatedStyle(() => ({
    height: musicBar2Height.value,
  }));

  const animatedMusicBar3Style = useAnimatedStyle(() => ({
    height: musicBar3Height.value,
  }));

  // Update the handleMusicControl function to toggle the panel instead
  const toggleMusicPanel = () => {
    if (isMusicControlVisible) {
      musicControlOpacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setIsMusicControlVisible)(false);
      });
    } else {
      setIsMusicControlVisible(true);
      musicControlOpacity.value = withTiming(1, { duration: 200 });
    }
  };

  // Update this function to handle both the index change and playback in one go
  const handleNextTrack = async () => {
    const nextIndex = (currentTrackIndex + 1) % musicTracks.length;
    setCurrentTrackIndex(nextIndex);
    
    try {
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      }
      
      const audioRef = ref(storage, musicTracks[nextIndex]);
      const url = await getDownloadURL(audioRef);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      
      setCurrentSound(newSound);
      setIsMusicPlaying(true);
      
      // Track changing to next track
      if (trackEvent) {
        trackEvent('Background Music', {
          action: 'next_track',
          track_index: nextIndex,
          track_name: musicTracks[nextIndex].split('/').pop()
        });
      }

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsMusicPlaying(false);
          setCurrentSound(null);
        }
      });
    } catch (error) {
      console.error('Error playing next track:', error);
      
      // Track errors
      if (trackEvent) {
        trackEvent('Background Music', {
          action: 'error',
          track_index: nextIndex,
          error_message: error.message || 'Unknown error'
        });
      }
    }
  };

  // Add this check in the checkIfVerseSaved function
  const checkIfVerseSaved = async () => {
    try {
      // Make sure we have prayers and a valid current index
      if (!savedPrayers.length || currentPrayerIndex >= savedPrayers.length) {
        setIsSaved(false);
        return;
      }
      
      const savedVerses = await AsyncStorage.getItem('savedVerses');
      if (savedVerses) {
        const verses: SavedVerse[] = JSON.parse(savedVerses);
        const isCurrentVerseSaved = verses.some(
          verse => verse.reference === savedPrayers[currentPrayerIndex].reference
        );
        setIsSaved(isCurrentVerseSaved);
      }
    } catch (error) {
      console.error('Error checking saved verse:', error);
      setIsSaved(false);
    }
  };

  const handleSaveVerse = async () => {
    try {
      const savedVerses = await AsyncStorage.getItem('savedVerses');
      let verses: SavedVerse[] = savedVerses ? JSON.parse(savedVerses) : [];
      
      if (isSaved) {
        // Remove verse if already saved
        verses = verses.filter(verse => verse.reference !== savedPrayers[currentPrayerIndex].reference);
        setIsSaved(false);
      } else {
        // Add new verse
        verses.push({
          content: savedPrayers[currentPrayerIndex].text,
          reference: savedPrayers[currentPrayerIndex].reference,
          timestamp: Date.now()
        });
        setIsSaved(true);
      }
      
      await AsyncStorage.setItem('savedVerses', JSON.stringify(verses));
    } catch (error) {
      console.error('Error saving verse:', error);
    }
  };

  // Also update the useEffect that calls checkIfVerseSaved
  useEffect(() => {
    if (savedPrayers.length > 0 && currentPrayerIndex < savedPrayers.length) {
      checkIfVerseSaved();
    }
  }, [savedPrayers, currentPrayerIndex]);

  // Update handleTimerSelect to track selection
  const handleTimerSelect = (minutes: number) => {
    setSelectedTimer(minutes === selectedTimer ? null : minutes);
  };

  // Update the timer button press handler
  const handleTimerPress = () => {
    if (isTimerMenuVisible) {
      timerMenuOpacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setIsTimerMenuVisible)(false);
      });
    } else {
      setIsTimerMenuVisible(true);
      timerMenuOpacity.value = withTiming(1, { duration: 200 });
    }
  };

  // Call this function where appropriate, e.g., in useEffect or a button press
  useEffect(() => {
    fetchImagesFromStorage();
  }, []);

  // Function to load prayers from AsyncStorage
  const loadSavedPrayers = async () => {
    try {
      const savedPrayersStr = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayersStr) {
        const prayers = JSON.parse(savedPrayersStr);
        
        // Sort prayers by timestamp in descending order (newest first)
        const sortedPrayers = [...prayers].sort((a, b) => b.timestamp - a.timestamp);
        
        setSavedPrayers(sortedPrayers);
        
        // Always set the current index to 0 (the most recent prayer)
        setCurrentPrayerIndex(0);
      }
    } catch (error) {
      console.error('Error loading saved prayers:', error);
    }
  };

  // Load prayers when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadSavedPrayers();
    }, [])
  );

  // PrayerCard component for displaying individual prayers
  const PrayerCard = ({ prayer, index }) => (
    <TouchableOpacity 
      style={styles.prayerCard}
      onPress={() => {
        // Track when user revisits a prayer
        if (trackEvent) {
          trackEvent('Revisit Prayer', {
            prayer_id: index,
            prayer_timestamp: prayer.timestamp,
            prayer_length: prayer.text?.length || 0,
            has_audio: prayer.generatedAudioPath ? 'yes' : 'no'
          });
        }
        
        // Navigate to prayer-voice screen with prayer data
        router.push({
          pathname: '/prayer-voice',
          params: { prayer: JSON.stringify(prayer) }
        });
      }}
    >
      {/* Bookmark icon if prayer is bookmarked */}
      {prayer.isBookmarked && (
        <View style={styles.bookmarkIconContainer}>
          <Ionicons name="bookmark" size={20} color="#5856D6" />
        </View>
      )}
      
      {/* Prayer text preview */}
      <Text style={styles.prayerText} numberOfLines={3}>
        {prayer.text}
      </Text>
      
      {/* Footer with date and audio indicator */}
      <View style={styles.prayerCardFooter}>
        <Text style={styles.prayerDate}>
          {prayer.timestamp ? new Date(prayer.timestamp).toLocaleDateString() : ''}
        </Text>
        <Ionicons 
          name={prayer.generatedAudioPath ? "musical-note" : "timer-outline"} 
          size={16} 
          color="#666"
        />
      </View>
    </TouchableOpacity>
  );

  // Add useEffect to check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('hasOnboarded');
        setHasOnboarded(status === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };
    checkOnboardingStatus();
  }, []);

  // Add function to clear onboarding cache
  const clearOnboardingCache = async () => {
    try {
      await AsyncStorage.removeItem('hasOnboarded');
      setHasOnboarded(false);
      console.log('Onboarding cache cleared');
    } catch (error) {
      console.error('Error clearing onboarding cache:', error);
    }
  };

  // Format the date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Get a preview of the prayer text (first 100 characters)
  const getPrayerPreview = (text: string) => {
    if (!text) return "";
    return text.length > 200 ? text.substring(0, 200) + "..." : text;
  };

  // Add this function to navigate multiple prayers at once
  const navigateMultiplePrayers = (direction: 'next' | 'prev', count: number = 5) => {
    if (savedPrayers.length <= 1) return; // No need to navigate if only one prayer
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentPrayerIndex + count) % savedPrayers.length;
    } else {
      // For previous, we add the total length before modulo to handle negative numbers correctly
      newIndex = (currentPrayerIndex - count + savedPrayers.length) % savedPrayers.length;
    }
    
    setCurrentPrayerIndex(newIndex);
    
    // Stop any playing audio when changing prayers
    if (sound) {
      sound.stopAsync();
      sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
    
    // Save the new index
    saveCurrentIndices(newIndex, currentImageIndex);
    
    // Close the menu after navigation
    menuOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setIsMenuVisible)(false);
    });
  };

  return (
    <AudioProvider>
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.devButtonsContainer}>
          {!hasOnboarded && (
            <TouchableOpacity 
              style={styles.onboardingButton}
              onPress={resetOnboarding}
            >
              <ThemedText style={styles.onboardingButtonText}>
                Inicio Onboarding
              </ThemedText>
            </TouchableOpacity>
          )}
          {/* <TouchableOpacity 
            style={styles.devButton}
            onPress={clearOnboardingCache}
          >
            <ThemedText style={styles.devButtonText}>
              Clear Cache
            </ThemedText>
          </TouchableOpacity> */}
        </View>

        <View style={styles.musicControlWrapper}>
          <TouchableOpacity 
            style={styles.musicControlButton}
            onPress={toggleMusicPanel}
          >
            <View style={styles.equalizerMusic}>
              <Animated.View style={[styles.barMusic, styles.bar1Music, animatedMusicBar1Style]} />
              <Animated.View style={[styles.barMusic, styles.bar2Music, animatedMusicBar2Style]} />
              <Animated.View style={[styles.barMusic, styles.bar3Music, animatedMusicBar3Style]} />
            </View>
          </TouchableOpacity>

          {isMusicControlVisible && (
            <Animated.View style={[styles.musicControlPanel, musicControlAnimatedStyle]}>
              <TouchableOpacity 
                style={styles.musicControlPanelButton}
                onPress={() => {
                  setCurrentTrackIndex((prev) => 
                    prev === 0 ? musicTracks.length - 1 : prev - 1
                  );
                  handleMusicControl(true); // Auto-play when changing tracks
                }}
              >
                <Ionicons name="play-skip-back" size={24} color="#666666" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.musicControlPanelButton}
                onPress={() => handleMusicControl(false)} // Normal play/pause
              >
                <Ionicons 
                  name={isMusicPlaying ? "pause" : "play"} 
                  size={24} 
                  color="#666666" 
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.musicControlPanelButton}
                onPress={handleNextTrack}
              >
                <Ionicons name="play-skip-forward" size={24} color="#666666" />
              </TouchableOpacity>
            </Animated.View>
          )}
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

        {/* Prayer content with fade */}
        <GestureDetector gesture={gesture}>
          <Animated.View 
            ref={viewRef}
            style={[
              styles.textContainer,
              styles.pageContainer,
              textStyle
            ]}
          >
            <TouchableOpacity 
              style={styles.textOverlay}
              onPress={() => {
                if (savedPrayers.length > 0) {
                  handleVersePress(); // Show menu
                } else {
                  // Navigate to prayer creation if no prayers
                  router.push('/prayer-tracker');
                }
              }}
              activeOpacity={1}
            >
              {savedPrayers.length > 0 ? (
                <>
                  <ThemedText style={styles.prayerTitle}>
                    Prayer {currentPrayerIndex + 1} of {savedPrayers.length}
                  </ThemedText>
                  <ThemedText style={styles.verseText}>
                    {getPrayerPreview(savedPrayers[currentPrayerIndex].text)}
                  </ThemedText>
                  {/* <ThemedText style={styles.reference}>
                    {formatDate(savedPrayers[currentPrayerIndex].timestamp)}
                  </ThemedText> */}
                  {savedPrayers[currentPrayerIndex].generatedAudioPath && (
                    <TouchableOpacity 
                      style={styles.playButton} 
                      onPress={handlePlayPrayer}
                    >
                      <Ionicons 
                        name={isPlaying ? "pause" : "play"} 
                        size={24} 
                        color="#ffffff" 
                      />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <ThemedText style={styles.verseText}>
                    No prayers generated yet
                  </ThemedText>
                  <ThemedText style={styles.reference}>
                    Tap to create your first prayer
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>

        {/* Menu overlay */}
        {isMenuVisible && savedPrayers.length > 0 && (
          <Animated.View 
            style={[styles.menuContainer, menuAnimatedStyle]}
          >
            <View style={styles.menuCard}>
              <View style={styles.menuButtonsRow}>
                {/* <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => navigateMultiplePrayers('prev', 5)}
                >
                  <Ionicons name="arrow-back" size={24} color="#666666" />
                </TouchableOpacity> */}
                
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    // Navigate to full prayer view
                    const currentPrayer = savedPrayers[currentPrayerIndex];
                    router.push({
                      pathname: '/prayer-voice',
                      params: { prayer: JSON.stringify(currentPrayer) }
                    });
                  }}
                >
                  <MaterialCommunityIcons name="robot-love" size={24} color="#666666" />
                </TouchableOpacity>
                
                {/* <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => navigateMultiplePrayers('next', 5)}
                >
                  <Ionicons name="arrow-forward" size={24} color="#666666" />
                </TouchableOpacity> */}
                
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    // Navigate to prayer creation
                    router.push('/prayer-tracker');
                  }}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#666666" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Create Prayer button if no prayers exist */}
        {savedPrayers.length === 0 && (
          <TouchableOpacity 
            style={styles.createPrayerButton}
            onPress={() => router.push('/prayer-tracker')}
          >
            <ThemedText style={styles.createPrayerButtonText}>
              Create Prayer
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Add a button to toggle prayer display */}
        <TouchableOpacity 
          style={styles.prayersToggleButton}
          onPress={() => setShowPrayers(!showPrayers)}
        >
         
        </TouchableOpacity>
        
        {/* Prayer list overlay */}
        {showPrayers && (
          <Animated.View 
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.prayersOverlay}
          >
            <View style={styles.prayersContainer}>
              <View style={styles.prayersHeader}>
                <ThemedText style={styles.prayersTitle}>My Prayers</ThemedText>
                <TouchableOpacity onPress={() => setShowPrayers(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.prayersList}>
                {savedPrayers.length > 0 ? (
                  savedPrayers.map((prayer, index) => (
                    <PrayerCard key={index} prayer={prayer} index={index} />
                  ))
                ) : (
                  <ThemedText style={styles.noPrayersText}>
                    No prayers saved yet. Generate a prayer to see it here.
                  </ThemedText>
                )}
              </View>
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    height: 56,
    justifyContent: 'flex-start',
  },
  musicControlButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
  equalizerMusic: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 24,
    gap: 2,
  },
  barMusic: {
    width: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  bar1Music: {
    height: 14,
  },
  bar2Music: {
    height: 20,
  },
  bar3Music: {
    height: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginTop: '-30%',
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
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  pageContainer: {
    backfaceVisibility: 'hidden',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  verseText: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 20,
    color: '#ffffff',
    fontWeight: '300',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 8,
  },
  reference: {
    fontSize: 20,
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '300',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 8,
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
  menuButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  musicControlPanel: {
    position: 'relative',
    marginRight: 10,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 160,
    paddingHorizontal: 8,
    height: 64,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  musicControlPanelButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  timerOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 15,
    paddingHorizontal: 20,
  },
  timerChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  timerChipSelected: {
    backgroundColor: '#E6E6FA',
  },
  timerChipText: {
    fontSize: 14,
    color: '#666666',
  },
  timerChipTextSelected: {
    color: '#663399',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  devButtonsContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    gap: 10,
    zIndex: 999,
  },
  onboardingButton: {
    backgroundColor: '#ffffff66',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  onboardingButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  iconButton: {
    padding: 10,
  },
  prayersToggleButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  prayersToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#663399',
  },
  prayersOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  prayersContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 16,
  },
  prayersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  prayersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#663399',
  },
  prayersList: {
    flex: 1,
  },
  prayerCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#444',
    marginBottom: 8,
  },
  prayerCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  prayerDate: {
    fontSize: 12,
    color: '#888',
  },
  bookmarkIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  noPrayersText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
    fontSize: 16,
  },
  prayerTitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 8,
  },
  createPrayerButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(102, 51, 153, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createPrayerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
