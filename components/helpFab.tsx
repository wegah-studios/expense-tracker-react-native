import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { openBrowserAsync } from "expo-web-browser";
import React from "react";
import { Pressable } from "react-native";
import ThemedIcon from "./themedIcon";

const HelpFab = ({ staticMode = false }: { staticMode?: boolean }) => {
  const { setFeedbackModal } = useEditingContext();
  const handlePress = async () => {
    await openBrowserAsync("https://qwantu.wegahstudios.com/help");
  };
  const handleLongPress = () => {
    setFeedbackModal(true);
  };
  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      className={` rounded-[20px] flex-row justify-center items-center border ${
        staticMode
          ? "w-[30px] h-[30px] dark:border-white "
          : " w-[40px] h-[40px] absolute top-[-60] right-[20] bg-primary"
      } `}
    >
      <ThemedIcon
        toggleOnDark={staticMode}
        source={icons.help}
        className=" w-[15px] h-[15px] "
      />
    </Pressable>
  );
};

export default HelpFab;
