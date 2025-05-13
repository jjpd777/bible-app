import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
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

export default function ChatUI() {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { language } = useLanguage();
  const { getPrayerPrompt } = useReligion();

  // Load conversations on mount - removed the router.addListener which might be causing the crash
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation metadata from storage
  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const conversationsData = await AsyncStorage.getItem('conversationsMeta');
      
      if (conversationsData) {
        const parsedData = JSON.parse(conversationsData);
        // Sort by most recent first
        const sortedConversations = parsedData.sort(
          (a: ConversationMeta, b: ConversationMeta) => b.timestamp - a.timestamp
        );
        setConversations(sortedConversations);
      } else {
        // If no conversations exist yet, show empty state
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start a new conversation
  const handleNewConversation = () => {
    const newId = Date.now().toString();
    router.push({
      pathname: '/components/Conversation',
      params: { conversationId: newId, isNew: 'true' }
    });
  };

  // Open an existing conversation
  const handleOpenConversation = (conversationId: string) => {
    router.push({
      pathname: '/components/Conversation',
      params: { conversationId }
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
        <Text style={styles.headerTitle}>Prayer Conversations</Text>
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
          >
            <Ionicons name="add" size={24} color="#fff" />
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
