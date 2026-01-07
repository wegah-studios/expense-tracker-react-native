import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import React from "react";
import { Pressable } from "react-native";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const LabelChip = ({
  index,
  size = "md",
  color = "grey",
  name,
  disabled,
  onPress,
  onCancel,
}: {
  index: number;
  size?: "md" | "sm";
  color?: "dark" | "grey" | "theme";
  disabled?: boolean;
  name: string;
  onPress?: (index: number) => void;
  onCancel?: (index: number) => void;
}) => {
  return (
    <Pressable
      disabled={!!disabled}
      onPress={() => onPress && onPress(index)}
      className={` p-[10px] pt-[5px] pb-[5px] rounded-[20px] flex-row gap-2 items-center ${
        color === "theme"
          ? "bg-white dark:bg-black"
          : color === "dark"
          ? "bg-black"
          : "bg-divider"
      } `}
    >
      <ThemedText
        toggleOnDark={color === "theme"}
        reverse={color !== "theme"}
        className={`  capitalize ${size === "md" ? "text-[1.2rem]" : ""} `}
      >
        {name}
      </ThemedText>
      {onCancel && (
        <Pressable
          disabled={!!disabled}
          hitSlop={5}
          onPress={() => onCancel(index)}
        >
          <ThemedIcon
            toggleOnDark={color === "theme"}
            reverse={color !== "theme"}
            source={icons.add}
            className={` ${
              size === "md" ? "w-[15px] h-[15px]" : "w-[10px] h-[10px]"
            } rotate-45 `}
            tintColor={color !== "theme" ? tintColors.light : undefined}
          />
        </Pressable>
      )}
    </Pressable>
  );
};

export default LabelChip;
