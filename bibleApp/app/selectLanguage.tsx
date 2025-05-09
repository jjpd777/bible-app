import {
  Image,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Fonts, Icons, Images } from "@/assets";
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from "react-native-responsive-screen";
import CustomButton from "@/app/components/button";
import Loader from "@/app/components/loader";
import { Colors } from "@/constants/Colors";
import { useReligion } from "@/contexts/ReligionContext";
import { SupportedLanguage, useLanguage } from "@/contexts/LanguageContext";

export default function Language({ navigation }: any) {
  const { language, setLanguage } = useLanguage();
  const [showRequired, setShowRequired] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const {
    religion,
    setReligion,
    getReligionEmoji,
    getAllReligions,
    getPrayerPrompt,
  } = useReligion();
  // Add focus on inner peace to the prompt
  const prayerPrompt = getPrayerPrompt(language);
  const enhancedPrompt = `${prayerPrompt} Make the prayer focus on Myself & Inner Peace.`;

  useEffect(() => {
    setLanguage("en" as SupportedLanguage);
  }, []);

  // Reset generating state when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setIsGenerating(false);
    });

    return unsubscribe;
  }, [navigation]);

  const handleLanguageChange = (selectedLanguage: string) => {
    setLanguage(selectedLanguage as SupportedLanguage);
    setShowRequired(false);
  };

  const handleGeneratePrayer = () => {
    if (!language) {
      setShowRequired(true);
      return;
    }
    if (isGenerating) return;

    setIsGenerating(true);
    navigation.navigate("prayer-voice", {
      isNewGeneration: "true",
      language: language,
      prayerPrompt: enhancedPrompt,
    });
  };

  // Reset generating state when component unmounts or when navigation completes
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      setIsGenerating(false);
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <ImageBackground source={Images.BackgroundImage} style={styles.mainCont}>
      <StatusBar
        translucent
        backgroundColor={Colors.light.transparent}
        barStyle={"light-content"}
      />
      <Image source={Images.Logo} style={styles.logo} resizeMode="contain" />
      <View style={styles.languageCont}>
        <Text style={styles.languageText}>
          Language
          {showRequired && <Text style={styles.staric}> *</Text>}
        </Text>

        <Pressable
          style={styles.languageItem}
          onPress={() => handleLanguageChange("en")}
        >
          <View style={styles.languageItemLeftCont}>
            <View style={styles.checkBoxCircle}>
              {language === "en" && <Icons.InnerThumb />}
            </View>
            <Text style={styles.languageItemTxt}>English</Text>
          </View>
          <Icons.US />
        </Pressable>

        <Pressable
          style={styles.languageItem}
          onPress={() => handleLanguageChange("es")}
        >
          <View style={styles.languageItemLeftCont}>
            <View style={styles.checkBoxCircle}>
              {language === "es" && <Icons.InnerThumb />}
            </View>
            <Text style={styles.languageItemTxt}>Spanish</Text>
          </View>
          <Icons.Maxico />
        </Pressable>
      </View>

      <CustomButton
        text="Generate Inner Peace Prayer"
        onPress={handleGeneratePrayer}
        disabled={isGenerating}
      />
    </ImageBackground>
  );
}

Language.route = "Language";

const styles = StyleSheet.create({
  mainCont: {
    flex: 1,
    alignItems: "center",
    paddingTop: heightPercentageToDP(20),
  },
  logo: { width: 165, height: 165 },
  languageCont: {
    marginTop: 30,
    width: widthPercentageToDP(90),
    padding: 15,
    gap: 20,
    backgroundColor: Colors.light.transparentBlack,
    borderRadius: 15,
    marginBottom: heightPercentageToDP(3),
  },
  languageText: {
    fontSize: 16,
    fontFamily: Fonts.MEDIUM,
    color: Colors.light.white,
  },
  staric: { color: Colors.light.livelyPurple },
  languageItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  languageItemLeftCont: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkBoxCircle: {
    borderWidth: 2,
    borderColor: Colors.light.white,
    width: 18,
    height: 18,
    borderRadius: 18 / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  languageItemTxt: {
    fontFamily: Fonts.LIGHT,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.white,
    textDecorationLine: "none",
  },
});
