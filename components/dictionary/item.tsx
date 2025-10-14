import { colorCycle } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { DictionaryItem } from "@/types/common";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import LabelChip from "../expenses/labelChip";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const DictionaryItemComponent = React.memo(
  ({
    index,
    item,
    selected,
    handlePress,
    handleLongPress,
  }: {
    index: number;
    item: DictionaryItem;
    selected: boolean;
    handlePress: (id: string, index: number) => void;
    handleLongPress: (id: string, index: number) => void;
  }) => {
    const labels = useMemo(() => item.label.split(","), [item]);
    // const handleLongPress = () => {
    //   if (!selected) {
    //     handleItemSelect(item.id, "add");
    //   }
    // };

    // const handlePress = () => {
    //   if (selectMode) {
    //     handleItemSelect(item.id, selected ? "delete" : "add");
    //   } else {
    //     handleItemEdit(index);
    //   }
    // };

    const onPress = () => {
      handlePress(item.id, index);
    };
    const onLongPress = () => {
      handleLongPress(item.id, index);
    };

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        className={`flex-col gap-[10px] p-[20px] rounded-[20px] ${
          selected ? "bg-black dark:bg-white" : `bg-${colorCycle[index % 3]}`
        } `}
      >
        <View className=" flex-row items-center gap-2 ">
          <View className=" flex-1 flex-row gap-[10px] items-center ">
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
              className=" flex-1 capitalize font-urbanistMedium text-[1.2rem] "
            >
              <ThemedText
                toggleOnDark={selected}
                reverse={selected}
                className=" font-urbanistBold text-[1rem] "
              >
                {item.type}:{" "}
              </ThemedText>
              {item.match}
            </ThemedText>
          </View>
          <ThemedIcon
            toggleOnDark={selected}
            reverse={selected}
            source={icons.edit}
            className=" w-[15px] h-[15px] "
          />
        </View>
        <View className=" flex-row flex-wrap items-center gap-[10px] ">
          {labels.map((name, index) => (
            <LabelChip
              key={index}
              name={name}
              index={index}
              onPress={onPress}
              color={selected ? "theme" : "dark"}
            />
          ))}
        </View>
      </Pressable>
    );
  }
);

export default DictionaryItemComponent;
