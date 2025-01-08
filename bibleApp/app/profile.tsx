import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';

const ProfileOption = ({ icon, title, onPress }: { icon: string; title: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.option} onPress={onPress}>
    <Ionicons name={icon as any} size={24} color="#666" />
    <ThemedText style={styles.optionText}>{title}</ThemedText>
    <Ionicons name="chevron-forward" size={24} color="#666" />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#666" />
        </View>
        <ThemedText style={styles.name}>User Name</ThemedText>
        <ThemedText style={styles.email}>user@example.com</ThemedText>
      </View>

      {/* Profile Options */}
      <View style={styles.optionsContainer}>
        <ProfileOption
          icon="person-outline"
          title="Account Settings"
          onPress={() => console.log('Account Settings')}
        />
        <ProfileOption
          icon="notifications-outline"
          title="Notifications"
          onPress={() => console.log('Notifications')}
        />
        <ProfileOption
          icon="bookmark-outline"
          title="Saved Verses"
          onPress={() => console.log('Saved Verses')}
        />
        <ProfileOption
          icon="settings-outline"
          title="App Settings"
          onPress={() => console.log('App Settings')}
        />
        <ProfileOption
          icon="help-circle-outline"
          title="Help & Support"
          onPress={() => console.log('Help & Support')}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  optionsContainer: {
    padding: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
  },
});
