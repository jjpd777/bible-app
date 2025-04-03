import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the supported languages
export type SupportedLanguage = 'en' | 'es' | 'hi' | 'pt' | 'id' | 'fr' | 'de' | 'ar' | 'la';

interface LanguageContextType {
  language: SupportedLanguage;
  toggleLanguage: () => void;
  setLanguage: (lang: SupportedLanguage) => void;
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
    'select_intentions': 'Prayer Intentions',
    
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
    'select_intentions': 'Seleccionar Intenciones',
    
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
    'select_intentions': 'Intenções de Oração',
    
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
  },
  id: {
    // Prayer Tracker Screen
    'days_sharing': 'Hari Berbagi',
    'total_shared': 'Total Dibagikan',
    'generate': 'Buat',
    'prayer_for': 'Doa Untuk',
    'intention': 'Niat',
    'instructions': 'Petunjuk',
    'generate_prayer': 'Buat Doa',
    'saved_prayers': 'Doa Tersimpan',
    'start_onboarding': 'Mulai Pengenalan',
    
    // Prayer Voice Screen
    'generating_prayer': 'Membuat doa...',
    'could_not_load': 'Tidak dapat memuat doa',
    'back': 'Kembali',
    'generated_prayer': 'Doa yang Dibuat',
    'prayer': 'Doa',
    'generating_audio': 'Membuat audio...',
    'close': 'Tutup',
    'share': 'Bagikan',
    'what_to_share': 'Apa yang ingin Anda bagikan?',
    'ai_prayer': 'Doa AI',
    'your_recording': 'Rekaman Anda',
    'saved_items': 'Item Tersimpan',
    'no_saved_items': 'Belum ada item tersimpan',
    'verse': 'Ayat',
    'select_intentions': 'Pilih Niat Doa',
    
    // Predefined options
    'myself': 'Diri Sendiri',
    'mother': 'Ibu',
    'father': 'Ayah',
    'siblings': 'Saudara',
    'love': 'Cinta',
    'friends': 'Teman',
    'health': 'Kesehatan',
    'abundance': 'Kelimpahan',
    'humanity': 'Kemanusiaan',
    'enemies': 'Musuh',
    'sinners': 'Pendosa',
    'lonely': 'Kesepian',
    'finance': 'Keuangan',
    'success': 'Kesuksesan',
    'holy_scripture': 'Kutipan Kitab Suci',
  },
  fr: {
    // Prayer Tracker Screen
    'days_sharing': 'Jours de Partage',
    'total_shared': 'Total Partagé',
    'generate': 'Générer',
    'prayer_for': 'Prière Pour',
    'intention': 'Intention',
    'instructions': 'Instructions',
    'generate_prayer': 'Générer une Prière',
    'saved_prayers': 'Prières Sauvegardées',
    'start_onboarding': 'Commencer l\'Intégration',
    
    // Prayer Voice Screen
    'generating_prayer': 'Génération de la prière...',
    'could_not_load': 'Impossible de charger la prière',
    'back': 'Retour',
    'generated_prayer': 'Prière Générée',
    'prayer': 'Prière',
    'generating_audio': 'Génération de l\'audio...',
    'close': 'Fermer',
    'share': 'Partager',
    'what_to_share': 'Que souhaitez-vous partager?',
    'ai_prayer': 'Prière IA',
    'your_recording': 'Votre Enregistrement',
    'saved_items': 'Éléments Sauvegardés',
    'no_saved_items': 'Aucun élément sauvegardé',
    'verse': 'Verset',
    'select_intentions': 'Intentions de Prière',
    
    // Predefined options
    'myself': 'Moi-même',
    'mother': 'Mère',
    'father': 'Père',
    'siblings': 'Frères et Sœurs',
    'love': 'Amour',
    'friends': 'Amis',
    'health': 'Santé',
    'abundance': 'Abondance',
    'humanity': 'Humanité',
    'enemies': 'Ennemis',
    'sinners': 'Pécheurs',
    'lonely': 'Personnes Seules',
    'finance': 'Finances',
    'success': 'Succès',
    'holy_scripture': 'Passage des Saintes Écritures',
  },
  de: {
    // Prayer Tracker Screen
    'days_sharing': 'Tage des Teilens',
    'total_shared': 'Insgesamt geteilt',
    'generate': 'Generieren',
    'prayer_for': 'Gebet für',
    'intention': 'Intention',
    'instructions': 'Anweisungen',
    'generate_prayer': 'Gebet generieren',
    'saved_prayers': 'Gespeicherte Gebete',
    'start_onboarding': 'Einführung starten',
    
    // Prayer Voice Screen
    'generating_prayer': 'Gebet wird generiert...',
    'could_not_load': 'Gebet konnte nicht geladen werden',
    'back': 'Zurück',
    'generated_prayer': 'Generiertes Gebet',
    'prayer': 'Gebet',
    'generating_audio': 'Audio wird generiert...',
    'close': 'Schließen',
    'share': 'Teilen',
    'what_to_share': 'Was möchten Sie teilen?',
    'ai_prayer': 'KI-Gebet',
    'your_recording': 'Ihre Aufnahme',
    'saved_items': 'Gespeicherte Elemente',
    'no_saved_items': 'Noch keine gespeicherten Elemente',
    'verse': 'Vers',
    'select_intentions': 'Gebetsanliegen',
    
    // Predefined options
    'myself': 'Mich selbst',
    'mother': 'Mutter',
    'father': 'Vater',
    'siblings': 'Geschwister',
    'love': 'Liebe',
    'friends': 'Freunde',
    'health': 'Gesundheit',
    'abundance': 'Fülle',
    'humanity': 'Menschheit',
    'enemies': 'Feinde',
    'sinners': 'Sünder',
    'lonely': 'Einsame',
    'finance': 'Finanzen',
    'success': 'Erfolg',
    'holy_scripture': 'Heilige Schrift Passage',
  },
  ar: {
    // Prayer Tracker Screen
    'days_sharing': 'أيام المشاركة',
    'total_shared': 'إجمالي المشاركات',
    'generate': 'إنشاء',
    'prayer_for': 'صلاة من أجل',
    'intention': 'النية',
    'instructions': 'تعليمات',
    'generate_prayer': 'إنشاء صلاة',
    'saved_prayers': 'الصلوات المحفوظة',
    'start_onboarding': 'بدء التعريف',
    
    // Prayer Voice Screen
    'generating_prayer': 'جاري إنشاء الصلاة...',
    'could_not_load': 'تعذر تحميل الصلاة',
    'back': 'رجوع',
    'generated_prayer': 'الصلاة المنشأة',
    'prayer': 'صلاة',
    'generating_audio': 'جاري إنشاء الصوت...',
    'close': 'إغلاق',
    'share': 'مشاركة',
    'what_to_share': 'ماذا تريد أن تشارك؟',
    'ai_prayer': 'صلاة الذكاء الاصطناعي',
    'your_recording': 'تسجيلك',
    'saved_items': 'العناصر المحفوظة',
    'no_saved_items': 'لا توجد عناصر محفوظة بعد',
    'verse': 'آية',
    'select_intentions': 'نوايا الصلاة',
    
    // Predefined options
    'myself': 'نفسي',
    'mother': 'الأم',
    'father': 'الأب',
    'siblings': 'الإخوة',
    'love': 'الحب',
    'friends': 'الأصدقاء',
    'health': 'الصحة',
    'abundance': 'الوفرة',
    'humanity': 'الإنسانية',
    'enemies': 'الأعداء',
    'sinners': 'الخاطئين',
    'lonely': 'الوحيدين',
    'finance': 'المال',
    'success': 'النجاح',
    'holy_scripture': 'مقطع من الكتاب المقدس',
  },
  la: {
    // Prayer Tracker Screen
    'days_sharing': 'Dies Communicationis',
    'total_shared': 'Summa Communicata',
    'generate': 'Generare',
    'prayer_for': 'Oratio Pro',
    'intention': 'Intentio',
    'instructions': 'Instructiones',
    'generate_prayer': 'Generare Orationem',
    'saved_prayers': 'Orationes Servatae',
    'start_onboarding': 'Incipere Inductionem',
    
    // Prayer Voice Screen
    'generating_prayer': 'Generans orationem...',
    'could_not_load': 'Non potuit onerare orationem',
    'back': 'Retro',
    'generated_prayer': 'Oratio Generata',
    'prayer': 'Oratio',
    'generating_audio': 'Generans sonum...',
    'close': 'Claudere',
    'share': 'Communicare',
    'what_to_share': 'Quid vis communicare?',
    'ai_prayer': 'Oratio Intelligentiae Artificialis',
    'your_recording': 'Tua Registratio',
    'saved_items': 'Res Servatae',
    'no_saved_items': 'Nullae res servatae adhuc',
    'verse': 'Versus',
    'select_intentions': 'Intentiones Orationis',
    
    // Predefined options
    'myself': 'Me ipsum',
    'mother': 'Mater',
    'father': 'Pater',
    'siblings': 'Fratres et sorores',
    'love': 'Amor',
    'friends': 'Amici',
    'health': 'Sanitas',
    'abundance': 'Abundantia',
    'humanity': 'Humanitas',
    'enemies': 'Inimici',
    'sinners': 'Peccatores',
    'lonely': 'Solitarii',
    'finance': 'Pecunia',
    'success': 'Successus',
    'holy_scripture': 'Scriptura Sacra',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  // Load saved language preference on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('appLanguage');
        if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
          setLanguage(savedLanguage as SupportedLanguage);
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    };
    
    loadLanguage();
  }, []);

  const toggleLanguage = async () => {
    // Cycle through languages: en -> es -> hi -> pt -> id -> fr -> de -> ar -> la -> en
    let newLanguage: SupportedLanguage;
    switch (language) {
      case 'en': newLanguage = 'es'; break;
      case 'es': newLanguage = 'hi'; break;
      case 'hi': newLanguage = 'pt'; break;
      case 'pt': newLanguage = 'id'; break;
      case 'id': newLanguage = 'fr'; break;
      case 'fr': newLanguage = 'de'; break;
      case 'de': newLanguage = 'ar'; break;
      case 'ar': newLanguage = 'la'; break;
      case 'la': newLanguage = 'en'; break;
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
  const setAppLanguage = async (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    
    // Save language preference
    try {
      await AsyncStorage.setItem('appLanguage', newLanguage);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      toggleLanguage, 
      setLanguage: setAppLanguage,
      t 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);