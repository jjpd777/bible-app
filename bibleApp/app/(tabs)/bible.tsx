import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// API configuration
const API_KEY = 'a199ed5ad2b126cdc4b2630580930967';
const BIBLE_ID = '592420522e16049f-01';

// Replace the mock data with empty arrays initially
const OLD_TESTAMENT: string[] = [];
const NEW_TESTAMENT: string[] = [];

export default function BibleScreen() {
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [books, setBooks] = useState({ old: [], new: [] });
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    const fetchBooks = async () => {
      console.log('Fetching books...');
      try {
        const response = await fetch(
          `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/books`,
          {
            headers: {
              'api-key': API_KEY,
              'accept': 'application/json',
            },
          }
        );
        
        const data = await response.json();
        console.log('Books API Response:', data);
        
        if (!data.data) {
          console.error('No data received from books API');
          return;
        }

        // The first 39 books are Old Testament, the rest are New Testament
        const oldTestament = data.data.slice(0, 39);
        const newTestament = data.data.slice(39);
        
        console.log('Old Testament Books:', oldTestament.length);
        console.log('New Testament Books:', newTestament.length);
        
        setBooks({
          old: oldTestament,
          new: newTestament,
        });
      } catch (error) {
        console.error('Error fetching Bible books:', error);
      }
    };

    fetchBooks();
  }, []);

  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedBook) return;
      
      console.log('Fetching chapters for book:', selectedBook);
      try {
        const response = await fetch(
          `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/books/${selectedBook}/chapters`,
          {
            headers: {
              'api-key': API_KEY,
              'accept': 'application/json',
            },
          }
        );
        
        const data = await response.json();
        console.log('Chapters API Response:', data);
        
        if (!data.data) {
          console.error('No chapter data received');
          return;
        }
        
        // Filter out the 'intro' chapter if it exists
        const bookChapters = data.data.filter(chapter => chapter.number !== 'intro');
        console.log('Filtered Chapters:', bookChapters);
        
        setChapters(bookChapters);
        setSelectedChapter(0);
      } catch (error) {
        console.error('Error fetching chapters:', error);
      }
    };

    fetchChapters();
  }, [selectedBook]);

  // Add console log for render
  console.log('Current State:', {
    booksOld: books.old.length,
    booksNew: books.new.length,
    selectedBook,
    chaptersCount: chapters.length,
    selectedChapter
  });

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <ThemedText type="title" style={styles.testamentHeader}>
          Antiguo Testamento
        </ThemedText>
        
        <ThemedView style={styles.booksContainer}>
          {books.old && books.old.map((book: any) => (
            <TouchableOpacity
              key={book.id}
              style={[
                styles.bookItem,
                selectedBook === book.id && styles.selectedBook
              ]}
              onPress={() => {
                console.log('Selected book:', book);
                setSelectedBook(book.id);
              }}
            >
              <ThemedText style={styles.bookText}>{book.name}</ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        <ThemedText type="title" style={styles.testamentHeader}>
          Nuevo Testamento
        </ThemedText>
        
        <ThemedView style={styles.booksContainer}>
          {books.new && books.new.map((book: any) => (
            <TouchableOpacity
              key={book.id}
              style={[
                styles.bookItem,
                selectedBook === book.id && styles.selectedBook
              ]}
              onPress={() => {
                console.log('Selected book:', book);
                setSelectedBook(book.id);
              }}
            >
              <ThemedText style={styles.bookText}>{book.name}</ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Updated Selected Book Preview */}
        {selectedBook && (
          <ThemedView style={styles.previewContainer}>
            <ThemedText type="subtitle">
              {books.old.concat(books.new).find(b => b.id === selectedBook)?.name}
            </ThemedText>
            <ScrollView horizontal style={styles.chaptersRow}>
              {chapters.map((chapter) => (
                <TouchableOpacity
                  key={chapter.id}
                  style={[
                    styles.chapterButton,
                    selectedChapter === chapter.number && styles.selectedChapter
                  ]}
                  onPress={() => setSelectedChapter(chapter.number)}
                >
                  <ThemedText style={styles.chapterText}>{chapter.number}</ThemedText>
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
