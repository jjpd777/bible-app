import { Stack } from 'expo-router';

export default function PrayerModeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#333',
        headerTitle: 'Prayer Mode',
      }}
    />
  );
}
