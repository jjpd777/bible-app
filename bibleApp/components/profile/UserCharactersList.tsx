import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
}

interface UserCharactersListProps {
  characters: Character[];
  loading: boolean;
  onCharacterSelect?: (character: Character) => void;
  onRefresh?: () => void;
}

export const UserCharactersList: React.FC<UserCharactersListProps> = ({
  characters,
  loading,
  onCharacterSelect,
  onRefresh
}) => {
  const renderCharacterItem = ({ item }: { item: Character }) => {
    return (
      <TouchableOpacity 
        style={styles.characterCard}
        onPress={() => onCharacterSelect?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.characterHeader}>
          <View style={styles.characterAvatar}>
            <Text style={styles.characterAvatarText}>
              {item.character_name ? item.character_name.charAt(0).toUpperCase() : 'C'}
            </Text>
          </View>
          <View style={styles.characterInfo}>
            <Text style={styles.characterName}>{item.character_name || 'Unnamed Character'}</Text>
            <Text style={styles.characterDescription} numberOfLines={2}>
              {item.religion_category && item.religion_branch 
                ? `${item.religion_category} - ${item.religion_branch}`
                : item.religion_category || 'Religious Character'
              }
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#a0aec0" />
        </View>
        
        <View style={styles.characterMeta}>
          <View style={styles.characterMetaItem}>
            <Ionicons name="calendar" size={10} color="#718096" />
            <Text style={styles.characterMetaText}>
              {item.inserted_at ? new Date(item.inserted_at).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>
          <View style={styles.characterMetaItem}>
            <Ionicons 
              name={item.public ? "globe" : "lock-closed"} 
              size={10} 
              color={item.public ? "#27ae60" : "#718096"} 
            />
            <Text style={styles.characterMetaText}>
              {item.public ? 'Public' : 'Private'}
            </Text>
          </View>
          <View style={styles.characterMetaItem}>
            <Ionicons 
              name={item.active ? "checkmark-circle" : "pause-circle"} 
              size={10} 
              color={item.active ? "#27ae60" : "#e74c3c"} 
            />
            <Text style={styles.characterMetaText}>
              {item.active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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
        <Text style={styles.loadingText}>Loading characters...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {characters.length} character{characters.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <FlatList
        data={characters}
        renderItem={renderCharacterItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        style={styles.flatList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxHeight: 400,
  },
  header: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#718096',
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  characterCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
    marginBottom: 8,
  },
  characterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  characterAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 2,
  },
  characterDescription: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
  },
  characterMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characterMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  characterMetaText: {
    fontSize: 10,
    color: '#718096',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    minHeight: 100,
  },
  loadingFooter: {
    padding: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#718096',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 16,
  },
  flatList: {
    flex: 1,
  },
}); 