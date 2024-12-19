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

// Add this helper function at the top of the file, outside the component
const cleanVerseContent = (html: string) => {
  return html
    .replace(/<\/?p[^>]*>/g, '') // Remove p tags
    .replace(/<\/?span[^>]*>/g, '') // Remove span tags
    .replace(/<\/?[^>]+(>|$)/g, '') // Remove any remaining HTML tags
    .replace(/^\d+\s*/, '') // Remove leading numbers and any following whitespace
    .trim(); // Remove extra whitespace
};

export default function BibleScreen() {
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedVerse, setSelectedVerse] = useState('');
  const [books, setBooks] = useState({ old: [], new: [] });
  const [chapters, setChapters] = useState([]);
  const [verses, setVerses] = useState([]);
  const [verseContent, setVerseContent] = useState('');

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

  useEffect(() => {
    const fetchVerses = async () => {
      if (!selectedBook || !selectedChapter) return;
      
      const chapterId = `${selectedBook}.${selectedChapter}`;
      console.log('Fetching verses for chapter:', chapterId);
      
      try {
        const response = await fetch(
          `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/chapters/${chapterId}/verses`,
          {
            headers: {
              'api-key': API_KEY,
              'accept': 'application/json',
            },
          }
        );
        
        const data = await response.json();
        console.log('Verses API Response:', data);
        
        if (!data.data) {
          console.error('No verse data received');
          return;
        }
        
        setVerses(data.data);
      } catch (error) {
        console.error('Error fetching verses:', error);
      }
    };

    fetchVerses();
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    const fetchVerseContent = async () => {
      if (!selectedVerse) return;
      
      console.log('Fetching content for verse:', selectedVerse);
      
      try {
        const response = await fetch(
          `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/verses/${selectedVerse}`,
          {
            headers: {
              'api-key': API_KEY,
              'accept': 'application/json',
            },
          }
        );
        
        const data = await response.json();
        console.log('Verse content response:', data);
        
        if (!data.data) {
          console.error('No verse content received');
          return;
        }
        
        // Clean the HTML content before setting it
        const cleanContent = cleanVerseContent(data.data.content);
        setVerseContent(cleanContent);
      } catch (error) {
        console.error('Error fetching verse content:', error);
      }
    };

    fetchVerseContent();
  }, [selectedVerse]);

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
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

        {/* Chapter Display Section */}
        {selectedBook && chapters.length > 0 && (
          <ThemedView style={styles.previewContainer}>
            <ThemedText type="subtitle">
              {books.old.concat(books.new).find(b => b.id === selectedBook)?.name}
            </ThemedText>
            <ScrollView horizontal contentContainerStyle={styles.chaptersRow}>
              {chapters.map((chapter) => (
                <TouchableOpacity
                  key={chapter.id}
                  style={[
                    styles.chapterButton,
                    selectedChapter === chapter.number && styles.selectedChapter
                  ]}
                  onPress={() => {
                    console.log('Selected chapter:', chapter);
                    setSelectedChapter(chapter.number);
                  }}
                >
                  <ThemedText style={styles.chapterText}>
                    {chapter.number}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
          </ThemedView>
        )}

        {/* Updated Verses Display Section */}
        {selectedChapter && verses.length > 0 && (
          <ThemedView style={styles.versesContainer}>
            <ThemedText type="subtitle" style={styles.versesHeader}>
              {books.old.concat(books.new).find(b => b.id === selectedBook)?.name} {selectedChapter}
            </ThemedText>
            <ScrollView contentContainerStyle={styles.versesList}>
              {verses.map((verse) => (
                <TouchableOpacity
                  key={verse.id}
                  style={[
                    styles.verseItem,
                    selectedVerse === verse.id && styles.selectedVerse
                  ]}
                  onPress={() => {
                    console.log('Selected verse:', verse);
                    setSelectedVerse(verse.id);
                  }}
                >
                  <ThemedText style={styles.verseReference}>
                    {verse.reference}
                  </ThemedText>
                  {selectedVerse === verse.id && verseContent && (
                    <ThemedText style={styles.verseContent}>
                      {verseContent}
                    </ThemedText>
                  )}
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
  versesContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(161, 206, 220, 0.1)',
  },
  versesHeader: {
    marginBottom: 16,
    textAlign: 'center',
  },
  versesList: {
    maxHeight: 300, // Limit the height to prevent it from taking too much space
  },
  verseItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(161, 206, 220, 0.2)',
  },
  selectedVerse: {
    backgroundColor: 'rgba(161, 206, 220, 0.2)',
  },
  verseReference: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  verseContent: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
