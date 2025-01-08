import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function PlayerScreen() {
  const { duration } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{duration} Minute Bible Reading</Text>
      
      <View style={styles.playerContainer}>
        <TouchableOpacity style={styles.playButton}>
          <Ionicons name="play" size={50} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.timeText}>00:00 / {duration}:00</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 50,
    textAlign: 'center',
  },
  playerContainer: {
    alignItems: 'center',
    gap: 30,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '500',
  },
});
