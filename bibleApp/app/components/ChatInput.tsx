import React from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

type ChatInputProps = {
  inputText: string;
  setInputText: (text: string) => void;
  isRecording: boolean;
  onSendMessage: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

export default function ChatInput({
  inputText,
  setInputText,
  isRecording,
  onSendMessage,
  onStartRecording,
  onStopRecording
}: ChatInputProps) {
  return (
    <View style={styles.inputContainer}>
      {isRecording ? (
        <TouchableOpacity 
          style={styles.recordingButton}
          onPress={onStopRecording}
        >
          <Ionicons name="stop" size={24} color="#fff" />
          <Text style={styles.recordingText}>Recording...</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your prayer request..."
            multiline
          />
          
          {inputText.trim() ? (
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={onSendMessage}
            >
              <Ionicons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.micButton}
              onPress={onStartRecording}
            >
              <Ionicons name="mic" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: Colors.light.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micButton: {
    backgroundColor: Colors.light.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  recordingButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ff4444',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
}); 