import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert, Linking, Animated, BackHandler, ScrollView, Platform, TextInput } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { StreakDisplay } from '../../components/StreakDisplay';
import { PrayerButton } from '../../components/PrayerButton';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReligion } from '@/contexts/ReligionContext';

// Add this notification handler setup at the top level
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const scheduleSingleNotification = async (time: Date, isWakeTime: boolean) => {
  try {
    // First, let's cancel any existing notifications
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('\n=== Current Scheduled Notifications ===');
    console.log(`Found ${existingNotifications.length} existing notifications`);
    
    // Cancel existing notifications of the same type
    for (const notification of existingNotifications) {
      if (notification.content.title?.includes(isWakeTime ? "Morning" : "Evening")) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`Cancelled existing ${isWakeTime ? "morning" : "evening"} notification: ${notification.identifier}`);
      }
    }

    const notificationType = isWakeTime ? "Morning" : "Evening";
    
    // Create a new Date object for today with the specified time
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(time.getHours());
    scheduledTime.setMinutes(time.getMinutes());
    scheduledTime.setSeconds(0);
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const trigger = scheduledTime;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${notificationType} Prayer Time`,
        body: `Time for your ${notificationType.toLowerCase()} prayers 🙏`,
        sound: true,
      },
      trigger,
    });

    console.log('\n=== New Notification Scheduled ===');
    console.log({
      id,
      type: notificationType,
      scheduledTime: scheduledTime.toLocaleTimeString(),
      scheduledDate: scheduledTime.toLocaleDateString(),
      trigger: {
        timestamp: scheduledTime.getTime(),
        date: scheduledTime.toISOString(),
      },
    });

    // Verify the notification was scheduled
    const verifyNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('\n=== Verification of Scheduled Notifications ===');
    verifyNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. Notification ID: ${notification.identifier}`);
      console.log('   Title:', notification.content.title);
      console.log('   Trigger:', notification.trigger);
      console.log('   Scheduled Time:', new Date(notification.trigger.seconds * 1000).toLocaleString());
    });

    return id;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    throw error;
  }
};

interface PrayerBoxProps {
  title: string;
  icon: string;
  color: string;
  isCompleted?: boolean;
  onPress: (title: string) => void;
}

// Move PrayerBox outside the main component
const PrayerBox: React.FC<PrayerBoxProps> = ({ title, icon, color, isCompleted, onPress }) => (
  <TouchableOpacity 
    style={[styles.prayerBox, { backgroundColor: color }]}
    onPress={() => onPress(title)}
  >
    <View style={styles.prayerBoxContent}>
      <Text style={styles.prayerBoxIcon}>{icon}</Text>
      <Text style={styles.prayerBoxText}>{title}</Text>
      {isCompleted && <Text style={styles.checkmark}>✓</Text>}
    </View>
  </TouchableOpacity>
);

// Add this function near the top of the file
const generateDailyPrayer = (names: string[], intentions: string[]) => {
  const namesString = names.map((name, index) => {
    if (index === 0) return name;
    if (index === names.length - 1) return ` and ${name}`;
    return `, ${name}`;
  }).join('');

  const intentionsString = intentions.map((intention, index) => {
    if (index === 0) return intention.toLowerCase();
    if (index === intentions.length - 1) return ` and ${intention.toLowerCase()}`;
    return `, ${intention.toLowerCase()}`;
  }).join('');

  return `Dear Heavenly Father,

Please watch over and protect ${namesString}. Guide them with Your wisdom, fill their hearts with Your love, and bless them with Your grace.${intentionsString ? `\n\nLord, I pray for ${intentionsString} in their lives.` : ''}

Help them feel Your presence in their lives today and always.

In Jesus' name,
Amen.`;
};

