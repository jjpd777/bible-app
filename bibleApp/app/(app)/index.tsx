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
      setIsSharing(true);
      
      // Get the current background image source
      const currentImageSource = currentBackground;
      let imagePath;
      
      if (typeof currentImageSource === 'number') {
        // Local require'd image - we need to get its local URI
        const asset = Asset.fromModule(currentImageSource);
        await asset.downloadAsync();
        imagePath = asset.localUri;
      } else if (currentImageSource.uri) {
        // Firebase Storage image
        imagePath = currentImageSource.uri;
      } else {
        throw new Error('Unsupported image source');
      }
      
      const imageDestination = `imageTest/verse_${Date.now()}.jpg`;
      const verse = `${verseOfDay.content} - ${verseOfDay.reference}`;

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

  // Update the handleMusicControl function
  const handleMusicControl = async (autoPlay = false) => {
    try {
      if (currentSound) {
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
    }
  };

  // Helper function to play a new track
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

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsMusicPlaying(false);
          setCurrentSound(null);
        }
      });
    } catch (error) {
      console.error('Error playing new track:', error);
    }
  };

  // Update the verse audio handler
  const handlePlayVerse = async () => {
    try {
      if (isVerseAudioPlaying) {
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
        setIsVerseAudioPlaying(false);
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
        setIsVerseAudioPlaying(true);
        
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsVerseAudioPlaying(false);
            setSound(null);
          }
        });
      } catch (error) {
        console.error('Error loading audio file:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        alert('Audio file not available');
      }
    } catch (error) {
      console.error('Failed to play verse audio:', error);
      setIsVerseAudioPlaying(false);
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
          runOnJS(navigateVerse)('next');
        } else if (event.translationX > SWIPE_THRESHOLD) {
          runOnJS(navigateVerse)('prev');
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

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsMusicPlaying(false);
          setCurrentSound(null);
        }
      });
    } catch (error) {
      console.error('Error playing next track:', error);
    }
  };

  // Add these functions before the return statement
  const checkIfVerseSaved = async () => {
    try {
      const savedVerses = await AsyncStorage.getItem('savedVerses');
      if (savedVerses) {
        const verses: SavedVerse[] = JSON.parse(savedVerses);
        const isCurrentVerseSaved = verses.some(
          verse => verse.reference === verseOfDay.reference
        );
        setIsSaved(isCurrentVerseSaved);
      }
    } catch (error) {
      console.error('Error checking saved verse:', error);
    }
  };

  const handleSaveVerse = async () => {
    try {
      const savedVerses = await AsyncStorage.getItem('savedVerses');
      let verses: SavedVerse[] = savedVerses ? JSON.parse(savedVerses) : [];
      
      if (isSaved) {
        // Remove verse if already saved
        verses = verses.filter(verse => verse.reference !== verseOfDay.reference);
        setIsSaved(false);
      } else {
        // Add new verse
        verses.push({
          content: verseOfDay.content,
          reference: verseOfDay.reference,
          timestamp: Date.now()
        });
        setIsSaved(true);
      }
      
      await AsyncStorage.setItem('savedVerses', JSON.stringify(verses));
    } catch (error) {
      console.error('Error saving verse:', error);
    }
  };

  // Add this useEffect to check saved status when verse changes
  useEffect(() => {
    checkIfVerseSaved();
  }, [verseOfDay]);

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
  const loadPrayers = async () => {
    try {
      // Fetch the prayers from AsyncStorage
      const storedPrayers = await AsyncStorage.getItem('savedPrayers');
      const prayersArray = JSON.parse(storedPrayers) || [];

      // Transform the prayers into the desired format
      const formattedPrayers = prayersArray.map((prayer, index) => ({
        verse: `prayer # ${index + 1}`,
        audioPath: "",
        bibleText: prayer // Assuming the prayer text is stored directly
      }));

      // Log the loaded prayers
      console.log(formattedPrayers);
    } catch (error) {
      console.error("Error loading prayers from AsyncStorage:", error);
    }
  };

  // Call loadPrayers when the component mounts
  useEffect(() => {
    loadPrayers();
  }, []);

  return (
    <AudioProvider>
      <GestureHandlerRootView style={styles.container}>
     

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
            <TouchableOpacity 
              style={styles.textOverlay}
              onPress={handleVersePress}
              activeOpacity={1}
            >
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
                  name={isVerseAudioPlaying ? "pause" : "play"} 
                  size={24} 
                  color="#ffffff" 
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>

        {isMenuVisible && (
          <Animated.View 
            style={[styles.menuContainer, menuAnimatedStyle]}
          >
            <View style={styles.menuCard}>
              <View style={styles.menuButtonsRow}>
                <TouchableOpacity 
                  style={[
                    styles.menuItem,
                    isSharing && styles.menuItemDisabled
                  ]} 
                  onPress={isSharing ? null : handleShare}
                  disabled={isSharing}
                >
                  <Ionicons 
                    name={isSharing ? "hourglass-outline" : "share-outline"} 
                    size={24} 
                    color={isSharing ? "#663399" : "#666666"}
                  />
                  <ThemedText style={styles.menuText}>Share</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={handleTimerPress}
                >
                  <Ionicons name="timer-outline" size={24} color="#666666" />
                  <ThemedText style={styles.menuText}>Sleep</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={handleSaveVerse}
                >
                  <Ionicons 
                    name={isSaved ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isSaved ? "#663399" : "#666666"}
                  />
                  <ThemedText 
                    style={[styles.menuText, isSaved && { color: "#663399" }]}
                  >
                    Favorite
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {isTimerMenuVisible && (
                <View style={styles.timerOptionsRow}>
                  {[5, 15, 30].map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.timerChip,
                        selectedTimer === minutes && styles.timerChipSelected
                      ]}
                      onPress={() => handleTimerSelect(minutes)}
                    >
                      <ThemedText 
                        style={[
                          styles.timerChipText,
                          selectedTimer === minutes && styles.timerChipTextSelected
                        ]}
                      >
                        {minutes}m
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
});
