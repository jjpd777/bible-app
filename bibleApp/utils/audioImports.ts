import { Platform } from 'react-native';

// Old Testament Audio Files
const OLD_TESTAMENT_AUDIO = {
  'SAL023': require('../assets/bible/verses_audio/old_testament/19_Sal023.mp3'),
  'SAL034': require('../assets/bible/verses_audio/old_testament/19_Sal034.mp3'),
  'SAL046': require('../assets/bible/verses_audio/old_testament/19_Sal046.mp3'),
  'ISA026': require('../assets/bible/verses_audio/old_testament/23_Isa026.mp3'),
  'ISA041': require('../assets/bible/verses_audio/old_testament/23_Isa041.mp3'),
};

// New Testament Audio Files
const NEW_TESTAMENT_AUDIO = {
  'MAT011': require('../assets/bible/verses_audio/new_testament/40_Mat011.mp3'),
  'JUAN014': require('../assets/bible/verses_audio/new_testament/43_Juan014.mp3'),
  'JUAN016': require('../assets/bible/verses_audio/new_testament/43_Juan016.mp3'),
  'ROM008': require('../assets/bible/verses_audio/new_testament/45_Rom008.mp3'),
  'FIL004': require('../assets/bible/verses_audio/new_testament/50_Fil004.mp3'),
};

// Combine both testaments
export const VERSE_AUDIO_FILES = {
  ...OLD_TESTAMENT_AUDIO,
  ...NEW_TESTAMENT_AUDIO
} as const;

// Type for the audio file keys
export type AudioFileKey = keyof typeof VERSE_AUDIO_FILES;
