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
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#667eea" />
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
              {conversationTitle || character?.character_name || "Spiritual Guide"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {character?.religion_branch ? `${character.religion_branch} • Online` : 'Available now'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
          <Ionicons name="ellipsis-vertical" size={16} color="#667eea" />
        </TouchableOpacity>
      </View>
      
      {/* Messages Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
            <Text style={styles.loadingSubtext}>Preparing your spiritual dialogue</Text>
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
              {message.role === 'assistant' && character?.character_image_url && (
                <View style={styles.messageAvatar}>
                  <Image 
                    source={{ uri: character.character_image_url }}
                    style={styles.avatarImage}
                  />
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
                  <Ionicons name="person" size={16} color="#fff" />
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
                  <Ionicons name="sparkles" size={16} color="#667eea" />
                )}
              </View>
              <View style={[styles.messageBubble, styles.assistantMessage]}>
                <View style={styles.typingIndicatorContainer}>
                  <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, styles.typingDotMiddle]} />
                    <View style={styles.typingDot} />
                  </View>
                  <Text style={styles.typingText}>Reflecting...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
      
      {/* Enhanced Input Area */}
      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Share your thoughts..."
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
              colors={(!inputText.trim() || isSending) ? ['#a0aec0', '#a0aec0'] : ['#667eea', '#764ba2']}
              style={styles.sendButtonGradient}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
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
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#27ae60',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 2,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
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
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userMessage: {
    borderBottomRightRadius: 6,
  },
  assistantMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
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
    lineHeight: 22,
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
    fontSize: 12,
    color: '#a0aec0',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  inputArea: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    backdropFilter: 'blur(10px)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 12,
    fontWeight: '500',
  },
  sendButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 