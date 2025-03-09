import React, { createContext, useContext, useEffect, useState } from 'react';
import { Mixpanel } from 'mixpanel-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

// Get your Mixpanel token from app.config.js
const MIXPANEL_TOKEN = Constants.expoConfig?.extra?.MIXPANEL_TOKEN;

type MixpanelContextType = {
  mixpanel: Mixpanel | null;
  isInitialized: boolean;
};

const MixpanelContext = createContext<MixpanelContextType>({
  mixpanel: null,
  isInitialized: false,
});

export const useMixpanel = () => useContext(MixpanelContext);

export const MixpanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mixpanelInstance, setMixpanelInstance] = useState<Mixpanel | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initMixpanel = async () => {
      if (!MIXPANEL_TOKEN) {
        console.warn('Mixpanel token not found in environment variables');
        return;
      }

      try {
        // Create Mixpanel instance
        const trackAutomaticEvents = true;
        const mixpanel = new Mixpanel(MIXPANEL_TOKEN, trackAutomaticEvents);
        await mixpanel.init();
        
        // Generate or retrieve a unique device ID
        let deviceId = await AsyncStorage.getItem('mixpanel_device_id');
        
        if (!deviceId) {
          // Generate a unique ID if none exists
          if (Platform.OS === 'ios') {
            deviceId = await Application.getIosIdForVendorAsync() || `ios_${Date.now()}`;
          } else {
            deviceId = Application.androidId || `android_${Date.now()}`;
          }
          
          // Save the ID for future sessions
          await AsyncStorage.setItem('mixpanel_device_id', deviceId);
        }
        
        // Identify the user with the device ID
        mixpanel.identify(deviceId);
        
        // Set some default properties
        mixpanel.getPeople().set('$os', Platform.OS);
        mixpanel.getPeople().set('$os_version', Platform.Version);
        mixpanel.getPeople().set('app_version', Application.nativeApplicationVersion);
        
        // Track app open event
        mixpanel.track('App Open');
        
        setMixpanelInstance(mixpanel);
        setIsInitialized(true);
        
        console.log('Mixpanel initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Mixpanel:', error);
      }
    };

    initMixpanel();

    // Cleanup function
    return () => {
      if (mixpanelInstance) {
        mixpanelInstance.flush();
      }
    };
  }, []);

  return (
    <MixpanelContext.Provider value={{ mixpanel: mixpanelInstance, isInitialized }}>
      {children}
    </MixpanelContext.Provider>
  );
};
