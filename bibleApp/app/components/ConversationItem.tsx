import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

type ConversationItemProps = {
  conversation: {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: number;
    messageCount: number;
  };
  onPress: () => void;
};

export default function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  // Log the incoming prop
  console.log(`[ConversationItem.tsx] Received conversation prop for ID ${conversation.id}:`, JSON.stringify(conversation, null, 2));

  // Format the timestamp
  const formatTime = (timestamp: number) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    // If today, show time
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (messageDate.getFullYear() === now.getFullYear()) {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show full date
    return messageDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Use the title directly from props - no need for state
  const displayTitle = conversation.title || "New Conversation";

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="chatbubble-ellipses" size={24} color={Colors.light.primary} />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.timestamp}>
            {formatTime(conversation.timestamp)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(103, 58, 183, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
}); 