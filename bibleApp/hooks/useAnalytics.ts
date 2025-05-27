import { useMixpanel } from '@/contexts/MixpanelContext';
import analytics from '@react-native-firebase/analytics';

export function useAnalytics() {
  const { mixpanel, isInitialized } = useMixpanel();

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (isInitialized && mixpanel) {
      mixpanel.track(eventName, properties);
    } else {
      console.log(`[Analytics] Event not tracked (Mixpanel not initialized): ${eventName}`);
    }
  };

  const setUserProperties = (properties: Record<string, any>) => {
    if (isInitialized && mixpanel) {
      mixpanel.getPeople().set(properties);
    } else {
      console.log(`[Analytics] User properties not set (Mixpanel not initialized)`);
    }
  };

  const incrementUserProperty = (property: string, value: number = 1) => {
    if (isInitialized && mixpanel) {
      mixpanel.getPeople().increment(property, value);
    }
  };

  const logFirebaseEvent = async (eventName: string, parameters?: { [key: string]: any }) => {
    try {
      await analytics().logEvent(eventName, parameters);
    } catch (error) {
      console.error('Firebase Analytics error:', error);
    }
  };

  const logScreenView = async (screenName: string, screenClass?: string) => {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      console.error('Firebase Analytics screen view error:', error);
    }
  };

  const setFirebaseUserProperty = async (name: string, value: string) => {
    try {
      await analytics().setUserProperty(name, value);
    } catch (error) {
      console.error('Firebase Analytics user property error:', error);
    }
  };

  const setFirebaseUserId = async (userId: string) => {
    try {
      await analytics().setUserId(userId);
    } catch (error) {
      console.error('Firebase Analytics user ID error:', error);
    }
  };

  const trackEventBoth = (eventName: string, properties?: Record<string, any>) => {
    trackEvent(eventName, properties);
    logFirebaseEvent(eventName, properties);
  };

  const setUserPropertiesBoth = (properties: Record<string, any>) => {
    setUserProperties(properties);
    Object.entries(properties).forEach(([key, value]) => {
      if (typeof value === 'string') {
        setFirebaseUserProperty(key, value);
      } else {
        setFirebaseUserProperty(key, String(value));
      }
    });
  };

  const setUserIdBoth = (userId: string) => {
    if (isInitialized && mixpanel) {
      mixpanel.identify(userId);
    }
    setFirebaseUserId(userId);
  };

  return {
    trackEvent,
    setUserProperties,
    incrementUserProperty,
    logFirebaseEvent,
    logScreenView,
    setFirebaseUserProperty,
    setFirebaseUserId,
    trackEventBoth,
    setUserPropertiesBoth,
    setUserIdBoth,
  };
}
