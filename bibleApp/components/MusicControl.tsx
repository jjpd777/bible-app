import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '@/contexts/AudioContext';

export function MusicControl() {
  console.log('MusicControl rendering');
  const { isPlaying, togglePlayPause, currentTrackIndex } = useAudio();

  return (
    <View>
      <TouchableOpacity 
        style={styles.container} 
        onPress={() => {
          console.log('Music button pressed');
          togglePlayPause();
        }}
      >
        <Ionicons 
          name={isPlaying ? "musical-note" : "musical-note-outline"} 
          size={24} 
          color="#666"
        />
      </TouchableOpacity>
      <Text style={styles.trackInfo}>
        Track {currentTrackIndex + 1}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trackInfo: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});
