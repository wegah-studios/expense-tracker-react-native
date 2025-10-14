import icons from "@/constants/icons";
import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const CollectionCard = ({
  name,
  selected,
  count,
  handlePress,
  handleLongPress,
}: {
  name: "add" | string;
  selected: boolean;
  count?: number;
  handlePress: (name: string) => void;
  handleLongPress: (name: string) => void;
}) => {
  return (
    <Pressable
      onLongPress={() => handleLongPress(name)}
      onPress={() => handlePress(name)}
      className={` relative w-[100px] min-h-[100px] p-[10px] gap-1 rounded-[20px] flex-col justify-center items-center ${
        selected
          ? "bg-black dark:bg-white"
          : "bg-paper-light dark:bg-paper-dark"
      } `}
    >
      {selected && (
        <ThemedIcon
          reverse={selected}
          source={icons.checkbox.checked}
          className=" absolute right-2 top-3 w-[15px] h-[15px] "
        />
      )}
      <ThemedIcon
        reverse={selected}
        source={icons[name === "add" ? "add" : "folder"]}
        className={`${
          name === "add" ? "h-[30px] w-[30px]" : "w-[40px] h-[40px]"
        } `}
      />
      <View style={{ height: 16 }}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
          <ThemedText reverse={selected} className=" capitalize ">
            {name}
          </ThemedText>
        </ScrollView>
      </View>
      {count !== undefined && (
        <ThemedText toggleOnDark={false} className=" text-divider ">
          {count}
        </ThemedText>
      )}
    </Pressable>
  );
};

export default CollectionCard;
