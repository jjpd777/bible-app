import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const durations = [
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
];

export default function ListenScreen() {
  const handleDurationSelect = (duration: number) => {
    router.push({
      pathname: '/player',
      params: { duration }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>How long would you like to listen?</Text>
      <View style={styles.buttonContainer}>
        {durations.map((duration) => (
          <TouchableOpacity
            key={duration.value}
            style={styles.button}
            onPress={() => handleDurationSelect(duration.value)}
          >
            <Text style={styles.buttonText}>{duration.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
