import { createContext, useContext, useState, useEffect } from 'react';
import { Audio } from 'expo-av';

type VerseAudioContextType = {
  isPlaying: boolean;
  playVerse: (audioFile: number) => Promise<void>;
  pauseVerse: () => Promise<void>;
  getPosition: () => Promise<number>;
};

const VerseAudioContext = createContext<VerseAudioContextType | undefined>(undefined);

export function VerseAudioProvider({ children }: { children: React.ReactNode }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playVerse = async (audioFile: number) => {
    try {
      if (sound) {
        await sound.playAsync();
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(audioFile);
        setSound(newSound);
        await newSound.playAsync();
      }
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing verse:', error);
    }
  };

  const pauseVerse = async () => {
    try {
      if (sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error pausing verse:', error);
    }
  };

  const getPosition = async () => {
    if (sound) {
      const status = await sound.getStatusAsync();
      return status.positionMillis;
    }
    return 0;
  };

  return (
    <VerseAudioContext.Provider
      value={{
        isPlaying,
        playVerse,
        pauseVerse,
        getPosition,
      }}
    >
      {children}
    </VerseAudioContext.Provider>
  );
}

export const useVerseAudio = () => {
  const context = useContext(VerseAudioContext);
  if (context === undefined) {
    throw new Error('useVerseAudio must be used within a VerseAudioProvider');
  }
  return context;
};
