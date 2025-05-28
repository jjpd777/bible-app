import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { API_BASE_URL } from '../../constants/ApiConfig';

const { width } = Dimensions.get('window');

// Add responsive breakpoints with fixed mobile width for web
const isWeb = Platform.OS === 'web';
const isTablet = width >= 768;
const isDesktop = width >= 1024;

// Fixed mobile-like width for web
const MOBILE_WIDTH = 390; // iPhone 14 Pro width
const getContentWidth = () => {
  if (isWeb) return MOBILE_WIDTH;
  return width;
};

// Updated type to include character details
type Conversation = {
  id: string;
  title: string;
  character_id: string;
  user_id: string;
  is_monologue: boolean;
  updated_at: string;
  character?: {
    id: string;
    character_name: string;
    religion_category: string;
    religion_label: string;
    religion_branch: string;
    character_image_url: string;
  };
};

export default function ChatUI() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get or create user ID
  const getUserId = async () => {
    try {
      // Use the same default user ID as character-detail.tsx
      const defaultUserId = "00000000-0000-0000-0000-000000000001";
      
      // For now, always use the default user ID
      setUserId(defaultUserId);
      return defaultUserId;
      
      // Comment out the dynamic user ID generation for now
      /*
      let storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        // Generate a new user ID (in a real app, this would come from authentication)
        storedUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await AsyncStorage.setItem('userId', storedUserId);
      }
      setUserId(storedUserId);
      return storedUserId;
      */
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  };

  // Load conversations from backend
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const currentUserId = await getUserId();
      if (!currentUserId) {
        console.error('No user ID available');
        return;
      }

      console.log(`Fetching conversations for user: ${currentUserId}`);
      
      const response = await fetch(`${API_BASE_URL}/conversations/user/${currentUserId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // User has no conversations yet
          setConversations([]);
          return;
        }
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Conversations loaded:', data.conversations);
      setConversations(data.conversations || []);
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Enhanced conversation item rendering with fixed mobile width
  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={[styles.conversationItem, isWeb && styles.webConversationItem]}
      onPress={() => {
        router.push({
          pathname: '/components/Conversation',
          params: { 
            conversationId: item.id,
            conversationTitle: item.title,
            characterData: item.character ? JSON.stringify(item.character) : undefined
          }
        });
      }}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, isWeb && styles.webIconContainer]}>
        {item.character?.character_image_url ? (
          <Image 
            source={{ uri: item.character.character_image_url }}
            style={[styles.characterImage, isWeb && styles.webCharacterImage]}
            defaultSource={require('../../assets/images/bendiga_01.png')}
          />
        ) : (
          <Ionicons name="chatbubble-ellipses" size={24} color={Colors.light.primary} />
        )}
      </View>
      
      <View style={[styles.contentContainer, isWeb && styles.webContentContainer]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, isWeb && styles.webTitle]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.timestamp, isWeb && styles.webTimestamp]}>
            {formatTime(item.updated_at)}
          </Text>
        </View>
        <Text style={[styles.subtitle, isWeb && styles.webSubtitle]}>
          {item.character?.character_name || 'General conversation'}
        </Text>
        {isWeb && (
          <View style={styles.webConversationMeta}>
            <View style={styles.webMetaItem}>
              <Ionicons name="person" size={14} color="#a0aec0" />
              <Text style={styles.webMetaText}>
                {item.character?.religion_branch || 'General'}
              </Text>
            </View>
            {item.is_monologue && (
              <View style={styles.webMetaItem}>
                <Ionicons name="mic" size={14} color="#a0aec0" />
                <Text style={styles.webMetaText}>Monologue</Text>
              </View>
            )}
          </View>
        )}
      </View>
      
      {isWeb && (
        <View style={styles.webActionContainer}>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </View>
      )}
    </TouchableOpacity>
  );

  // Handle creating new conversation (placeholder for now)
  const handleNewConversation = () => {
    // TODO: Implement character selection and conversation creation
    console.log('New conversation - to be implemented');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      />
      
      {/* Enhanced Header with fixed mobile width */}
      <View style={[styles.header, isWeb && styles.webHeader]}>
        <View style={[styles.headerContent, isWeb && styles.webHeaderContent]}>
          <View style={styles.titleContainer}>
            <Text style={[styles.headerTitle, isWeb && styles.webHeaderTitle]}>Conversations</Text>
            <Text style={[styles.headerSubtitle, isWeb && styles.webHeaderSubtitle]}>Your spiritual dialogues</Text>
          </View>
          <TouchableOpacity 
            style={[styles.newButton, isWeb && styles.webNewButton]}
            onPress={handleNewConversation}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={[styles.newButtonGradient, isWeb && styles.webNewButtonGradient]}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content with fixed mobile width */}
      <View style={[styles.contentWrapper, isWeb && styles.webContentWrapper]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingCard, isWeb && styles.webLoadingCard]}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={[styles.loadingText, isWeb && styles.webLoadingText]}>Loading conversations...</Text>
              <Text style={[styles.loadingSubtext, isWeb && styles.webLoadingSubtext]}>Preparing your spiritual dialogues</Text>
            </View>
          </View>
        ) : conversations.length > 0 ? (
          <FlatList
            data={conversations}
            renderItem={renderConversationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.listContent, isWeb && styles.webListContent]}
            refreshing={isLoading}
            onRefresh={loadConversations}
            showsVerticalScrollIndicator={false}
            style={[styles.conversationsList, isWeb && styles.webConversationsList]}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyStateCard, isWeb && styles.webEmptyStateCard]}>
              <View style={[styles.emptyIconContainer, isWeb && styles.webEmptyIconContainer]}>
                <Ionicons name="chatbubble-outline" size={64} color="#667eea" />
              </View>
              <Text style={[styles.emptyStateTitle, isWeb && styles.webEmptyStateTitle]}>No Conversations Yet</Text>
              <Text style={[styles.emptyStateText, isWeb && styles.webEmptyStateText]}>
                Start a new conversation to begin your spiritual journey.
              </Text>
              <TouchableOpacity 
                style={[styles.startButton, isWeb && styles.webStartButton]}
                onPress={handleNewConversation}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={[styles.startButtonGradient, isWeb && styles.webStartButtonGradient]}
                >
                  <Text style={[styles.startButtonText, isWeb && styles.webStartButtonText]}>Start New Conversation</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Debug info with fixed mobile width */}
      {userId && (
        <View style={[styles.debugContainer, isWeb && styles.webDebugContainer]}>
          <Text style={[styles.debugText, isWeb && styles.webDebugText]}>User ID: {userId}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },

  // Enhanced header with fixed mobile width
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  webHeader: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  headerContent: {
    width: MOBILE_WIDTH,
    paddingHorizontal: 20,
  },
  webHeaderContent: {
    width: MOBILE_WIDTH,
    paddingHorizontal: 20,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  webHeaderTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 4,
  },
  webHeaderSubtitle: {
    fontSize: 16,
    marginTop: 6,
  },
  newButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  webNewButton: {
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
    }),
  },
  newButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webNewButtonGradient: {
    width: 48,
    height: 48,
  },

  // Content wrapper with fixed mobile width
  contentWrapper: {
    flex: 1,
  },
  webContentWrapper: {
    flex: 1,
    alignItems: 'center',
  },

  // Enhanced conversation list with mobile width
  conversationsList: {
    flex: 1,
  },
  webConversationsList: {
    width: MOBILE_WIDTH,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  webListContent: {
    padding: 0,
    paddingVertical: 24,
  },

  // Enhanced conversation items with mobile styling
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    backdropFilter: 'blur(10px)',
  },
  webConversationItem: {
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
    }),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  webIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  characterImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e2e8f0',
  },
  webCharacterImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  webContentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2d3748',
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.3,
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 13,
    color: '#a0aec0',
    fontWeight: '600',
  },
  webTimestamp: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    color: '#718096',
    fontWeight: '500',
    marginBottom: 2,
  },
  webSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 8,
  },

  // Web-specific conversation metadata
  webConversationMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  webMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  webMetaText: {
    fontSize: 12,
    color: '#a0aec0',
    fontWeight: '500',
  },
  webActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Enhanced loading state with mobile width
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    backdropFilter: 'blur(10px)',
  },
  webLoadingCard: {
    width: MOBILE_WIDTH - 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
  },
  webLoadingText: {
    fontSize: 20,
    marginTop: 24,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  webLoadingSubtext: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Enhanced empty state with mobile width
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    backdropFilter: 'blur(10px)',
    maxWidth: 320,
  },
  webEmptyStateCard: {
    width: MOBILE_WIDTH - 40,
    maxWidth: MOBILE_WIDTH - 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  webEmptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 32,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  webEmptyStateTitle: {
    fontSize: 28,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    fontWeight: '500',
  },
  webEmptyStateText: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 40,
  },
  startButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  webStartButton: {
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
    }),
  },
  startButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  webStartButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  webStartButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Enhanced debug container with mobile width
  debugContainer: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    backdropFilter: 'blur(10px)',
  },
  webDebugContainer: {
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    fontWeight: '500',
  },
  webDebugText: {
    width: MOBILE_WIDTH,
  },
});
