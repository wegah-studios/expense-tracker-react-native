import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { openBrowserAsync } from "expo-web-browser";
import React from "react";
import { Image, Pressable } from "react-native";

const HelpFab = () => {
  const { setFeedbackModal } = useEditingContext();
  const handlePress = async () => {
    await openBrowserAsync(
      "https://expense-tracker-wegah-studios.netlify.app/#faq"
    );
  };
  const handleLongPress = () => {
    setFeedbackModal(true);
  };
  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      className=" absolute top-[-60] right-[20] w-[40px] h-[40px] rounded-[20px] bg-primary flex-row justify-center items-center border "
    >
      <Image source={icons.help} className=" w-[15px] h-[15px] " />
    </Pressable>
  );
};

export default HelpFab;
