import { Colors } from "@/constants/Colors";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";
import Svg, { Path } from "react-native-svg";

interface AnimatedGenerateIconProps {
  isAnimating: boolean;
}

const AnimatedGenerateIcon: React.FC<AnimatedGenerateIconProps> = ({
  isAnimating,
}) => {
  // Animation values for the Generate icon
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconColor = useRef(new Animated.Value(0)).current;

  // Convert animated value to color string
  const animatedColor = iconColor.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.light.white, Colors.light.livelyPurple],
  });

  // Animation function for the Generate icon
  const animateIcon = () => {
    // Reset values
    iconScale.setValue(1);
    iconColor.setValue(0);

    // Create animation sequence
    Animated.parallel([
      // Scale up and down
      Animated.sequence([
        // Scale up
        Animated.timing(iconScale, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Scale down
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      // Color animation - synchronized with scaling
      Animated.sequence([
        // Change to purple as stars scale up
        Animated.timing(iconColor, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        // Change back to white as stars scale down
        Animated.timing(iconColor, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      // Repeat animation if still animating
      if (isAnimating) {
        animateIcon();
      }
    });
  };

  // Start the animation when the component mounts and isAnimating is true
  useEffect(() => {
    if (isAnimating) {
      animateIcon();
    }

    return () => {
      // Clean up animations
      iconScale.stopAnimation();
      iconColor.stopAnimation();
    };
  }, [isAnimating]);

  const AnimatedPath = Animated.createAnimatedComponent(Path);

  return (
    <Animated.View
      style={{
        width: 22,
        height: 24,
        transform: [{ scale: iconScale }],
      }}
    >
      <Svg width="22" height="24" viewBox="0 0 22 24" fill="none">
        <AnimatedPath
          d={`M10.1309 12.4537C10.2032 12.7562 10.4117 13.005 10.6904 13.1315L10.8135 13.1783L15.5361 14.609L10.8135 16.0397C10.5161 16.1299 10.2797 16.3517 10.1699 16.6373L10.1309 16.7633L8.91309 21.8522L7.69531 16.7633C7.62291 16.4611 7.41523 16.2121 7.13672 16.0856L7.0127 16.0397L2.29004 14.609L7.0127 13.1783C7.31034 13.0882 7.5465 12.8655 7.65625 12.5797L7.69531 12.4537L8.91309 7.36584L10.1309 12.4537Z`}
          stroke={animatedColor}
        />
        <AnimatedPath
          d={`M16.3618 5.17578C16.4307 5.47801 16.6355 5.72851 16.9116 5.8584L17.0337 5.90723L19.7856 6.78223L17.0337 7.6582C16.7385 7.7522 16.5062 7.97681 16.3999 8.2627L16.3618 8.38867L15.6958 11.3145L15.0288 8.38867C14.9598 8.08662 14.756 7.83586 14.48 7.70605L14.3579 7.6582L11.606 6.78223L14.3579 5.90723C14.653 5.81321 14.8854 5.58852 14.9917 5.30273L15.0288 5.17578L15.6958 2.25098L16.3618 5.17578Z`}
          stroke={animatedColor}
        />
      </Svg>
    </Animated.View>
  );
};

export default AnimatedGenerateIcon;
