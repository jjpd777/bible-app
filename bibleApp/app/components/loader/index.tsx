import { Image, Modal, StyleSheet, View } from "react-native";
import React from "react";
import { Colors } from "@/constants/Colors";
import { Images } from "@/assets";

interface LoaderProps {
  visible: boolean;
}

export default function Loader({ visible }: LoaderProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Image source={Images.Loading} style={styles.img} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.darkPurple },
  img: { width: "100%", height: "100%" },
});
