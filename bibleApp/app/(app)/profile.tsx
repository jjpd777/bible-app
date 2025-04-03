import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReligion } from '@/contexts/ReligionContext';

export default function ProfileScreen() {
  const { language, setLanguage, t } = useLanguage();
  const { getReligionEmoji, getAllReligions, religion, setReligion } = useReligion();
  
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isReligionDropdownVisible, setIsReligionDropdownVisible] = useState(false);

  // Language options with their display names and flags
  const languageOptions = [
    { code: 'en', label: '🇺🇸 English' },
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'hi', label: '🇮🇳 हिंदी' },
    { code: 'pt', label: '🇧🇷 Português' },
    { code: 'id', label: '🇮🇩 Bahasa Indonesia' },
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'de', label: '🇩🇪 Deutsch' },
    { code: 'ar', label: '🇸🇦 العربية' }
  ];

  // Get the current language display name
  const getCurrentLanguageLabel = () => {
    const currentLang = languageOptions.find(item => item.code === language);
    return currentLang ? currentLang.label : languageOptions[0].label;
  };

  // Translations for "Settings" title
  const settingsTranslations = {
    'en': 'Settings',
    'es': 'Configuración',
    'hi': 'सेटिंग्स',
    'pt': 'Configurações',
    'id': 'Pengaturan',
    'fr': 'Paramètres',
    'de': 'Einstellungen',
    'ar': 'الإعدادات'
  };

  // Translations for "Language" section title
  const languageTranslations = {
    'en': 'Language',
    'es': 'Idioma',
    'hi': 'भाषा',
    'pt': 'Idioma',
    'id': 'Bahasa',
    'fr': 'Langue',
    'de': 'Sprache',
    'ar': 'اللغة'
  };

  // Translations for "Religion" section title
  const religionTranslations = {
    'en': 'Religion',
    'es': 'Religión',
    'hi': 'धर्म',
    'pt': 'Religião',
    'id': 'Agama',
    'fr': 'Religion',
    'de': 'Religion',
    'ar': 'الدين'
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Ionicons name="person" size={60} color={Colors.light.primary} />
        </View>
        <Text style={styles.profileTitle}>
          {settingsTranslations[language] || settingsTranslations['en']}
        </Text>
      </View>

      <View style={styles.settingsContainer}>
        {/* Language Selector */}
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>
            {languageTranslations[language] || languageTranslations['en']}
          </Text>
          
          <TouchableOpacity 
            style={styles.dropdownTrigger}
            onPress={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
          >
            <View style={styles.selectedOptionDisplay}>
              <Text style={styles.selectedOptionText}>
                {getCurrentLanguageLabel()}
              </Text>
              <Ionicons 
                name={isLanguageDropdownOpen ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={Colors.light.primary} 
              />
            </View>
          </TouchableOpacity>
          
          {isLanguageDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {languageOptions.map(item => (
                <TouchableOpacity 
                  key={item.code}
                  style={[
                    styles.dropdownOption,
                    language === item.code && styles.activeDropdownOption
                  ]}
                  onPress={() => {
                    setLanguage(item.code as any);
                    setIsLanguageDropdownOpen(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    language === item.code && styles.selectedOption
                  ]}>{item.label}</Text>
                  {language === item.code && (
                    <Ionicons name="checkmark" size={18} color={Colors.light.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Religion Selector */}
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>
            {religionTranslations[language] || religionTranslations['en']}
          </Text>
          
          <TouchableOpacity 
            style={styles.dropdownTrigger}
            onPress={() => setIsReligionDropdownVisible(!isReligionDropdownVisible)}
          >
            <View style={styles.selectedOptionDisplay}>
              <Text style={styles.selectedOptionText}>
                {getReligionEmoji()} {getAllReligions().find(r => r.id === religion)?.name || ''}
              </Text>
              <Ionicons 
                name={isReligionDropdownVisible ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={Colors.light.primary} 
              />
            </View>
          </TouchableOpacity>
          
          {isReligionDropdownVisible && (
            <View style={styles.dropdownMenu}>
              {getAllReligions().map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  style={[
                    styles.dropdownOption,
                    religion === item.id && styles.activeDropdownOption
                  ]}
                  onPress={() => {
                    setReligion(item.id);
                    setIsReligionDropdownVisible(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    religion === item.id && styles.selectedOption
                  ]}>{item.emoji} {item.name}</Text>
                  {religion === item.id && (
                    <Ionicons name="checkmark" size={18} color={Colors.light.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    backgroundColor: Colors.light.primary,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsContainer: {
    padding: 20,
  },
  settingSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  dropdownTrigger: {
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e5eb',
  },
  selectedOptionDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownMenu: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: '#e0e5eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeDropdownOption: {
    backgroundColor: '#f0f8ff',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOption: {
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
});
