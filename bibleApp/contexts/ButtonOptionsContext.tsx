import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useLanguage } from './LanguageContext';

// Define types for our button options
export interface ButtonOption {
  id: string;
  label: string;
}

export interface ButtonCategory {
  id: string;
  titleKey: { [languageCode: string]: string };
  options: { [languageCode: string]: ButtonOption[] };
}

interface ButtonOptionsContextType {
  categories: ButtonCategory[];
  getOptionsForCategory: (categoryId: string) => ButtonOption[];
  getCategoryTitle: (categoryId: string) => string;
}

// Create the context
const ButtonOptionsContext = createContext<ButtonOptionsContextType | undefined>(undefined);

// Define the provider component
export const ButtonOptionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { language, t } = useLanguage();
  
  // Define all button categories with options for each language
  const categories: ButtonCategory[] = [
    {
      id: 'prayer_for',
      titleKey: {
        'en': 'Prayer for',
        'es': 'Oración para',
        'hi': 'के लिए प्रार्थना',
        'pt': 'Oração para',
        'id': 'Doa untuk',
        'fr': 'Prière pour',
        'de': 'Gebet für',
        'ar': 'صلاة من أجل',
        'la': 'Oratio pro',
      },
      options: {
        'en': [
          { id: 'myself', label: 'Myself' },
          { id: 'family', label: 'Family' },
          { id: 'mother', label: 'Mother' },
          { id: 'father', label: 'Father' },
          { id: 'siblings', label: 'Siblings' },
          { id: 'kids', label: 'Kids' },
          { id: 'partner', label: 'Partner' },
          { id: 'friends', label: 'Friends' },
          { id: 'community', label: 'Community' },
          { id: 'humanity', label: 'Humanity' },
          { id: 'enemies', label: 'My Enemies' },
        ],
        'es': [
          { id: 'myself', label: 'Yo mismo' },
          { id: 'family', label: 'Familia' },
          { id: 'mother', label: 'Madre' },
          { id: 'father', label: 'Padre' },
          { id: 'siblings', label: 'Hermanos' },
          { id: 'kids', label: 'Niños' },
          { id: 'partner', label: 'Pareja' },
          { id: 'friends', label: 'Amigos' },
          { id: 'community', label: 'Comunidad' },
          { id: 'humanity', label: 'Humanidad' },
          { id: 'enemies', label: 'Mis Enemigos' },
        ],
        'hi': [
          { id: 'myself', label: 'स्वयं' },
          { id: 'family', label: 'परिवार' },
          { id: 'mother', label: 'माता' },
          { id: 'father', label: 'पिता' },
          { id: 'siblings', label: 'भाई-बहन' },
          { id: 'kids', label: 'बच्चे' },
          { id: 'partner', label: 'साथी' },
          { id: 'friends', label: 'मित्र' },
          { id: 'community', label: 'समुदाय' },
          { id: 'humanity', label: 'मानवता' },
          { id: 'enemies', label: 'मेरे शत्रु' },
        ],
        'pt': [
          { id: 'myself', label: 'Eu mesmo' },
          { id: 'family', label: 'Família' },
          { id: 'mother', label: 'Mãe' },
          { id: 'father', label: 'Pai' },
          { id: 'siblings', label: 'Irmãos' },
          { id: 'kids', label: 'Crianças' },
          { id: 'partner', label: 'Parceiro' },
          { id: 'friends', label: 'Amigos' },
          { id: 'community', label: 'Comunidade' },
          { id: 'humanity', label: 'Humanidade' },
          { id: 'enemies', label: 'Meus Inimigos' },
        ],
        'id': [
          { id: 'myself', label: 'Diri sendiri' },
          { id: 'family', label: 'Keluarga' },
          { id: 'mother', label: 'Ibu' },
          { id: 'father', label: 'Ayah' },
          { id: 'siblings', label: 'Saudara' },
          { id: 'kids', label: 'Anak-anak' },
          { id: 'partner', label: 'Pasangan' },
          { id: 'friends', label: 'Teman' },
          { id: 'community', label: 'Komunitas' },
          { id: 'humanity', label: 'Kemanusiaan' },
          { id: 'enemies', label: 'Musuh-musuh saya' },
        ],
        'fr': [
          { id: 'myself', label: 'Moi-même' },
          { id: 'family', label: 'Famille' },
          { id: 'mother', label: 'Mère' },
          { id: 'father', label: 'Père' },
          { id: 'siblings', label: 'Frères et sœurs' },
          { id: 'kids', label: 'Enfants' },
          { id: 'partner', label: 'Partenaire' },
          { id: 'friends', label: 'Amis' },
          { id: 'community', label: 'Communauté' },
          { id: 'humanity', label: 'Humanité' },
          { id: 'enemies', label: 'Mes Ennemis' },
        ],
        'de': [
          { id: 'myself', label: 'Mich selbst' },
          { id: 'family', label: 'Familie' },
          { id: 'mother', label: 'Mutter' },
          { id: 'father', label: 'Vater' },
          { id: 'siblings', label: 'Geschwister' },
          { id: 'kids', label: 'Kinder' },
          { id: 'partner', label: 'Partner' },
          { id: 'friends', label: 'Freunde' },
          { id: 'community', label: 'Gemeinschaft' },
          { id: 'humanity', label: 'Menschheit' },
          { id: 'enemies', label: 'Meine Feinde' },
        ],
        'ar': [
          { id: 'myself', label: 'نفسي' },
          { id: 'family', label: 'العائلة' },
          { id: 'mother', label: 'الأم' },
          { id: 'father', label: 'الأب' },
          { id: 'siblings', label: 'الإخوة' },
          { id: 'kids', label: 'الأطفال' },
          { id: 'partner', label: 'الشريك' },
          { id: 'friends', label: 'الأصدقاء' },
          { id: 'community', label: 'المجتمع' },
          { id: 'humanity', label: 'الإنسانية' },
          { id: 'enemies', label: 'أعدائي' },
        ],
        'la': [
          { id: 'myself', label: 'Me ipsum' },
          { id: 'family', label: 'Familia' },
          { id: 'mother', label: 'Mater' },
          { id: 'father', label: 'Pater' },
          { id: 'siblings', label: 'Fratres et sorores' },
          { id: 'kids', label: 'Liberi' },
          { id: 'partner', label: 'Coniux' },
          { id: 'friends', label: 'Amici' },
          { id: 'community', label: 'Communitas' },
          { id: 'humanity', label: 'Humanitas' },
          { id: 'enemies', label: 'Inimici mei' },
        ],
      }
    },
    {
      id: 'prayer_intentions',
      titleKey: {
        'en': 'Prayer Intentions',
        'es': 'Intenciones de Oración',
        'hi': 'प्रार्थना के इरादे',
        'pt': 'Intenções de Oração',
        'id': 'Niat Doa',
        'fr': 'Intentions de Prière',
        'de': 'Gebetsanliegen',
        'ar': 'نوايا الصلاة',
        'la': 'Intentiones Orationis',
      },
      options: {
        'en': [
          { id: 'peace', label: 'Peace' },
          { id: 'happiness', label: 'Happiness' },
          { id: 'acceptance', label: 'Acceptance' },
          { id: 'health', label: 'Health' },
          { id: 'success', label: 'Success' },
          { id: 'wealth', label: 'Wealth' },
          { id: 'courage', label: 'Courage' },
          { id: 'gratitude', label: 'Gratitude' },
        ],
        'es': [
          { id: 'peace', label: 'Paz' },
          { id: 'happiness', label: 'Felicidad' },
          { id: 'acceptance', label: 'Aceptación' },
          { id: 'health', label: 'Salud' },
          { id: 'success', label: 'Éxito' },
          { id: 'wealth', label: 'Riqueza' },
          { id: 'courage', label: 'Valentía' },
          { id: 'gratitude', label: 'Gratitud' },
        ],
        'hi': [
          { id: 'peace', label: 'शांति' },
          { id: 'happiness', label: 'खुशी' },
          { id: 'acceptance', label: 'स्वीकृति' },
          { id: 'health', label: 'स्वास्थ्य' },
          { id: 'success', label: 'सफलता' },
          { id: 'wealth', label: 'धन' },
          { id: 'courage', label: 'साहस' },
          { id: 'gratitude', label: 'कृतज्ञता' },
        ],
        'pt': [
          { id: 'peace', label: 'Paz' },
          { id: 'happiness', label: 'Felicidade' },
          { id: 'acceptance', label: 'Aceitação' },
          { id: 'health', label: 'Saúde' },
          { id: 'success', label: 'Sucesso' },
          { id: 'wealth', label: 'Riqueza' },
          { id: 'courage', label: 'Coragem' },
          { id: 'gratitude', label: 'Gratidão' },
        ],
        'id': [
          { id: 'peace', label: 'Kedamaian' },
          { id: 'happiness', label: 'Kebahagiaan' },
          { id: 'acceptance', label: 'Penerimaan' },
          { id: 'health', label: 'Kesehatan' },
          { id: 'success', label: 'Kesuksesan' },
          { id: 'wealth', label: 'Kekayaan' },
          { id: 'courage', label: 'Keberanian' },
          { id: 'gratitude', label: 'Rasa syukur' },
        ],
        'fr': [
          { id: 'peace', label: 'Paix' },
          { id: 'happiness', label: 'Bonheur' },
          { id: 'acceptance', label: 'Acceptation' },
          { id: 'health', label: 'Santé' },
          { id: 'success', label: 'Succès' },
          { id: 'wealth', label: 'Richesse' },
          { id: 'courage', label: 'Courage' },
          { id: 'gratitude', label: 'Gratitude' },
        ],
        'de': [
          { id: 'peace', label: 'Frieden' },
          { id: 'happiness', label: 'Glück' },
          { id: 'acceptance', label: 'Akzeptanz' },
          { id: 'health', label: 'Gesundheit' },
          { id: 'success', label: 'Erfolg' },
          { id: 'wealth', label: 'Wohlstand' },
          { id: 'courage', label: 'Mut' },
          { id: 'gratitude', label: 'Dankbarkeit' },
        ],
        'ar': [
          { id: 'peace', label: 'السلام' },
          { id: 'happiness', label: 'السعادة' },
          { id: 'acceptance', label: 'القبول' },
          { id: 'health', label: 'الصحة' },
          { id: 'success', label: 'النجاح' },
          { id: 'wealth', label: 'الثروة' },
          { id: 'courage', label: 'الشجاعة' },
          { id: 'gratitude', label: 'الامتنان' },
        ],
        'la': [
          { id: 'peace', label: 'Pax' },
          { id: 'happiness', label: 'Felicitas' },
          { id: 'acceptance', label: 'Acceptatio' },
          { id: 'health', label: 'Sanitas' },
          { id: 'success', label: 'Successus' },
          { id: 'wealth', label: 'Divitiae' },
          { id: 'courage', label: 'Fortitudo' },
          { id: 'gratitude', label: 'Gratitudo' },
        ],
      }
    },
    // You can add more categories as needed
  ];

  // Function to get options for a specific category in the current language
  const getOptionsForCategory = (categoryId: string): ButtonOption[] => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return [];
    
    // Return options for current language, or fall back to English if not available
    return category.options[language] || category.options['en'] || [];
  };

  // Function to get the translated title for a category
  const getCategoryTitle = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return '';
    
    // Return title for current language, or fall back to English if not available
    return category.titleKey[language] || category.titleKey['en'] || '';
  };

  return (
    <ButtonOptionsContext.Provider value={{ 
      categories, 
      getOptionsForCategory,
      getCategoryTitle
    }}>
      {children}
    </ButtonOptionsContext.Provider>
  );
};

// Custom hook to use the context
export const useButtonOptions = () => {
  const context = useContext(ButtonOptionsContext);
  if (context === undefined) {
    throw new Error('useButtonOptions must be used within a ButtonOptionsProvider');
  }
  return context;
};