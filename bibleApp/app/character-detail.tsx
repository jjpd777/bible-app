import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../constants/ApiConfig';
import { useAuthContext } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

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

// Add this new type for monologue messages
type MonologueMessage = {
  id: string;
  content: string;
  timestamp: string;
  character_id: string;
};

// Add this new type for conversation creation
type ConversationResponse = {
  conversation: {
    id: string;
    title: string;
    character_id: string;
    user_id: string;
    is_monologue: boolean;
  };
  messages: Array<{
    id: string;
    content: string;
    sender: string;
    timestamp: string;
  }>;
};

// Add this new type for fetching conversation data
type ConversationData = {
  conversation: {
    id: string;
    title: string;
    character_id: string;
    user_id: string;
    is_monologue: boolean;
  };
  messages: Array<{
    id: string;
    sender: string;
    content: string;
    timestamp: string;
  }>;
};


// Update these API functions to use the correct API_BASE
const getCharacterMonologue = async (characterId: string): Promise<MonologueMessage[]> => {
  try {
    console.log(`Fetching monologues from: ${API_BASE_URL}/monologues/${characterId}`);
    const response = await fetch(`${API_BASE_URL}/monologues/${characterId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Monologue data received:", data);
    return data.messages || [];
  } catch (error) {
    console.error("Failed to load monologues:", error);
    return [];
  }
};

const generateMonologue = async (characterId: string): Promise<MonologueMessage | null> => {
  try {
    console.log(`Generating monologue at: ${API_BASE_URL}/monologues/${characterId}`);
    console.log("Character ID:", characterId);
    
    const response = await fetch(`${API_BASE_URL}/monologues/${characterId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Generation response:", data);
    return data.message;
  } catch (error) {
    console.error("Failed to generate monologue:", error);
    return null;
  }
};

// Add this API function after the existing API functions
const createConversation = async (characterId: string, userId: string, characterName?: string): Promise<ConversationResponse | null> => {
  try {
    const requestBody = {
      title: characterName ? `Chat with ${characterName}` : `Chat with ${characterId}`
    };
    
    console.log(`Creating conversation at: ${API_BASE_URL}/conversations/${characterId}/user/${userId}`);
    console.log("Request method: POST");
    console.log("Request headers:", {
      'Content-Type': 'application/json'
    });
    console.log("Request body being sent:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/conversations/${characterId}/user/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error response body:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Conversation creation response:", data);
    return data;
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return null;
  }
};

// Add this new API function after the existing ones
const fetchConversation = async (conversationId: string): Promise<ConversationData | null> => {
  try {
    console.log(`Fetching conversation from: ${API_BASE_URL}/conversations/${conversationId}`);
    
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Conversation data received:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    return null;
  }
};

export default function CharacterDetailScreen() {
  const { characterId, characterData } = useLocalSearchParams();
  const [character, setCharacter] = useState<ReligiousCharacter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const [monologueMessages, setMonologueMessages] = useState<MonologueMessage[]>([]);
  const [isGeneratingMonologue, setIsGeneratingMonologue] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');
  const [currentPage, setCurrentPage] = useState(1);
  const insightsPerPage = 3;
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  
  // Add auth context
  const { isAuthenticated, isAnonymous } = useAuthContext();

  // Add this function to load monologues
  const loadMonologues = useCallback(async () => {
    if (character?.id) {
      try {
        const messages = await getCharacterMonologue(character.id);
        // Sort messages by timestamp in descending order (newest first)
        const sortedMessages = messages.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setMonologueMessages(sortedMessages);
      } catch (error) {
        console.error("Failed to load monologues:", error);
      }
    }
  }, [character?.id]);

  // Update useEffect to load monologues when character is loaded
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

  // Add a new useEffect to load monologues when character changes
  useEffect(() => {
    if (character) {
      loadMonologues();
    }
  }, [character, loadMonologues]);

  // Add this function to handle generating a new monologue
  const handleGenerateMonologue = async () => {
    if (!character?.id) return;
    
    setIsGeneratingMonologue(true);
    try {
      console.log("Generating monologue for character:", character);
      const result = await generateMonologue(character.id);
      console.log("Generation result:", result);
      
      // Reload messages to include the new one
      await loadMonologues();
    } catch (error) {
      console.error("Failed to generate monologue:", error);
      // You can add an alert here if you want to show an error message to the user
    } finally {
      setIsGeneratingMonologue(false);
    }
  };

  // Update the handleCreateConversation function to check authentication
  const handleCreateConversation = async () => {
    if (!character?.id) return;
    
    // Check if user is authenticated (not anonymous)
    if (!isAuthenticated || isAnonymous) {
      console.log('User not authenticated, redirecting to profile_auth...');
      console.log('isAuthenticated:', isAuthenticated);
      console.log('isAnonymous:', isAnonymous);
      router.push('/profile_auth');
      return;
    }
    
    // Using default user ID
    const userId = "00000000-0000-0000-0000-000000000001";
    
    console.log("User is authenticated, proceeding with conversation creation");
    console.log("Using user ID:", userId);
    
    setIsCreatingConversation(true);
    try {
      console.log("Creating conversation for character:", character);
      const result = await createConversation(character.id, userId, character.character_name);
      console.log("Conversation creation result:", result);
      
      if (result) {
        // Conversation created successfully
        const conversationId = result.conversation.id;
        console.log("New conversation created with ID:", conversationId);
        
        // Fetch the conversation data to verify it was created properly
        const conversationData = await fetchConversation(conversationId);
        if (conversationData) {
          console.log('Conversation:', conversationData.conversation);
          console.log('Messages:', conversationData.messages);
          
          // Navigate to conversation screen with the backend data AND character data
          router.push({
            pathname: '/components/Conversation',
            params: {
              conversationId: conversationId,
              backendMessages: JSON.stringify(conversationData.messages),
              isNew: 'false',
              characterData: JSON.stringify(character),
              conversationTitle: `Chat with ${character.character_name}`
            }
          });
        }
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
      // You can add an alert here if you want to show an error message to the user
    } finally {
      setIsCreatingConversation(false);
    }
  };

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

  // Add this function to handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Calculate pagination values
  const indexOfLastInsight = currentPage * insightsPerPage;
  const indexOfFirstInsight = indexOfLastInsight - insightsPerPage;
  const currentInsights = monologueMessages.slice(indexOfFirstInsight, indexOfLastInsight);
  const totalPages = Math.ceil(monologueMessages.length / insightsPerPage);

  // Enhanced render functions with modern design
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      />
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.8}>
          <View style={styles.backButtonInner}>
            <Ionicons name="chevron-back" size={24} color="#667eea" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Spiritual Guide</Text>
          <Text style={styles.headerSubtitle}>Connect & Learn</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.shareButton} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={20} color="#667eea" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCharacterHero = () => (
    <View style={styles.heroSection}>
      <View style={styles.characterImageContainer}>
        <Image
          source={{ uri: character.character_image_url }}
          style={styles.characterImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.imageGradientOverlay}
        />
        <View style={styles.characterFloatingBadge}>
          <Ionicons name="sparkles" size={16} color="#fff" />
        </View>
      </View>
      
      <View style={styles.characterInfo}>
        <Text style={styles.characterName}>{character.character_name}</Text>
        <Text style={styles.characterLabel}>{character.character_label}</Text>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[
              styles.iconActionButton, 
              styles.messageButton, 
              (isCreatingConversation || (!isAuthenticated || isAnonymous)) && styles.buttonDisabled
            ]}
            onPress={handleCreateConversation}
            disabled={isCreatingConversation}
            activeOpacity={0.8}
          >
            <View style={styles.iconButtonBackground}>
              <Ionicons 
                name={
                  isCreatingConversation ? "hourglass" : 
                  (!isAuthenticated || isAnonymous) ? "lock-closed" : 
                  "chatbubble-ellipses"
                } 
                size={20} 
                color={(!isAuthenticated || isAnonymous) ? "#cbd5e0" : "#667eea"} 
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.iconActionButton, styles.connectionButton]}
            onPress={() => {
              // Handle connection request
              console.log("Connection request sent");
            }}
            activeOpacity={0.8}
          >
            <View style={styles.iconButtonBackground}>
              <Ionicons name="person-add" size={20} color="#667eea" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.iconActionButton, styles.notificationButton]}
            onPress={() => {
              // Handle notifications
              console.log("Notifications toggled");
            }}
            activeOpacity={0.8}
          >
            <View style={styles.iconButtonBackground}>
              <Ionicons name="notifications" size={20} color="#667eea" />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Add authentication notice for unauthenticated users */}
        {(!isAuthenticated || isAnonymous) && (
          <View style={styles.authNotice}>
            <Ionicons name="information-circle" size={16} color="#f59e0b" />
            <Text style={styles.authNoticeText}>
              Sign in to start conversations
            </Text>
          </View>
        )}
        
        <View style={styles.tagsContainer}>
          {character.religion_category && (
            <View style={[styles.tag, styles.categoryTag]}>
              <Ionicons name="library" size={12} color="#fff" />
              <Text style={styles.tagText}>{character.religion_category}</Text>
            </View>
          )}
          
          {character.religion_branch && (
            <View style={[styles.tag, styles.branchTag]}>
              <Ionicons name="people" size={12} color="#fff" />
              <Text style={styles.tagText}>{character.religion_branch}</Text>
            </View>
          )}
          
          {character.religion_label && (
            <View style={[styles.tag, styles.religionTag]}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.tagText}>{character.religion_label}</Text>
            </View>
          )}
          
          {character.llm_model && (
            <View style={[styles.tag, styles.modelTag]}>
              <Ionicons name="hardware-chip" size={12} color="#fff" />
              <Text style={styles.tagText}>{character.llm_model}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderTabNavigation = () => (
    <View style={styles.tabContainer}>
      <View style={styles.tabBackground}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'insights' && styles.activeTabButton]}
          onPress={() => setActiveTab('insights')}
          activeOpacity={0.8}
        >
          {activeTab === 'insights' && (
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.activeTabGradient}
            />
          )}
          <Ionicons 
            name="diamond" 
            size={18} 
            color={activeTab === 'insights' ? '#fff' : '#718096'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'insights' && styles.activeTabText]}>
            Sample
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'prompts' && styles.activeTabButton]}
          onPress={() => setActiveTab('prompts')}
          activeOpacity={0.8}
        >
          {activeTab === 'prompts' && (
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.activeTabGradient}
            />
          )}
          <Ionicons 
            name="code-slash" 
            size={18} 
            color={activeTab === 'prompts' ? '#fff' : '#718096'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'prompts' && styles.activeTabText]}>
            Prompts
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInsightsTab = () => (
    <View style={styles.tabContent}>
      {character.character_gratitude_prompt && (
        <View style={styles.gratitudeSection}>
          <View style={styles.gratitudeCard}>
            <LinearGradient
              colors={['#FF9800', '#F57C00']}
              style={styles.gratitudeGradient}
            />
            <View style={styles.gratitudeContent}>
              <View style={styles.gratitudeHeader}>
                <Ionicons name="diamond" size={20} color="#FF9800" />
                <Text style={styles.gratitudeTitle}>Gratitude Nugget</Text>
              </View>
              <Text style={styles.gratitudeText}>
                {character.character_gratitude_prompt}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.insightGenerateButton, isGeneratingMonologue && styles.buttonDisabled]}
            onPress={handleGenerateMonologue}
            disabled={isGeneratingMonologue}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isGeneratingMonologue ? ['#a0c4de', '#90b4d3'] : ['#667eea', '#764ba2']}
              style={styles.buttonGradient}
            >
              {/* <Ionicons name="diamond" size={18} color="#fff" /> */}
              <Text style={styles.insightGenerateButtonText}>
                {isGeneratingMonologue ? "Generating..." : "✨ Generate ✨"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.insightsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Nuggets</Text>
          <View style={styles.insightsBadge}>
            <Text style={styles.insightsBadgeText}>{monologueMessages.length}</Text>
          </View>
        </View>
        
        {monologueMessages.length === 0 ? (
          <View style={styles.emptyInsights}>
            <View style={styles.emptyInsightsIcon}>
              <Ionicons name="diamond-outline" size={48} color="#cbd5e0" />
            </View>
            <Text style={styles.emptyInsightsTitle}>No gratitude nuggets yet</Text>
            <Text style={styles.emptyInsightsText}>Generate your first nugget to begin</Text>
          </View>
        ) : (
          <View style={styles.insightsGrid}>
            {currentInsights.map((message, index) => (
              <View key={message.id || message.timestamp || `message-${index}`} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <View style={styles.insightIcon}>
                    <Ionicons name="diamond" size={16} color="#667eea" />
                  </View>
                  <Text style={styles.insightTimestamp}>
                    {new Date(message.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.insightContent}>{message.content}</Text>
                <View style={styles.insightFooter}>
                  <TouchableOpacity style={styles.insightAction} activeOpacity={0.8}>
                    <Ionicons name="bookmark-outline" size={16} color="#718096" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.insightAction} activeOpacity={0.8}>
                    <Ionicons name="share-outline" size={16} color="#718096" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity 
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#cbd5e0' : '#667eea'} />
                </TouchableOpacity>
                
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>{currentPage} of {totalPages}</Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                  onPress={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#cbd5e0' : '#667eea'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const renderPromptsTab = () => (
    <View style={styles.tabContent}>
      {collapsibleFields.map(field => {
        if (!character[field as keyof ReligiousCharacter]) return null;
        
        let friendlyTitle = '';
        let iconName = '';
        let gradientColors = ['#667eea', '#764ba2'];
        
        switch(field) {
          case 'character_system_prompt':
            friendlyTitle = 'System Prompt';
            iconName = 'settings';
            gradientColors = ['#667eea', '#764ba2'];
            break;
          case 'character_gratitude_prompt':
            friendlyTitle = 'Gratitude Prompt';
            iconName = 'heart';
            gradientColors = ['#FF9800', '#F57C00'];
            break;
          case 'character_image_prompt':
            friendlyTitle = 'Image Prompt';
            iconName = 'image';
            gradientColors = ['#9C27B0', '#673AB7'];
            break;
          default:
            friendlyTitle = field.replace(/_/g, ' ');
            iconName = 'document-text';
        }
        
        return (
          <View key={field} style={styles.promptCard}>
            <TouchableOpacity 
              style={styles.promptHeader}
              onPress={() => toggleSection(field)}
              activeOpacity={0.8}
            >
              <View style={styles.promptTitleContainer}>
                <LinearGradient
                  colors={gradientColors}
                  style={styles.promptIcon}
                >
                  <Ionicons name={iconName as any} size={16} color="#fff" />
                </LinearGradient>
                <Text style={styles.promptTitle}>{friendlyTitle}</Text>
              </View>
              <View style={styles.expandIcon}>
                <Ionicons 
                  name={expandedSections[field] ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#718096" 
                />
              </View>
            </TouchableOpacity>
            
            {expandedSections[field] && (
              <View style={styles.promptContent}>
                <Text style={styles.promptText}>
                  {character[field as keyof ReligiousCharacter] as string}
                </Text>
                <View style={styles.promptActions}>
                  <TouchableOpacity style={styles.promptAction} activeOpacity={0.8}>
                    <Ionicons name="copy-outline" size={16} color="#667eea" />
                    <Text style={styles.promptActionText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingTitle}>Loading Guide</Text>
            <Text style={styles.loadingText}>Preparing your spiritual connection...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !character) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline" size={64} color="#e74c3c" />
            <Text style={styles.errorTitle}>Connection Lost</Text>
            <Text style={styles.errorText}>{error || 'Character not found'}</Text>
            <TouchableOpacity style={styles.errorButton} onPress={goBack} activeOpacity={0.8}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.buttonGradient}
              >
                <Ionicons name="arrow-back" size={16} color="#fff" />
                <Text style={styles.errorButtonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
      {renderHeader()}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderCharacterHero()}
        {renderTabNavigation()}
        
        <View style={styles.contentContainer}>
          {activeTab === 'insights' && renderInsightsTab()}
          {activeTab === 'prompts' && renderPromptsTab()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    position: 'relative',
    paddingBottom: 16,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
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
  backButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    width: 44,
    alignItems: 'flex-end',
  },
  shareButton: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  characterImageContainer: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  characterImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#e2e8f0',
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  characterFloatingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  characterInfo: {
    alignItems: 'center',
  },
  characterName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  characterLabel: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  iconActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconButtonBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageButton: {
    // Inherits base styles
  },
  connectionButton: {
    // Inherits base styles
  },
  notificationButton: {
    // Inherits base styles
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  categoryTag: {
    backgroundColor: '#E91E63',
  },
  branchTag: {
    backgroundColor: '#9C27B0',
  },
  religionTag: {
    backgroundColor: '#FF9800',
  },
  modelTag: {
    backgroundColor: '#607D8B',
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    position: 'relative',
  },
  activeTabButton: {
    // Styles handled by gradient overlay
  },
  activeTabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#fff',
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  tabContent: {
    gap: 20,
  },
  gratitudeCard: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gratitudeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  gratitudeContent: {
    padding: 20,
  },
  gratitudeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  gratitudeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a202c',
  },
  gratitudeText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4a5568',
    fontWeight: '400',
  },
  gratitudeSection: {
    marginBottom: 24,
  },
  insightGenerateButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  insightGenerateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  insightsSection: {
    // Container styles
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
    letterSpacing: -0.3,
  },
  insightsBadge: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  insightsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667eea',
  },
  emptyInsights: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyInsightsIcon: {
    marginBottom: 16,
  },
  emptyInsightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  emptyInsightsText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  insightsGrid: {
    gap: 16,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTimestamp: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  insightContent: {
    fontSize: 15,
    lineHeight: 24,
    color: '#2d3748',
    marginBottom: 16,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  insightAction: {
    padding: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 20,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  promptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  promptTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promptIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
  },
  expandIcon: {
    // Container for expand icon
  },
  promptContent: {
    padding: 20,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4a5568',
    marginBottom: 16,
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  promptAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  promptActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  loadingGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingText: {
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
  errorButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  authNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16,
    gap: 6,
  },
  authNoticeText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
}); 