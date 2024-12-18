import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Modal, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function HomeScreen() {
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';

  const todayVerse = {
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    reference: "Example 1:1"
  };

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  return (
    <ThemedView style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        theme={{
          calendarBackground: Colors[colorScheme].background,
          textSectionTitleColor: Colors[colorScheme].text,
          selectedDayBackgroundColor: Colors[colorScheme].tint,
          selectedDayTextColor: '#ffffff',
          todayTextColor: Colors[colorScheme].tint,
          dayTextColor: Colors[colorScheme].text,
          textDisabledColor: '#d9e1e8',
          monthTextColor: Colors[colorScheme].text,
          arrowColor: Colors[colorScheme].tint,
        }}
      />

      <ThemedView style={styles.verseContainer}>
        <ThemedText type="subtitle">Verse of the Day</ThemedText>
        <ThemedText style={styles.verseText}>{todayVerse.text}</ThemedText>
        <ThemedText style={styles.reference}>{todayVerse.reference}</ThemedText>
      </ThemedView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="subtitle">Verse for {selectedDate}</ThemedText>
            <ThemedText style={styles.modalVerseText}>
              "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
            </ThemedText>
            <ThemedText style={styles.modalReference}>Example 2:10</ThemedText>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={styles.closeButtonText}>Close</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  verseContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(161, 206, 220, 0.1)',
  },
  verseText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  reference: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalVerseText: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  modalReference: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 24,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
