import icons from "@/constants/icons";
import React from "react";
import { Pressable } from "react-native";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const PinButton = ({
  value,
  onPress,
}: {
  value: string | "erase";
  onPress: (value: string) => void;
}) => {
  return (
    <Pressable
      onPress={() => onPress(value)}
      className=" flex-1 flex-row items-center justify-center aspect-square rounded-[50%] border border-black dark:border-white "
    >
      {value === "erase" ? (
        <ThemedIcon source={icons.backspace} className=" w-[15px] h-[15px] " />
      ) : (
        <ThemedText className=" text-[1.2rem] font-urbanistMedium ">
          {value}
        </ThemedText>
      )}
    </Pressable>
  );
};

export default PinButton;
