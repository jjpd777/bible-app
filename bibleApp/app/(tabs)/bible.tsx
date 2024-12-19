import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    .split(/(\d+)/) // Split on numbers, keeping the numbers
    .map((part, index) => {
      if (/^\d+$/.test(part)) { // If part is a number
        return { type: 'number', content: part };
      }
      return { type: 'text', content: part };
    })
    .filter(part => part.content.trim()); // Remove empty parts
};

export default function BibleScreen() {
  const [isNavigationVisible, setIsNavigationVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState('GEN');
  const [selectedChapter, setSelectedChapter] = useState('1');
  const [books, setBooks] = useState({ old: [], new: [] });
  const [chapters, setChapters] = useState([]);
  const [chapterContent, setChapterContent] = useState<Array<{type: string, content: string}>>([]);

  // Initial load effect
  useEffect(() => {
    fetchBooks();
  }, []);

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
      
      // The first 39 books are Old Testament, the rest are New Testament
      const oldTestament = data.data.slice(0, 39);
      const newTestament = data.data.slice(39);
      
      setBooks({
        old: oldTestament,
        new: newTestament,
      });
    } catch (error) {
      console.error('Error fetching Bible books:', error);
    }
  };

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
        
        if (!data.data) {
          console.error('No chapter data received');
          return;
        }
        
        // Filter out the 'intro' chapter if it exists
        const bookChapters = data.data.filter(chapter => chapter.number !== 'intro');
        console.log('Filtered Chapters:', bookChapters);
        
        setChapters(bookChapters);
        setSelectedChapter('1');
      } catch (error) {
        console.error('Error fetching chapters:', error);
      }
    };

    fetchChapters();
  }, [selectedBook]);

  useEffect(() => {
    const fetchChapterContent = async () => {
      if (!selectedBook || !selectedChapter) return;
      
      const chapterId = `${selectedBook}.${selectedChapter}`;
      console.log('Fetching chapter content:', chapterId);
      
      try {
        const response = await fetch(
          `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/chapters/${chapterId}`,
          {
            headers: {
              'api-key': API_KEY,
              'accept': 'application/json',
            },
          }
        );
        
        const data = await response.json();
        console.log('Chapter content response:', data);
        
        if (!data.data) {
          console.error('No chapter content received');
          return;
        }
        
        const cleanContent = cleanVerseContent(data.data.content);
        setChapterContent(cleanContent);
      } catch (error) {
        console.error('Error fetching chapter content:', error);
      }
    };

    fetchChapterContent();
  }, [selectedBook, selectedChapter]);

  const handleBookSelect = (bookId: string) => {
    setSelectedBook(bookId);
    setSelectedChapter('1');
  };

  
  const handleChapterSelect = (chapterNumber: string) => {
    setSelectedChapter(chapterNumber);
    setIsNavigationVisible(false); // Close navigation after selection
  };

  const navigateChapter = (direction: 'prev' | 'next') => {
    const currentIndex = chapters.findIndex(ch => ch.number === selectedChapter);
    if (direction === 'prev' && currentIndex > 0) {
      handleChapterSelect(chapters[currentIndex - 1].number);
    } else if (direction === 'next' && currentIndex < chapters.length - 1) {
      handleChapterSelect(chapters[currentIndex + 1].number);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Main Reading View */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerTextContainer}>
          <ThemedText type="title" style={styles.bookTitle}>
            {books.old.concat(books.new).find(b => b.id === selectedBook)?.name}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.chapterTitle}>
            Capítulo {selectedChapter}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {chapterContent && (
          <ThemedText style={styles.chapterContent}>
            {chapterContent.map((part, index) => (
              part.type === 'number' ? (
                <ThemedText key={index} style={styles.verseNumber}>
                  {'\n\n'}{part.content}{'  '}
                </ThemedText>
              ) : (
                <ThemedText key={index}>{part.content}</ThemedText>
              )
            ))}
          </ThemedText>
        )}
      </ScrollView>

      {/* Navigation Modal */}
      <Modal
        visible={isNavigationVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNavigationVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <ThemedView style={styles.modalHeader}>
            <ThemedText type="title">Select Book</ThemedText>
            <TouchableOpacity 
              onPress={() => setIsNavigationVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#0a7ea4" />
            </TouchableOpacity>
          </ThemedView>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <ThemedText type="title" style={styles.testamentHeader}>
              Antiguo Testamento
            </ThemedText>
            
            <ThemedView style={styles.booksContainer}>
              {books.old.map((book: any) => (
                <TouchableOpacity
                  key={book.id}
                  style={[
                    styles.bookItem,
                    selectedBook === book.id && styles.selectedBook
                  ]}
                  onPress={() => {
                    handleBookSelect(book.id);
                    setIsNavigationVisible(false); // Close modal after selection
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
              {books.new.map((book: any) => (
                <TouchableOpacity
                  key={book.id}
                  style={[
                    styles.bookItem,
                    selectedBook === book.id && styles.selectedBook
                  ]}
                  onPress={() => {
                    handleBookSelect(book.id);
                    setIsNavigationVisible(false); // Close modal after selection
                  }}
                >
                  <ThemedText style={styles.bookText}>{book.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
          </ScrollView>
        </ThemedView>
      </Modal>

      <ThemedView style={styles.navigationButtons}>
        <TouchableOpacity 
          style={[
            styles.navChapterButton, 
            selectedChapter === chapters[0]?.number && styles.navButtonDisabled
          ]}
          onPress={() => navigateChapter('prev')}
          disabled={selectedChapter === chapters[0]?.number}
        >
          <Ionicons name="chevron-back" size={24} color="#0a7ea4" />
          <ThemedText style={styles.navButtonText}>Previous</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setIsNavigationVisible(true)}
        >
          <Ionicons name="menu" size={28} color="#0a7ea4" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.navChapterButton, 
            selectedChapter === chapters[chapters.length - 1]?.number && styles.navButtonDisabled
          ]}
          onPress={() => navigateChapter('next')}
          disabled={selectedChapter === chapters[chapters.length - 1]?.number}
        >
          <ThemedText style={styles.navButtonText}>Next</ThemedText>
          <Ionicons name="chevron-forward" size={24} color="#0a7ea4" />
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(161, 206, 220, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 18,
    opacity: 0.8,
  },
  navButton: {
    padding: 12,
    marginLeft: 16,
  },
  contentContainer: {
    padding: 16,
  },
  chapterContent: {
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'justify',
    paddingVertical: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(161, 206, 220, 0.2)',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
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
  verseNumber: {
    fontWeight: 'bold',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(161, 206, 220, 0.2)',
  },
  navChapterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(161, 206, 220, 0.1)',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    marginHorizontal: 8,
  },
  menuButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(161, 206, 220, 0.1)',
  },
});
