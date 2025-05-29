import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../constants/ApiConfig';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface Character {
  id: string;
  character_name: string;
  religion_category: string;
  religion_branch: string;
  character_system_prompt: string;
  active: boolean;
  public: boolean;
  creator_id: string;
  inserted_at: string;
  updated_at: string;
  conversations?: Conversation[];
  conversationsLoaded?: boolean;
}

interface CharactersResponse {
  characters: Character[];
  page: number;
  total_pages: number;
  total_count: number;
  page_size: number;
}

interface UserCharactersListProps {
  onCharacterSelect?: (character: Character) => void;
}

export function UserCharactersList({ onCharacterSelect }: UserCharactersListProps) {
  const { user } = useAuthContext();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set());
  const [loadingConversations, setLoadingConversations] = useState<Set<string>>(new Set());

  const getUserCharacters = async (firebaseUid: string, pageNum = 1, pageSize = 20, isRefresh = false) => {
    try {
      const url = `${API_BASE_URL}/religious_characters/user/${firebaseUid}?page=${pageNum}&page_size=${pageSize}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        characters: result.data || [],
        page: result.meta?.page || 1,
        total_pages: result.meta?.total_pages || 0,
        total_count: result.meta?.total_count || 0,
        page_size: result.meta?.page_size || pageSize
      };
    } catch (error) {
      console.error('Error fetching user characters:', error);
      throw error;
    }
  };

  const getCharacterConversations = async (characterId: string) => {
    try {
      const url = `${API_BASE_URL}/conversations/character/${characterId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching character conversations:', error);
      return [];
    }
  };

  const loadCharacters = async (pageNum = 1, isRefresh = false) => {
    if (!user?.uid) return;

    if (isRefresh) {
      setRefreshing(true);
    } else if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await getUserCharacters(user.uid, pageNum);
      
      if (isRefresh || pageNum === 1) {
        setCharacters(response.characters);
        setPage(1);
      } else {
        setCharacters(prev => [...prev, ...response.characters]);
      }
      
      setTotalPages(response.total_pages);
      setTotalCount(response.total_count);
      setPage(pageNum);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load characters');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const toggleCharacterExpansion = async (characterId: string) => {
    const newExpanded = new Set(expandedCharacters);
    
    if (expandedCharacters.has(characterId)) {
      newExpanded.delete(characterId);
    } else {
      newExpanded.add(characterId);
      
      // Load conversations if not already loaded
      const character = characters.find(c => c.id === characterId);
      if (character && !character.conversationsLoaded) {
        setLoadingConversations(prev => new Set(prev).add(characterId));
        
        try {
          const conversations = await getCharacterConversations(characterId);
          
          setCharacters(prev => prev.map(c => 
            c.id === characterId 
              ? { ...c, conversations, conversationsLoaded: true }
              : c
          ));
        } catch (error) {
          Alert.alert('Error', 'Failed to load conversations');
        } finally {
          setLoadingConversations(prev => {
            const newSet = new Set(prev);
            newSet.delete(characterId);
            return newSet;
          });
        }
      }
    }
    
    setExpandedCharacters(newExpanded);
  };

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      loadCharacters(page + 1);
    }
  };

  const handleRefresh = () => {
    loadCharacters(1, true);
  };

  useEffect(() => {
    if (user?.uid) {
      loadCharacters();
    }
  }, [user?.uid]);

  const renderConversationItem = (conversation: Conversation, characterId: string) => (
    <TouchableOpacity
      key={conversation.id}
      style={styles.conversationItem}
      onPress={() => {
        // Navigate to conversation
        console.log('Navigate to conversation:', conversation.id);
        // router.push(`/conversation/${conversation.id}`);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.conversationHeader}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          {conversation.title || 'Untitled Conversation'}
        </Text>
        <Text style={styles.conversationDate}>
          {new Date(conversation.created_at).toLocaleDateString()}
        </Text>
      </View>
      {conversation.message_count !== undefined && (
        <Text style={styles.conversationMeta}>
          {conversation.message_count} message{conversation.message_count !== 1 ? 's' : ''}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderCharacterItem = ({ item }: { item: Character }) => {
    const isExpanded = expandedCharacters.has(item.id);
    const isLoadingConvs = loadingConversations.has(item.id);
    
    return (
      <View style={styles.characterCard}>
        <TouchableOpacity 
          style={styles.characterHeader}
          onPress={() => toggleCharacterExpansion(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.characterAvatar}>
            <Text style={styles.characterAvatarText}>
              {item.character_name ? item.character_name.charAt(0).toUpperCase() : 'C'}
            </Text>
          </View>
          <View style={styles.characterInfo}>
            <Text style={styles.characterName}>{item.character_name || 'Unnamed Character'}</Text>
            <Text style={styles.characterDescription} numberOfLines={2}>
              {item.character_system_prompt || 'No description available'}
            </Text>
          </View>
          <View style={styles.expandButton}>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#718096" 
            />
          </View>
        </TouchableOpacity>
        
        <View style={styles.characterMeta}>
          <View style={styles.characterMetaItem}>
            <Ionicons name="calendar" size={12} color="#718096" />
            <Text style={styles.characterMetaText}>
              {item.inserted_at ? new Date(item.inserted_at).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>
          {item.religion_category && (
            <View style={styles.characterMetaItem}>
              <Ionicons name="book" size={12} color="#718096" />
              <Text style={styles.characterMetaText}>{item.religion_category}</Text>
            </View>
          )}
          {item.religion_branch && (
            <View style={styles.characterMetaItem}>
              <Ionicons name="library" size={12} color="#718096" />
              <Text style={styles.characterMetaText}>{item.religion_branch}</Text>
            </View>
          )}
          <View style={styles.characterMetaItem}>
            <Ionicons 
              name={item.public ? "globe" : "lock-closed"} 
              size={12} 
              color={item.public ? "#27ae60" : "#718096"} 
            />
            <Text style={styles.characterMetaText}>
              {item.public ? 'Public' : 'Private'}
            </Text>
          </View>
          {!item.active && (
            <View style={styles.characterMetaItem}>
              <Ionicons name="pause-circle" size={12} color="#e74c3c" />
              <Text style={styles.characterMetaText}>Inactive</Text>
            </View>
          )}
        </View>

        {isExpanded && (
          <View style={styles.conversationsSection}>
            <View style={styles.conversationsHeader}>
              <Text style={styles.conversationsTitle}>Conversations</Text>
              <TouchableOpacity
                style={styles.newConversationButton}
                onPress={() => {
                  console.log('Start new conversation with character:', item.id);
                  // Navigate to new conversation
                  // router.push(`/conversation/new?characterId=${item.id}`);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="#667eea" />
                <Text style={styles.newConversationText}>New</Text>
              </TouchableOpacity>
            </View>
            
            {isLoadingConvs ? (
              <View style={styles.conversationsLoading}>
                <Text style={styles.loadingText}>Loading conversations...</Text>
              </View>
            ) : item.conversations && item.conversations.length > 0 ? (
              <View style={styles.conversationsList}>
                {item.conversations.map(conversation => 
                  renderConversationItem(conversation, item.id)
                )}
              </View>
            ) : (
              <View style={styles.emptyConversations}>
                <Ionicons name="chatbubbles-outline" size={24} color="#a0aec0" />
                <Text style={styles.emptyConversationsText}>
                  No conversations yet. Start chatting with {item.character_name}!
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="person-outline" size={48} color="#a0aec0" />
      <Text style={styles.emptyTitle}>No Characters Yet</Text>
      <Text style={styles.emptyDescription}>
        You haven't created any religious characters yet. Start by creating your first character!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your characters...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {totalCount} character{totalCount !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <FlatList
        data={characters}
        renderItem={renderCharacterItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        style={styles.flatList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 200,
  },
  header: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  characterCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  characterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  characterAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  characterDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  characterMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  characterMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  characterMetaText: {
    fontSize: 12,
    color: '#718096',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#718096',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  expandButton: {
    padding: 8,
  },
  conversationsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  conversationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  conversationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  newConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  newConversationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  conversationsLoading: {
    padding: 20,
    alignItems: 'center',
  },
  conversationsList: {
    gap: 8,
  },
  conversationItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3748',
    flex: 1,
    marginRight: 8,
  },
  conversationDate: {
    fontSize: 12,
    color: '#718096',
  },
  conversationMeta: {
    fontSize: 12,
    color: '#718096',
  },
  emptyConversations: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  emptyConversationsText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  flatList: {
    flex: 1,
  },
}); 