import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useLanguage } from './LanguageContext';

// Define types for our button options
export interface ButtonOption {
  id: string;
  label: string;
}

export interface ButtonCategory {
  id: string;
  titleKey: string; // Translation key for the category title
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
      titleKey: 'Prayer for',
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
        // Add other languages here with the same structure
        'hi': [
          { id: 'myself', label: 'स्वयं' },
          // ... other Hindi options
        ],
        'pt': [
          { id: 'myself', label: 'Eu mesmo' },
          // ... other Portuguese options
        ],
        'id': [
          { id: 'myself', label: 'Diri sendiri' },
          // ... other Indonesian options
        ],
        'fr': [
          { id: 'myself', label: 'Moi-même' },
          // ... other French options
        ],
      }
    },
    {
      id: 'prayer_intentions',
      titleKey: 'Prayer Intentions',
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
        // Add other languages here
        'hi': [
          // Hindi options
        ],
        'pt': [
          // Portuguese options
        ],
        'id': [
          // Indonesian options
        ],
        'fr': [
          // French options
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
    
    return t(category.titleKey);
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