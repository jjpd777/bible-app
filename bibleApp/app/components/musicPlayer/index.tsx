import React from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Icons } from "@/assets";
import { widthPercentageToDP } from "react-native-responsive-screen";

interface MusicPlayerProps {
  visible: boolean;
  onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ visible, onClose }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.controlButton}>
        <Icons.Previous />
      </TouchableOpacity>

      <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
        {isPlaying ? (
          <Icons.Pause width={15} height={15} />
        ) : (
          <Icons.PlayerPlay />
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.controlButton}>
        <Icons.Next />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 5,
    paddingBottom: 5,
    width: widthPercentageToDP(30),
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default MusicPlayer;
