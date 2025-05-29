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
import { useAuthContext } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { API_BASE_URL } from '../../constants/ApiConfig';

const { width } = Dimensions.get('window');

// Add responsive breakpoints
const isWeb = Platform.OS === 'web';
const isTablet = width >= 768;
const isDesktop = width >= 1024;

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
  const { user, isAuthenticated } = useAuthContext();

  // Load conversations from backend using Firebase UID
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!isAuthenticated || !user?.uid) {
        console.log('User not authenticated, clearing conversations');
        setConversations([]);
        return;
      }

      console.log(`Fetching conversations for Firebase user: ${user.uid}`);
      
      const response = await fetch(`${API_BASE_URL}/conversations/user/${user.uid}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // User has no conversations yet
          console.log('No conversations found for user (404)');
          setConversations([]);
          return;
        }
        if (response.status === 400) {
          // Bad request - likely empty or invalid user data
          console.log('Bad request when fetching conversations (400) - user may not exist in system yet');
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
      // Don't show error to user for empty state - just show empty conversations
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.uid]);

  // Load conversations on mount and when auth state changes
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

  // Enhanced conversation item rendering with responsive design
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
          <Ionicons name="chatbubble-ellipses" size={isWeb ? 28 : 24} color={Colors.light.primary} />
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
    if (!isAuthenticated || !user?.uid) {
      console.log('User not authenticated, redirecting to auth...');
      router.push('/profile_auth');
      return;
    }
    
    // Navigate to character selection or implement character selection logic
    router.push('/'); // Go back to character selection
    console.log('Navigate to character selection');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      />
      
      {/* Enhanced Header with responsive design */}
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
              <Ionicons name="add" size={isWeb ? 28 : 24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content with responsive container */}
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
                <Ionicons name="chatbubble-outline" size={isWeb ? 80 : 64} color="#667eea" />
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

      {/* Debug info */}
      {user?.uid && (
        <View style={[styles.debugContainer, isWeb && styles.webDebugContainer]}>
          <Text style={[styles.debugText, isWeb && styles.webDebugText]}>Firebase UID: {user.uid}</Text>
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

  // Enhanced header with responsive design
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  webHeader: {
    paddingHorizontal: isDesktop ? 80 : isTablet ? 60 : 40,
    paddingTop: 40,
    paddingBottom: 32,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  webHeaderContent: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
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
    fontSize: isDesktop ? 36 : 32,
    letterSpacing: -1,
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
    borderRadius: 24,
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

  // Content wrapper for responsive design
  contentWrapper: {
    flex: 1,
  },
  webContentWrapper: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    flex: 1,
  },

  // Enhanced conversation list
  conversationsList: {
    flex: 1,
  },
  webConversationsList: {
    paddingHorizontal: isDesktop ? 80 : isTablet ? 60 : 40,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  webListContent: {
    padding: 0,
    paddingVertical: 24,
  },

  // Enhanced conversation items
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  webConversationItem: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
    }),
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  webIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 20,
  },
  characterImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f0f0',
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
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2d3748',
    flex: 1,
    letterSpacing: -0.2,
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#a0aec0',
    marginLeft: 8,
    fontWeight: '500',
  },
  webTimestamp: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
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
    gap: 16,
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
    marginLeft: 16,
    opacity: 0.6,
  },

  // Enhanced loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    maxWidth: 400,
    padding: 60,
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

  // Enhanced empty state
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
    maxWidth: 500,
    padding: 60,
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
    borderRadius: 30,
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

  // Enhanced debug container
  debugContainer: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    backdropFilter: 'blur(10px)',
  },
  webDebugContainer: {
    paddingHorizontal: isDesktop ? 80 : isTablet ? 60 : 40,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    fontWeight: '500',
  },
  webDebugText: {
    fontSize: 13,
    textAlign: 'left',
  },
});
