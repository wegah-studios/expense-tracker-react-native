import React from "react";
import { Pressable, View } from "react-native";
import ThemedText from "../textThemed";

const StatisticsOption = ({
  subtitle,
  title,
  value,
  active,
  onPress,
}: {
  subtitle: string;
  title: string;
  value: string;
  active: boolean;
  onPress: (value: string) => void;
}) => {
  return (
    <Pressable
      onPress={() => onPress(value)}
      className={` p-[10px] rounded-[10px] flex-col gap-[5px] justify-center items-center border ${
        active
          ? "border-black bg-black dark:border-white dark:bg-white"
          : "border-divider"
      } `}
    >
      <ThemedText toggleOnDark={false} className=" capitalize text-divider ">
        {subtitle}
      </ThemedText>
      <View className=" bg-divider w-[100%] h-[1px] " />
      <ThemedText
        toggleOnDark={active}
        reverse={active}
        className={` capitalize text-[1.2rem] ${active ? "" : "text-divider"} `}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
};

export default StatisticsOption;
