import React from "react";
import { TouchableOpacity } from "react-native";
import { Icons } from "@/assets";

interface WhatsappButtonProps {
  onPress: () => void;
}

export default function WhatsappButton({ onPress }: WhatsappButtonProps) {
  const handlePress = () => {
    onPress();
  };

  return (
    <TouchableOpacity hitSlop={40} onPress={handlePress}>
      <Icons.Whatsapp />
    </TouchableOpacity>
  );
}
