import { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Mock data for Bible books
const OLD_TESTAMENT = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'
  // Add more books as needed
];

const NEW_TESTAMENT = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts'
  // Add more books as needed
];

export default function BibleScreen() {
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        {/* Testament Headers */}
        <ThemedText type="title" style={styles.testamentHeader}>
          Old Testament
        </ThemedText>
        
        {/* Old Testament Books */}
        <ThemedView style={styles.booksContainer}>
          {OLD_TESTAMENT.map((book) => (
            <TouchableOpacity
              key={book}
              style={[
                styles.bookItem,
                selectedBook === book && styles.selectedBook
              ]}
              onPress={() => setSelectedBook(book)}
            >
              <ThemedText style={styles.bookText}>{book}</ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        <ThemedText type="title" style={styles.testamentHeader}>
          New Testament
        </ThemedText>
        
        {/* New Testament Books */}
        <ThemedView style={styles.booksContainer}>
          {NEW_TESTAMENT.map((book) => (
            <TouchableOpacity
              key={book}
              style={[
                styles.bookItem,
                selectedBook === book && styles.selectedBook
              ]}
              onPress={() => setSelectedBook(book)}
            >
              <ThemedText style={styles.bookText}>{book}</ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Selected Book Preview */}
        {selectedBook && (
          <ThemedView style={styles.previewContainer}>
            <ThemedText type="subtitle">{selectedBook}</ThemedText>
            <ScrollView horizontal style={styles.chaptersRow}>
              {[...Array(50)].map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.chapterButton,
                    selectedChapter === index + 1 && styles.selectedChapter
                  ]}
                  onPress={() => setSelectedChapter(index + 1)}
                >
                  <ThemedText style={styles.chapterText}>{index + 1}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  testamentHeader: {
    fontSize: 24,
    marginTop: 20,
    marginBottom: 16,
  },
  booksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  bookItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(161, 206, 220, 0.1)',
    minWidth: '30%',
  },
  selectedBook: {
    backgroundColor: '#0a7ea4',
  },
  bookText: {
    textAlign: 'center',
    fontSize: 14,
  },
  previewContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(161, 206, 220, 0.1)',
  },
  chaptersRow: {
    marginTop: 16,
    flexDirection: 'row',
  },
  chapterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(161, 206, 220, 0.2)',
  },
  selectedChapter: {
    backgroundColor: '#0a7ea4',
  },
  chapterText: {
    fontSize: 16,
  },
});
