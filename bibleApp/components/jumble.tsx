"use client";

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

type JumbleProps = {
  content: any; // Replace with proper type from your mock data
  onComplete: () => void;
  gameNumber: number;
  totalGames: number;
};

export default function Jumble({ content, onComplete, gameNumber, totalGames }: JumbleProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'completed'>('intro');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Word jumble state
  const [wordPieces, setWordPieces] = useState<string[]>([]);
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  
  // Initialize the game
  useEffect(() => {
    if (gameState === 'playing' && wordPieces.length === 0) {
      // Split the verse into word pieces
      const verse = content.verse_llm_response || "Sample verse for testing";
      const pieces = verse.split(' ').filter(word => word.trim() !== '');
      
      // Shuffle the pieces
      const shuffled = [...pieces].sort(() => Math.random() - 0.5);
      setWordPieces(shuffled);
    }
  }, [gameState, content, wordPieces.length]);
  
  // Check if the puzzle is solved
  useEffect(() => {
    if (gameState === 'playing' && selectedPieces.length > 0) {
      const verse = content.verse_llm_response || "Sample verse for testing";
      const originalPieces = verse.split(' ').filter(word => word.trim() !== '');
      
      // Check if all pieces are selected and in the correct order
      if (selectedPieces.length === originalPieces.length) {
        const isCorrect = selectedPieces.every((piece, index) => 
          piece === originalPieces[index]
        );
        
        if (isCorrect) {
          setGameState('completed');
          stopAudio();
        }
      }
    }
  }, [selectedPieces, gameState, content]);
  
  // Audio functions
  const playAudio = async () => {
    try {
      if (content.explanation_audio_url) {
        console.log("Attempting to play audio from:", content.explanation_audio_url);
        
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: content.explanation_audio_url },
            { shouldPlay: true }
          );
          
          soundRef.current = sound;
          await sound.setIsLoopingAsync(false);
          await sound.playAsync();
          setAudioPlaying(true);
          
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setAudioPlaying(false);
            }
          });
        } catch (audioError) {
          console.warn("Could not play audio from URL:", audioError);
          setAudioPlaying(false);
        }
      } else {
        console.warn("No audio URL provided for this content");
        setAudioPlaying(false);
      }
    } catch (error) {
      console.error("Error in audio handling:", error);
      setAudioPlaying(false);
    }
  };
  
  const toggleAudio = async () => {
    if (!soundRef.current) {
      playAudio();
    } else {
      if (audioPlaying) {
        await soundRef.current.pauseAsync();
        setAudioPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setAudioPlaying(true);
      }
    }
  };
  
  const stopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      setAudioPlaying(false);
    }
  };
  
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);
  
  const startGame = () => {
    setGameState('playing');
    playAudio();
  };
  
  const continueToNext = () => {
    onComplete();
  };
  
  // Handle word piece selection
  const selectPiece = (piece: string, index: number) => {
    if (gameState !== 'playing') return;
    
    // Add the piece to selected pieces
    setSelectedPieces([...selectedPieces, piece]);
    
    // Remove from available pieces
    const newPieces = [...wordPieces];
    newPieces.splice(index, 1);
    setWordPieces(newPieces);
  };
  
  // Remove a selected piece
  const removeSelectedPiece = (index: number) => {
    if (gameState !== 'playing') return;
    
    // Get the piece to remove
    const piece = selectedPieces[index];
    
    // Remove from selected
    const newSelected = [...selectedPieces];
    newSelected.splice(index, 1);
    setSelectedPieces(newSelected);
    
    // Add back to available pieces
    setWordPieces([...wordPieces, piece]);
  };
  
  // Skip to next game
  const skipToNext = () => {
    stopAudio();
    onComplete();
  };
  
  return (
    <View style={styles.container}>
      
      {gameState === 'intro' && (
        <View style={styles.introContainer}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: content.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.description}>
            Rearrange the words to form the complete verse about {content.verse_prompt?.split('about ')[1] || "wisdom"}.
          </Text>
          <TouchableOpacity
            onPress={startGame}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Start Word Jumble</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {gameState === 'playing' && (
        <View style={styles.playingContainer}>
          {/* <Text style={styles.instructions}>Arrange the words in the correct order</Text> */}
          
          {/* Display the verse above the word jumble */}
          <View style={styles.verseContainer}>
            <Text style={styles.verse}>{content.verse_llm_response}</Text>
            
            {/* Audio explanation status with beautiful styling */}
            {audioPlaying ? (
              <View style={styles.audioPlayingContainer}>
                <View style={styles.audioWaveContainer}>
                  <View style={[styles.audioWave, styles.audioWave1]} />
                  <View style={[styles.audioWave, styles.audioWave2]} />
                  <View style={[styles.audioWave, styles.audioWave3]} />
                </View>
                <Text style={styles.audioPlayingText}>Listening to wisdom...</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={toggleAudio} style={styles.audioHintContainer}>
                <Ionicons name="play-circle" size={48} color="#8b5cf6" style={styles.playIcon} />
                <Text style={styles.audioHint}></Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Selected words area */}
          <View style={styles.selectedWordsContainer}>
            {selectedPieces.length > 0 ? (
              <View style={styles.selectedWords}>
                {selectedPieces.map((piece, index) => (
                  <TouchableOpacity 
                    key={`selected-${index}`}
                    style={styles.selectedWordPiece}
                    onPress={() => removeSelectedPiece(index)}
                  >
                    <Text style={styles.wordPieceText}>{piece}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.placeholderText}>Tap words below to build the verse</Text>
            )}
          </View>
          
          {/* Available words */}
          <View style={styles.availableWordsContainer}>
            {wordPieces.map((piece, index) => (
              <TouchableOpacity 
                key={`available-${index}`}
                style={styles.wordPiece}
                onPress={() => selectPiece(piece, index)}
              >
                <Text style={styles.wordPieceText}>{piece}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Add Submit button */}
          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
          
          {/* Audio controls */}
        
        </View>
      )}
      
      {gameState === 'completed' && (
        <View style={styles.completedContainer}>
          <Text style={styles.completedTitle}>Word Jumble Completed!</Text>
          <View style={styles.verseContainer}>
            <Text style={styles.verse}>{content.verse_llm_response}</Text>
          </View>
          <Text style={styles.explanation}>{content.explanation_llm_response}</Text>
          <TouchableOpacity
            onPress={continueToNext}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Continue to Next Challenge
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  introContainer: {
    alignItems: 'center',
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  description: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  playingContainer: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instructions: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  selectedWordsContainer: {
    width: '100%',
    minHeight: 100,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#d8b4fe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    justifyContent: 'center',
  },
  selectedWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  placeholderText: {
    textAlign: 'center',
    color: '#a78bfa',
    fontStyle: 'italic',
  },
  availableWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  wordPiece: {
    backgroundColor: '#f3e8ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    margin: 4,
  },
  selectedWordPiece: {
    backgroundColor: '#d8b4fe',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    margin: 4,
  },
  wordPieceText: {
    color: '#6d28d9',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  audioButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  skipButton: {
    backgroundColor: '#9ca3af',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  audioButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  skipButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  completedContainer: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  verseContainer: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#d8b4fe',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  verse: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
    color: '#5b21b6',
  },
  explanation: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  audioPlayingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(216, 180, 254, 0.5)',
  },
  audioWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    height: 16,
  },
  audioWave: {
    width: 3,
    marginHorizontal: 1,
    backgroundColor: '#8b5cf6',
    borderRadius: 1,
  },
  audioWave1: {
    height: 8,
    animationName: 'wave1',
    animationDuration: '0.8s',
    animationIterationCount: 'infinite',
  },
  audioWave2: {
    height: 16,
    animationName: 'wave2',
    animationDuration: '0.6s',
    animationIterationCount: 'infinite',
  },
  audioWave3: {
    height: 10,
    animationName: 'wave3',
    animationDuration: '1s',
    animationIterationCount: 'infinite',
  },
  audioPlayingText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  audioHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  audioHint: {
    fontSize: 22,
    color: '#6d28d9',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  playIcon: {
    marginRight: 6,
    color: '#8b5cf6',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 