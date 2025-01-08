import { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import bibleData from '@/assets/bible/rv1909.json';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalSearchParams } from 'expo-router';

// Remove API configuration since we're using static data
// Remove BIBLE_VERSIONS since we're only using RV1909
// Keep the cleanVerseContent helper if needed for display formatting

// Add this helper function to parse verses
const parseVerses = (content: string) => {
  return content
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
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isNavigationVisible, setIsNavigationVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState(params.initialBook as string || 'GEN');
  const [selectedChapter, setSelectedChapter] = useState(params.initialChapter as string || '1');
  const [books, setBooks] = useState({ old: [], new: [] });
  const [chapters, setChapters] = useState([]);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initial load effect - now just organizing the static data
  useEffect(() => {
    const allBooks = Object.entries(bibleData.books).map(([id, book]) => ({
      id,
      name: book.name,
    }));
    
    // The first 39 books are Old Testament, the rest are New Testament
    setBooks({
      old: allBooks.slice(0, 39),
      new: allBooks.slice(39),
    });
  }, []);

  // Update chapters when book changes
  useEffect(() => {
    if (!selectedBook || !bibleData.books[selectedBook]) return;
    
    const bookChapters = Object.keys(bibleData.books[selectedBook].chapters).map(num => ({
      number: num,
      id: `${selectedBook}.${num}`
    }));
    
    setChapters(bookChapters);
  }, [selectedBook]);

  // Load content when book or chapter changes
  useEffect(() => {
    if (selectedBook && selectedChapter) {
      const content = bibleData.books[selectedBook]?.chapters[selectedChapter]?.content || '';
      setChapterContent(content);
    }
  }, [selectedBook, selectedChapter]);

  // Handle initial navigation and scrolling
  useEffect(() => {
    console.log('Navigation params:', params); // Debug log
    
    if (params.initialBook && params.initialChapter && params.initialVerse) {
      // Set the book and chapter
      setSelectedBook(params.initialBook as string);
      setSelectedChapter(params.initialChapter as string);

      // Wait for content to load then scroll
      const timer = setTimeout(() => {
        const verses = parseVerses(chapterContent);
        const verseIndex = verses.findIndex(
          part => part.type === 'number' && part.content === params.initialVerse
        );
        
        console.log('Scrolling to verse:', params.initialVerse, 'at index:', verseIndex); // Debug log
        
        if (verseIndex !== -1 && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: verseIndex * 50,
            animated: true
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [params, chapterContent]); // Added params dependency

  const handleBookSelect = (bookId: string) => {
    setSelectedBook(bookId);
    setSelectedChapter('1');
  };

  const handleChapterSelect = (chapterNumber: string) => {
    setSelectedChapter(chapterNumber);
    setIsNavigationVisible(false);
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
            {bibleData.books[selectedBook]?.name}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.chapterTitle}>
            Capítulo {selectedChapter}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.contentContainer}
      >
        <ThemedText style={styles.chapterContent}>
          {parseVerses(chapterContent).map((part, index) => (
            part.type === 'number' ? (
              <ThemedText 
                key={index} 
                style={[
                  styles.verseNumber,
                  part.content === params.verse && styles.highlightedVerse
                ]}
              >
                {'\n\n'}{part.content}{'  '}
              </ThemedText>
            ) : (
              <ThemedText key={index}>{part.content}</ThemedText>
            )
          ))}
        </ThemedText>
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
    paddingTop: 48,
    paddingBottom: 24,
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
    paddingTop: 24,
  },
  chapterContent: {
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'justify',
    paddingVertical: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(245, 247, 250, 0.98)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 175, 195, 0.2)',
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
    color: '#445670',
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
    backgroundColor: 'rgba(226, 234, 241, 0.5)',
    minWidth: '30%',
    borderWidth: 1,
    borderColor: 'rgba(156, 175, 195, 0.3)',
  },
  selectedBook: {
    backgroundColor: '#E1E8F5',
    borderColor: '#7895CB',
  },
  bookText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#445670',
  },
  verseNumber: {
    fontWeight: 'bold',
    color: '#000000', // Bold black for verse numbers
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 175, 195, 0.2)',
  },
  navChapterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(226, 234, 241, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(156, 175, 195, 0.3)',
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
    backgroundColor: 'rgba(226, 234, 241, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(156, 175, 195, 0.3)',
  },
  highlightedVerse: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
});
