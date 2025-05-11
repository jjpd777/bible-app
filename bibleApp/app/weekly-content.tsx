import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  useColorScheme,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { MOCK_WEEKLY_CONTENT } from '@/constants/mockWeeklyContent';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// In a real app, you would fetch from your API instead of using mock data
const fetchWeeklyContent = async (language = 'en') => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In production, replace with actual API call:
  // const response = await fetch('https://your-backend.com/weekly-content');
  // const data = await response.json();
  
  // Filter by language
  return MOCK_WEEKLY_CONTENT.filter(item => item.language === language);
};

export default function WeeklyContentScreen() {
  const colorScheme = useColorScheme() || 'light';
  const { language } = useLanguage();
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sound, setSound] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  
  const isDark = colorScheme === 'dark';
  const screenWidth = Dimensions.get('window').width;
  
  useEffect(() => {
    loadContent();
    
    // Track screen view
    if (trackEvent) {
      trackEvent('Screen View', {
        screen_name: 'Weekly Content',
        language: language
      });
    }
    
    // Cleanup audio on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [language]);
  
  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWeeklyContent(language);
      setContent(data);
    } catch (err) {
      console.error('Error loading weekly content:', err);
      setError('Failed to load content. Please try again.');
      
      // Track error
      if (trackEvent) {
        trackEvent('Content Error', {
          error_message: err.message || 'Unknown error',
          screen: 'Weekly Content'
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handlePlayAudio = async (audioUrl, itemId) => {
    try {
      // If already playing, stop it
      if (sound) {
        await sound.unloadAsync();
        
        // If tapping the same item that's playing, just stop it
        if (playingId === itemId) {
          setSound(null);
          setPlayingId(null);
          return;
        }
      }
      
      // Track audio play
      if (trackEvent) {
        trackEvent('Play Audio', {
          content_id: itemId,
          language: language
        });
      }
      
      // Load and play new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setPlayingId(itemId);
      
      // When audio finishes
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      alert('Could not play audio. Please try again.');
    }
  };
  
  const handleContentPress = (item) => {
    // Track content selection
    if (trackEvent) {
      trackEvent('Content Selected', {
        content_id: item.id,
        experiment_id: item.experiment_id,
        language: item.language
      });
    }
    
    // Navigate to detail view
    router.push({
      pathname: '/weekly-content-detail',
      params: { id: item.id }
    });
  };
  
  const renderContentItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.contentCard, 
        isDark ? styles.contentCardDark : null
      ]}
      onPress={() => handleContentPress(item)}
    >
      {/* Image */}
      <Image 
        source={{ uri: item.image_url }} 
        style={styles.contentImage}
        resizeMode="cover"
      />
      
      {/* Content */}
      <View style={styles.contentInfo}>
        {/* Verse */}
        <ThemedText style={styles.verseText}>
          "{item.verse_llm_response}"
        </ThemedText>
        
        {/* Explanation Preview */}
        <ThemedText style={styles.explanationPreview} numberOfLines={2}>
          {item.explanation_llm_response}
        </ThemedText>
        
        {/* Controls */}
        <View style={styles.controls}>
          {/* Audio Button */}
          {item.explanation_audio_url && (
            <TouchableOpacity 
              style={styles.audioButton}
              onPress={() => handlePlayAudio(item.explanation_audio_url, item.id)}
            >
              <Ionicons 
                name={playingId === item.id ? "pause-circle" : "play-circle"} 
                size={32} 
                color={Colors[colorScheme].primary} 
              />
            </TouchableOpacity>
          )}
          
          {/* Read More Button */}
          <TouchableOpacity style={styles.readMoreButton}>
            <ThemedText style={styles.readMoreText}>
              {language === 'es' ? 'Leer más' : 'Read more'}
            </ThemedText>
            <Ionicons 
              name="chevron-forward" 
              size={16} 
              color={Colors[colorScheme].primary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
  
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
  
  // Empty state
  if (content.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <Ionicons name="document-outline" size={48} color={Colors[colorScheme].text} />
        <ThemedText style={styles.emptyText}>
          {language === 'es' 
            ? 'No hay contenido disponible en este momento.' 
            : 'No content available at this time.'}
        </ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={loadContent}>
          <ThemedText style={styles.retryText}>
            {language === 'es' ? 'Actualizar' : 'Refresh'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }
  
  // Content list
  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={content}
        renderItem={renderContentItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
        onRefresh={loadContent}
        refreshing={loading}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentCardDark: {
    backgroundColor: '#2c2c2e',
  },
  contentImage: {
    width: '100%',
    height: 180,
  },
  contentInfo: {
    padding: 16,
  },
  verseText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  explanationPreview: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioButton: {
    padding: 4,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
}); 