import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useCustomThemeContext } from "@/context/themeContext";
import React from "react";
import { Image, Pressable, View } from "react-native";
import ThemedText from "../textThemed";

const ExpenseSectionHeader = React.memo(
  ({
    section,
    selectMode,
    selected,
    handleSectionSelect,
  }: {
    section: { id: string; data: number[] };
    selectMode: boolean;
    selected: boolean;
    handleSectionSelect: (
      section: { id: string; data: number[] },
      selectAll: boolean
    ) => void;
  }) => {
    const { theme } = useCustomThemeContext();
    const handleSelect = () => {
      handleSectionSelect(section, !selected);
    };

    return (
      <View className=" flex-row justify-between items-center ">
        <ThemedText className=" text-divider ">{section.id}</ThemedText>
        <Pressable style={{ zIndex: 100 }} onPress={handleSelect}>
          <Image
            source={icons.checkbox[selected ? "checked" : "unchecked"]}
            tintColor={
              selectMode
                ? theme === "dark"
                  ? tintColors.light
                  : tintColors.dark
                : tintColors.divider
            }
            className=" w-[20px] h-[20px] "
          />
        </Pressable>
      </View>
    );
  }
);

export default ExpenseSectionHeader;
