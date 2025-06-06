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
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../constants/ApiConfig';
import { Colors } from '../../constants/Colors';

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
      
      {/* Enhanced Header with fixed mobile width */}
      <View style={[styles.header, isWeb && styles.webHeader]}>
        <View style={[styles.headerContent, isWeb && styles.webHeaderContent]}>
          <TouchableOpacity 
            style={[styles.backButton, isWeb && styles.webBackButton]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#4facfe" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            {character?.character_image_url && (
              <View style={[styles.characterImageWrapper, isWeb && styles.webCharacterImageWrapper]}>
                <Image 
                  source={{ uri: character.character_image_url }}
                  style={[styles.headerCharacterImage, isWeb && styles.webHeaderCharacterImage]}
                />
                <View style={[styles.onlineIndicator, isWeb && styles.webOnlineIndicator]} />
              </View>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, isWeb && styles.webHeaderTitle]} numberOfLines={1}>
                {character?.character_name || conversation?.title || 'Conversation'}
              </Text>
              <Text style={[styles.headerSubtitle, isWeb && styles.webHeaderSubtitle]}>
                {character?.religion_branch || 'Spiritual Guide'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.menuButton, isWeb && styles.webMenuButton]}
            onPress={() => {}}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#4facfe" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Messages Container with fixed mobile width */}
      <View style={[styles.messagesContainer, isWeb && styles.webMessagesContainer]}>
        <ScrollView
          ref={scrollViewRef}
          style={[styles.messagesScrollView, isWeb && styles.webMessagesScrollView]}
          contentContainerStyle={[styles.messagesContent, isWeb && styles.webMessagesContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View style={[styles.loadingContainer, isWeb && styles.webLoadingContainer]}>
              <ActivityIndicator size="large" color="#4facfe" />
              <Text style={[styles.loadingText, isWeb && styles.webLoadingText]}>Loading conversation...</Text>
            </View>
          ) : (
            conversation?.messages.map((message, index) => (
              <View key={index} style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer,
                isWeb && styles.webMessageContainer
              ]}>
                {message.role === 'assistant' && character?.character_image_url && (
                  <View style={[styles.assistantAvatar, isWeb && styles.webAssistantAvatar]}>
                    <Image 
                      source={{ uri: character.character_image_url }}
                      style={[styles.assistantAvatarImage, isWeb && styles.webAssistantAvatarImage]}
                    />
                  </View>
                )}
                
                <View style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  isWeb && styles.webMessageBubble,
                  isWeb && (message.role === 'user' ? styles.webUserBubble : styles.webAssistantBubble)
                ]}>
                  <Text style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                    isWeb && styles.webMessageText
                  ]}>
                    {message.content}
                  </Text>
                  
                  {message.timestamp && (
                    <Text style={[
                      styles.messageTimestamp,
                      message.role === 'user' ? styles.userTimestamp : styles.assistantTimestamp,
                      isWeb && styles.webMessageTimestamp
                    ]}>
                      {formatTimestamp(message.timestamp)}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Input Container with fixed mobile width */}
      <View style={[styles.inputContainer, isWeb && styles.webInputContainer]}>
        <View style={[styles.inputWrapper, isWeb && styles.webInputWrapper]}>
          <View style={[styles.inputRow, isWeb && styles.webInputRow]}>
            <TextInput
              style={[styles.textInput, isWeb && styles.webTextInput]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="#a0aec0"
              multiline
              maxLength={1000}
              editable={!isSending}
            />
            
            <TouchableOpacity 
              style={[
                styles.sendButton,
                isWeb && styles.webSendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isSending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={(!inputText.trim() || isSending) ? ['#e2e8f0', '#cbd5e0'] : ['#4facfe', '#00f2fe']}
                style={[styles.sendButtonGradient, isWeb && styles.webSendButtonGradient]}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.inputFooter, isWeb && styles.webInputFooter]}>
            <Text style={[styles.characterCount, isWeb && styles.webCharacterCount]}>
              {inputText.length}/1000
            </Text>
          </View>
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
    height: 120,
  },

  // Web-specific styles with fixed mobile width
  webHeader: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  webHeaderContent: {
    width: MOBILE_WIDTH,
    paddingHorizontal: 20,
  },
  webBackButton: {
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
    }),
  },
  webCharacterImageWrapper: {
    // Keep mobile styling
  },
  webHeaderCharacterImage: {
    // Keep mobile size
  },
  webOnlineIndicator: {
    // Keep mobile styling
  },
  webHeaderTitle: {
    // Keep mobile font size
  },
  webHeaderSubtitle: {
    // Keep mobile font size
  },
  webMenuButton: {
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
    }),
  },

  // Messages container with fixed mobile width
  webMessagesContainer: {
    alignItems: 'center',
  },
  webMessagesScrollView: {
    width: MOBILE_WIDTH,
  },
  webMessagesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  webLoadingContainer: {
    // Keep mobile styling
  },
  webLoadingText: {
    // Keep mobile font size
  },

  // Message styling with mobile dimensions
  webMessageContainer: {
    // Keep mobile styling
  },
  webAssistantAvatar: {
    // Keep mobile size
  },
  webAssistantAvatarImage: {
    // Keep mobile size
  },
  webMessageBubble: {
    // Keep mobile styling
  },
  webUserBubble: {
    // Keep mobile styling
  },
  webAssistantBubble: {
    // Keep mobile styling
  },
  webMessageText: {
    // Keep mobile font size
  },
  webMessageTimestamp: {
    // Keep mobile font size
  },

  // Input container with fixed mobile width
  webInputContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  webInputWrapper: {
    width: MOBILE_WIDTH,
    paddingHorizontal: 20,
  },
  webInputRow: {
    // Keep mobile styling
  },
  webTextInput: {
    // Keep mobile styling
    ...(Platform.OS === 'web' && {
      outline: 'none', // Remove web input outline
    }),
  },
  webSendButton: {
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
    }),
  },
  webSendButtonGradient: {
    // Keep mobile styling
  },
  webInputFooter: {
    // Keep mobile styling
  },
  webCharacterCount: {
    // Keep mobile font size
  },

  // Enhanced header styles (keeping mobile dimensions)
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  characterImageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  headerCharacterImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Messages container
  messagesContainer: {
    flex: 1,
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },

  // Message styling
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
  assistantAvatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  assistantAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#4facfe',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#2d3748',
  },
  messageTimestamp: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.8)',
  },
  assistantTimestamp: {
    color: '#a0aec0',
  },

  // Input container
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  inputWrapper: {
    backgroundColor: '#f7fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
    maxHeight: 100,
    marginRight: 12,
    fontWeight: '500',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
  inputFooter: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#a0aec0',
    textAlign: 'right',
    fontWeight: '500',
  },
}); 