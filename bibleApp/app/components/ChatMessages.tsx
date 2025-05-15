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
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Error formatting time:', e);
      return '';
    }
  };
  
  // Render a chat message with extreme caution for text rendering
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // Super safe handling of content - ensure it's always a string
    let messageContent = '';
    try {
      if (typeof item.content === 'string') {
        messageContent = item.content;
      } else if (item.content === null || item.content === undefined) {
        messageContent = '';
      } else {
        messageContent = String(item.content);
      }
    } catch (e) {
      messageContent = 'Error displaying message';
      console.error('Error processing message content:', e);
    }
    
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
          <Text style={styles.timestampText}>
            {formatTime(item.timestamp)}
          </Text>
          
          {item.role === 'assistant' && item.audioPath && (
            <TouchableOpacity 
              style={styles.audioButton}
              onPress={() => onPlayAudio(item.audioPath || '')}
            >
              <Ionicons name="play-circle" size={20} color="#fff" />
              <Text style={styles.audioButtonText}>
                Play
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  // Ensure we have valid messages to render
  const safeMessages = React.useMemo(() => {
    if (!Array.isArray(messages)) {
      console.warn('Messages is not an array:', messages);
      return [];
    }
    
    return messages.filter(msg => {
      try {
        // Basic validation
        if (!msg || typeof msg !== 'object') {
          return false;
        }
        
        // Ensure required fields exist
        if (!msg.id || !msg.role || msg.content === undefined || msg.timestamp === undefined) {
          return false;
        }
        
        return true;
      } catch (e) {
        console.error('Error validating message:', e);
        return false;
      }
    });
  }, [messages]);
  
  // Empty state component
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        No messages yet
      </Text>
    </View>
  );
  
  // If we have no messages, render the empty state
  if (safeMessages.length === 0) {
    return <EmptyState />;
  }
  
  // Only render FlatList when we have messages
  return (
    <FlatList
      ref={flatListRef}
      data={safeMessages}
      keyExtractor={(item) => item.id || Math.random().toString()}
      renderItem={renderMessage}
      contentContainerStyle={styles.messageList}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<EmptyState />}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
}); 