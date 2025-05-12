"use client";

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Animated, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

type FlappyProps = {
  content: any; // Replace with proper type from your mock data
  onComplete: () => void;
  gameNumber: number;
  totalGames: number;
};

export default function Flappy({ content, onComplete, gameNumber, totalGames }: FlappyProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'completed'>('intro');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [verseWords, setVerseWords] = useState<string[]>([]);
  const [collectedWords, setCollectedWords] = useState<string[]>([]);
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const birdPosition = useRef(new Animated.Value(0)).current;
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  
  // Screen dimensions
  const screenWidth = Dimensions.get('window').width;
  const gameHeight = 400;
  
  // Initialize the game
  useEffect(() => {
    if (gameState === 'playing' && verseWords.length === 0) {
      // Split the verse into words
      const verse = content.verse_llm_response || "Sample verse for testing";
      const words = verse.split(' ').filter(word => word.trim() !== '');
      setVerseWords(words);
    }
  }, [gameState, content, verseWords.length]);
  
  // Game loop
  useEffect(() => {
    if (gameState === 'playing') {
      // Start game loop
      startGameLoop();
      
      // Start with bird in middle
      birdPosition.setValue(gameHeight / 2);
    } else {
      // Clear game loop
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState]);
  
  // Check if all words are collected
  useEffect(() => {
    if (gameState === 'playing' && verseWords.length > 0) {
      if (collectedWords.length === verseWords.length) {
        setGameState('completed');
        stopAudio();
      }
    }
  }, [collectedWords, verseWords, gameState]);
  
  // Start the game loop
  const startGameLoop = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    
    gameLoopRef.current = setInterval(() => {
      // Game logic would go here
      // - Move obstacles
      // - Check collisions
      // - Update score
    }, 16); // ~60fps
  };
  
  // Make the bird flap (jump)
  const flap = () => {
    if (gameState !== 'playing') return;
    
    Animated.sequence([
      Animated.timing(birdPosition, {
        toValue: birdPosition._value - 50,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(birdPosition, {
        toValue: birdPosition._value + 50,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  };
  
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
    setScore(0);
    setCollectedWords([]);
    playAudio();
  };
  
  const continueToNext = () => {
    onComplete();
  };
  
  // Skip to next game
  const skipToNext = () => {
    stopAudio();
    onComplete();
  };
  
  return (
    <View style={styles.container}>
      {/* <Text style={styles.header}>Labyrinth {gameNumber} of {totalGames}</Text> */}
      
      {gameState === 'intro' && (
        <ScrollView contentContainerStyle={styles.introContainer}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: content.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.description}>
            Guide the dove through the sky to collect words from the verse about {content.verse_prompt?.split('about ')[1] || "wisdom"}.
          </Text>
          <TouchableOpacity
            onPress={startGame}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Start Flappy Challenge</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      
      {gameState === 'playing' && (
        <View style={styles.playingContainer}>
          <ScrollView>
            {/* Display the verse above the game area */}
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
                  <Ionicons name="play-circle" size={48} color="#4f46e5" style={styles.playIcon} />
                  <Text style={styles.audioHint}>Tap here to hear an explanation</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.gameHeader}>
              <Text style={styles.scoreText}>Words: {collectedWords.length}/{verseWords.length}</Text>
            </View>
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.gameArea} 
            onPress={flap}
            activeOpacity={1}
          >
            {/* Game canvas */}
            <View style={styles.gameCanvas}>
              {/* Bird */}
              <Animated.View
                style={[
                  styles.bird,
                  {
                    transform: [{ translateY: birdPosition }],
                  },
                ]}
              >
                <Image 
                  source={require('../assets/images/maze_01.png')}
                  style={styles.birdImage}
                  resizeMode="contain"
                />
              </Animated.View>
              
              {/* Words to collect would be rendered here */}
            </View>
            
            <Text style={styles.tapInstruction}>Tap to flap!</Text>
          </TouchableOpacity>
          
     
        </View>
      )}
      
      {gameState === 'completed' && (
        <ScrollView contentContainerStyle={styles.completedContainer}>
          <Text style={styles.completedTitle}>Flappy Challenge Completed!</Text>
          <View style={styles.verseContainer}>
            <Text style={styles.verse}>{content.verse_llm_response}</Text>
          </View>
          <Text style={styles.explanation}>{content.explanation_llm_response}</Text>
          <TouchableOpacity
            onPress={continueToNext}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Complete Labyrinth Challenge
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
  gameHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameArea: {
    width: '100%',
    height: 400,
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gameCanvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  bird: {
    position: 'absolute',
    left: 50,
    width: 120,
    height: 120,
  },
  birdImage: {
    width: '100%',
    height: '100%',
  },
  tapInstruction: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.7)',
    color: 'white',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  collectedWordsContainer: {
    width: '100%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginTop: 16,
  },
  collectedWordsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  collectedWordsText: {
    fontSize: 14,
    fontStyle: 'italic',
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
  playIcon: {
    marginRight: 6,
  },
  audioHint: {
    fontSize: 12,
    color: '#6d28d9',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 