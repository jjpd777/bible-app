import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Religion = 
  | 'christianity' 
  | 'orthodoxChristianity' 
  | 'judaism' 
  | 'islam' 
  | 'hinduism' 
  | 'buddhism' 
  | 'atheism' 
  | 'sikhism';

interface ReligionContextType {
  religion: Religion;
  setReligion: (religion: Religion) => void;
  getReligionEmoji: () => string;
  getAllReligions: () => Array<{id: Religion, name: string, emoji: string}>;
  getPrayerPrompt: (language: string) => string;
}

// Religion emojis and display names
const religionData = {
  christianity: { name: '', emoji: '✝️' },
  orthodoxChristianity: { name: '', emoji: '☦️' },
  judaism: { name: '', emoji: '✡️' },
  islam: { name: '', emoji: '☪️' },
  hinduism: { name: '', emoji: '🕉️' },
  buddhism: { name: '', emoji: '☸️' },
  atheism: { name: '', emoji: '🧠' },
  sikhism: { name: '', emoji: '🪔' }
};

// Religion-specific prayer prompts
const religionPrayerPrompts = {
  christianity: `Write a short Christian prayer (approximately 120 words) that begins with 'Dear Lord' and is personalized to reflect the intentions and the person the prayer is for. Use first-person language if the user is praying for themselves, or third-person language if they are praying for someone else. Avoid overly formal or cliché phrases; the prayer should sound like a heartfelt, personal conversation with God. Incorporate at least one relevant Bible verse naturally, by speaking to how it relates to the intentions in the prayer, and at most two. The tone should be warm, sincere, and uplifting, rooted in Christian tradition and natural human language.`,
  
  orthodoxChristianity: `Write a short Orthodox Christian prayer (approximately 120 words) that begins with 'O Lord our God' and is personalized to reflect the intentions and the person the prayer is for. Use first-person language if the user is praying for themselves, or third-person language if they are praying for someone else. Avoid cliché phrases; the prayer should sound like a reverent, personal conversation with God. Incorporate at least one relevant Bible verse naturally, by speaking to how it relates to the intentions in the prayer, and at most two. The tone should be warm, sincere, and uplifting, rooted in Orthodox tradition and natural human language. End with "Through the prayers of our Holy Fathers, Lord Jesus Christ our God, have mercy on us."`,
  
  judaism: `Write a short Jewish prayer (approximately 120 words) that begins with 'Adonai, our God' and is personalized to reflect the intentions and the person the prayer is for. Use first-person language if the user is praying for themselves, or third-person language if they are praying for someone else. Avoid overly formal or cliché phrases; the prayer should sound like a heartfelt, personal conversation with Hashem. Incorporate at least one relevant Torah verse naturally, by speaking to how it relates to the intentions in the prayer, and at most two. The tone should be warm, sincere, and uplifting, rooted in Jewish tradition and natural human language. End with "Baruch Hashem" or "Amen."`,
  
  islam: `Write a short Islamic prayer (approximately 120 words) that begins with "Bismillah ir-Rahman ir-Rahim" and is personalized to reflect the intentions and the person the prayer is for. Use first-person language if the user is praying for themselves, or third-person language if they are praying for someone else. Avoid overly formal or cliché phrases; the prayer should sound like a heartfelt, personal conversation with Allah. Incorporate at least one relevant Quran verse naturally, by speaking to how it relates to the intentions in the prayer, and at most two. The tone should be warm, sincere, and uplifting, rooted in Islamic tradition and natural human language. End with "Ameen."`,
  
  hinduism: `Write a short Hindu prayer (approximately 120 words) that begins with an appropriate invocation (such as "Om Namah Shivaya" or "Om Namo Bhagavate Vasudevaya") and is personalized to reflect the intentions and the person the prayer is for. Use first-person language if the user is praying for themselves, or third-person language if they are praying for someone else. Avoid overly formal or cliché phrases; the prayer should sound like a heartfelt, personal conversation with the divine. Incorporate at least one relevant verse from Hindu scriptures naturally, by speaking to how it relates to the intentions in the prayer, and at most two. The tone should be warm, sincere, and uplifting, rooted in Hindu tradition and natural human language. End with "Om Shanti Shanti Shanti."`,
  
  buddhism: `Write a short Buddhist reflection (approximately 120 words) that begins with a mindful acknowledgment and is personalized to reflect the intentions and the person the reflection is for. Use first-person language if reflecting for oneself, or third-person language if for someone else. Avoid overly formal or cliché phrases; the reflection should sound like a heartfelt, mindful contemplation. Incorporate at least one relevant teaching from Buddhist sutras naturally, by speaking to how it relates to the intentions in the reflection, and at most two. The tone should be warm, sincere, and uplifting, rooted in Buddhist wisdom and natural human language. End with "May all beings be happy and free from suffering."`,
  
  atheism: `Write a short secular reflection (approximately 120 words) that begins with a thoughtful acknowledgment and is personalized to reflect the intentions and the person the reflection is for. Use first-person language if reflecting for oneself, or third-person language if for someone else. Avoid overly formal or cliché phrases; the reflection should sound like a heartfelt, rational contemplation. Incorporate at least one relevant quote from a philosopher, scientist, or humanist thinker naturally, by speaking to how it relates to the intentions in the reflection, and at most two. The tone should be warm, sincere, and uplifting, rooted in humanist values and natural human language.`,
  
  sikhism: `Write a short Sikh prayer (approximately 120 words) that begins with "Waheguru Ji" and is personalized to reflect the intentions and the person the prayer is for. Use first-person language if the user is praying for themselves, or third-person language if they are praying for someone else. Avoid overly formal or cliché phrases; the prayer should sound like a heartfelt, personal conversation with Waheguru. Incorporate at least one relevant verse from the Guru Granth Sahib naturally, by speaking to how it relates to the intentions in the prayer, and at most two. The tone should be warm, sincere, and uplifting, rooted in Sikh tradition and natural human language. End with "Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh."`,
};

