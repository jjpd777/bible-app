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
  christianity: { name: 'Christianity', emoji: '✝️' },
  orthodoxChristianity: { name: 'Orthodox Christianity', emoji: '☦️' },
  judaism: { name: 'Judaism', emoji: '✡️' },
  islam: { name: 'Islam', emoji: '☪️' },
  hinduism: { name: 'Hinduism', emoji: '🕉️' },
  buddhism: { name: 'Buddhism', emoji: '☸️' },
  atheism: { name: 'Atheism', emoji: '🧠' },
  sikhism: { name: 'Sikhism', emoji: '🪔' }
};

// Religion-specific prayer prompts
const religionPrayerPrompts = {
  christianity: `Include Christian themes of grace, redemption, and the teachings of Jesus Christ. Reference the Bible, particularly the New Testament. Address the prayer to God, Jesus, or the Holy Spirit as appropriate. End with "In Jesus' name, Amen" or a similar Christian closing.`,
  
  orthodoxChristianity: `Include Orthodox Christian themes with emphasis on tradition, liturgy, and the communion of saints. Reference the Bible and Orthodox teachings. Address prayers to the Holy Trinity, Jesus Christ, the Theotokos (Mary), or specific saints. Use more formal, reverent language. End with "Through the prayers of our Holy Fathers, Lord Jesus Christ our God, have mercy on us and save us. Amen."`,
  
  judaism: `Include Jewish themes of covenant, community, and ethical living. Reference the Torah, Tanakh, or Talmudic wisdom. Address prayers to Hashem, Adonai, or simply God. Avoid any references to Jesus or Christian concepts. Consider including Hebrew terms where appropriate. End with "Baruch Hashem" (Blessed is God) or "Amen."`,
  
  islam: `Include Islamic themes of submission to Allah, the oneness of God (Tawhid), and following the straight path. Reference the Quran and teachings of Prophet Muhammad (peace be upon him). Address prayers to Allah. Include phrases like "Insha'Allah" (if God wills) and "Alhamdulillah" (praise be to God) where appropriate. Begin with "Bismillah ir-Rahman ir-Rahim" (In the name of God, the Most Gracious, the Most Merciful) and end with "Ameen."`,
  
  hinduism: `Include Hindu themes of dharma (duty/righteousness), karma, and the divine nature within all beings. Reference the Bhagavad Gita, Upanishads, or other Hindu scriptures. Address prayers to specific deities as appropriate (Vishnu, Shiva, Ganesh, etc.) or to the universal Brahman. Include concepts like inner peace, harmony with nature, and spiritual growth. End with "Om Shanti Shanti Shanti" or "Hari Om."`,
  
  buddhism: `Include Buddhist themes of mindfulness, compassion, impermanence, and the cessation of suffering. Reference the Dhammapada, Sutras, or Buddha's teachings. Focus on wisdom and compassion rather than divine intervention. Avoid references to a creator deity. Include concepts of loving-kindness (metta) and the path to enlightenment. End with "May all beings be happy and free from suffering."`,
  
  atheism: `Create a secular reflection rather than a prayer. Focus on human connection, natural wonder, rational thought, and finding meaning without supernatural elements. Instead of divine references, emphasize human potential, scientific understanding, and ethical principles. Address the reflection to the person or community rather than to a deity. End with an affirmation of human resilience or community.`,
  
  sikhism: `Include Sikh themes of equality, service to others (seva), and remembrance of God (naam japna). Reference the Guru Granth Sahib. Address prayers to Waheguru (the Wonderful Teacher). Include concepts of truthful living, community service, and the oneness of humanity. Begin with "Ik Onkar" (There is One God) and end with "Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh" (The Khalsa belongs to God, Victory belongs to God).`
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
    const generalPrompt = `Purpose: Create a prayer (around 110 words) based on up to three parameters: who the prayer is for, the prayer intentions, and any additional instructions. Any, all, or none of these parameters may be provided.

Tone and Atmosphere: The prayer should be warm, hopeful, and natural—something a real person would say. Avoid language that is overly formal or just a collection of vague spiritual phrases or clichés. At the same time, it should not be overly casual or conversational.

Content: Include one, and only one, quote of a key verse of the main scripture of that religion that relates to the prayer intentions of the person. The verse should not just be referenced but should naturally reflect on its meaning and message, applying it to the person's situation, offering comfort, encouragement, or wisdom.

If the prayer mentions difficulties, it should acknowledge the real challenges of life and faith while maintaining a tone of trust and hope rather than despair.`;

    const religionSpecificPrompt = religionPrayerPrompts[religion] || '';
    
    const languagePrompt = language !== 'en' 
      ? `Output the prayer in ${language === 'es' ? 'Spanish' : 
          language === 'hi' ? 'Hindi' : 
          language === 'pt' ? 'Portuguese' : 'English'}.` 
      : '';

    return `${generalPrompt}\n\n${religionSpecificPrompt}\n\n${languagePrompt}`;
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