import { Fonts, Icons, Images } from "@/assets";
import React, { useRef, useState } from "react";
import { Colors } from "@/constants/Colors";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  widthPercentageToDP,
  heightPercentageToDP,
} from "react-native-responsive-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";

const height = Dimensions.get("window").height;

export default function Intro({ navigation }: any) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      key: 1,
      title: "Connect.",
      text: "Discover prayers crafted uniquely for your\njourney and beliefs.",
      icon: <Icons.Intro1 height={heightPercentageToDP(40)} />,
    },
    {
      key: 2,
      title: "Choose.",
      text: "Choose your faith, focus, and intention\nfor a meaningful prayer.",
      icon: <Icons.Intro2 height={heightPercentageToDP(40)} />,
    },
    {
      key: 3,
      title: "Listen.",
      text: "Listen to heartfelt prayers with calming,\nguided audio.",
      icon: <Icons.Intro3 height={heightPercentageToDP(40)} />,
    },
  ];

  const renderSlides = ({ item }: any) => (
    <View style={styles.slide}>
      {item.icon}
      <View style={styles.slideTxtCont}>
        <Text allowFontScaling={false} style={styles.slideTitle}>
          {item.title}
        </Text>
        <Text allowFontScaling={false} style={styles.slideTxt}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  const renderPagination = () => {
    const dotPosition = Animated.divide(scrollX, widthPercentageToDP(100));

    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const backgroundColor = dotPosition.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [
              Colors.light.shadowWhite,
              Colors.light.white,
              Colors.light.shadowWhite,
            ],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={index}
              style={[styles.dotStyle, { backgroundColor }]}
            />
          );
        })}
      </View>
    );
  };

  // Function to handle intro completion
  const handleIntroDone = async () => {
    try {
      await AsyncStorage.setItem("hasSeenIntro", "true");
      navigation.reset({
        index: 0,
        routes: [{ name: "selectLanguage" }],
      });
    } catch (error) {
      console.error("Error setting intro status:", error);
    }
  };

  return (
    <ImageBackground source={Images.BackgroundImage} style={styles.mainCont}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.light.transparent}
        translucent
      />
      <SafeAreaView style={styles.safeArea}>
        <Pressable style={styles.skipCont} onPress={handleIntroDone}>
          <Text style={styles.skipTxt}>
            {currentIndex === slides.length - 1 ? "Next" : "Skip"}
          </Text>
        </Pressable>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlides}
          keyExtractor={(item) => item.key.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / widthPercentageToDP(100)
            );
            setCurrentIndex(index);
          }}
        />
        {renderPagination()}
      </SafeAreaView>
    </ImageBackground>
  );
}

Intro.route = "Intro";

const styles = StyleSheet.create({
  mainCont: { flex: 1 },
  safeArea: { flex: 1 },
  slide: {
    width: widthPercentageToDP(100),
    justifyContent: "center",
    alignItems: "center",
  },
  slideImage: {
    width: widthPercentageToDP(100),
    height: heightPercentageToDP(60),
  },
  slideTxtCont: {
    top:
      Platform.OS == "android" && height < 800
        ? heightPercentageToDP(15)
        : heightPercentageToDP(15),
    width: widthPercentageToDP(90),
    alignItems: "flex-start",
  },
  slideTitle: {
    fontSize: 32,
    color: Colors.light.white,
    fontFamily: Fonts.BOLD,
  },
  slideTxt: {
    marginTop: heightPercentageToDP(1),
    fontSize: 14,
    color: Colors.light.white,
    fontFamily: Fonts.REGULAR,
    lineHeight: 24,
  },
  skipCont: {
    backgroundColor: Colors.light.transparentBlack,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 5,
    position: "absolute",
    top:
      Platform.OS == "android" && height < 800
        ? heightPercentageToDP(7)
        : heightPercentageToDP(7),
    right: widthPercentageToDP(5),
    zIndex: 1,
  },
  skipTxt: {
    fontSize: 16,
    color: Colors.light.white,
    fontFamily: Fonts.MEDIUM,
  },
  paginationContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: height < 800 ? heightPercentageToDP(4) : heightPercentageToDP(6),
    alignSelf: "flex-start",
    marginLeft: widthPercentageToDP(5),
  },
  dotStyle: {
    backgroundColor: Colors.light.shadowWhite,
    width: 7,
    height: 7,
    borderRadius: 7 / 2,
    marginHorizontal: 4,
  },
});
