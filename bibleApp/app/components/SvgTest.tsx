import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icons from "../../assets/icons";

const SvgTest = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SVG Test Component</Text>
      <Icons.Home width={50} height={50} />
      <Icons.Logo width={100} height={100} />
      <Icons.Play width={40} height={40} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});

export default SvgTest;
