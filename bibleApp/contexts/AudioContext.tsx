import { createContext, useContext, useState, useEffect } from 'react';
import { Audio } from 'expo-av';

type AudioContextType = {
  isPlaying: boolean;
  currentTrackIndex: number;
  togglePlayPause: () => Promise<void>;
  playNextTrack: () => Promise<void>;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const AUDIO_TRACKS = [
  require('../assets/audio/track1.mp3'),
  require('../assets/audio/track2.mp3'),
  require('../assets/audio/track3.mp3'),
];

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize audio session
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        // Load the first track
        await loadSound(0);
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };

    setupAudio();

    // Cleanup
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadSound = async (trackIndex: number) => {
    try {
      setIsLoading(true);
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        AUDIO_TRACKS[trackIndex],
        { isLooping: false, volume: 0.5 },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setCurrentTrackIndex(trackIndex);
      setIsLoading(false);
      return newSound;
    } catch (error) {
      console.error('Error loading sound:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const onPlaybackStatusUpdate = async (status: any) => {
    if (status.didJustFinish) {
      await playNextTrack();
    }
  };

  const togglePlayPause = async () => {
    try {
      if (isLoading) return;

      if (!sound) {
        const newSound = await loadSound(currentTrackIndex);
        await newSound.playAsync();
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
        setIsPlaying(!isPlaying);
      }
    } catch (error) {
      console.error('Error in togglePlayPause:', error);
    }
  };

  const playNextTrack = async () => {
    try {
      if (isLoading) return;

      const nextIndex = (currentTrackIndex + 1) % AUDIO_TRACKS.length;
      const newSound = await loadSound(nextIndex);
      await newSound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error in playNextTrack:', error);
    }
  };

  return (
    <AudioContext.Provider value={{ 
      isPlaying, 
      currentTrackIndex, 
      togglePlayPause, 
      playNextTrack 
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
