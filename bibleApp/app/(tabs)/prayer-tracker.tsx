import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { StreakDisplay } from '../../components/StreakDisplay';
import { PrayerButton } from '../../components/PrayerButton';

export default function PrayerTrackerScreen() {
  // Temporary mock data
  const mockMarkedDates = {
    '2024-03-10': { marked: true, dotColor: '#50C878' },
    '2024-03-11': { marked: true, dotColor: '#50C878' },
    '2024-03-12': { marked: true, dotColor: '#50C878' },
  };

  return (
    <View style={styles.container}>
      <StreakDisplay streak={3} />
      <Calendar
        markedDates={mockMarkedDates}
        onDayPress={(day) => {
          console.log('selected day', day);
        }}
        theme={{
          todayTextColor: '#00adf5',
          selectedDayBackgroundColor: '#00adf5',
          dotColor: '#50C878',
        }}
      />
      <PrayerButton onPress={() => console.log('Prayer marked')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});