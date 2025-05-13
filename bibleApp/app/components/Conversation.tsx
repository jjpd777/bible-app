import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import ChatMessages, { ChatMessage } from './ChatMessages';
import ChatInput from './ChatInput';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReligion } from '../../contexts/ReligionContext';

// Initial welcome message
const getInitialMessage = (): ChatMessage => ({
  id: '1',
  role: 'assistant',
  content: 'Hello! I can help you create personalized prayers. What would you like to pray about today?',
  timestamp: Date.now()
});

export default function Conversation() {
  const params = useLocalSearchParams();
  const conversationId = params.conversationId as string;
  const isNewConversation = params.isNew === 'true';
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationTitle, setConversationTitle] = useState('New Conversation');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { language } = useLanguage();
  const { getPrayerPrompt } = useReligion();
  
  console.log('Rendering Conversation component');
  
  // Load conversation data on mount
  useEffect(() => {
    console.log('Loading conversation:', conversationId);
    loadConversation();
  }, [conversationId]);
  
  // Clean up audio resources on unmount
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [recording, sound]);
  
  // Load conversation from storage
  const loadConversation = async () => {
    try {
      if (isNewConversation) {
        // Start with welcome message for new conversations
        const initialMessages = [getInitialMessage()];
        setMessages(initialMessages);
        
        // Save the new conversation immediately so it appears in the list
        await saveConversation(initialMessages);
        return;
      }
      
      // Load existing conversation
      const conversationData = await AsyncStorage.getItem(`conversation_${conversationId}`);
      if (conversationData) {
        const parsedData = JSON.parse(conversationData);
        setMessages(parsedData.messages);
        setConversationTitle(parsedData.title || 'New Conversation');
      } else {
        // Fallback if conversation not found
        const initialMessages = [getInitialMessage()];
        setMessages(initialMessages);
        await saveConversation(initialMessages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'Failed to load conversation');
    }
  };
  
  // Save conversation to storage
  const saveConversation = async (updatedMessages: ChatMessage[]) => {
    try {
      // Determine conversation title from first user message
      let title = conversationTitle;
      if (updatedMessages.length > 1) {
        const firstUserMessage = updatedMessages.find(msg => msg.role === 'user');
        if (firstUserMessage && typeof firstUserMessage.content === 'string') {
          // Use first 30 chars of first user message as title
          title = firstUserMessage.content.substring(0, 30);
          if (firstUserMessage.content.length > 30) title += '...';
          setConversationTitle(title);
        }
      }
      
      // Save the conversation
      const conversationData = {
        id: conversationId,
        title: title,
        messages: updatedMessages,
        lastUpdated: Date.now()
      };
      
      await AsyncStorage.setItem(`conversation_${conversationId}`, JSON.stringify(conversationData));
      
      // Update conversation metadata for the list view
      await updateConversationMeta(title, updatedMessages);
      
      console.log('Conversation saved successfully:', conversationId);
      
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };
  
  // Update conversation metadata for the list view
  const updateConversationMeta = async (title: string, updatedMessages: ChatMessage[]) => {
    try {
      const lastMessage = updatedMessages[updatedMessages.length - 1].content;
      const timestamp = Date.now();
      const messageCount = updatedMessages.length;
      
      // Create metadata for this conversation
      const conversationMeta = {
        id: conversationId,
        title: title,
        lastMessage: lastMessage.substring(0, 60) + (lastMessage.length > 60 ? '...' : ''),
        timestamp: timestamp,
        messageCount: messageCount
      };
      
      // Get existing metadata
      const metaData = await AsyncStorage.getItem('conversationsMeta');
      let allConversations = [];
      
      if (metaData) {
        allConversations = JSON.parse(metaData);
        // Update or add this conversation
        const existingIndex = allConversations.findIndex((c: any) => c.id === conversationId);
        if (existingIndex >= 0) {
          allConversations[existingIndex] = conversationMeta;
        } else {
          allConversations.push(conversationMeta);
        }
      } else {
        allConversations = [conversationMeta];
      }
      
      // Save updated metadata
      await AsyncStorage.setItem('conversationsMeta', JSON.stringify(allConversations));
      console.log('Conversation metadata updated:', conversationId);
      
    } catch (error) {
      console.error('Error updating conversation metadata:', error);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    
    // Save conversation with user message
    saveConversation(updatedMessages);
    
    // Simulate processing
    setIsProcessing(true);
    
    // Simulate AI response after a delay
    setTimeout(() => {
      // Generate a response based on the conversation
      const responseText = generateSampleResponse(userMessage.content);
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
        audioPath: '/sample/audio/path.mp3' // Sample path for audio
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      setIsProcessing(false);
      
      // Save conversation with assistant response
      saveConversation(finalMessages);
      
    }, 1500);
  };
  
  // Start recording
  const startRecording = async () => {
    try {
      setIsRecording(true);
      
      // Simulate recording for now
      console.log('Recording started...');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };
  
  // Stop recording
  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      
      // Simulate transcription delay
      setTimeout(() => {
        // Simulated transcription result
        const transcribedText = "Please pray for strength and guidance during my job interview tomorrow.";
        
        // Add user message with transcribed text
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: transcribedText,
          timestamp: Date.now()
        };
        
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        
        // Save conversation with user message
        saveConversation(updatedMessages);
        
        // Simulate AI response after a delay
        setTimeout(() => {
          // Generate a response based on the conversation
          const responseText = generateSampleResponse(transcribedText);
          
          // Add assistant response
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseText,
            timestamp: Date.now(),
            audioPath: '/sample/audio/path.mp3' // Sample path for audio
          };
          
          const finalMessages = [...updatedMessages, assistantMessage];
          setMessages(finalMessages);
          setIsProcessing(false);
          
          // Save conversation with assistant response
          saveConversation(finalMessages);
          
        }, 1500);
      }, 1000);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsProcessing(false);
    }
  };
  
  // Handle playing audio
  const handlePlayAudio = (audioPath: string) => {
    console.log('Playing audio:', audioPath);
    // Simulate audio playback
  };
  
  // Generate a sample response (in a real app, this would come from the API)
  const generateSampleResponse = (input: string) => {
    let response = "";
    
    if (input.toLowerCase().includes('interview')) {
      response = "Dear Heavenly Father,\n\nI come before You seeking Your divine strength and guidance for the upcoming job interview. Please fill me with confidence, clarity of mind, and the ability to express myself well. Help me to showcase the talents and abilities You've blessed me with.\n\nCalm my anxious heart and remind me that my worth is not determined by any interview outcome, but by Your love for me. If this job is in Your will for my life, please open this door. If not, I trust You to lead me to where I should be.\n\nIn Jesus' name, Amen.";
    } else if (input.toLowerCase().includes('family')) {
      response = "Loving Father,\n\nI lift up my family to You today. Surround them with Your protection, fill their hearts with Your peace, and guide their steps with Your wisdom. Strengthen the bonds between us and help us to love one another as You have loved us.\n\nWhere there is conflict, bring reconciliation. Where there is pain, bring healing. Where there is distance, bring closeness. Help us to be patient and kind with one another, bearing with each other in love.\n\nThank You for the gift of family. May our home be a place where Your presence dwells.\n\nIn Jesus' name, Amen.";
    } else {
      response = "Gracious God,\n\nThank You for this moment to connect with You. I'm grateful for Your constant presence in my life and for the opportunity to bring my thoughts and concerns before You.\n\nPlease guide me in all I do today. Give me wisdom for the decisions I face, strength for the challenges ahead, and compassion in my interactions with others. Help me to see others as You see them and to be a reflection of Your love in this world.\n\nI trust in Your perfect plan for my life, even when I don't understand it. Thank You for Your faithfulness and for hearing my prayers.\n\nIn Jesus' name, Amen.";
    }
    
    // Ensure the response is a valid string
    return response;
  };
  
  console.log('Messages to render:', messages);
  
  // Filter messages to ensure they are valid objects with expected string content before passing to ChatMessages.
  // This helps prevent errors if data from AsyncStorage is unexpectedly malformed.
  const validMessages = messages.filter(msg => {
    if (typeof msg !== 'object' || msg === null) {
      console.warn('Invalid message item found (not an object):', msg);
      return false;
    }
    // Ensure essential fields are present and of expected types, especially content.
    if (
      typeof msg.id !== 'string' ||
      typeof msg.role !== 'string' || 
      typeof msg.content !== 'string' || // Crucial: content must be a string
      typeof msg.timestamp !== 'number'
    ) {
      console.warn('Invalid message structure or content type:', msg);
      return false;
    }
    return true;
  });

  if (messages.length > 0 && validMessages.length !== messages.length) {
    console.warn(
      'Some messages were filtered out due to validation issues. Original count:', 
      messages.length, 
      'Validated count:', 
      validMessages.length
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{String(conversationTitle || 'Conversation')}</Text>
        <View style={{width: 40}} /> {/* Empty view for balance */}
      </View>
      
      {/* Messages */}
      <View style={styles.messagesContainer}>
        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator color={Colors.light.primary} size="small" />
            <Text style={styles.processingText}>
              {isRecording ? 'Transcribing...' : 'Generating prayer...'}
            </Text>
          </View>
        )}
        
        {validMessages.length > 0 ? (
          <ChatMessages 
            messages={validMessages}
            onPlayAudio={handlePlayAudio}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.light.primary} size="small" />
            <Text style={styles.loadingText}>
              Loading conversation...
            </Text>
          </View>
        )}
      </View>
      
      {/* Input area */}
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        isRecording={isRecording}
        onSendMessage={handleSendMessage}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />
    </KeyboardAvoidingView>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  }
}); 