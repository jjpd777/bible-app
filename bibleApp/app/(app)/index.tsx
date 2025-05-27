import { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, Text, Image, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL, BATCH_ID } from '../../constants/ApiConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useAnalytics } from '../../hooks/useAnalytics';

const { width } = Dimensions.get('window');

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchedCategory, setLastFetchedCategory] = useState<string | null>(null);
  
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, backendUserSynced, isAnonymous } = useAuth();
  const { trackEventBoth, logScreenView, setUserPropertiesBoth, setUserIdBoth } = useAnalytics();

  // Track screen view and user properties
  useEffect(() => {
    logScreenView('CharacterDiscovery', 'MainScreen');
    trackEventBoth('screen_view', {
      screen_name: 'character_discovery',
      screen_class: 'main_screen'
    });
  }, []);

  // Track user authentication status
  useEffect(() => {
    if (user && user.uid) {
      setUserIdBoth(user.uid);
      setUserPropertiesBoth({
        user_type: isAnonymous ? 'anonymous' : 'registered',
        backend_synced: backendUserSynced,
        has_email: !!user.email
      });
      
      trackEventBoth('user_identified', {
        user_type: isAnonymous ? 'anonymous' : 'registered',
        backend_synced: backendUserSynced,
        has_email: !!user.email
      });
    }
  }, [user, isAnonymous, backendUserSynced]);

  // Log firebase_uid as soon as user is available (keep for debugging)
  useEffect(() => {
    if (user && user.uid) {
      console.log('=== USER FIREBASE UID DETECTED ===');
      console.log('Firebase UID:', user.uid);
      console.log('User Type:', isAnonymous ? 'Anonymous' : 'Registered');
      console.log('User Email:', user.email || 'No email (anonymous)');
      console.log('User Display Name:', user.displayName || 'No display name');
      console.log('Backend User Synced:', backendUserSynced);
      console.log('===================================');
    }
  }, [user, isAnonymous, backendUserSynced]);

  // Remove authentication check - fetch immediately on mount
  useEffect(() => {
    console.log('🔄 [USEEFFECT] Component mounted, fetching categories...');
    fetchCategories();
  }, []); // Empty dependency array - runs once on mount

  // Add this debug function at the top of your component
  const debugApiCall = async (url: string, description: string) => {
    console.log(`🔍 [DEBUG] About to call: ${description}`);
    console.log(`🔍 [DEBUG] URL: ${url}`);
    console.log(`🔍 [DEBUG] API_BASE_URL: ${API_BASE_URL}`);
    console.log(`🔍 [DEBUG] BATCH_ID: ${BATCH_ID}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });
      
      console.log(`✅ [DEBUG] ${description} - Status: ${response.status}`);
      console.log(`✅ [DEBUG] ${description} - Headers:`, Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log(`✅ [DEBUG] ${description} - Raw response:`, text);
      
      return { response, text };
    } catch (error) {
      console.error(`❌ [DEBUG] ${description} - Error:`, error);
      throw error;
    }
  };

  // Enhanced fetch categories with detailed debugging and analytics
  const fetchCategories = async (retryAttempt = 0) => {
    console.log('🚀 [CATEGORIES] Starting fetchCategories...');
    console.log('🚀 [CATEGORIES] isAuthenticated:', isAuthenticated);
    console.log('🚀 [CATEGORIES] authLoading:', authLoading);
    console.log('🚀 [CATEGORIES] user:', user?.uid);
    
    try {
      setIsLoading(true);
      setError(null);
      
      const url = `${API_BASE_URL}/religious_characters/batch/${BATCH_ID}/categories`;
      
      const { response, text } = await debugApiCall(url, 'CATEGORIES');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ [CATEGORIES] Failed to parse JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('✅ [CATEGORIES] Parsed data:', data);
      
      // Be more flexible with response format
      const categories = data.categories || data.data || data;
      if (!Array.isArray(categories)) {
        console.error('❌ [CATEGORIES] Categories is not an array:', categories);
        throw new Error('Invalid categories format received');
      }
      
      console.log('✅ [CATEGORIES] Found categories:', categories.length);
      
      // Sort categories by count (descending)
      const sortedCategories = [...categories].sort((a, b) => (b.count || 0) - (a.count || 0));
      setCategories(sortedCategories);
      
      // Auto-select and fetch the first category if available
      if (sortedCategories.length > 0 && isInitialLoad) {
        const firstCategory = sortedCategories[0].category;
        console.log('🎯 [CATEGORIES] Auto-selecting first category:', firstCategory);
        setSelectedCategory(firstCategory);
        
        // Make sure this actually gets called
        console.log('🎯 [CATEGORIES] About to call fetchCharactersByCategory...');
        await fetchCharactersByCategory(firstCategory, true);
        setIsInitialLoad(false);
      }
      
      // Track successful category load
      trackEventBoth('categories_loaded', {
        categories_count: sortedCategories.length,
        retry_attempt: retryAttempt,
        load_time: Date.now()
      });
      
      setRetryCount(0);
      
    } catch (error) {
      console.error('❌ [CATEGORIES] Error:', error);
      
      // Track category load error
      trackEventBoth('categories_load_error', {
        error_message: error.message,
        retry_attempt: retryAttempt,
        api_url: `${API_BASE_URL}/religious_characters/batch/${BATCH_ID}/categories`
      });
      
      if (retryAttempt < 3) {
        const delay = Math.pow(2, retryAttempt) * 1000;
        console.log(`🔄 [CATEGORIES] Retrying in ${delay}ms (attempt ${retryAttempt + 1})`);
        setTimeout(() => {
          fetchCategories(retryAttempt + 1);
        }, delay);
        return;
      }
      
      console.log('💥 [CATEGORIES] All attempts failed, trying fallback');
      setError(`Failed to load categories: ${error.message}`);
      fetchAllCharacters();
    } finally {
      if (retryAttempt === 0) {
        setIsLoading(false);
      }
    }
  };
  
  // Enhanced fetch characters with detailed debugging and analytics
  const fetchCharactersByCategory = async (category: string, isInitial = false) => {
    console.log('🚀 [CHARACTERS] Starting fetchCharactersByCategory...');
    console.log('🚀 [CHARACTERS] Category:', category);
    console.log('🚀 [CHARACTERS] isInitial:', isInitial);
    console.log('🚀 [CHARACTERS] lastFetchedCategory:', lastFetchedCategory);
    
    // Prevent duplicate fetches
    if (category === lastFetchedCategory && !isInitial) {
      console.log('⏭️ [CHARACTERS] Category already fetched, skipping:', category);
      return;
    }

    try {
      setLoadingCharacters(true);
      setError(null);
      
      const encodedCategory = encodeURIComponent(category);
      const url = `${API_BASE_URL}/religious_characters/batch/${BATCH_ID}?religion_category=${encodedCategory}`;
      
      const { response, text } = await debugApiCall(url, 'CHARACTERS');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ [CHARACTERS] Failed to parse JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('✅ [CHARACTERS] Parsed data:', data);
      
      // Be more flexible with response format
      const characters = data.data || data.characters || data;
      if (!Array.isArray(characters)) {
        console.error('❌ [CHARACTERS] Characters is not an array:', characters);
        throw new Error('Invalid characters format received');
      }
      
      console.log('✅ [CHARACTERS] Found characters:', characters.length);
      if (characters.length > 0) {
        console.log('✅ [CHARACTERS] Sample character:', characters[0]);
      }
      
      // Track successful character load
      trackEventBoth('characters_loaded', {
        category: category,
        characters_count: characters.length,
        is_initial_load: isInitial,
        load_time: Date.now()
      });
      
      setCharacters(characters);
      setLastFetchedCategory(category);
      
    } catch (error) {
      console.error('❌ [CHARACTERS] Error:', error);
      
      // Track character load error
      trackEventBoth('characters_load_error', {
        category: category,
        error_message: error.message,
        is_initial_load: isInitial
      });
      
      setError(`Failed to load characters for ${category}: ${error.message}`);
      
      if (isInitial) {
        setCharacters([]);
      }
    } finally {
      setLoadingCharacters(false);
    }
  };

  // Enhanced category selection with better UX and analytics
  const handleCategorySelect = async (category: string) => {
    console.log('Category selected:', category);
    
    // Track category selection
    trackEventBoth('category_selected', {
      category_name: category,
      previous_category: selectedCategory || 'none'
    });
    
    // Only fetch if it's a different category
    if (category !== selectedCategory) {
      setSelectedCategory(category);
      
      // Show loading state but don't clear characters immediately
      // This provides better UX as users can still see previous content
      await fetchCharactersByCategory(category);
    }
  };

  // Handle character selection
  const handleSelectCharacter = (character: ReligiousCharacter) => {
    // Track character selection
    trackEventBoth('character_selected', {
      character_id: character.id,
      character_name: character.character_name,
      religion_category: character.religion_category,
      religion_branch: character.religion_branch,
      selected_from_category: selectedCategory
    });

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

  // Format branch name for display (split on spaces and capitalize each word)
  const formatBranchName = (branch: string) => {
    return branch
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Enhanced category filter rendering with glassmorphism
  const renderCategoryFilters = () => {
    return (
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesScrollView}
        >
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
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isSelected ? ['#667eea', '#764ba2'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                  style={styles.categoryGradient}
                >
                  <Text style={[
                    styles.categoryChipText,
                    isSelected && styles.selectedCategoryChipText
                  ]}>
                    {formatCategoryName(category.category)}
                  </Text>
                  <View style={[styles.categoryBadge, isSelected && styles.selectedCategoryBadge]}>
                    <Text style={[styles.categoryBadgeText, isSelected && styles.selectedCategoryBadgeText]}>
                      {category.count}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Enhanced character image rendering with modern card design
  const renderCharacterImage = (character: ReligiousCharacter) => (
    <TouchableOpacity
      style={styles.characterCard}
      onPress={() => handleSelectCharacter(character)}
      activeOpacity={0.9}
    >
      <View style={styles.characterImageWrapper}>
        <Image
          source={{ uri: character.character_image_url }}
          style={styles.gridCharacterImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.characterGradientOverlay}
        />
        <View style={styles.characterInfo}>
          <Text style={styles.characterName} numberOfLines={1}>
            {character.character_name}
          </Text>
          <Text style={styles.characterBranch} numberOfLines={1}>
            {formatBranchName(character.religion_branch)}
          </Text>
        </View>
        <View style={styles.characterFloatingIcon}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Group characters by religion_branch within the selected category
  const groupCharactersByBranch = (characters: ReligiousCharacter[]) => {
    const grouped = characters.reduce((acc, character) => {
      const branch = character.religion_branch || 'Other';
      if (!acc[branch]) {
        acc[branch] = [];
      }
      acc[branch].push(character);
      return acc;
    }, {} as Record<string, ReligiousCharacter[]>);

    // Sort branches alphabetically and return as array of objects
    return Object.keys(grouped)
      .sort()
      .map(branch => ({
        branch,
        characters: grouped[branch]
      }));
  };

  // Enhanced branch group rendering
  const renderReligionBranchGroup = (branchGroup: { branch: string; characters: ReligiousCharacter[] }, index: number) => (
    <View key={branchGroup.branch} style={[styles.branchGroup, index === 0 && styles.firstBranchGroup]}>
      <View style={styles.branchHeader}>
        <View style={styles.branchTitleContainer}>
          <View style={styles.branchIcon}>
            <Ionicons name="people" size={20} color="#667eea" />
          </View>
          <Text style={styles.branchGroupTitle}>
            {formatBranchName(branchGroup.branch)}
          </Text>
        </View>
        <View style={styles.branchCount}>
          <Text style={styles.branchCountText}>{branchGroup.characters.length}</Text>
        </View>
      </View>
      <View style={styles.characterGrid}>
        {branchGroup.characters.map((character, index) => (
          <View key={`${character.id}-${index}`} style={styles.gridItem}>
            {renderCharacterImage(character)}
          </View>
        ))}
      </View>
    </View>
  );

  // Simplified fallback that tries to get all characters directly
  const fetchAllCharacters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = `${API_BASE_URL}/religious_characters/batch/${BATCH_ID}`;
      console.log('Fallback: Fetching all characters from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        signal: AbortSignal.timeout(20000),
      });
      
      console.log('All characters response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('All characters error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseText = await response.text();
      console.log('Raw all characters response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse all characters JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      const characters = data.data || data.characters || data;
      if (!Array.isArray(characters)) {
        throw new Error('Invalid characters format received');
      }
      
      console.log('All characters loaded:', characters.length);
      setCharacters(characters);
      
      // Create categories from the characters
      const categoryMap = new Map<string, number>();
      characters.forEach((char: ReligiousCharacter) => {
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
      
      if (derivedCategories.length > 0) {
        const firstCategory = derivedCategories[0].category;
        setSelectedCategory(firstCategory);
        
        const filteredCharacters = characters.filter((char: ReligiousCharacter) => 
          char.religion_category === firstCategory
        );
        setCharacters(filteredCharacters);
        setLastFetchedCategory(firstCategory);
      }
      
    } catch (error) {
      console.error('Error in fallback fetch:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen only while fetching data
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.backgroundGradient}
        />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Discovering spiritual guides...</Text>
            <Text style={styles.loadingSubtext}>Preparing your journey</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <View style={styles.titleIcon}>
              <Ionicons name="sparkles" size={28} color="#fff" />
            </View>
            <View>
              <Text style={styles.title}>Gratitud.ai</Text>
              <Text style={styles.subtitle}>Practice it.</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={navigateToHomeScreen}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={20} color="#667eea" />
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline" size={48} color="#e74c3c" />
            <Text style={styles.errorTitle}>Connection Lost</Text>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchCategories}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.fallbackButton}
                onPress={fetchAllCharacters}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#27ae60', '#2ecc71']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="download" size={16} color="#fff" />
                  <Text style={styles.retryButtonText}>Load All</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <>
          {categories.length > 0 ? renderCategoryFilters() : null}
          
          {loadingCharacters ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Loading guides...</Text>
              </View>
            </View>
          ) : (
            <ScrollView 
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.categorySection}>
                {characters.length > 0 ? (
                  groupCharactersByBranch(characters).map((branchGroup, index) => 
                    renderReligionBranchGroup(branchGroup, index)
                  )
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search" size={64} color="#bdc3c7" />
                    <Text style={styles.emptyTitle}>No guides found</Text>
                    <Text style={styles.emptyText}>Try selecting a different category</Text>
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
    backgroundColor: '#f8fafc',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 2,
  },
  homeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  categoriesContainer: {
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoriesScrollView: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryChip: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedCategoryChip: {
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3748',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  selectedCategoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d3748',
  },
  selectedCategoryBadgeText: {
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  categorySection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  categorySectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a202c',
    letterSpacing: -0.5,
  },
  totalCount: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  totalCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  branchGroup: {
    marginBottom: 32,
  },
  firstBranchGroup: {
    marginTop: 24,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  branchTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  branchGroupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
  },
  branchCount: {
    backgroundColor: '#f7fafc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  branchCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
  },
  characterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  gridItem: {
    width: (width - 72) / 3, // Account for padding and gaps
  },
  characterCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  characterImageWrapper: {
    position: 'relative',
  },
  gridCharacterImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e2e8f0',
  },
  characterGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  characterInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  characterName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  characterBranch: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  characterFloatingIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    backdropFilter: 'blur(10px)',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    backdropFilter: 'blur(10px)',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fallbackButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
}); 