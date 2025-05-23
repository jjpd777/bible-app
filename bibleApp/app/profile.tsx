import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useLanguage } from '../contexts/LanguageContext';
import { useReligion } from '@/contexts/ReligionContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { router, useRouter } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const { language, setLanguage, t } = useLanguage();
  const { getReligionEmoji, getAllReligions, religion, setReligion } = useReligion();
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  const { user, logout } = useAuthContext();
  
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isReligionDropdownVisible, setIsReligionDropdownVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedReligion, setSelectedReligion] = useState('Christianity');

  // Track page view when component mounts
  useEffect(() => {
    if (typeof trackEvent === 'function') {
      trackEvent('Page View', {
        page_name: 'Profile',
        timestamp: Date.now()
      });
    }
  }, [trackEvent]);

  // Language options with their display names and flags
  const languageOptions = [
    { code: 'en', label: '🇺🇸 English' },
    { code: 'es', label: '🇨🇴 Español' },
    { code: 'hi', label: '🇮🇳 हिंदी' },
    { code: 'pt', label: '🇧🇷 Português' },
    { code: 'id', label: '🇮🇩 Bahasa Indonesia' },
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'de', label: '🇩🇪 Deutsch' },
    { code: 'ar', label: '🇸🇦 العربية' },
    { code: 'la', label: '🏛 Latin' }
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
    'ar': 'الإعدادات',
    'la': 'Configurationes'
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
    'ar': 'اللغة',
    'la': 'Lingua'
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
    'ar': 'الدين',
    'la': 'Religio'
  };

  // Modified language selection handler
  const handleLanguageChange = (languageCode) => {
    // Track language change event
    if (typeof trackEvent === 'function') {
      const oldLanguage = language;
      const newLanguage = languageCode;
      
      trackEvent('Language Changed', {
        previous_language: oldLanguage,
        new_language: newLanguage,
        timestamp: Date.now()
      });
    }
    
    // Set the new language
    setLanguage(languageCode);
    setIsLanguageDropdownOpen(false);
  };

  // Modified religion selection handler
  const handleReligionChange = (religionId) => {
    // Track religion change event
    if (typeof trackEvent === 'function') {
      const oldReligion = religion;
      const newReligion = religionId;
      const oldReligionName = getAllReligions().find(r => r.id === oldReligion)?.name || '';
      const newReligionName = getAllReligions().find(r => r.id === newReligion)?.name || '';
      
      trackEvent('Religion Changed', {
        previous_religion_id: oldReligion,
        new_religion_id: newReligion,
        previous_religion_name: oldReligionName,
        new_religion_name: newReligionName,
        timestamp: Date.now()
      });
    }
    
    // Set the new religion
    setReligion(religionId);
    setIsReligionDropdownVisible(false);
  };

  // Add logout handler
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled automatically by the auth state change
            } catch (error: any) {
              Alert.alert('Error', 'Failed to logout: ' + error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.mainContainer}>
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={require('../assets/images/bendiga_react.png')} 
              style={styles.profileImage} 
            />
          </View>
          <Text style={styles.profileTitle}>
            {settingsTranslations[language] || settingsTranslations['en']}
          </Text>
          
          {/* Add authentication status section */}
          <View style={styles.authStatusContainer}>
            <Text style={styles.authStatusLabel}>Logged in as:</Text>
            <Text style={styles.authStatusEmail}>{user?.email || 'Not logged in'}</Text>
          </View>
        </View>

        <View style={styles.settingsContainer}>
          {/* Authentication Section */}
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Authentication</Text>
            
            <View style={styles.authInfoContainer}>
              <View style={styles.authInfoRow}>
                <Ionicons name="person-circle" size={24} color={Colors.light.primary} />
                <View style={styles.authInfoText}>
                  <Text style={styles.authInfoLabel}>Email</Text>
                  <Text style={styles.authInfoValue}>{user?.email || 'Not available'}</Text>
                </View>
              </View>
              
              <View style={styles.authInfoRow}>
                <Ionicons name="time" size={24} color={Colors.light.primary} />
                <View style={styles.authInfoText}>
                  <Text style={styles.authInfoLabel}>Account Created</Text>
                  <Text style={styles.authInfoValue}>
                    {user?.metadata?.creationTime 
                      ? new Date(user.metadata.creationTime).toLocaleDateString()
                      : 'Not available'
                    }
                  </Text>
                </View>
              </View>
              
              <View style={styles.authInfoRow}>
                <Ionicons name="log-in" size={24} color={Colors.light.primary} />
                <View style={styles.authInfoText}>
                  <Text style={styles.authInfoLabel}>Last Sign In</Text>
                  <Text style={styles.authInfoValue}>
                    {user?.metadata?.lastSignInTime 
                      ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                      : 'Not available'
                    }
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

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
                    onPress={() => handleLanguageChange(item.code)}
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
                    onPress={() => handleReligionChange(item.id)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
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
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 130,
    height: 130,
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
  authStatusContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  authStatusLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  authStatusEmail: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  authInfoContainer: {
    marginBottom: 20,
  },
  authInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  authInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  authInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  authInfoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
