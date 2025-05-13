import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  audioPath?: string;
};

type ChatMessagesProps = {
  messages: ChatMessage[];
  onPlayAudio: (audioPath: string) => void;
};

export default function ChatMessages({ messages, onPlayAudio }: ChatMessagesProps) {
  const flatListRef = useRef<FlatList>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Render a chat message - simplified to avoid any text rendering issues
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // Safely handle content - ensure it's a string and handle newlines
    const messageContent = typeof item.content === 'string' 
      ? item.content 
      : String(item.content || '');
      
    return (
      <View style={[
        styles.messageContainer,
        item.role === 'user' ? styles.userMessage : styles.assistantMessage
      ]}>
        <View style={styles.messageTextContainer}>
          <Text style={styles.messageText}>
            {messageContent}
          </Text>
        </View>
        
        <View style={styles.messageFooter}>
          <Text style={styles.timestampText}>{formatTime(item.timestamp)}</Text>
          
          {item.role === 'assistant' && item.audioPath && (
            <TouchableOpacity 
              style={styles.audioButton}
              onPress={() => onPlayAudio(item.audioPath || '')}
            >
              <Ionicons name="play-circle" size={20} color="#fff" />
              <Text style={styles.audioButtonText}>Play</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderMessage}
      contentContainerStyle={styles.messageList}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={{alignItems: 'center', marginTop: 40}}>
          <Text style={{color: '#888'}}>No messages yet</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  messageList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.primary,
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageTextContainer: {
    // Add any necessary styles for the message text container
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timestampText: {
    fontSize: 12,
    color: '#888',
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  audioButtonText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
}); 