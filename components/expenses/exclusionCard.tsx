import { colorCycle } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import React from "react";
import { Pressable, View } from "react-native";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const ExclusionCard = ({
  index,
  value,
  count,
  selected,
  handlePress,
  handleLongPress,
}: {
  index: number;
  value: string;
  count: number;
  selected: boolean;
  handlePress: (value: string) => void;
  handleLongPress: (value: string) => void;
}) => {
  const onPress = () => {
    handlePress(value);
  };
  const onLongPress = () => {
    handleLongPress(value);
  };
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className={`flex-row gap-[10px] items-center p-[20px] rounded-[20px] ${
        selected ? "bg-black dark:bg-white" : `bg-${colorCycle[index % 3]}`
      } `}
    >
      <View className=" flex-1 flex-col gap-2 items-start ">
        <View className=" flex-row items-center gap-2 ">
          {selected && (
            <ThemedIcon
              reverse
              source={icons.checkbox.checked}
              className=" w-[15px] h-[15px] "
            />
          )}
          <ThemedText
            toggleOnDark={selected}
            reverse={selected}
            className=" capitalize flex-1 font-urbanistMedium text-[1.3rem] "
          >
            {value}
          </ThemedText>
        </View>
        <ThemedText toggleOnDark={false} className=" text-divider ">
          {count} item{count === 1 ? "" : "s"}
        </ThemedText>
      </View>
      <ThemedIcon
        toggleOnDark={selected}
        reverse={selected}
        source={icons.chevron}
        className=" w-[20px] h-[20px]  rotate-[-90deg] "
      />
    </Pressable>
  );
};

export default ExclusionCard;
