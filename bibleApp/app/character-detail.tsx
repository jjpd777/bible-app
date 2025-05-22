import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Character type definition (same as in index.tsx)
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
  batch_id?: string;
  creator_id?: string;
  created_at?: string;
  updated_at?: string;
  llm_model?: string;
  inserted_at?: string;
  batch_label?: string;
};

export default function CharacterDetailScreen() {
  const { characterId, characterData } = useLocalSearchParams();
  const [character, setCharacter] = useState<ReligiousCharacter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    try {
      // Parse the character data from params
      if (characterData) {
        const parsedCharacter = JSON.parse(characterData as string) as ReligiousCharacter;
        setCharacter(parsedCharacter);
      } else if (characterId) {
        // Fallback to fetching by ID if needed
        setError('Character data is missing');
      } else {
        setError('Character information is missing');
      }
    } catch (error) {
      console.error('Error parsing character data:', error);
      setError('Failed to load character details. Please try again later.');
    }
  }, [characterData, characterId]);

  const goBack = () => {
    router.back();
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get language flag emoji
  const getLanguageFlag = (language: string) => {
    const languageMap: Record<string, string> = {
      'en': '🇺🇸',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'it': '🇮🇹',
      'pt': '🇵🇹',
      'ru': '🇷🇺',
      'zh': '🇨🇳',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
      'ar': '🇸🇦',
      'hi': '🇮🇳',
      // Add more languages as needed
    };
    
    return languageMap[language.toLowerCase()] || language;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading character details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !character) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Character not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={goBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Fields to hide completely
  const hiddenFields = [
    'id', 
    'batch_id', 
    'creator_id', 
    'created_at', 
    'updated_at', 
    'character_image_url',
    'inserted_at',
    'batch_label'
  ];
  
  // Fields to show in collapsible sections
  const collapsibleFields = [
    'character_system_prompt', 
    'character_gratitude_prompt', 
    'character_image_prompt'
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Character Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.characterHeader}>
          <Image
            source={{ uri: character.character_image_url }}
            style={styles.characterImage}
            resizeMode="cover"
          />
          <View style={styles.characterTitleContainer}>
            <Text style={styles.characterName}>{character.character_name}</Text>
            <Text style={styles.characterLabel}>{character.character_label}</Text>
            
            <View style={styles.tagsContainer}>
              {character.religion_category && (
                <View style={styles.categoryTag}>
                  <Text style={styles.tagText}>{character.religion_category}</Text>
                </View>
              )}
              
              {character.religion_branch && (
                <View style={styles.branchTag}>
                  <Text style={styles.tagText}>{character.religion_branch}</Text>
                </View>
              )}
              
              {character.religion_label && (
                <View style={styles.religionTag}>
                  <Text style={styles.tagText}>{character.religion_label}</Text>
                </View>
              )}
              
              {character.llm_model && (
                <View style={styles.modelTag}>
                  <Text style={styles.tagText}>{character.llm_model}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          {/* Collapsible sections */}
          {collapsibleFields.map(field => {
            if (!character[field as keyof ReligiousCharacter]) return null;
            
            // Get a friendly title for each field
            let friendlyTitle = '';
            switch(field) {
              case 'character_system_prompt':
                friendlyTitle = 'System Prompt';
                break;
              case 'character_gratitude_prompt':
                friendlyTitle = 'Gratitude Prompt';
                break;
              case 'character_image_prompt':
                friendlyTitle = 'Image Prompt';
                break;
              default:
                friendlyTitle = field.replace(/_/g, ' ');
            }
            
            return (
              <View key={field} style={styles.collapsibleSection}>
                <TouchableOpacity 
                  style={styles.collapsibleHeader}
                  onPress={() => toggleSection(field)}
                >
                  <Text style={styles.collapsibleTitle}>{friendlyTitle}</Text>
                  <Ionicons 
                    name={expandedSections[field] ? 'chevron-up' : 'chevron-down'} 
                    size={24} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                {expandedSections[field] && (
                  <View style={styles.collapsibleContent}>
                    <Text style={styles.promptText}>
                      {character[field as keyof ReligiousCharacter] as string}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
          
          {/* Regular fields */}
          <Text style={[styles.sectionTitle, {marginTop: 20}]}>Additional Information</Text>
          {Object.entries(character).map(([key, value]) => {
            // Skip hidden and collapsible fields
            if (hiddenFields.includes(key) || collapsibleFields.includes(key)) {
              return null;
            }
            
            // Skip already displayed fields
            if (['character_name', 'character_label', 'religion_label', 
                 'religion_branch', 'religion_category', 'active', 
                 'public', 'language'].includes(key)) {
              return null;
            }
            
            // Format boolean values
            if (typeof value === 'boolean') {
              value = value ? 'Yes' : 'No';
            }
            
            // Format field name
            const formattedKey = key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            return (
              <View key={key} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{formattedKey}</Text>
                <Text style={styles.fieldValue}>{value}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  placeholder: {
    width: 50, // To balance the header
  },
  scrollView: {
    flex: 1,
  },
  characterHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  characterImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  characterTitleContainer: {
    alignItems: 'center',
  },
  characterName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  characterLabel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  activeTag: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  publicTag: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  religionTag: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  branchTag: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  tagText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  collapsibleSection: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  collapsibleContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  promptText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  fieldContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
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
  modelTag: {
    backgroundColor: '#607D8B', // Blue-gray color for model tag
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 8,
  },
}); 