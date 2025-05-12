"use client";

import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MOCK_WEEKLY_CONTENT } from '../../constants/mockWeeklyContent';
import Maze from '../../components/maze';
import Jumble from '../../components/jumble';
import Flappy from '../../components/flappy';

export default function Labyrinth() {
  const [gameState, setGameState] = useState<'intro' | 'maze' | 'jumble' | 'flappy' | 'completed'>('intro');
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  
  // We'll use the first 3 items from the mock content
  const gameContents = MOCK_WEEKLY_CONTENT.slice(0, 3);
  
  const startChallenge = () => {
    setGameState('maze');
    setCurrentContentIndex(0);
  };
  
  const handleMazeComplete = () => {
    setGameState('jumble');
  };
  
  const handleJumbleComplete = () => {
    setGameState('flappy');
  };
  
  const handleFlappyComplete = () => {
    if (currentContentIndex < gameContents.length - 1) {
      // Move to next set of games with new content
      setCurrentContentIndex(currentContentIndex + 1);
      setGameState('maze');
    } else {
      // All games completed
      setGameState('completed');
    }
  };
  
  const resetGame = () => {
    setGameState('intro');
    setCurrentContentIndex(0);
  };
  
  // Navigation functions for skipping games
  const skipToMaze = () => setGameState('maze');
  const skipToJumble = () => setGameState('jumble');
  const skipToFlappy = () => setGameState('flappy');
  const skipToCompleted = () => setGameState('completed');
  
  // Render progress indicator
  const renderProgressIndicator = () => {
    if (gameState === 'intro' || gameState === 'completed') return null;
    
    const totalSteps = 3; // maze, jumble, flappy
    let currentStep = 1;
    
    if (gameState === 'jumble') currentStep = 2;
    if (gameState === 'flappy') currentStep = 3;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressSteps}>
          {[1, 2, 3].map((step) => (
            <View 
              key={step} 
              style={[
                styles.progressStep,
                currentStep >= step ? styles.progressStepActive : styles.progressStepInactive,
                step === currentStep && styles.progressStepCurrent
              ]}
            >
              <Text style={[
                styles.progressStepText,
                currentStep >= step ? styles.progressStepTextActive : styles.progressStepTextInactive
              ]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.progressLabels}>
          <Text style={[
            styles.progressLabel,
            currentStep === 1 && styles.progressLabelActive
          ]}>Maze</Text>
          <Text style={[
            styles.progressLabel,
            currentStep === 2 && styles.progressLabelActive
          ]}>Jumble</Text>
          <Text style={[
            styles.progressLabel,
            currentStep === 3 && styles.progressLabelActive
          ]}>Flappy</Text>
        </View>
      </View>
    );
  };
  
  // Render navigation arrows
  const renderNavigationArrows = () => {
    if (gameState === 'intro' || gameState === 'completed') return null;
    
    return (
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          style={[
            styles.navigationArrow,
            gameState === 'maze' && styles.navigationArrowDisabled
          ]}
          onPress={() => {
            if (gameState === 'jumble') skipToMaze();
            if (gameState === 'flappy') skipToJumble();
          }}
          disabled={gameState === 'maze'}
        >
          <Text style={styles.navigationArrowText}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.navigationArrow,
            gameState === 'flappy' && styles.navigationArrowDisabled
          ]}
          onPress={() => {
            if (gameState === 'maze') skipToJumble();
            if (gameState === 'jumble') skipToFlappy();
          }}
          disabled={gameState === 'flappy'}
        >
          <Text style={styles.navigationArrowText}>→</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {renderProgressIndicator()}
      
      {gameState === 'intro' && (
        <View style={styles.introContainer}>
          <Text style={styles.title}>Daily Labyrinth Challenge</Text>
          <View style={styles.imageContainer}>
            <Image 
              source={require('../../assets/images/bendiga_011.png')}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.description}>
            Navigate through three sacred labyrinths while contemplating verses of wisdom.
          </Text>
          <TouchableOpacity
            onPress={startChallenge}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Start Daily Challenge</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {gameState === 'maze' && (
        <>
          <Maze 
            content={gameContents[currentContentIndex]}
            onComplete={handleMazeComplete}
            gameNumber={1}
            totalGames={3}
          />
          {renderNavigationArrows()}
        </>
      )}
      
      {gameState === 'jumble' && (
        <>
          <Jumble
            content={gameContents[currentContentIndex]}
            onComplete={handleJumbleComplete}
            gameNumber={2}
            totalGames={3}
          />
          {renderNavigationArrows()}
        </>
      )}
      
      {gameState === 'flappy' && (
        <>
          <Flappy
            content={gameContents[currentContentIndex]}
            onComplete={handleFlappyComplete}
            gameNumber={3}
            totalGames={3}
          />
          {renderNavigationArrows()}
        </>
      )}
      
      {gameState === 'completed' && (
        <View style={styles.introContainer}>
          <Text style={styles.title}>Challenge Completed!</Text>
          <Text style={styles.description}>
            You have successfully navigated all three labyrinths and absorbed their wisdom.
          </Text>
          <TouchableOpacity
            onPress={resetGame}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Start New Challenge</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f1f5f9',
  },
  introContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
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
  // Progress indicator styles
  progressContainer: {
    width: '100%',
    marginBottom: 20,
    paddingTop: 46,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  progressStepActive: {
    backgroundColor: '#8b5cf6',
  },
  progressStepInactive: {
    backgroundColor: '#e2e8f0',
  },
  progressStepCurrent: {
    borderWidth: 3,
    borderColor: '#a78bfa',
  },
  progressStepText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressStepTextActive: {
    color: 'white',
  },
  progressStepTextInactive: {
    color: '#64748b',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#64748b',
    width: '33%',
    textAlign: 'center',
  },
  progressLabelActive: {
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  // Navigation arrows styles
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  navigationArrow: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  navigationArrowDisabled: {
    backgroundColor: '#cbd5e1',
  },
  navigationArrowText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
