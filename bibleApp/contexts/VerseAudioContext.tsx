import { createContext, useContext, useState, useEffect } from 'react';
import { Audio } from 'expo-av';

type VerseAudioContextType = {
  isPlaying: boolean;
  playVerse: (audioFile: number) => Promise<void>;
  stopVerse: () => Promise<void>;
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
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        audioFile,
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing verse audio:', error);
      setIsPlaying(false);
    }
  };

  const stopVerse = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error stopping verse audio:', error);
    }
  };

  return (
    <VerseAudioContext.Provider
      value={{
        isPlaying,
        playVerse,
        stopVerse,
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
