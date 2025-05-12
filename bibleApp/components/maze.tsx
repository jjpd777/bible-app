"use client";

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, PanResponder, GestureResponderEvent } from 'react-native';
import { Audio } from 'expo-av';

// Define cell types
type Cell = {
  x: number;
  y: number;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  visited: boolean;
};

// Define the props type based on your mock content structure
type MazeProps = {
  content: any; // Replace with proper type from your mock data
  onComplete: () => void;
  mazeNumber: number;
  totalMazes: number;
};

export default function Maze({ content, onComplete, mazeNumber, totalMazes }: MazeProps) {
  const [mazeState, setMazeState] = useState<'intro' | 'playing' | 'completed'>('intro');
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [maze, setMaze] = useState<Cell[][]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Calculate cell size based on screen width
  const screenWidth = Dimensions.get('window').width;
  const mazeSize = Math.min(screenWidth - 40, 320); // Max 320px, with some padding
  const cellSize = mazeSize / 10; // For 10x10 grid instead of 20x20
  
  // Generate a random maze when the component mounts
  useEffect(() => {
    if (mazeState === 'playing' && maze.length === 0) {
      const newMaze = generateMaze(10, 10, content.id); // Use content.id as seed, smaller 10x10 maze
      setMaze(newMaze);
      // Start at the entrance (top-left)
      setPlayerPosition({ x: 0, y: 0 });
    }
  }, [mazeState, content.id, maze.length]);
  
  // Check if player has reached the exit
  useEffect(() => {
    if (mazeState === 'playing' && maze.length > 0) {
      // Exit is at the bottom-right
      if (playerPosition.x === 9 && playerPosition.y === 9) { // Updated for 10x10 grid
        setMazeState('completed');
        stopAudio();
      }
    }
  }, [playerPosition, mazeState, maze]);
  
  // Play audio
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
          
          // Add listener for playback status
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setAudioPlaying(false);
            }
          });
        } catch (audioError) {
          console.warn("Could not play audio from URL:", audioError);
          
          // Try fallback audio
          try {
            const { sound } = await Audio.Sound.createAsync(
              require('../assets/audio/sample.mp3'),
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
          } catch (fallbackError) {
            console.error("Fallback audio also failed:", fallbackError);
            setAudioPlaying(false);
          }
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
  
  // Toggle audio play/pause
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
  
  // Stop audio
  const stopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      setAudioPlaying(false);
    }
  };
  
  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);
  
  const startMaze = () => {
    setMazeState('playing');
    playAudio();
  };
  
  const continueToNextMaze = () => {
    onComplete();
  };
  
  // Move player in specified direction
  const movePlayer = (direction: 'up' | 'right' | 'down' | 'left') => {
    if (mazeState !== 'playing' || maze.length === 0) return;
    
    const { x, y } = playerPosition;
    let newX = x;
    let newY = y;
    
    switch (direction) {
      case 'up':
        if (!maze[y][x].walls.top) newY = y - 1;
        break;
      case 'right':
        if (!maze[y][x].walls.right) newX = x + 1;
        break;
      case 'down':
        if (!maze[y][x].walls.bottom) newY = y + 1;
        break;
      case 'left':
        if (!maze[y][x].walls.left) newX = x - 1;
        break;
    }
    
    if (newX !== x || newY !== y) {
      setPlayerPosition({ x: newX, y: newY });
    }
  };
  
  // Generate a random maze using Depth-First Search algorithm
  const generateMaze = (width: number, height: number, seed: number): Cell[][] => {
    // Initialize the grid with all walls intact
    const grid: Cell[][] = [];
    for (let y = 0; y < height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < width; x++) {
        row.push({
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false
        });
      }
      grid.push(row);
    }
    
    // Seeded random function
    const seededRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    
    // DFS to carve paths
    const stack: [number, number][] = [];
    let currentX = 0;
    let currentY = 0;
    
    grid[currentY][currentX].visited = true;
    stack.push([currentX, currentY]);
    
    while (stack.length > 0) {
      const [x, y] = stack[stack.length - 1];
      
      // Find all neighbors
      const neighbors: [number, number, string][] = [];
      
      if (y > 0 && !grid[y-1][x].visited) neighbors.push([x, y-1, 'top']);
      if (x < width-1 && !grid[y][x+1].visited) neighbors.push([x+1, y, 'right']);
      if (y < height-1 && !grid[y+1][x].visited) neighbors.push([x, y+1, 'bottom']);
      if (x > 0 && !grid[y][x-1].visited) neighbors.push([x-1, y, 'left']);
      
      if (neighbors.length > 0) {
        // Choose random neighbor
        const randomIndex = Math.floor(seededRandom() * neighbors.length);
        const [nextX, nextY, direction] = neighbors[randomIndex];
        
        // Remove walls between current cell and chosen neighbor
        if (direction === 'top') {
          grid[y][x].walls.top = false;
          grid[nextY][nextX].walls.bottom = false;
        } else if (direction === 'right') {
          grid[y][x].walls.right = false;
          grid[nextY][nextX].walls.left = false;
        } else if (direction === 'bottom') {
          grid[y][x].walls.bottom = false;
          grid[nextY][nextX].walls.top = false;
        } else if (direction === 'left') {
          grid[y][x].walls.left = false;
          grid[nextY][nextX].walls.right = false;
        }
        
        grid[nextY][nextX].visited = true;
        stack.push([nextX, nextY]);
      } else {
        // Backtrack
        stack.pop();
      }
    }
    
    // Ensure there's a path from start to finish
    // Create entrance and exit
    grid[0][0].walls.top = false; // Entrance at top-left
    grid[height-1][width-1].walls.bottom = false; // Exit at bottom-right
    
    return grid;
  };
  
  // Setup pan responder for swipe gestures with improved sensitivity
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderEnd: (e: GestureResponderEvent, gestureState) => {
        if (mazeState !== 'playing' || maze.length === 0) return;
        
        // Determine swipe direction based on velocity and distance
        const { dx, dy } = gestureState;
        const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
        
        // Lower threshold for easier movement (30 instead of 50)
        if (isHorizontalSwipe) {
          if (dx > 30) {
            movePlayer('right');
          } else if (dx < -30) {
            movePlayer('left');
          }
        } else {
          if (dy > 30) {
            movePlayer('down');
          } else if (dy < -30) {
            movePlayer('up');
          }
        }
      },
    })
  ).current;
  
  // Skip to next maze
  const skipToNext = () => {
    // Stop any playing audio
    stopAudio();
    // Complete this maze
    onComplete();
  };
  
  // Render the maze
  const renderMaze = () => {
    return (
      <View style={[styles.mazeContainer, { width: mazeSize, height: mazeSize }]}>
        {/* Background gradient for the maze */}
        <View style={styles.mazeBackground} />
        
        {maze.flat().map((cell) => (
          <View
            key={`${cell.x}-${cell.y}`}
            style={[
              styles.cell,
              {
                left: cell.x * cellSize,
                top: cell.y * cellSize,
                width: cellSize,
                height: cellSize,
                borderTopWidth: cell.walls.top ? 2 : 0,
                borderRightWidth: cell.walls.right ? 2 : 0,
                borderBottomWidth: cell.walls.bottom ? 2 : 0,
                borderLeftWidth: cell.walls.left ? 2 : 0,
              },
              // Add special styling for start and end cells
              cell.x === 0 && cell.y === 0 ? styles.startCell : null,
              cell.x === 9 && cell.y === 9 ? styles.endCell : null,
            ]}
          />
        ))}
        
        {/* Player - using image instead of circle */}
        <View
          style={[
            styles.player,
            {
              left: playerPosition.x * cellSize - cellSize / 6,
              top: playerPosition.y * cellSize - cellSize / 6,
              width: cellSize * 4/3,
              height: cellSize * 4/3,
            },
          ]}
        >
          <Image 
            source={require('../assets/images/maze_01.png')}
            style={styles.playerImage}
            resizeMode="contain"
          />
        </View>
        
        {/* Start and End markers with improved styling */}
        <View style={[styles.markerContainer, styles.startMarkerContainer]}>
          <Text style={styles.startMarker}>START</Text>
        </View>
        <View style={[styles.markerContainer, styles.endMarkerContainer]}>
          <Text style={styles.endMarker}>EXIT</Text>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      
      {mazeState === 'intro' && (
        <View style={styles.introContainer}>
          <View style={styles.cardContainer}>
            <Image 
              source={require('../assets/images/maze_01.png')} 
              style={styles.cardImage}
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Gratitude Labyrinth</Text>
              <Text style={styles.description}>
                Navigate the labyrinth while listening to Bible verses & reflections.
              </Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={startMaze}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Enter Labyrinth</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      {mazeState === 'playing' && (
        <View style={styles.playingContainer}>
          {/* Display the verse above the maze */}
          <View style={styles.verseContainer}>
            <Text style={styles.verseLabel}>SCRIPTURE WISDOM</Text>
            <Text style={styles.verse}>{content.verse_llm_response}</Text>
            
            {/* Audio explanation status with beautiful styling */}
            {audioPlaying ? (
              <View style={styles.audioPlayingContainer}>
                <View style={styles.audioWaveContainer}>
                  <View style={[styles.audioWave, styles.audioWave1]} />
                  <View style={[styles.audioWave, styles.audioWave2]} />
                  <View style={[styles.audioWave, styles.audioWave3]} />
                  <View style={[styles.audioWave, styles.audioWave4]} />
                  <View style={[styles.audioWave, styles.audioWave5]} />
                </View>
                <Text style={styles.audioPlayingText}>Listening to wisdom...</Text>
              </View>
            ) : (
              <Text style={styles.audioHint}>Tap the audio button below to hear an explanation</Text>
            )}
          </View>
          
          {/* Instructions for gestures */}
          <Text style={styles.gestureHint}>Swipe on the maze to move</Text>
          
          <View style={styles.mazeWrapper} {...panResponder.panHandlers}>
            {maze.length > 0 && renderMaze()}
          </View>
          
          {/* Audio control buttons */}
          
        </View>
      )}
      
      {mazeState === 'completed' && (
        <View style={styles.completedContainer}>
          <View style={styles.completedHeader}>
            <Image 
              source={require('../assets/images/maze_01.png')}
              style={styles.completedIcon}
              resizeMode="contain"
            />
            <Text style={styles.completedTitle}>Labyrinth Completed!</Text>
          </View>
          
          <View style={styles.verseContainer}>
            <Text style={styles.verseLabel}>SCRIPTURE WISDOM</Text>
            <Text style={styles.verse}>{content.verse_llm_response}</Text>
          </View>
          
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>REFLECTION</Text>
            <Text style={styles.explanation}>{content.explanation_llm_response}</Text>
          </View>
          
          <TouchableOpacity
            onPress={continueToNextMaze}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {mazeNumber === totalMazes ? "Complete Challenge" : "Continue to Next Labyrinth"}
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
    backgroundColor: '#f8fafc',
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
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  imageTitle: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 32,
    textAlign: 'center',
    paddingHorizontal: 24,
    color: '#334155',
  },
  button: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  playingContainer: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mazeWrapper: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mazeContainer: {
    position: 'relative',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mazeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f3e8ff',
    opacity: 0.8,
  },
  cell: {
    position: 'absolute',
    borderColor: '#a78bfa',
  },
  startCell: {
    backgroundColor: 'rgba(216, 180, 254, 0.4)',
  },
  endCell: {
    backgroundColor: 'rgba(192, 132, 252, 0.4)',
  },
  player: {
    position: 'absolute',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerImage: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    position: 'absolute',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 5,
  },
  startMarkerContainer: {
    top: -8,
    left: 8,
    transform: [{ translateY: -10 }],
  },
  endMarkerContainer: {
    bottom: -8,
    right: 8,
    transform: [{ translateY: 10 }],
  },
  startMarker: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  endMarker: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  verseContainer: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#d8b4fe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  verseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6d28d9',
    marginBottom: 8,
    letterSpacing: 1,
  },
  verse: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
    color: '#5b21b6',
  },
  gestureHint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  audioButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 3,
    marginRight: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioButtonPlaying: {
    backgroundColor: '#a78bfa',
  },
  skipButton: {
    backgroundColor: '#94a3b8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
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
    animationDuration: '0.6s',
    animationIterationCount: 'infinite',
  },
  audioWave3: {
    height: 10,
    animationDuration: '1s',
    animationIterationCount: 'infinite',
  },
  audioWave4: {
    height: 14,
    animationDuration: '0.7s',
    animationIterationCount: 'infinite',
  },
  audioWave5: {
    height: 6,
    animationDuration: '0.9s',
    animationIterationCount: 'infinite',
  },
  audioPlayingText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  audioHint: {
    fontSize: 12,
    color: '#6d28d9',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  completedContainer: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  completedIcon: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  explanationContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 1,
  },
  explanation: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    marginBottom: 8,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#334155',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
    color: '#1e293b',
  },
  cardActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
  },
}); 