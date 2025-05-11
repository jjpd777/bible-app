import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Share,
  useColorScheme,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { MOCK_WEEKLY_CONTENT } from '@/constants/mockWeeklyContent';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  FadeIn
} from 'react-native-reanimated';

// In a real app, you would fetch from your API instead of using mock data
const fetchContentById = async (id) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, replace with actual API call:
  // const response = await fetch(`https://your-backend.com/weekly-content/${id}`);
  // const data = await response.json();
  
  return MOCK_WEEKLY_CONTENT.find(item => item.id.toString() === id.toString());
};

export default function WeeklyContentDetailScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme() || 'light';
  const { language } = useLanguage();
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  
  const isDark = colorScheme === 'dark';
  const screenWidth = Dimensions.get('window').width;
  
  // Animation values
  const headerOpacity = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const scrollRef = useRef(null);
  
  useEffect(() => {
    loadContent();
    
    // Track screen view
    if (trackEvent) {
      trackEvent('Screen View', {
        screen_name: 'Weekly Content Detail',
        content_id: id,
        language: language
      });
    }
    
    // Start header animation
    headerOpacity.value = withTiming(1, { duration: 500 });
    
    // Cleanup audio on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [id]);
  
  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchContentById(id);
      
      if (!data) {
        throw new Error('Content not found');
      }
      
      setContent(data);
    } catch (err) {
      console.error('Error loading content detail:', err);
      setError('Failed to load content. Please try again.');
      
      // Track error
      if (trackEvent) {
        trackEvent('Content Detail Error', {
          error_message: err.message || 'Unknown error',
          content_id: id
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handlePlayAudio = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playFromPositionAsync(playbackPosition);
          setIsPlaying(true);
        }
      } else if (content?.explanation_audio_url) {
        // Track audio play
        if (trackEvent) {
          trackEvent('Play Audio', {
            content_id: content.id,
            language: content.language
          });
        }
        
        // Load and play new audio
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: content.explanation_audio_url },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      alert('Could not play audio. Please try again.');
    }
  };
  
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      setPlaybackDuration(status.durationMillis);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  };
  
  const handleShare = async () => {
    try {
      // Track share attempt
      if (trackEvent) {
        trackEvent('Share Content', {
          content_id: content.id,
          language: content.language
        });
      }
      
      await Share.share({
        message: `"${content.verse_llm_response}" - Check out this inspiring content from Bible App!`,
        url: content.image_url, // On iOS this will be included, on Android it may be ignored
      });
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  };
  
  const handleBackPress = () => {
    router.back();
  };
  
  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));
  
  // Format playback time
  const formatTime = (milliseconds) => {
    if (!milliseconds) return '0:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Loading state
  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
        <ThemedText style={styles.loadingText}>
          {language === 'es' ? 'Cargando contenido...' : 'Loading content...'}
        </ThemedText>
      </ThemedView>
    );
  }
  
  // Error state
  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors[colorScheme].error} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={loadContent}>
          <ThemedText style={styles.retryText}>
            {language === 'es' ? 'Reintentar' : 'Retry'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }
  
  // Content not found
  if (!content) {
    return (
      <ThemedView style={styles.centered}>
        <Ionicons name="document-outline" size={48} color={Colors[colorScheme].text} />
        <ThemedText style={styles.emptyText}>
          {language === 'es' 
            ? 'Contenido no encontrado.' 
            : 'Content not found.'}
        </ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ThemedText style={styles.backButtonText}>
            {language === 'es' ? 'Volver' : 'Go Back'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }
  
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color={Colors[colorScheme].text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={Colors[colorScheme].text} />
        </TouchableOpacity>
      </Animated.View>
      
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image */}
        <Animated.View entering={FadeIn.duration(800)}>
          <Image 
            source={{ uri: content.image_url }} 
            style={styles.heroImage}
            resizeMode="cover"
          />
        </Animated.View>
        
        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Verse */}
          <ThemedText style={styles.verseText}>
            "{content.verse_llm_response}"
          </ThemedText>
          
          {/* Explanation */}
          <ThemedText style={styles.sectionTitle}>
            {language === 'es' ? 'Explicación' : 'Explanation'}
          </ThemedText>
          <ThemedText style={styles.explanationText}>
            {content.explanation_llm_response}
          </ThemedText>
          
          {/* Audio Player */}
          {content.explanation_audio_url && (
            <View style={styles.audioPlayerContainer}>
              <ThemedText style={styles.audioTitle}>
                {language === 'es' ? 'Audio Explicación' : 'Audio Explanation'}
              </ThemedText>
              
              <View style={styles.audioPlayer}>
                <TouchableOpacity 
                  style={styles.playButton}
                  onPress={handlePlayAudio}
                >
                  <Ionicons 
                    name={isPlaying ? "pause" : "play"} 
                    size={32} 
                    color={Colors[colorScheme].primary} 
                  />
                </TouchableOpacity>
                
                <View style={styles.progressContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${playbackDuration ? (playbackPosition / playbackDuration) * 100 : 0}%`,
                        backgroundColor: Colors[colorScheme].primary 
                      }
                    ]} 
                  />
                  <View style={styles.timeContainer}>
                    <ThemedText style={styles.timeText}>
                      {formatTime(playbackPosition)}
                    </ThemedText>
                    <ThemedText style={styles.timeText}>
                      {formatTime(playbackDuration)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          )}
          
          {/* Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <Ionicons name="globe-outline" size={16} color={Colors[colorScheme].text} />
              <ThemedText style={styles.metadataText}>
                {content.language === 'en' ? 'English' : 'Español'}
              </ThemedText>
            </View>
            
            <View style={styles.metadataItem}>
              <Ionicons name="book-outline" size={16} color={Colors[colorScheme].text} />
              <ThemedText style={styles.metadataText}>
                {content.verse_system}
              </ThemedText>
            </View>
            
            <View style={styles.metadataItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors[colorScheme].text} />
              <ThemedText style={styles.metadataText}>
                {new Date(content.updated_at).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 250,
  },
  contentContainer: {
    padding: 20,
  },
  verseText: {
    fontSize: 22,
    fontWeight: '500',
    marginBottom: 24,
    lineHeight: 32,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  audioPlayerContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    marginRight: 12,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#007AFF',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 14,
    marginLeft: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  }
}); 