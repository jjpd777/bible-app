import {
  GestureResponderEvent,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import React from "react";

import { widthPercentageToDP } from "react-native-responsive-screen";
import { Colors } from "@/constants/Colors";
import { Fonts } from "@/assets";

interface CustomButtonProps {
  text?: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  text = "",
  onPress,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.btnContainerStyle, disabled && styles.disabledButton]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text
        allowFontScaling={false}
        style={[styles.buttonTxtStyle, disabled && styles.disabledText]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

export default React.memo(CustomButton);

const styles = StyleSheet.create({
  btnContainerStyle: {
    width: widthPercentageToDP(90),
    backgroundColor: Colors.light.livelyPurple,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 16,
  },
  buttonTxtStyle: {
    fontSize: 16,
    color: Colors.light.white,
    fontFamily: Fonts.MEDIUM,
  },
  disabledButton: {
    backgroundColor: Colors.light.livelyPurple + "80", // Adding 50% opacity
  },
  disabledText: {
    opacity: 0.7,
  },
});
