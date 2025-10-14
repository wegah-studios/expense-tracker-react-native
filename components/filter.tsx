import icons from "@/constants/icons";
import React from "react";
import { Pressable } from "react-native";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const Filter = ({
  active,
  title,
  value,
  direction,
  onPress,
}: {
  active: boolean;
  title: string;
  value: string;
  direction: "ASC" | "DESC";
  onPress: (value: string, direction: "ASC" | "DESC") => void;
}) => {
  return (
    <Pressable
      onPress={() => onPress(value, direction)}
      className={` p-[10px] pt-[5px] pb-[5px] rounded-[10px] flex-row gap-1 items-center ${
        active ? "bg-black dark:bg-white" : "border border-divider"
      } `}
    >
      {active && (
        <ThemedIcon
          reverse
          source={icons.arrow}
          className={`w-[10px] h-[10px] ${
            direction === "DESC" ? "rotate-90" : "rotate-[-90deg]"
          } `}
        />
      )}
      <ThemedText
        toggleOnDark={active}
        reverse={active}
        className={`${active ? "" : "text-divider"}`}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
};

export default Filter;
