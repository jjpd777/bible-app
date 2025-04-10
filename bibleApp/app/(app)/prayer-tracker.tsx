import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert, Linking, Animated, BackHandler, ScrollView, Platform, TextInput } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { StreakDisplay } from '../../components/StreakDisplay';
import { PrayerButton } from '../../components/PrayerButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReligion } from '@/contexts/ReligionContext';
import { useButtonOptions } from '../../contexts/ButtonOptionsContext';
//

// Keep notification handler setup
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
  const { trackEvent } = useAnalytics();

  // Track page view
  useEffect(() => {
    if (typeof trackEvent === 'function') {
      trackEvent('Page View', { page_name: 'Prayer Generation Form' });
    }
  }, [trackEvent]);

  const [selectedPrayer, setSelectedPrayer] = useState<string | null>(null);
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
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
  const [todaysRecordings, setTodaysRecordings] = useState<{ [key: string]: string }>({});
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
  const { getOptionsForCategory, getCategoryTitle } = useButtonOptions();

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
          // Load prayer names and intentions
          const savedPrayerNamesData = await AsyncStorage.getItem('prayerNames');
          const savedPrayerForData = await AsyncStorage.getItem('prayerFor');
          
          if (savedPrayerNamesData) {
            setSavedPrayerNames(JSON.parse(savedPrayerNamesData));
          }
          
          if (savedPrayerForData) {
            setSelectedPrayerFor(JSON.parse(savedPrayerForData));
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

  // Update useFocusEffect to remove audio-related functions
  useFocusEffect(
    React.useCallback(() => {
      refreshPrayerStatus();
      loadShareStats();
    }, [])
  );

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

  // Modify handleGeneratePrayer to clear the text input after generating
  const handleGeneratePrayer = () => {
    // Get the religion-specific prayer prompt using the context
    const prayerPrompt = getPrayerPrompt(language);
    
    // Navigate to prayer-voice screen
    router.push({
      pathname: '/prayer-voice',
      params: {
        instructions,
        dailyVerse: params.dailyVerse,
        isNewGeneration: 'true',
        language: language,
        prayerPrompt: prayerPrompt
      }
    });
    
    // Clear the text input
    setInstructions('');
  };

  return (
    <View style={styles.container}>
      {/* Hiding the top navigation bar by setting display: 'none' */}
      <View style={[styles.topNavBar, { display: 'none' }]}>
        <View style={styles.selectionContainer}>
          {/* Language Button */}
          <TouchableOpacity 
            style={styles.selectorButton}
            onPress={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
          >
            <Text style={styles.selectorText}>
              {language === 'en' ? '🇺🇸 ' : 
               language === 'es' ? '🇪🇸 ' : 
               language === 'hi' ? '🇮🇳 ' : 
               language === 'pt' ? '🇧🇷 ' : 
               language === 'id' ? '🇮🇩' : 
               '🇫🇷 Français'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.light.primary} style={styles.selectorIcon} />
          </TouchableOpacity>

          {/* Religion Button */}
          <TouchableOpacity 
            style={styles.selectorButton}
            onPress={() => setIsReligionDropdownVisible(!isReligionDropdownVisible)}
          >
            <Text style={styles.selectorText}>
              {getReligionEmoji()} {getAllReligions().find(r => r.id === religion)?.name || ''}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.light.primary} style={styles.selectorIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Dropdown Menu - Redesigned */}
      {isLanguageDropdownOpen && (
        <View style={styles.dropdownMenu}>
          {[
            { code: 'en', label: '🇺🇸 English' },
            { code: 'es', label: '🇪🇸 Español' },
            { code: 'hi', label: '🇮🇳 हिंदी' },
            { code: 'pt', label: '🇧🇷 Português' },
            { code: 'id', label: '🇮🇩 Bahasa Indonesia' },
            { code: 'fr', label: '🇫🇷 Français' }
          ].map(item => (
            <TouchableOpacity 
              key={item.code}
              style={[
                styles.dropdownOption,
                language === item.code && styles.activeDropdownOption
              ]}
              onPress={() => {
                setLanguage(item.code as Language);
                setIsLanguageDropdownOpen(false);
              }}
            >
              <Text style={[
                styles.dropdownOptionText,
                language === item.code && styles.selectedOption
              ]}>{item.label}</Text>
              {language === item.code && (
                <Ionicons name="checkmark" size={18} color={Colors.light.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Religion Dropdown Menu - Redesigned */}
      {isReligionDropdownVisible && (
        <View style={styles.dropdownMenu}>
          {getAllReligions().map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={[
                styles.dropdownOption,
                religion === item.id && styles.activeDropdownOption
              ]}
              onPress={() => {
                setReligion(item.id);
                setIsReligionDropdownVisible(false);
              }}
            >
              <Text style={[
                styles.dropdownOptionText,
                religion === item.id && styles.selectedOption
              ]}>{item.emoji} {item.name}</Text>
              {religion === item.id && (
                <Ionicons name="checkmark" size={18} color={Colors.light.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.savedPrayersContainer}>
        {/* Redesigned Prayer Generator */}
        <View style={styles.prayerGeneratorContainer}>
          {/* Prayer For section - now displayed first */}
          <Text style={styles.instructionsLabel}>
            {getCategoryTitle('prayer_for')}
          </Text>
          
          <View style={styles.predefinedOptionsContainer}>
            <View style={styles.optionsGrid}>
              {getOptionsForCategory('prayer_for').map((option) => (
                <TouchableOpacity 
                  key={option.id}
                  style={styles.optionButton}
                  onPress={() => setInstructions(prev => 
                    prev ? `${prev} ${option.label}` : option.label
                  )}
                >
                  <Text style={styles.optionButtonText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Prayer Intentions section - now displayed second */}
          <Text style={[styles.instructionsLabel, styles.secondSectionTitle]}>
            {getCategoryTitle('prayer_intentions')}
          </Text>
          
          <View style={styles.predefinedOptionsContainer}>
            <View style={styles.optionsGrid}>
              {getOptionsForCategory('prayer_intentions').map((option) => (
                <TouchableOpacity 
                  key={option.id}
                  style={styles.optionButton}
                  onPress={() => setInstructions(prev => 
                    prev ? `${prev} ${option.label}` : option.label
                  )}
                >
                  <Text style={styles.optionButtonText}>{option.label}</Text>
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
              language === 'en' ? 'Enter your prayer intentions here...' : 
              language === 'es' ? 'Ingresa tus intenciones de oración aquí...' : 
              language === 'hi' ? 'अपनी प्रार्थना इरादों यहां दर्ज करें...' : 
              language === 'pt' ? 'Digite suas intenções de oração aqui...' : 
              language === 'id' ? 'Masukkan niat doa Anda di sini...' : 
              language === 'fr' ? 'Entrez vos intentions de prière ici...' : 
              'Enter your prayer intentions here...'
            }
            textAlignVertical="top"
            placeholderTextColor="#999"
          />
          
          <TouchableOpacity 
            style={styles.generateButton}
            onPress={handleGeneratePrayer}
          >
            <Ionicons name="create-outline" size={20} color="#fff" style={styles.generateButtonIcon} />
            <Text style={styles.generateButtonText}>
              {language === 'en' ? 'Generate Prayer' : 
               language === 'es' ? 'Generar Oración' : 
               language === 'hi' ? 'प्रार्थना उत्पन्न करें' : 
               language === 'pt' ? 'Gerar Oração' : 
               language === 'id' ? 'Buat Doa' : 
               language === 'fr' ? 'Générer une Prière' : 
               'Generate Prayer'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    top: 120,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 5,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    width: 220,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeDropdownOption: {
    backgroundColor: '#f0f8ff',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 15,
    width: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  selectionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 25,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 5,
  },
  selectorIcon: {
    marginLeft: 2,
  },
  savedPrayersContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  prayerGeneratorContainer: {
    marginTop: 82,
    marginHorizontal: 5,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  instructionsLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.light.primary,
    textAlign: 'left',
  },
  secondSectionTitle: {
    marginTop: 16,
  },
  predefinedOptionsContainer: {
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#f5f2fa',
    paddingHorizontal: 14.4,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0dce8',
    minWidth: 92,
    alignItems: 'center',
    flex: 0,
    flexGrow: 0,
    flexBasis: 'auto',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
    textAlign: 'center',
  },
  instructionsInput: {
    height: 120,
    borderWidth: 1,
    borderColor: '#e0e5eb',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9fafc',
    marginTop: 8,
    marginBottom: 20,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  generateButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  generateButtonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bookmarkIconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
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
});