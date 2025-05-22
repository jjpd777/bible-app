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

// Category type definition
type CategoryInfo = {
  category: string;
  count: number;
};

export default function CharacterDiscoveryScreen() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [characters, setCharacters] = useState<ReligiousCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const BATCH_ID = 'batch_58026f45-de77-4dda-bee7-2e7b52f197ba';
  const API_BASE = 'https://realtime-3d-server.fly.dev/api';

  // Fetch available categories
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching categories from:', `${API_BASE}/religious_characters/batch/${BATCH_ID}/categories`);
      
      const response = await fetch(
        `${API_BASE}/religious_characters/batch/${BATCH_ID}/categories`
      );
      
      console.log('Categories response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Categories data received:', data);
      
      if (!data.categories || !Array.isArray(data.categories)) {
        console.error('Invalid categories data format:', data);
        throw new Error('Invalid data format received from server');
      }
      
      // Sort categories by count (descending)
      const sortedCategories = [...data.categories].sort((a, b) => b.count - a.count);
      setCategories(sortedCategories);
      
      // Auto-select the first category if available
      if (sortedCategories.length > 0) {
        const firstCategory = sortedCategories[0].category;
        setSelectedCategory(firstCategory);
        fetchCharactersByCategory(firstCategory);
      }
      
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError(`Failed to load categories: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch characters for a specific category
  const fetchCharactersByCategory = async (category: string) => {
    try {
      setLoadingCharacters(true);
      setError(null);
      
      console.log('Fetching characters for category:', category);
      
      // Make sure to properly encode the category parameter
      const encodedCategory = encodeURIComponent(category);
      const url = `${API_BASE}/religious_characters/batch/${BATCH_ID}?religion_category=${encodedCategory}`;
      
      console.log('Request URL:', url);
      
      const response = await fetch(url);
      
      console.log('Characters response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch characters: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Characters data received:', data);
      console.log('Characters count:', data.data?.length || 0);
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error('Invalid characters data format:', data);
        throw new Error('Invalid data format received from server');
      }
      
      // Log the first character to see its structure
      if (data.data.length > 0) {
        console.log('Sample character:', data.data[0]);
      }
      
      setCharacters(data.data);
      
    } catch (error) {
      console.error('Error fetching characters:', error);
      setError(`Failed to load characters: ${error.message}`);
      // Clear characters on error to avoid showing stale data
      setCharacters([]);
    } finally {
      setLoadingCharacters(false);
    }
  };

  // Initial fetch of categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    console.log('Category selected:', category);
    
    // Only fetch if it's a different category
    if (category !== selectedCategory) {
      setSelectedCategory(category);
      // Clear current characters while loading new ones
      setCharacters([]);
      // Fetch characters for the selected category
      fetchCharactersByCategory(category);
    }
  };

  // Handle character selection
  const handleSelectCharacter = (character: ReligiousCharacter) => {
    // Navigate to character detail screen with the full character object
    router.push({
      pathname: '/character-detail',
      params: { 
        characterId: character.id,
        // We need to serialize the character object to pass it as params
        characterData: JSON.stringify(character)
      }
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

  // Render a character image in the grid
  const renderCharacterImage = (character: ReligiousCharacter) => (
    <TouchableOpacity
      style={styles.characterImageContainer}
      onPress={() => handleSelectCharacter(character)}
    >
      <Image
        source={{ uri: character.character_image_url }}
        style={styles.gridCharacterImage}
        resizeMode="cover"
      />
      <View style={styles.characterNameOverlay}>
        <Text style={styles.characterNameText} numberOfLines={1}>
          {character.character_name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render category filter buttons with improved logging
  const renderCategoryFilters = () => (
    <View style={styles.categoriesContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScrollView}>
        {categories.map(category => {
          const isSelected = selectedCategory === category.category;
          
          return (
            <TouchableOpacity
              key={category.category}
              style={[
                styles.categoryChip,
                isSelected && styles.selectedCategoryChip
              ]}
              onPress={() => handleCategorySelect(category.category)}
            >
              <Text style={[
                styles.categoryChipText,
                isSelected && styles.selectedCategoryChipText
              ]}>
                {formatCategoryName(category.category)} ({category.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // Fallback to old method if categories API fails
  const fetchAllCharacters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Falling back to fetching all characters');
      
      const response = await fetch(
        `${API_BASE}/religious_characters/batch/${BATCH_ID}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch characters: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received from server');
      }
      
      setCharacters(data.data);
      
      // Create categories from the characters
      const categoryMap = new Map<string, number>();
      data.data.forEach((char: ReligiousCharacter) => {
        if (char.religion_category) {
          const count = categoryMap.get(char.religion_category) || 0;
          categoryMap.set(char.religion_category, count + 1);
        }
      });
      
      const derivedCategories = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count
      })).sort((a, b) => b.count - a.count);
      
      setCategories(derivedCategories);
      
      // Auto-select the first category if available
      if (derivedCategories.length > 0) {
        setSelectedCategory(derivedCategories[0].category);
      }
      
    } catch (error) {
      console.error('Error in fallback fetch:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchCategories}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.retryButton, styles.fallbackButton]}
              onPress={fetchAllCharacters}
            >
              <Text style={styles.retryButtonText}>Load All</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {categories.length > 0 ? renderCategoryFilters() : null}
          
          {loadingCharacters ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Loading spiritual guides...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.categorySection}>
                <Text style={styles.categorySectionTitle}>
                  {selectedCategory ? formatCategoryName(selectedCategory) : 'All Characters'}
                  {selectedCategory && ` (${characters.length})`}
                </Text>
                <View style={styles.characterGrid}>
                  {characters.map((character, index) => (
                    <View key={`${character.id}-${index}`} style={styles.gridItem}>
                      {renderCharacterImage(character)}
                    </View>
                  ))}
                </View>
                
                {characters.length === 0 && !loadingCharacters && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No characters found in this category.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </>
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
  categorySection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  categorySectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  characterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '31%',
    marginBottom: 12,
  },
  characterImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridCharacterImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
  },
  characterNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
  },
  characterNameText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  
  fallbackButton: {
    backgroundColor: '#27ae60',
  },
  
  scrollContainer: {
    flex: 1,
  },
  
  scrollContentContainer: {
    paddingBottom: 20, // Add padding at the bottom for better scrolling
  },
}); 