import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'es' | 'hi' | 'pt';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Prayer Tracker Screen
    'days_sharing': 'Days Sharing',
    'total_shared': 'Total Shared',
    'generate': 'Generate',
    'prayer_for': 'Prayer For',
    'intention': 'Intention',
    'instructions': 'Instructions',
    'generate_prayer': 'Generate Prayer',
    'saved_prayers': 'Saved Prayers',
    'start_onboarding': 'Start Onboarding',
    
    // Prayer Voice Screen
    'generating_prayer': 'Generating prayer...',
    'could_not_load': 'Could not load prayer',
    'back': 'Back',
    'generated_prayer': 'Generated Prayer',
    'prayer': 'Prayer',
    'generating_audio': 'Generating audio...',
    'close': 'Close',
    'share': 'Share',
    'what_to_share': 'What would you like to share?',
    'ai_prayer': 'AI Prayer',
    'your_recording': 'Your Recording',
    'saved_items': 'Bookmarked Items',
    'no_saved_items': 'No bookmarked items yet',
    'verse': 'Verse',
    'select_intentions': 'Select Prayer Intentions',
    
    // Predefined options
    'myself': 'Myself',
    'mother': 'Mother',
    'father': 'Father',
    'siblings': 'Siblings',
    'love': 'Love',
    'friends': 'Friends',
    'health': 'Health',
    'abundance': 'Abundance',
    'humanity': 'Humanity',
    'enemies': 'Enemies',
    'sinners': 'Sinners',
    'lonely': 'Lonely',
    'finance': 'Finance',
    'success': 'Success',
    'holy_scripture': 'Holy Scripture Passage',
  },
  es: {
    // Prayer Tracker Screen
    'days_sharing': 'Días compartiendo',
    'total_shared': 'Total compartido',
    'generate': 'Generar',
    'prayer_for': 'Oración Para',
    'intention': 'Intención',
    'instructions': 'Instrucciones',
    'generate_prayer': 'Generar oración',
    'saved_prayers': 'Oraciones Guardadas',
    'start_onboarding': 'Iniciar Configuración',
    
    // Prayer Voice Screen
    'generating_prayer': 'Generando oración...',
    'could_not_load': 'No se pudo cargar la oración',
    'back': 'Volver',
    'generated_prayer': 'Oración Generada',
    'prayer': 'Oración',
    'generating_audio': 'Generando audio...',
    'close': 'Cerrar',
    'share': 'Compartir',
    'what_to_share': '¿Qué deseas compartir?',
    'ai_prayer': 'Oración de I.A.',
    'your_recording': 'Grabación tuya',
    'saved_items': 'Elementos Guardados',
    'no_saved_items': 'Aún no hay elementos guardados',
    'verse': 'Versículo',
    'select_intentions': 'Seleccionar Intenciones de Oración',
    
    // Predefined options
    'myself': 'Yo mismo',
    'mother': 'Madre',
    'father': 'Padre',
    'siblings': 'Hermanos',
    'love': 'Amor',
    'friends': 'Amigos',
    'health': 'Salud',
    'abundance': 'Abundancia',
    'humanity': 'Humanidad',
    'enemies': 'Enemigos',
    'sinners': 'Pecadores',
    'lonely': 'Solitarios',
    'finance': 'Finanzas',
    'success': 'Éxito',
    'holy_scripture': 'Escrituras',
  },
  hi: {
    // Prayer Tracker Screen
    'days_sharing': 'साझा करने के दिन',
    'total_shared': 'कुल साझा किया गया',
    'generate': 'उत्पन्न करें',
    'prayer_for': 'प्रार्थना किसके लिए',
    'intention': 'इरादा',
    'instructions': 'निर्देश',
    'generate_prayer': 'प्रार्थना उत्पन्न करें',
    'saved_prayers': 'सहेजी गई प्रार्थनाएँ',
    'start_onboarding': 'ऑनबोर्डिंग शुरू करें',
    
    // Prayer Voice Screen
    'generating_prayer': 'प्रार्थना उत्पन्न हो रही है...',
    'could_not_load': 'प्रार्थना लोड नहीं हो सकी',
    'back': 'वापस',
    'generated_prayer': 'उत्पन्न प्रार्थना',
    'prayer': 'प्रार्थना',
    'generating_audio': 'ऑडियो उत्पन्न हो रहा है...',
    'close': 'बंद करें',
    'share': 'साझा करें',
    'what_to_share': 'आप क्या साझा करना चाहेंगे?',
    'ai_prayer': 'एआई प्रार्थना',
    'your_recording': 'आपकी रिकॉर्डिंग',
    'saved_items': 'बुकमार्क किए गए आइटम',
    'no_saved_items': 'अभी तक कोई बुकमार्क नहीं',
    'verse': 'श्लोक',
    'select_intentions': 'प्रार्थना के इरादे चुनें',
    
    // Predefined options
    'myself': 'स्वयं',
    'mother': 'माता',
    'father': 'पिता',
    'siblings': 'भाई-बहन',
    'love': 'प्रेम',
    'friends': 'मित्र',
    'health': 'स्वास्थ्य',
    'abundance': 'समृद्धि',
    'humanity': 'मानवता',
    'enemies': 'शत्रु',
    'sinners': 'पापी',
    'lonely': 'अकेले लोग',
    'finance': 'वित्त',
    'success': 'सफलता',
    'holy_scripture': 'पवित्र शास्त्र का अंश',
  },
  pt: {
    // Prayer Tracker Screen
    'days_sharing': 'Dias Compartilhando',
    'total_shared': 'Total Compartilhado',
    'generate': 'Gerar',
    'prayer_for': 'Oração Para',
    'intention': 'Intenção',
    'instructions': 'Instruções',
    'generate_prayer': 'Gerar Oração',
    'saved_prayers': 'Orações Salvas',
    'start_onboarding': 'Iniciar Integração',
    
    // Prayer Voice Screen
    'generating_prayer': 'Gerando oração...',
    'could_not_load': 'Não foi possível carregar a oração',
    'back': 'Voltar',
    'generated_prayer': 'Oração Gerada',
    'prayer': 'Oração',
    'generating_audio': 'Gerando áudio...',
    'close': 'Fechar',
    'share': 'Compartilhar',
    'what_to_share': 'O que você gostaria de compartilhar?',
    'ai_prayer': 'Oração de IA',
    'your_recording': 'Sua Gravação',
    'saved_items': 'Itens Salvos',
    'no_saved_items': 'Nenhum item salvo ainda',
    'verse': 'Versículo',
    'select_intentions': 'Selecionar Intenções de Oração',
    
    // Predefined options
    'myself': 'Eu mesmo',
    'mother': 'Mãe',
    'father': 'Pai',
    'siblings': 'Irmãos',
    'love': 'Amor',
    'friends': 'Amigos',
    'health': 'Saúde',
    'abundance': 'Abundância',
    'humanity': 'Humanidade',
    'enemies': 'Inimigos',
    'sinners': 'Pecadores',
    'lonely': 'Solitários',
    'finance': 'Finanças',
    'success': 'Sucesso',
    'holy_scripture': 'Passagem das Sagradas Escrituras',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('es');

  // Load saved language preference on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('appLanguage');
        if (savedLanguage === 'en' || savedLanguage === 'es' || savedLanguage === 'hi' || savedLanguage === 'pt') {
          setLanguage(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    };
    
    loadLanguage();
  }, []);

  const toggleLanguage = async () => {
    // Cycle through languages: en -> es -> hi -> pt -> en
    let newLanguage: Language;
    switch (language) {
      case 'en': newLanguage = 'es'; break;
      case 'es': newLanguage = 'hi'; break;
      case 'hi': newLanguage = 'pt'; break;
      case 'pt': newLanguage = 'en'; break;
      default: newLanguage = 'en';
    }
    
    setLanguage(newLanguage);
    
    // Save language preference
    try {
      await AsyncStorage.setItem('appLanguage', newLanguage);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };
  
  // Add a new function to set language directly
  const setAppLanguage = async (newLanguage: Language) => {
    setLanguage(newLanguage);
    
    // Save language preference
    try {
      await AsyncStorage.setItem('appLanguage', newLanguage);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      toggleLanguage, 
      setLanguage: setAppLanguage, // Add this new function to the context
      t 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);