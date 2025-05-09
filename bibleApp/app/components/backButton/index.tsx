import { TouchableOpacity, StyleSheet, Platform } from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import { Icons } from "@/assets";

export default function BackButton() {
  const navigation = useNavigation<any>();
  // const route = useRoute<any>();

  // const {favourites} = useSelector((state: any) => state.auth);

  const handleBackPress = () => {
    // favourites.length > 0
    //   ? navigation.navigate(BottomTabs.name, {
    //       screen: Home.name,
    //     })
    //   :
    navigation.goBack();
  };

  return (
    <TouchableOpacity
      hitSlop={styles.hitSlop}
      onPress={handleBackPress}
      activeOpacity={0.7}
    >
      <Icons.BackIcon />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hitSlop: {
    top: 15,
    bottom: 15,
    left: 15,
    right: 15,
  },
});
