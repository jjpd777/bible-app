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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../constants/ApiConfig';
import { Colors } from '../../constants/Colors';

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
  if (!conversationBackendId) return; // Don't proceed if no backendId

  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationBackendId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: { // Ensure this matches your backend's expected structure
          role: message.role,
          content: message.content,
        },
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
  const { conversationId, isNew, backendId: localBackendIdParam, backendMessages, characterData } = useLocalSearchParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Extract single backendId string if it's an array
  const backendId = typeof localBackendIdParam === 'string' ? localBackendIdParam : undefined;

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
            backendId: backendId // Store the backend ID for future reference
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
      if (backendId) {
        try {
          console.log(`[Conversation.tsx] Sending message to ${API_BASE_URL}/conversations/${backendId}/messages`);
          const response = await fetch(`${API_BASE_URL}/conversations/${backendId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              content: userMessage.content,
              sender: 'user' // optional, but explicit
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
          if (backendId) {
            // Not awaiting this intentionally
            saveMessageToBackend(backendId, { role: 'assistant', content: aiMessage.content });
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

  const startEditingTitle = () => {
    if (conversation) {
      setEditedTitle(conversation.title || '');
      setIsEditingTitle(true);
    }
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const saveTitle = async () => {
    if (!conversation || !editedTitle || editedTitle.trim() === '') return;
    
    try {
      setIsSavingTitle(true);
      const newTitle = editedTitle.trim();
      console.log(`[Conversation.tsx] Attempting to save new title: "${newTitle}" for conversationId: ${conversationId}`);
      
      // Update in AsyncStorage for this conversation
      const updatedConversation = {
        ...conversation,
        title: newTitle
      };
      
      setConversation(updatedConversation);
      await AsyncStorage.setItem(
        `conversation_${conversationId}`, 
        JSON.stringify(updatedConversation)
      );
      console.log(`[Conversation.tsx] Saved individual conversation_${conversationId} with new title.`);
      
      // Update in conversationsMeta
      const metaData = await AsyncStorage.getItem('conversationsMeta');
      if (metaData) {
        let conversations = JSON.parse(metaData);
        console.log('[Conversation.tsx] Current conversationsMeta before update:', JSON.stringify(conversations, null, 2));
        
        // Convert conversationId to string for comparison if needed
        const convId = String(conversationId);
        
        // Create a new array with the updated conversation
        const updatedConversations = conversations.map((c: any) => {
          if (String(c.id) === convId) {
            console.log(`[Conversation.tsx] Updating title in meta for conversation ${c.id} from "${c.title}" to "${newTitle}"`);
            return {
              ...c,
              title: newTitle
            };
          }
          return c;
        });
        
        console.log('[Conversation.tsx] Updated conversationsMeta to be saved:', JSON.stringify(updatedConversations, null, 2));
        await AsyncStorage.setItem('conversationsMeta', JSON.stringify(updatedConversations));
        console.log('[Conversation.tsx] Updated conversationsMeta in AsyncStorage');
      } else {
        console.log('[Conversation.tsx] No conversationsMeta found to update.');
      }
      
      // Try to update in backend
      if (backendId) {
        try {
          await fetch(`${API_BASE_URL}/conversations/${backendId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
          });
        } catch (backendError) {
          console.log('Backend update failed, but local update succeeded');
        }
      }
      
      setIsEditingTitle(false);
      
    } catch (error) {
      console.error('Error updating title:', error);
    } finally {
      setIsSavingTitle(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Character Image */}
        {character?.character_image_url && (
          <Image 
            source={{ uri: character.character_image_url }}
            style={styles.headerCharacterImage}
          />
        )}
        
        {isEditingTitle ? (
          // Title edit mode
          <View style={styles.titleEditContainer}>
            <TextInput
              style={styles.titleInput}
              value={editedTitle}
              onChangeText={setEditedTitle}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={saveTitle}
              onBlur={cancelEditingTitle}
            />
            <View style={styles.titleEditButtons}>
              <TouchableOpacity 
                style={styles.titleEditButton}
                onPress={cancelEditingTitle}
                disabled={isSavingTitle}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.titleEditButton}
                onPress={saveTitle}
                disabled={!editedTitle.trim() || isSavingTitle}
              >
                {isSavingTitle ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Title display mode
          <TouchableOpacity 
            style={styles.headerTitleContainer}
            onPress={startEditingTitle}
            activeOpacity={0.7}
          >
            <Text style={styles.headerTitle}>
              {conversation?.title || character?.character_name || "New Conversation"}
            </Text>
            <Ionicons name="pencil" size={16} color="#fff" style={styles.editIcon} />
          </TouchableOpacity>
        )}
        
        <View style={{width: 40}} />
      </View>
      
      {/* Messages Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a6da7" />
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
        >
          {conversation?.messages.map((message, index) => (
            <View 
              key={index} 
              style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessage : styles.assistantMessage
              ]}
            >
              <Text style={styles.messageText}>
                {message.content}
              </Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(message.timestamp)}
              </Text>
            </View>
          ))}
          
          {isSending && (
            <View style={[styles.messageContainer, styles.assistantMessage]}>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, styles.typingDotMiddle]} />
                <View style={styles.typingDot} />
              </View>
            </View>
          )}
        </ScrollView>
      )}
      
      {/* Input Area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your message..."
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
        >
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  editIcon: {
    marginLeft: 8,
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    padding: 16,
    borderRadius: 16,
    maxWidth: '80%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: `${Colors.light.primary}15`, // 15% opacity
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: Colors.light.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#a0b4d4',
  },
  typingIndicator: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#aaa',
    marginHorizontal: 3,
    opacity: 0.6,
  },
  typingDotMiddle: {
    opacity: 0.8,
  },
  titleEditContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  titleInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleEditButtons: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  titleEditButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerCharacterImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
}); 