import { createContext, useContext, useState } from 'react';
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

  const playSound = async (trackIndex: number) => {
    try {
      console.log('Attempting to play sound:', { trackIndex });
      
      if (sound) {
        console.log('Unloading existing sound');
        await sound.unloadAsync();
      }

      console.log('Creating new sound with track:', AUDIO_TRACKS[trackIndex]);
      const { sound: newSound } = await Audio.Sound.createAsync(AUDIO_TRACKS[trackIndex], {
        isLooping: false,
        volume: 0.5,
      });
      
      console.log('Sound created successfully');
      setSound(newSound);
      
      console.log('Playing sound');
      await newSound.playAsync();
      setIsPlaying(true);
      console.log('Sound playing status:', { isPlaying: true });

      newSound.setOnPlaybackStatusUpdate(async (status) => {
        console.log('Playback status update:', status);
        if (status.didJustFinish) {
          console.log('Track finished, playing next');
          await playNextTrack();
        }
      });
    } catch (error) {
      console.error('Error in playSound:', error);
    }
  };

  const togglePlayPause = async () => {
    try {
      console.log('Toggle play/pause called:', { isPlaying, currentTrackIndex });
      
      if (!sound) {
        console.log('No sound loaded, playing new track');
        await playSound(currentTrackIndex);
      } else {
        if (isPlaying) {
          console.log('Pausing sound');
          await sound.pauseAsync();
        } else {
          console.log('Resuming sound');
          await sound.playAsync();
        }
        setIsPlaying(!isPlaying);
        console.log('New playing status:', { isPlaying: !isPlaying });
      }
    } catch (error) {
      console.error('Error in togglePlayPause:', error);
    }
  };

  const playNextTrack = async () => {
    try {
      console.log('Playing next track');
      const nextIndex = (currentTrackIndex + 1) % AUDIO_TRACKS.length;
      console.log('Next track index:', nextIndex);
      setCurrentTrackIndex(nextIndex);
      await playSound(nextIndex);
    } catch (error) {
      console.error('Error in playNextTrack:', error);
    }
  };

  console.log('AudioProvider mounted', {
    tracksAvailable: AUDIO_TRACKS.length,
    currentTrackIndex,
    isPlaying
  });

  return (
    <AudioContext.Provider value={{ isPlaying, currentTrackIndex, togglePlayPause, playNextTrack }}>
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
