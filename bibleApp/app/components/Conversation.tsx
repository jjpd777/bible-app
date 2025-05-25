import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../constants/ApiConfig';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

// Define message type
type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
};

// Define conversation type
type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  character?: {
    id: string;
    character_name: string;
    religion_category: string;
    religion_label: string;
    religion_branch: string;
    character_image_url: string;
  };
};

// Helper function to save a message to the backend
const saveMessageToBackend = async (
  conversationBackendId: string,
  message: { role: 'user' | 'assistant'; content: string }
) => {
  if (!conversationBackendId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationBackendId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: message.role === 'user' ? 'user' : 'character',
        content: message.content,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ details: 'Failed to save message and parse error' }));
      console.error(
        `Error saving ${message.role} message to backend for conversation ${conversationBackendId}:`,
        errorData.details || response.statusText
      );
    } else {
      console.log(
        `${message.role} message saved to backend successfully for conversation ${conversationBackendId}`
      );
    }
  } catch (error) {
    console.error(
      `Network error saving ${message.role} message to backend for conversation ${conversationBackendId}:`,
      error
    );
  }
};

export default function Conversation() {
  const { conversationId, isNew, backendMessages, characterData, conversationTitle } = useLocalSearchParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Parse character data if passed from chat_ui
  const character = characterData ? JSON.parse(characterData as string) : null;

  // Load conversation data
  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      setIsLoading(true);
      
      // Check if we have backend messages passed from character-detail
      if (backendMessages) {
        try {
          const parsedBackendMessages = JSON.parse(backendMessages as string);
          console.log('[Conversation.tsx] Using backend messages:', parsedBackendMessages);
          
          // Convert backend messages to our Message format
          const convertedMessages: Message[] = parsedBackendMessages.map((msg: any) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: new Date(msg.timestamp).getTime()
          }));
          
          // Create conversation with backend messages
          const newConversation: Conversation = {
            id: conversationId as string,
            title: "Chat with Character", // You might want to pass the title as well
            messages: convertedMessages
          };
          
          setConversation(newConversation);
          
          // Save to AsyncStorage for offline access
          await AsyncStorage.setItem(
            `conversation_${conversationId}`, 
            JSON.stringify(newConversation)
          );
          
          // Update conversations metadata
          const metaData = await AsyncStorage.getItem('conversationsMeta');
          let conversations = metaData ? JSON.parse(metaData) : [];
          
          // Check if conversation already exists in metadata
          const existingIndex = conversations.findIndex((c: any) => c.id === conversationId);
          const lastMessage = convertedMessages.length > 0 ? convertedMessages[convertedMessages.length - 1] : null;
          
          const conversationMeta = {
            id: conversationId,
            title: newConversation.title,
            lastMessage: lastMessage ? lastMessage.content.substring(0, 30) + '...' : '',
            timestamp: lastMessage ? lastMessage.timestamp : Date.now(),
            messageCount: convertedMessages.length,
            backendId: conversationId // Store the backend ID for future reference
          };
          
          if (existingIndex >= 0) {
            conversations[existingIndex] = conversationMeta;
          } else {
            conversations.unshift(conversationMeta);
          }
          
          await AsyncStorage.setItem('conversationsMeta', JSON.stringify(conversations));
          
          return; // Exit early since we used backend messages
        } catch (parseError) {
          console.error('[Conversation.tsx] Error parsing backend messages:', parseError);
          // Fall through to normal loading logic
        }
      }
      
      // Load conversation from AsyncStorage (existing logic)
      const conversationData = await AsyncStorage.getItem(`conversation_${conversationId}`);
      
      if (conversationData) {
        const parsedData = JSON.parse(conversationData);
        setConversation(parsedData);
      } else {
        // If conversation doesn't exist yet (new conversation)
        const newConversation: Conversation = {
          id: conversationId as string,
          title: "New Conversation",
          messages: [
            {
              role: 'assistant',
              content: 'Hello! I can help you create personalized prayers. What would you like to pray about today?',
              timestamp: Date.now()
            }
          ]
        };
        
        // Also try to get the title from the conversations metadata
        const metaData = await AsyncStorage.getItem('conversationsMeta');
        if (metaData) {
          const conversations = JSON.parse(metaData);
          const currentConversation = conversations.find((c: any) => c.id === conversationId);
          if (currentConversation) {
            newConversation.title = currentConversation.title;
          }
        }
        
        setConversation(newConversation);
        
        // Save this new conversation
        await AsyncStorage.setItem(
          `conversation_${conversationId}`, 
          JSON.stringify(newConversation)
        );
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (conversation?.messages.length && !isLoading) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation?.messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversation) return;
    
    const currentInputText = inputText.trim();
    setInputText(''); // Clear input immediately for better UX

    try {
      setIsSending(true);
      
      const userMessage: Message = {
        role: 'user',
        content: currentInputText,
        timestamp: Date.now()
      };
      
      let updatedMessages = [...conversation.messages, userMessage];
      let updatedConversation = {
        ...conversation,
        messages: updatedMessages
      };
      
      setConversation(updatedConversation); // Optimistic UI update
      
      // Save user message locally to AsyncStorage
      await AsyncStorage.setItem(
        `conversation_${conversationId}`, 
        JSON.stringify(updatedConversation)
      );
      // Update local metadata
      const metaData = await AsyncStorage.getItem('conversationsMeta');
      if (metaData) {
        const conversations = JSON.parse(metaData);
        const updatedConversationsMeta = conversations.map((c: any) => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessage: userMessage.content,
              timestamp: userMessage.timestamp,
              messageCount: updatedMessages.length
            };
          }
          return c;
        });
        await AsyncStorage.setItem('conversationsMeta', JSON.stringify(updatedConversationsMeta));
      }

      // --- Use the new combined endpoint ---
      if (conversationId) {
        try {
          console.log(`[Conversation.tsx] Sending message to ${API_BASE_URL}/conversations/${conversationId}/messages`);
          const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              content: userMessage.content,
              sender: 'user'
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({details: "Failed to send message and get AI response"}));
            throw new Error(errorData.details || `Failed to send message: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // Extract AI response from the new endpoint format
          const aiResponseContent = data.ai_message.content;
          
          const aiMessage: Message = {
            role: 'assistant',
            content: aiResponseContent,
            timestamp: new Date(data.ai_message.timestamp).getTime()
          };
          
          // Add AI message to the local list
          updatedMessages = [...updatedMessages, aiMessage];
          updatedConversation = {
            ...conversation,
            messages: updatedMessages
          };
          
          setConversation(updatedConversation);
          
          // Save AI message locally to AsyncStorage
          await AsyncStorage.setItem(
            `conversation_${conversationId}`, 
            JSON.stringify(updatedConversation)
          );
          
          // Update local metadata again for AI message
          const updatedMetaDataForAI = await AsyncStorage.getItem('conversationsMeta');
          if (updatedMetaDataForAI) {
            const conversations = JSON.parse(updatedMetaDataForAI);
            const finalConversationsMeta = conversations.map((c: any) => {
              if (c.id === conversationId) {
                return {
                  ...c,
                  lastMessage: aiMessage.content.substring(0, 30) + '...',
                  timestamp: aiMessage.timestamp,
                  messageCount: updatedMessages.length
                };
              }
              return c;
            });
            await AsyncStorage.setItem('conversationsMeta', JSON.stringify(finalConversationsMeta));
          }

          // Save AI message to backend (if backendId exists)
          if (conversationId) {
            // Not awaiting this intentionally
            saveMessageToBackend(conversationId as string, { role: 'assistant', content: aiMessage.content });
          }

        } catch (error: any) {
          console.error('[Conversation.tsx] Error with new messages endpoint:', error.message);
          const errorMessage: Message = {
            role: 'assistant',
            content: `Sorry, I encountered an error generating a response. Please try again. (Details: ${error.message})`,
            timestamp: Date.now()
          };
          
          // Add error message to the local list
          updatedMessages = [...updatedMessages, errorMessage]; 
          updatedConversation = {
            ...conversation, 
            messages: updatedMessages
          };
          
          setConversation(updatedConversation);
          await AsyncStorage.setItem(
            `conversation_${conversationId}`, 
            JSON.stringify(updatedConversation)
          );
        }
      } else {
        // Fallback to old /generate endpoint if no backendId
        try {
          // Prepare messages for the /api/generate endpoint
          const apiMessages = updatedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));
          
          // Add system message if not present
          if (!apiMessages.some(msg => msg.role === 'system')) {
            apiMessages.unshift({
              role: 'system',
              content: 'You are a helpful prayer assistant. Create personalized prayers based on user requests. Be compassionate, biblical, and thoughtful.' // Ensure this is your desired system prompt
            });
          }
          
          console.log(`[Conversation.tsx] Requesting AI response from ${API_BASE_URL}/generate with full history.`);
          const response = await fetch(`${API_BASE_URL}/generate`, { // Always use this endpoint
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages: apiMessages }), // Send full history
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({details: "Failed to get AI response"}));
            throw new Error(errorData.details || `Failed to get AI response: ${response.statusText}`);
          }
          
          const data = await response.json();
          const aiResponseMessageContent = data.response; // Assuming your backend returns { response: "..." }
          
          const aiMessage: Message = {
            role: 'assistant',
            content: aiResponseMessageContent,
            timestamp: Date.now()
          };
          
          // Add AI message to the local list
          updatedMessages = [...updatedMessages, aiMessage];
          updatedConversation = {
            ...conversation, // Use the latest conversation state before this update
            messages: updatedMessages
          };
          
          setConversation(updatedConversation); // Optimistic UI update
          
          // Save AI message locally to AsyncStorage
          await AsyncStorage.setItem(
            `conversation_${conversationId}`, 
            JSON.stringify(updatedConversation)
          );
          
          // Update local metadata again for AI message
          const updatedMetaDataForAI = await AsyncStorage.getItem('conversationsMeta');
          if (updatedMetaDataForAI) {
            const conversations = JSON.parse(updatedMetaDataForAI);
            const finalConversationsMeta = conversations.map((c: any) => {
              if (c.id === conversationId) {
                return {
                  ...c,
                  lastMessage: aiMessage.content.substring(0, 30) + '...',
                  timestamp: aiMessage.timestamp,
                  messageCount: updatedMessages.length
                };
              }
              return c;
            });
            await AsyncStorage.setItem('conversationsMeta', JSON.stringify(finalConversationsMeta));
          }

          // Save AI message to backend (if backendId exists)
          if (conversationId) {
            // Not awaiting this intentionally
            saveMessageToBackend(conversationId as string, { role: 'assistant', content: aiMessage.content });
          }

        } catch (error: any) {
          console.error('[Conversation.tsx] Error getting AI response:', error.message);
          const errorMessage: Message = {
            role: 'assistant',
            content: `Sorry, I encountered an error generating a response. Please try again. (Details: ${error.message})`,
            timestamp: Date.now()
          };
          
          // Add error message to the local list
          updatedMessages = [...updatedMessages, errorMessage]; 
          updatedConversation = {
            ...conversation, 
            messages: updatedMessages
          };
          
          setConversation(updatedConversation); // Show error in UI
          await AsyncStorage.setItem(
            `conversation_${conversationId}`, 
            JSON.stringify(updatedConversation)
          );
          // Optionally, do NOT save this frontend-generated error message to the backend.
          // Or, if you have a way to flag errors, you could. For now, it's local.
        }
      }
      
    } catch (error) {
      console.error('[Conversation.tsx] Error in handleSendMessage outer try:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4facfe', '#00f2fe']}
        style={styles.backgroundGradient}
      />
      
      {/* Enhanced Header with better spacing */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#4facfe" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          {character?.character_image_url && (
            <View style={styles.characterImageWrapper}>
              <Image 
                source={{ uri: character.character_image_url }}
                style={styles.headerCharacterImage}
              />
              <View style={styles.onlineIndicator} />
            </View>
          )}
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {conversationTitle || character?.character_name || "Your Spiritual Guide"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {character?.religion_branch ? `${character.religion_branch} • Here to guide you` : 'Ready to listen and guide'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
          <Ionicons name="heart" size={18} color="#4facfe" />
        </TouchableOpacity>
      </View>
      
      {/* Messages Area with warmer styling */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <View style={styles.loadingIconContainer}>
              <Ionicons name="sparkles" size={32} color="#4facfe" />
            </View>
            <Text style={styles.loadingText}>Preparing your sacred space...</Text>
            <Text style={styles.loadingSubtext}>Where hearts connect and souls find peace</Text>
          </View>
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {conversation?.messages.map((message, index) => (
            <View 
              key={index} 
              style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer
              ]}
            >
              {message.role === 'assistant' && (
                <View style={styles.messageAvatar}>
                  {character?.character_image_url ? (
                    <Image 
                      source={{ uri: character.character_image_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#4facfe', '#00f2fe']}
                      style={styles.defaultAvatarGradient}
                    >
                      <Ionicons name="heart" size={16} color="#fff" />
                    </LinearGradient>
                  )}
                </View>
              )}
              
              <View style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userMessage : styles.assistantMessage
              ]}>
                {message.role === 'user' ? (
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.userMessageGradient}
                  >
                    <Text style={styles.userMessageText}>
                      {message.content}
                    </Text>
                    <Text style={styles.userTimestamp}>
                      {formatTimestamp(message.timestamp)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.assistantMessageContent}>
                    <Text style={styles.assistantMessageText}>
                      {message.content}
                    </Text>
                    <Text style={styles.assistantTimestamp}>
                      {formatTimestamp(message.timestamp)}
                    </Text>
                  </View>
                )}
              </View>
              
              {message.role === 'user' && (
                <View style={styles.userAvatar}>
                  <LinearGradient
                    colors={['#ffeaa7', '#fab1a0']}
                    style={styles.userAvatarGradient}
                  >
                    <Ionicons name="person" size={16} color="#fff" />
                  </LinearGradient>
                </View>
              )}
            </View>
          ))}
          
          {isSending && (
            <View style={styles.assistantMessageContainer}>
              <View style={styles.messageAvatar}>
                {character?.character_image_url ? (
                  <Image 
                    source={{ uri: character.character_image_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <LinearGradient
                    colors={['#4facfe', '#00f2fe']}
                    style={styles.defaultAvatarGradient}
                  >
                    <Ionicons name="heart" size={16} color="#fff" />
                  </LinearGradient>
                )}
              </View>
              <View style={[styles.messageBubble, styles.assistantMessage]}>
                <View style={styles.typingIndicatorContainer}>
                  <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, styles.typingDotMiddle]} />
                    <View style={styles.typingDot} />
                  </View>
                  <Text style={styles.typingText}>Listening with love...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
      
      {/* Enhanced Input Area with warmer feel */}
      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <View style={styles.inputIconContainer}>
            <Ionicons name="heart-outline" size={20} color="#4facfe" />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Share what's in your heart..."
            placeholderTextColor="#a0aec0"
            multiline={true}
            value={inputText}
            onChangeText={setInputText}
            editable={!isSending}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={(!inputText.trim() || isSending) ? ['#a0aec0', '#a0aec0'] : ['#4facfe', '#00f2fe']}
              style={styles.sendButtonGradient}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <Text style={styles.inputHint}>
          Speak freely - this is a safe space for your thoughts and prayers
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f0',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    opacity: 0.8,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  characterImageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  headerCharacterImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2ecc71',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 28,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.1)',
  },
  loadingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  defaultAvatarGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 12,
    overflow: 'hidden',
    shadowColor: '#fab1a0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  userAvatarGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  userMessage: {
    borderBottomRightRadius: 6,
  },
  assistantMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.08)',
  },
  userMessageGradient: {
    padding: 16,
  },
  userMessageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
    fontWeight: '500',
  },
  userTimestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    alignSelf: 'flex-end',
    fontWeight: '500',
  },
  assistantMessageContent: {
    padding: 16,
  },
  assistantMessageText: {
    fontSize: 16,
    color: '#2d3748',
    lineHeight: 24,
    fontWeight: '500',
  },
  assistantTimestamp: {
    fontSize: 11,
    color: '#a0aec0',
    marginTop: 8,
    alignSelf: 'flex-start',
    fontWeight: '500',
  },
  typingIndicatorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a0aec0',
    marginHorizontal: 2,
    opacity: 0.6,
  },
  typingDotMiddle: {
    opacity: 0.8,
  },
  typingText: {
    fontSize: 13,
    color: '#4facfe',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  inputArea: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 172, 254, 0.08)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.1)',
  },
  inputIconContainer: {
    marginRight: 12,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 12,
    fontWeight: '500',
    lineHeight: 22,
  },
  sendButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  inputHint: {
    fontSize: 12,
    color: '#a0aec0',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
}); 