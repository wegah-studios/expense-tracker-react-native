import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const BottomTabItem = ({
  tab,
  type,
  onPress,
}: {
  tab: string | undefined;
  type: "home" | "expenses" | "add" | "insights" | "budgets";
  onPress: (type: "home" | "expenses" | "add" | "insights" | "budgets") => void;
}) => {
  const active = useMemo<boolean>(
    () => tab === type || (!tab && type === "home"),
    [tab]
  );

  return (
    <Pressable onPress={() => onPress(type)} className="flex-1">
      {type !== "add" ? (
        <View className="flex-1 flex-col items-center justify-center">
          <ThemedIcon
            source={icons[type][active ? "filled" : "outlined"]}
            alt={type}
            className=" w-[24px] h-[24px]"
            tintColor={active ? undefined : tintColors.divider}
          />
          <ThemedText
            toggleOnDark={active}
            className={` capitalize text-[0.8rem] ${
              active ? " font-urbanistBold" : " text-divider "
            }`}
          >
            {type}
          </ThemedText>
        </View>
      ) : (
        <View className=" w-[100%] h-[100%] flex-row justify-center items-center ">
          <View className=" w-[40px] h-[40px] flex-row justify-center  items-center rounded-[20px] bg-black dark:bg-white">
            <ThemedIcon
              reverse
              source={icons.add}
              className="w-[20px] h-[20px]"
            />
          </View>
        </View>
      )}
    </Pressable>
  );
};

export default BottomTabItem;
