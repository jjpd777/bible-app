import { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, Text, Image, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

// Character type definition
type ReligiousCharacter = {
  id: string;
  character_name: string;
  character_label: string;
  character_system_prompt: string;
  character_image_url: string;
  religion_label: string;
  religion_branch: string;
  religion_category: string;
  active: boolean;
  public: boolean;
  language: string;
};

export default function CharacterDiscoveryScreen() {
  const [characters, setCharacters] = useState<ReligiousCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const router = useRouter();
  const PAGE_SIZE = 20; // Number of items per page
  const BATCH_ID = 'batch_58026f45-de77-4dda-bee7-2e7b52f197ba'; // Hardcoded batch ID

  // Fetch a single page of religious characters
  const fetchPage = async (page: number) => {
    try {
      const response = await fetch(
        `https://realtime-3d-server.fly.dev/api/religious_characters/batch/${BATCH_ID}?page=${page}&page_size=${PAGE_SIZE}`
      );
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const result = await response.json();
      
      // Check if we've reached the last page
      const totalPages = result.meta?.total_pages || 1;
      const hasMore = page < totalPages;
      
      return {
        data: result.data || [],
        hasMore
      };
    } catch (error) {
      console.error('Error fetching page:', error);
      throw error;
    }
  };

  // Fetch initial religious characters
  const fetchReligiousCharacters = async () => {
    try {
      setIsLoading(true);
      const result = await fetchPage(1);
      setCharacters(result.data);
      setHasMorePages(result.hasMore);
      setCurrentPage(2); // Set next page to fetch
    } catch (error) {
      console.error('Error fetching religious characters:', error);
      setError('Failed to load characters. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load more data when scrolling
  const loadMoreCharacters = async () => {
    if (!hasMorePages || loadingMore) return;
    
    try {
      setLoadingMore(true);
      const result = await fetchPage(currentPage);
      
      // Append new data to existing characters
      setCharacters(prevCharacters => [...prevCharacters, ...result.data]);
      
      // Update pagination state
      setCurrentPage(currentPage + 1);
      setHasMorePages(result.hasMore);
    } catch (error) {
      console.error('Error loading more characters:', error);
      // Don't set the main error state here to avoid disrupting the UI
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchReligiousCharacters();
  }, []);

  // Get unique branches from characters
  const branches = [...new Set(characters.map(char => char.religion_branch))].sort();

  // Get unique categories from characters filtered by selected branch
  const getCategories = () => {
    const filteredByBranch = selectedBranch 
      ? characters.filter(char => char.religion_branch === selectedBranch)
      : characters;
    
    return [...new Set(filteredByBranch.map(char => char.religion_category))].sort();
  };

  const categories = getCategories();

  // Filter characters by selected branch and category
  const filteredCharacters = characters.filter(char => {
    if (selectedBranch && char.religion_branch !== selectedBranch) {
      return false;
    }
    if (selectedCategory && char.religion_category !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Handle character selection
  const handleSelectCharacter = (character: ReligiousCharacter) => {
    // Navigate to character detail screen
    router.push({
      pathname: '/character-detail',
      params: { characterId: character.id }
    });
  };

  // Navigate to archived home screen
  const navigateToHomeScreen = () => {
    router.push('/home');
  };

  // Format category name for display (convert snake_case to Title Case)
  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Render category filter buttons
  const renderCategoryFilters = () => (
    <View style={styles.categoriesContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScrollView}>
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === null && styles.selectedCategoryChip
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.categoryChipText,
            selectedCategory === null && styles.selectedCategoryChipText
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.selectedCategoryChip
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category && styles.selectedCategoryChipText
            ]}>
              {formatCategoryName(category)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render a character card
  const renderCharacterCard = ({ item }: { item: ReligiousCharacter }) => (
    <TouchableOpacity
      style={styles.characterCard}
      onPress={() => handleSelectCharacter(item)}
    >
      <Image
        source={{ uri: item.character_image_url }}
        style={styles.characterImage}
        resizeMode="cover"
      />
      <View style={styles.characterInfo}>
        <Text style={styles.characterName}>{item.character_name}</Text>
        <Text style={styles.characterLabel}>{item.character_label}</Text>
        <Text style={styles.religionLabel}>{item.religion_label}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render footer with loading indicator for pagination
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3498db" />
        <Text style={styles.footerText}>Loading more guides...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Spiritual Guides</Text>
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={navigateToHomeScreen}
        >
          <Text>Home</Text>
        </TouchableOpacity>
      </View>

      {renderCategoryFilters()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading spiritual guides...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchReligiousCharacters}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCharacters}
          renderItem={renderCharacterCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.charactersList}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No characters found</Text>
            </View>
          }
          ListFooterComponent={renderFooter}
          onEndReached={loadMoreCharacters}
          onEndReachedThreshold={0.3}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  homeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoriesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesScrollView: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#3498db',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
  },
  selectedCategoryChipText: {
    color: '#fff',
    fontWeight: '500',
  },
  charactersList: {
    padding: 8,
  },
  characterCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  characterImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#e0e0e0',
  },
  characterInfo: {
    padding: 12,
  },
  characterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  characterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  religionLabel: {
    fontSize: 12,
    color: '#3498db',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3498db',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
}); 