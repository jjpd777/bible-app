import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import ConversationItem from '../components/ConversationItem';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReligion } from '../../contexts/ReligionContext';

// Type for conversation metadata
type ConversationMeta = {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
};

// Add API service for conversations
const API_BASE_URL = 'https://9a34-172-58-160-54.ngrok-free.app/api';

// Create a new conversation in the backend
const createConversationOnBackend = async (title = 'New Conversation') => {
  try {
    // Get user identifier - this should come from your authentication system
    // For now, we'll use a device ID or generate a random one if not available
    let userIdentifier = await AsyncStorage.getItem('userIdentifier');
    if (!userIdentifier) {
      userIdentifier = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await AsyncStorage.setItem('userIdentifier', userIdentifier);
    }
    
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: {
          user_identifier: userIdentifier,
          title: title,
          language: 'en',
          system_prompt: "You are a helpful assistant for prayer and spiritual guidance",
          model: 'gpt-4o-mini' // Default model
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }
    
    const responseData = await response.json();
    return responseData.data;
  } catch (error) {
    console.error('Backend API error:', error);
    throw error;
  }
};

export default function ChatUI() {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  
  const { language } = useLanguage();
  const { getPrayerPrompt } = useReligion();

  // Log conversations state when it changes
  useEffect(() => {
    console.log('[ChatUI.tsx] Conversations state updated:', JSON.stringify(conversations, null, 2));
  }, [conversations]);

  // Load conversation metadata from storage
  const loadConversations = useCallback(async () => {
    console.log('[ChatUI.tsx] loadConversations called.');
    try {
      setIsLoading(true);
      const conversationsData = await AsyncStorage.getItem('conversationsMeta');
      console.log('[ChatUI.tsx] Raw conversationsData from AsyncStorage:', conversationsData);
      
      if (conversationsData) {
        const parsedData = JSON.parse(conversationsData);
        console.log('[ChatUI.tsx] Parsed conversationsData:', JSON.stringify(parsedData, null, 2));
        
        // Sort by most recent first
        const sortedConversations = parsedData.sort(
          (a: ConversationMeta, b: ConversationMeta) => b.timestamp - a.timestamp
        );
        console.log('[ChatUI.tsx] Sorted conversations to be set:', JSON.stringify(sortedConversations, null, 2));
        setConversations(sortedConversations);
      } else {
        console.log('[ChatUI.tsx] No conversationsData found in AsyncStorage. Setting conversations to empty array.');
        setConversations([]);
      }
    } catch (error) {
      console.error('[ChatUI.tsx] Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // setIsLoading and setConversations from useState are stable

  // Load conversations on mount
  useEffect(() => {
    console.log('[ChatUI.tsx] Initial mount: calling loadConversations.');
    loadConversations();
  }, [loadConversations]);

  // Add this focus effect to reload conversations when returning to this screen
  useFocusEffect(
    useCallback(() => {
      console.log("[ChatUI.tsx] Screen focused, forcing a fresh load of conversations");
      
      // Force a completely fresh load from AsyncStorage every time
      const refreshData = async () => {
        try {
          setIsLoading(true);
          
          // Get the latest data directly from AsyncStorage
          const conversationsData = await AsyncStorage.getItem('conversationsMeta');
          
          if (conversationsData) {
            const parsedData = JSON.parse(conversationsData);
            
            // Sort by most recent first
            const sortedConversations = parsedData.sort(
              (a: ConversationMeta, b: ConversationMeta) => b.timestamp - a.timestamp
            );
            
            // Log what we're about to set
            console.log('[ChatUI.tsx] Fresh conversations data loaded:', JSON.stringify(sortedConversations, null, 2));
            
            // Set the state with fresh data
            setConversations(sortedConversations);
          } else {
            setConversations([]);
          }
        } catch (error) {
          console.error("[ChatUI.tsx] Error refreshing conversations:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      refreshData();
      
      return () => {
        console.log("[ChatUI.tsx] Screen blurred/unfocused");
      }; 
    }, []) // Remove loadConversations from dependencies to avoid any potential issues
  );

  // Modified to create conversation in backend while maintaining current functionality
  const handleNewConversation = async () => {
    try {
      setIsCreatingConversation(true);
      
      // Create the conversation in the backend first
      const backendConversation = await createConversationOnBackend("New Conversation");
      
      // Use the backend ID as our conversation ID
      const conversationId = backendConversation.id;
      
      // Create a local record of this conversation
      const newConversationMeta: ConversationMeta = {
        id: conversationId,
        title: backendConversation.title,
        lastMessage: "Start a new conversation",
        timestamp: Date.now(),
        messageCount: 0
      };
      
      // Update local storage with the new conversation
      const existingData = await AsyncStorage.getItem('conversationsMeta') || '[]';
      const existingConversations = JSON.parse(existingData);
      const updatedConversations = [newConversationMeta, ...existingConversations];
      await AsyncStorage.setItem('conversationsMeta', JSON.stringify(updatedConversations));
      
      // Also create an empty messages array for this conversation
      await AsyncStorage.setItem(`conversation_${conversationId}`, JSON.stringify({
        id: conversationId,
        title: backendConversation.title,
        messages: []
      }));
      
      // Navigate to the conversation screen
      router.push({
        pathname: '/components/Conversation',
        params: { 
          conversationId: conversationId,
          isNew: 'true',
          backendId: conversationId // Pass the backend ID explicitly
        }
      });
      
      // Update the conversations state to reflect the new conversation
      setConversations([newConversationMeta, ...conversations]);
      
    } catch (error) {
      console.error('Failed to create conversation:', error);
      
      // Fallback to local-only conversation if backend fails
      const localId = Date.now().toString();
      
      // Create a local record
      const newLocalConversation: ConversationMeta = {
        id: localId,
        title: "New Conversation (Offline)",
        lastMessage: "Start a new conversation",
        timestamp: Date.now(),
        messageCount: 0
      };
      
      // Update local storage
      const existingData = await AsyncStorage.getItem('conversationsMeta') || '[]';
      const existingConversations = JSON.parse(existingData);
      const updatedConversations = [newLocalConversation, ...existingConversations];
      await AsyncStorage.setItem('conversationsMeta', JSON.stringify(updatedConversations));
      
      // Create empty messages array
      await AsyncStorage.setItem(`conversation_${localId}`, JSON.stringify({
        id: localId,
        messages: []
      }));
      
      // Navigate to the conversation screen
      router.push({
        pathname: '/components/Conversation',
        params: { conversationId: localId, isNew: 'true' }
      });
      
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Open an existing conversation
  const handleOpenConversation = (conversationId: string) => {
    // Find the conversation in our state to ensure we have the latest data
    const conversation = conversations.find(c => c.id === conversationId);
    
    // Log the conversation we're opening for debugging
    console.log(`[ChatUI.tsx] Opening conversation:`, JSON.stringify(conversation, null, 2));
    
    router.push({
      pathname: '/components/Conversation',
      params: { 
        conversationId,
        backendId: conversationId // Ensure backendId is passed
      }
    });
  };

  // Render a conversation item
  const renderConversationItem = ({ item }: { item: ConversationMeta }) => (
    <ConversationItem 
      conversation={item}
      onPress={() => handleOpenConversation(item.id)}
    />
  );

  // Get OpenAI-formatted messages for a conversation
  const getOpenAIMessages = async (conversationId: string) => {
    try {
      const conversationData = await AsyncStorage.getItem(`conversation_${conversationId}`);
      if (conversationData) {
        const { messages } = JSON.parse(conversationData);
        return messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting OpenAI messages:', error);
      return [];
    }
  };

  // Add this new function to clear all conversations
  const handleClearAllConversations = async () => {
    try {
      setIsLoading(true);
      // Clear conversation metadata
      await AsyncStorage.removeItem('conversationsMeta');
      
      // Also clear individual conversation data
      for (const conversation of conversations) {
        await AsyncStorage.removeItem(`conversation_${conversation.id}`);
      }
      
      // Update state to show empty conversations
      setConversations([]);
    } catch (error) {
      console.error('Error clearing conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Conversations
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearAllConversations}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.newButton}
            onPress={handleNewConversation}
            disabled={isCreatingConversation}
          >
            {isCreatingConversation ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="add" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading indicator */}
      {isLoading && conversations.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      )}

      {/* Conversations List */}
      {!isLoading && conversations.length > 0 ? (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={loadConversations}
        />
      ) : !isLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No Conversations Yet</Text>
          <Text style={styles.emptyStateText}>
            Start a new prayer conversation to begin receiving personalized prayers.
          </Text>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleNewConversation}
          >
            <Text style={styles.startButtonText}>Start New Conversation</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: Colors.light.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