const ReligionContext = createContext<ReligionContextType>({
  religion: 'christianity',
  setReligion: () => {},
  getReligionEmoji: () => '✝️',
  getAllReligions: () => [],
  getPrayerPrompt: () => '',
});

export const ReligionProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [religion, setReligionState] = useState<Religion>('christianity');

  // Load saved religion preference on mount
  useEffect(() => {
    const loadReligion = async () => {
      try {
        const savedReligion = await AsyncStorage.getItem('userReligion');
        if (savedReligion && Object.keys(religionData).includes(savedReligion)) {
          setReligionState(savedReligion as Religion);
        }
      } catch (error) {
        console.error('Error loading religion preference:', error);
      }
    };
    
    loadReligion();
  }, []);

  const setReligion = async (newReligion: Religion) => {
    setReligionState(newReligion);
    
    // Save religion preference
    try {
      await AsyncStorage.setItem('userReligion', newReligion);
    } catch (error) {
      console.error('Error saving religion preference:', error);
    }
  };

  const getReligionEmoji = (): string => {
    return religionData[religion].emoji;
  };

  const getAllReligions = () => {
    return Object.entries(religionData).map(([id, data]) => ({
      id: id as Religion,
      name: data.name,
      emoji: data.emoji
    }));
  };

  const getPrayerPrompt = (language: string): string => {
    const religionSpecificPrompt = religionPrayerPrompts[religion] || '';
    
    const languagePrompt = language !== 'en' 
      ? `Output the prayer in ${language === 'es' ? 'Spanish' : 
          language === 'hi' ? 'Hindi' : 
          language === 'pt' ? 'Portuguese' : 'English'}.` 
      : '';

    return `${religionSpecificPrompt}\n\n${languagePrompt}`;
  };

  return (
    <ReligionContext.Provider value={{ 
      religion, 
      setReligion,
      getReligionEmoji,
      getAllReligions,
      getPrayerPrompt
    }}>
      {children}
    </ReligionContext.Provider>
  );
};

export const useReligion = () => useContext(ReligionContext);