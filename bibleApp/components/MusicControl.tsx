import { TouchableOpacity, StyleSheet, View, Text, Animated } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '@/contexts/AudioContext';

export function MusicControl() {
  const [showMenu, setShowMenu] = useState(false);
  const { isPlaying, togglePlayPause, playNextTrack, currentTrackIndex } = useAudio();

  return (
    <View>
      <TouchableOpacity 
        style={styles.container} 
        onPress={() => setShowMenu(!showMenu)}
      >
        <Ionicons 
          name={isPlaying ? "musical-note" : "musical-note-outline"} 
          size={24} 
          color="#666"
        />
      </TouchableOpacity>

      {showMenu && (
        <View style={styles.menu}>
          <Text style={styles.title}>Now Playing</Text>
          
          <Text style={styles.trackInfo}>
            Track {currentTrackIndex + 1}
          </Text>

          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={togglePlayPause}
            >
              <Ionicons 
                name={isPlaying ? "pause-circle" : "play-circle"} 
                size={32} 
                color="#666" 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={playNextTrack}
            >
              <Ionicons 
                name="play-skip-forward-circle" 
                size={32} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  menu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  menuItem: {
    padding: 8,
    borderRadius: 20,
  },
  trackInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
});
