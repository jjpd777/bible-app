import { StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const { width } = Dimensions.get('window');

export default function DevotionalScreen() {
  const { content, reference } = useLocalSearchParams();

  return (
    <ScrollView style={styles.scrollView}>
      <ThemedView style={styles.container}>
        {/* Verse Section */}
        <ThemedView style={styles.verseContainer}>
          <ThemedText style={styles.verseText}>{content}</ThemedText>
          <ThemedText style={styles.reference}>— {reference}</ThemedText>
        </ThemedView>

        {/* Devotional Sections */}
        <TouchableOpacity style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Reflection</ThemedText>
          <ThemedText style={styles.sectionSubtext}>
            Take a moment to meditate on this verse in silence
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Prayer</ThemedText>
          <ThemedText style={styles.sectionSubtext}>
            Open your heart in prayer with these words
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Recital</ThemedText>
          <ThemedText style={styles.sectionSubtext}>
            Speak this verse aloud and let it resonate within
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFDF0', // Soft, peaceful yellow background
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 100, // Increased bottom padding to ensure full visibility
    backgroundColor: '#FFFDF0', // Matching yellow background
  },
  verseContainer: {
    width: width - 40, // Full width minus padding
    marginHorizontal: 20,
    marginBottom: 35,
    padding: 25,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  verseText: {
    fontSize: 24,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'System',
    letterSpacing: 0.5,
    color: '#2C3E50', // Deep, readable color
  },
  reference: {
    fontSize: 18,
    textAlign: 'center',
    color: '#7f8c8d',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  section: {
    width: width - 40, // Full width minus padding
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 25,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 10,
    color: '#34495e',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sectionSubtext: {
    fontSize: 17,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.3,
  },
});