export default function PrayerTrackerScreen() {
  const params = useLocalSearchParams();
  console.log('Daily Verse received:', params.dailyVerse);

  const [selectedPrayer, setSelectedPrayer] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [completedPrayers, setCompletedPrayers] = useState<{[key: number]: boolean}>({});
  const [markedDates, setMarkedDates] = useState({
    // Test data with dates around today (Jan 4, 2025)
    '2025-01-01': { marked: true, dotColor: '#50C878' },
    '2025-01-02': { marked: true, dotColor: '#50C878' },
    '2025-01-03': { marked: true, dotColor: '#50C878' },
    '2025-01-04': { marked: true, dotColor: '#50C878' },
  });
  const [isStatsVisible, setIsStatsVisible] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const [prayerModeActive, setPrayerModeActive] = useState(false);
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const [tempCompletedPrayers, setTempCompletedPrayers] = useState<Set<string>>(new Set());
  const [showNextButton, setShowNextButton] = useState(false);
  const [wakeTime, setWakeTime] = useState<Date | null>(null);
  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const [editingTimeType, setEditingTimeType] = useState<'wake' | 'sleep' | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [savedPrayerNames, setSavedPrayerNames] = useState<string[]>([]);
  const [selectedPrayerFor, setSelectedPrayerFor] = useState<string[]>([]);
  const [dailyPrayer, setDailyPrayer] = useState('');
  const [isFullPrayerVisible, setIsFullPrayerVisible] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [shareStreak, setShareStreak] = useState(0);
  const [totalShares, setTotalShares] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
  const [todaysRecordings, setTodaysRecordings] = useState<{ [key: string]: string }>({});
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedIntentions, setSelectedIntentions] = useState<string[]>([]);
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const [isIntentionDropdownOpen, setIsIntentionDropdownOpen] = useState(false);
  const [customIntention, setCustomIntention] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [isMainDropdownOpen, setIsMainDropdownOpen] = useState(false);
  const [savedPrayers, setSavedPrayers] = useState<{ prayer: string; timestamp: number }[]>([]);
  const { language, setLanguage, t } = useLanguage();
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const { getReligionEmoji, getAllReligions, religion, setReligion, getPrayerPrompt } = useReligion();
  const [isReligionDropdownVisible, setIsReligionDropdownVisible] = useState(false);

  const prayers: PrayerBoxProps[] = [
    { 
      title: "Padre Nuestro", 
      icon: "🙏", 
      color: '#FFE4E1' // Misty Rose
    },
    { 
      title: "Santa Maria", 
      icon: "👼", 
      color: '#E0FFFF' // Light Cyan
    },
    { 
      title: "Angel de la Guarda", 
      icon: "⭐", 
      color: '#F0FFF0' // Honeydew
    },
  ];

  // Add BackHandler effect for Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (prayerModeActive) {
        confirmExitPrayerMode();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [prayerModeActive]);

  const confirmExitPrayerMode = () => {
    Alert.alert(
      "¿Salir del modo oración?",
      "Si sales ahora, perderás el progreso de tus oraciones de hoy.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Salir",
          style: "destructive",
          onPress: () => {
            setPrayerModeActive(false);
            setCurrentPrayerIndex(0);
            setTempCompletedPrayers(new Set());
            setSelectedPrayer(null);
          }
        }
      ]
    );
  };

  // Modify handlePrayerSelect
  const handlePrayerSelect = (title: string) => {
    setPrayerModeActive(true);
    setSelectedPrayer(title);
    setCurrentPrayerIndex(prayers.findIndex(p => p.title === title));
  };

  // Add function to handle prayer completion
  const handlePrayerComplete = () => {
    if (selectedPrayer) {
      setTempCompletedPrayers(prev => new Set(prev).add(selectedPrayer));
      
      // Move to next prayer or finish prayer mode
      const nextIndex = currentPrayerIndex + 1;
      if (nextIndex < prayers.length) {
        setCurrentPrayerIndex(nextIndex);
        setSelectedPrayer(prayers[nextIndex].title);
      } else {
        // All prayers completed
        setCompletedPrayers(new Set(tempCompletedPrayers));
        setPrayerModeActive(false);
        setSelectedPrayer(null);
        
        // Update calendar if all prayers are completed
        if (tempCompletedPrayers.size === prayers.length) {
          const today = new Date().toISOString().split('T')[0];
          setMarkedDates(prev => ({
            ...prev,
            [today]: { marked: true, dotColor: '#50C878' }
          }));
        }
      }
    }
  };

  // Request permissions when component mounts
  useEffect(() => {
    (async () => {
      try {
        console.log('Requesting audio permissions...');
        const permission = await Audio.requestPermissionsAsync();
        console.log('Permission response:', permission);
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        setHasPermission(permission.status === 'granted');
        
        if (permission.status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable microphone access in your device settings to record prayers.',
            [
              {
                text: 'Open Settings',
                onPress: () => {
                  // On iOS this will open app settings
                  // On Android this will open app settings
                  Linking.openSettings();
                }
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      console.log('Checking permission status:', hasPermission);
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required to record prayers. Please enable it in settings.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return;
      }

      if (isRecording) {
        console.log('Already recording, skipping...');
        return;
      }

      console.log('Starting recording...');
      setIsRecording(true);

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  // Helper function to check if all prayers are completed
  const checkAllPrayersCompleted = (prayers: Set<string>) => {
    return prayers.size === 3; // Since we have 3 prayers total
  };

  const stopRecording = async () => {
    if (!recording || !isRecording) {
      console.log('No active recording to stop');
      return;
    }

    try {
      console.log('Stopping recording...');
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      setShowNextButton(true); // Show the next button after recording stops
      console.log('Recording stopped successfully');
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
    setRecording(null);
  };

  const toggleStats = () => {
    console.log('Toggling stats. Current state:', isStatsVisible);
    setIsStatsVisible(!isStatsVisible);
    Animated.timing(animatedHeight, {
      toValue: isStatsVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      console.log('Animation completed. New state:', !isStatsVisible);
    });
  };

  const startPrayerMode = () => {
    setPrayerModeActive(true);
    setCurrentPrayerIndex(0);
    setSelectedPrayer(prayers[0].title);
    setTempCompletedPrayers(new Set());
  };

  // Add this useEffect to fetch times when component mounts
  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        const onboardingDataString = await AsyncStorage.getItem('onboardingData');
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          setWakeTime(new Date(onboardingData.wakeTime));
          setSleepTime(new Date(onboardingData.sleepTime));
        }
      } catch (error) {
        console.error('Error loading onboarding data:', error);
      }
    };

    loadOnboardingData();
  }, []);

  // Update useEffect to also generate and save the prayer
  useFocusEffect(
    React.useCallback(() => {
      const loadPrayerData = async () => {
        try {
          // Load prayer names and intentions from onboardingData
          const onboardingDataString = await AsyncStorage.getItem('onboardingData');
          if (onboardingDataString) {
            const onboardingData = JSON.parse(onboardingDataString);
            setSavedPrayerNames(onboardingData.prayerNames || []);
            setSelectedPrayerFor(onboardingData.prayerFor || []);
          }
        } catch (error) {
          console.error('Error loading prayer data:', error);
        }
      };

      loadPrayerData();
    }, [])
  );

  // Add new useEffect to update prayer when dependencies change
  useEffect(() => {
    const updateDailyPrayer = async () => {
      const prayer = generateDailyPrayer(savedPrayerNames, selectedPrayerFor);
      setDailyPrayer(prayer);
      await AsyncStorage.setItem('dailyPrayer', prayer);
    };

    updateDailyPrayer();
  }, [savedPrayerNames, selectedPrayerFor]);

  // Add this helper function to format times
  const formatTime = (date: Date | null) => {
    if (!date) return { time: 'Not set', period: '' };
    const timeString = date.toLocaleTimeString('es-ES', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const [time, period] = timeString.split(' ');
    return { time, period };
  };

  const openTimeEditor = (type: 'wake' | 'sleep') => {
    setEditingTimeType(type);
    setTempTime(type === 'wake' ? wakeTime : sleepTime);
    setIsTimeModalVisible(true);
  };

  const saveTimeChanges = async () => {
    if (!tempTime || !editingTimeType) return;

    try {
      const onboardingDataString = await AsyncStorage.getItem('onboardingData');
      if (onboardingDataString) {
        const onboardingData = JSON.parse(onboardingDataString);
        const updatedData = {
          ...onboardingData,
          [editingTimeType === 'wake' ? 'wakeTime' : 'sleepTime']: tempTime.toISOString()
        };
        
        await AsyncStorage.setItem('onboardingData', JSON.stringify(updatedData));
        
        // Schedule the daily notification
        const notificationId = await scheduleSingleNotification(
          tempTime, 
          editingTimeType === 'wake'
        );

        if (editingTimeType === 'wake') {
          setWakeTime(tempTime);
        } else {
          setSleepTime(tempTime);
        }

        // Schedule immediate confirmation notification
        const confirmationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Prayer Time Updated",
            body: `Your ${editingTimeType} time has been set to ${formatTime(tempTime).time}. You will be notified daily at this time.`,
            sound: true,
          },
          trigger: { seconds: 5 }
        });

        console.log('\n=== Confirmation Notification Scheduled ===');
        console.log({
          id: confirmationId,
          type: 'Confirmation',
          message: `${editingTimeType} time set to ${formatTime(tempTime).time}`,
          delay: '5 seconds'
        });

        // Final verification of all scheduled notifications
        const finalNotifications = await Notifications.getAllScheduledNotificationsAsync();
        console.log('\n=== Final Verification of All Scheduled Notifications ===');
        console.log(`Total scheduled notifications: ${finalNotifications.length}`);
        finalNotifications.forEach((notification, index) => {
          console.log(`${index + 1}. Notification Details:`);
          console.log('   ID:', notification.identifier);
          console.log('   Title:', notification.content.title);
          console.log('   Body:', notification.content.body);
          console.log('   Trigger:', notification.trigger);
        });
      }
    } catch (error) {
      console.error('Error saving time:', error);
      Alert.alert('Error', 'Failed to save time settings');
    }

    setIsTimeModalVisible(false);
    setEditingTimeType(null);
  };

  const adjustTime = (amount: number, unit: 'hours' | 'minutes') => {
    if (!tempTime) return;
    
    const newTime = new Date(tempTime);
    if (unit === 'hours') {
      newTime.setHours(newTime.getHours() + amount);
    } else {
      newTime.setMinutes(newTime.getMinutes() + amount);  // Changed from +/- 5 to +/- 1
    }
    setTempTime(newTime);
  };

  const checkPrayerCompletion = async (prayerNumber: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const prayerKey = `bendiga_app_${prayerNumber}_${today}`;
      const status = await AsyncStorage.getItem(prayerKey);
      console.log(`Checking prayer ${prayerNumber}:`, { prayerKey, status });
      return status === 'completed';
    } catch (error) {
      console.error(`Error checking prayer ${prayerNumber} completion:`, error);
      return false;
    }
  };

  // Add a function to refresh prayer status
  const refreshPrayerStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const completedStatus = {};
      
      // Update the keys to match the new format
      for (let i = 1; i <= 4; i++) {
        const prayerKey = `bendiga_app_${i}_${today}`;
        const status = await AsyncStorage.getItem(prayerKey);
        completedStatus[i] = status === 'completed';
      }
      
      setCompletedPrayers(completedStatus);
    } catch (error) {
      console.error('Error refreshing prayer status:', error);
    }
  };

  // Update useFocusEffect to use the refresh function
  useFocusEffect(
    React.useCallback(() => {
      refreshPrayerStatus();
      
      // Optional: Set up an interval to refresh status periodically
      const intervalId = setInterval(refreshPrayerStatus, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(intervalId);
    }, [])
  );

  // Simplify handleStartPrayerMode since prayer is already saved
  const handleStartPrayerMode = () => {
    router.push('/prayer-mode');
  };

  // Add helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  // Update the calculateStreak function to use AsyncStorage
  const calculateStreak = async () => {
    try {
      const streakData = await AsyncStorage.getItem('streakData');
      if (streakData) {
        const data = JSON.parse(streakData);
        setCurrentStreak(data.currentStreak);
        console.log('Retrieved streak:', data.currentStreak);
      } else {
        setCurrentStreak(0);
        console.log('No streak data found');
      }
    } catch (error) {
      console.error('Error calculating streak:', error);
      setCurrentStreak(0);
    }
  };

  // Update useEffect to handle async calculateStreak
  useEffect(() => {
    calculateStreak();
  }, []);

  // Add useFocusEffect to recalculate streak when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      calculateStreak();
    }, [])
  );

  // Add this function to load share stats
  const loadShareStats = async () => {
    try {
      const shareData = await AsyncStorage.getItem('shareStreak');
      if (shareData) {
        const { dailyStreak, totalShares } = JSON.parse(shareData);
        setShareStreak(dailyStreak);
        setTotalShares(totalShares);
      }
    } catch (error) {
      console.error('Error loading share stats:', error);
    }
  };

  // Update useFocusEffect to also load share stats
  useFocusEffect(
    React.useCallback(() => {
      calculateStreak();
      loadShareStats();
    }, [])
  );

  // Add function to load today's recordings
  const loadTodaysRecordings = async () => {
    try {
      const recordings = await AsyncStorage.getItem('prayerRecordings');
      if (recordings) {
        const allRecordings = JSON.parse(recordings);
        const today = new Date().toISOString().split('T')[0];
        
        // Filter recordings for today and create a map of prayer name to URI
        const todaysPrayers = allRecordings.filter((rec: any) => 
          rec.timestamp.startsWith(today)
        ).reduce((acc: any, rec: any) => ({
          ...acc,
          [rec.prayerName]: rec.uri
        }), {});

        setTodaysRecordings(todaysPrayers);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  };

  // Add function to handle sharing
  const shareRecording = async (prayerName: string) => {
    try {
      const uri = todaysRecordings[prayerName];
      if (!uri) return;

      await Sharing.shareAsync(uri, {
        mimeType: 'audio/mp4',
        dialogTitle: `Share ${prayerName} Recording`,
        UTI: 'public.audio'
      });
    } catch (error) {
      console.error('Error sharing recording:', error);
      Alert.alert('Error', 'Failed to share recording');
    }
  };

  // Add cleanup for audio
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Update useFocusEffect to also load recordings
  useFocusEffect(
    React.useCallback(() => {
      refreshPrayerStatus();
      loadTodaysRecordings();
      loadShareStats();
    }, [])
  );

  // Add useEffect to check onboarding status when component mounts
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const onboardingStatus = await AsyncStorage.getItem('hasOnboarded');
        setHasOnboarded(onboardingStatus === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasOnboarded(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Keep the useEffect for dailyVerse
  useEffect(() => {
    if (params.dailyVerse) {
      setIsMainDropdownOpen(true);
      setInstructions(params.dailyVerse as string);
    }
  }, [params.dailyVerse]);

  // Load saved prayers - this function can be used by both useFocusEffect and refresh button
  const loadSavedPrayers = async () => {
    try {
      const savedPrayersStr = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayersStr) {
        const prayers = JSON.parse(savedPrayersStr);
        setSavedPrayers(prayers);
      }
    } catch (error) {
      console.error('Error loading saved prayers:', error);
    }
  };

  // Update useFocusEffect to load prayers when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadSavedPrayers();
    }, [])
  );

  // Update the refresh button to use the same loading function
  const handleRefresh = () => {
    loadSavedPrayers();
  };

  // Show loading state while checking onboarding status
  if (hasOnboarded === null) {
    return null; // Or a loading spinner if you prefer
  }

  const PrayerCard = ({ prayer, index }) => (
    <TouchableOpacity 
      style={styles.prayerCard}
      onPress={() => {
        // Safely track when user revisits a bookmarked prayer
        if (typeof trackEvent === 'function') {
          trackEvent('Revisit Bookmark Action', {
            prayer_id: prayer.id || index,
            prayer_timestamp: prayer.timestamp,
            prayer_length: prayer.text?.length || 0,
            has_audio: prayer.generatedAudioPath ? 'yes' : 'no'
          });
        }
        
        // Your existing navigation code
        router.push({
          pathname: '/prayer-voice',
          params: { prayer: JSON.stringify(prayer) }
        });
      }}
    >
      {/* Add bookmark icon at the top right */}
      {prayer.isBookmarked && (
        <View style={styles.bookmarkIconContainer}>
          <Ionicons name="bookmark" size={20} color="#5856D6" />
        </View>
      )}
      
      <Text style={styles.prayerText} numberOfLines={3}>
        {prayer.text}
      </Text>
      <View style={styles.prayerCardFooter}>
        <Text style={styles.prayerDate}>
          {prayer.timestamp ? new Date(prayer.timestamp).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : ''}
        </Text>
        <Ionicons 
          name={prayer.generatedAudioPath ? "musical-note" : "timer-outline"} 
          size={16} 
          color="#666"
        />
      </View>
    </TouchableOpacity>
  );

  // Modify handleGeneratePrayer to include the religion-specific prompt
  const handleGeneratePrayer = () => {
    // Get the religion-specific prayer prompt using the context that's already available
    const prayerPrompt = getPrayerPrompt(language);
    
    router.push({
      pathname: '/prayer-voice',
      params: {
        instructions,
        dailyVerse: params.dailyVerse,
        isNewGeneration: 'true',
        prayerPrompt
      }
    });
  };

  return (
    <View style={styles.container}>
      {!hasOnboarded ? (
        <View style={styles.onboardingPrompt}>
          <TouchableOpacity 
            style={styles.prayerModeButton}
            onPress={() => router.push('/onboarding')}
          >
            <Text style={styles.prayerModeButtonText}>{t('start_onboarding')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Top navigation bar with language and religion selectors */}
          <View style={styles.topNavBar}>
            <View style={styles.selectionContainer}>
              {/* Language Button */}
              <TouchableOpacity 
                style={styles.selectorButton}
                onPress={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              >
                <Text style={styles.selectorText}>
                  {language === 'en' ? '🇺🇸 English' : 
                   language === 'es' ? '🇪🇸 Español' : 
                   language === 'hi' ? '🇮🇳 हिंदी' : 
                   '🇧🇷 Português'}
                </Text>
              </TouchableOpacity>

              {/* Religion Button */}
              <TouchableOpacity 
                style={styles.selectorButton}
                onPress={() => setIsReligionDropdownVisible(!isReligionDropdownVisible)}
              >
                <Text style={styles.selectorText}>
                  {getReligionEmoji()} {getAllReligions().find(r => r.id === religion)?.name || ''}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Profile Button - Positioned at top right */}
            {/* <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/profile')}
            >
              <Ionicons 
                name="person-circle-outline" 
                size={32} 
                color={Colors.light.primary} 
              />
            </TouchableOpacity> */}
          </View>

          {/* Language Dropdown Menu */}
          {isLanguageDropdownOpen && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity 
                style={styles.dropdownOption}
                onPress={() => {
                  setLanguage('en');
                  setIsLanguageDropdownOpen(false);
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  language === 'en' && styles.selectedOption
                ]}>🇺🇸 English</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dropdownOption}
                onPress={() => {
                  setLanguage('es');
                  setIsLanguageDropdownOpen(false);
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  language === 'es' && styles.selectedOption
                ]}>🇪🇸 Español</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dropdownOption}
                onPress={() => {
                  setLanguage('hi');
                  setIsLanguageDropdownOpen(false);
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  language === 'hi' && styles.selectedOption
                ]}>🇮🇳 हिंदी</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dropdownOption}
                onPress={() => {
                  setLanguage('pt');
                  setIsLanguageDropdownOpen(false);
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  language === 'pt' && styles.selectedOption
                ]}>🇧🇷 Português</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Religion Dropdown Menu */}
          {isReligionDropdownVisible && (
            <View style={styles.dropdownMenu}>
              {getAllReligions().map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setReligion(item.id);
                    setIsReligionDropdownVisible(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    religion === item.id && styles.selectedOption
                  ]}>{item.emoji} {item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

      

          <ScrollView style={styles.savedPrayersContainer}>
            {/* Simplified Prayer Generator */}
            <View style={styles.prayerGeneratorContainer}>
              <Text style={styles.instructionsLabel}>
                {language === 'en' ? 'Instructions' : 
                 language === 'es' ? 'Instrucciones' : 
                 language === 'hi' ? 'निर्देश' : 
                 'Instruções'}
              </Text>
              
              <View style={styles.predefinedOptionsContainer}>
                <Text style={styles.predefinedOptionsLabel}>{t('select_intentions')}</Text>
                
                <View style={styles.optionsGrid}>
                  {[
                    'myself', 'mother', 'father', 'siblings',
                    'love', 'friends', 'health', 'abundance',
                    'humanity', 'enemies', 'sinners', 'lonely',
                    'finance', 'success', 'holy_scripture'
                  ].map((option) => (
                    <TouchableOpacity 
                      key={option}
                      style={styles.optionButton}
                      onPress={() => setInstructions(prev => 
                        prev ? `${prev} ${t(option)}` : t(option)
                      )}
                    >
                      <Text style={styles.optionButtonText}>{t(option)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TextInput
                style={styles.instructionsInput}
                multiline
                value={instructions}
                onChangeText={setInstructions}
                placeholder={
                  language === 'en' ? 'Enter your prayer instructions here...' : 
                  language === 'es' ? 'Ingresa tus instrucciones de oración aquí...' : 
                  language === 'hi' ? 'अपने प्रार्थना निर्देश यहां दर्ज करें...' : 
                  'Digite suas instruções de oração aqui...'
                }
                textAlignVertical="top"
              />
              
              <TouchableOpacity 
                style={styles.generateButton}
                onPress={handleGeneratePrayer}
              >
                <Text style={styles.generateButtonText}>
                  {language === 'en' ? 'Generate Prayer' : 
                   language === 'es' ? 'Generar Oración' : 
                   language === 'hi' ? 'प्रार्थना उत्पन्न करें' : 
                   'Gerar Oração'}
                </Text>
              </TouchableOpacity>
            </View>
       
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  statsButton: {
    height: 100,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: 'center',
        marginBottom: 10,

  },
  statsButtonContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 20,
    
  },
  streaksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    marginTop:-40
  },
  streakContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTextContainer: {
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  streakCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 8,
  },
  expandButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statsButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 4,
  },
  arrowIcon: {
    fontSize: 12,
    color: '#666',
  },
  prayerBoxesContainer: {
    padding: 16,
    gap: 12, // Space between cards
  },
  prayerBox: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3, // for Android shadow
    marginBottom: 2, // Extra space for shadow
  },
  prayerBoxContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prayerBoxIcon: {
    fontSize: 24,
  },
  prayerBoxText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  micButton: {
    backgroundColor: '#50C878',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  micButtonText: {
    fontSize: 30,
  },
  closeButton: {
    padding: 10,
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statsContent: {
    padding: 16,
  },
  calendar: {
    marginTop: 10,
    width: '100%',
    minHeight: 350,
  },
  prayerModeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exitButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
  },
  exitButtonText: {
    fontSize: 24,
    color: '#666',
  },
  prayerModeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  micButtonRecording: {
    backgroundColor: '#ff4444',
  },
  recordingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  prayerModeButton: {
    backgroundColor: Colors.light.primary,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  prayerModeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#50C878',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  timesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  timeBox: {
    alignItems: 'center',
    flex: 1,
    padding: 20,
  },
  timeLabel: {
    fontSize: 19,
    color: Colors.light.primary,
    marginBottom: 4,
  },
  timeValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  timePeriod: {
    fontSize: 12,  // Half the size of timeValue
    fontWeight: '600',
    color: Colors.light.primary,
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  timeEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  timeAdjuster: {
    alignItems: 'center',
    width: 80,
  },
  timeButton: {
    padding: 15,
  },
  timeButtonText: {
    fontSize: 24,
    color: Colors.light.primary,
  },
  timeDisplay: {
    fontSize: 40,
    fontWeight: 'bold',
    marginVertical: 10,
    color: Colors.light.primary,
  },
  timeSeparator: {
    fontSize: 40,
    fontWeight: 'bold',
    marginHorizontal: 10,
    color: Colors.light.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonText: {
    color: Colors.light.primary,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  prayerNamesContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  prayerNamesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  prayerName: {
    fontSize: 16,
    color: '#666',
    marginVertical: 4,
  },
  prayersContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 16,
  },
  prayerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginHorizontal: 2,
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 8,
  },
  showMoreText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  prayerList: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
  },
  prayerItem: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  prayerItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'normal',
  },
  prayerStatus: {
    fontSize: 24,
    marginLeft: 12,
  },
  resetButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'normal',
  },
  timeHeaderContainer: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
  },
  timeHeaderText: {
    fontSize: 21,
    color: '#666',
    fontWeight: '500',
  },
  prayerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareButton: {
    padding: 4,
  },
  profileButton: {
    position: 'absolute',
    top: 60,  // Adjust this value based on your status bar height
    right: 20,
    padding: 8,
    zIndex: 1000,
  },
  onboardingPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  simpleDropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownHeader: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dropdownPreview: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 100,
    left: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 200,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOption: {
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  topNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    width: '100%',
  },
  selectionContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectorButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectorText: {
    fontSize: 16,
  },
  savedPrayersContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  prayerCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  audioIndicator: {
    fontSize: 16,
  },
  savedPrayersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  savedPrayersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  refreshButton: {
    padding: 8,
  },
  bookmarkIconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  languageButton: {
    position: 'absolute',
    top: 60,  // Adjust this value based on your status bar height
    left: 20,
    padding: 8,
    zIndex: 1000,
  },
  languageButtonText: {
    fontSize: 24,
    color: Colors.light.primary,
  },
  languageDropdown: {
    position: 'absolute',
    top: 100,  // Adjust this value based on your status bar height
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
  },
  languageOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#666',
  },
  selectedLanguage: {
    fontWeight: 'bold',
  },
  prayerGeneratorContainer: {
    marginTop: 100,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: Colors.light.primary,
  },
  instructionsInput: {
    height: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  generateButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  predefinedOptionsContainer: {
    marginBottom: 15,
  },
  predefinedOptionsLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: '#555',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
    alignItems: 'center',
    flex: 0,
    flexGrow: 0,
    flexBasis: 'auto',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  religionButton: {
    position: 'absolute',
    top: 50,
    left: 140, // Position it to the right of language button
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  
  religionButtonText: {
    fontSize: 18,
    marginRight: 4,
  },
  
  religionDropdown: {
    position: 'absolute',
    top: 90,
    left: 140,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 200,
  },
  
  religionOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  religionOptionText: {
    fontSize: 16,
  },
  
  selectedReligion: {
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
});