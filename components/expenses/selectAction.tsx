import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useCustomThemeContext } from "@/context/themeContext";
import React from "react";
import { Image, Pressable, Text } from "react-native";

const SelectAction = ({
  type,
  disabled,
  handlePress,
}: {
  type: "edit" | "delete" | "export" | "move" | "collection" | "restore";
  disabled?: boolean;
  handlePress: () => void;
}) => {
  const { theme } = useCustomThemeContext();
  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      className=" flex-1 flex-col gap-1 items-center "
    >
      <Image
        source={icons[type]}
        className="w-[20px] h-[20px]"
        tintColor={
          !disabled
            ? theme === "dark"
              ? tintColors.light
              : tintColors.dark
            : tintColors.divider
        }
      />
      <Text
        className={` capitalize ${disabled ? " text-divider " : " text-black dark:text-white "} `}
      >
        {type}
      </Text>
    </Pressable>
  );
};

export default SelectAction;
