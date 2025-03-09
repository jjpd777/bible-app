import { useMixpanel } from '@/contexts/MixpanelContext';

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

  return {
    trackEvent,
    setUserProperties,
    incrementUserProperty,
  };
}
