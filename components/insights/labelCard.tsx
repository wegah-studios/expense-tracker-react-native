import { colorCycle } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { formatAmount } from "@/lib/appUtils";
import React from "react";
import { Pressable, View } from "react-native";
import * as Progress from "react-native-progress";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const LabelCard = ({
  index,
  value,
  percent,
  total,
  onPress,
}: {
  index: number;
  percent: number;
  value: string;
  total: number;
  onPress: (value: string) => void;
}) => {
  return (
    <Pressable
      onPress={() => onPress(value)}
      className={` relative grow w-[150px] p-[20px] rounded-[20px] flex-col items-center justify-center gap-2 bg-${
        colorCycle[index % 3]
      }`}
    >
      <ThemedIcon
        source={icons["arrow"]}
        className=" absolute right-[15] top-[15] w-[15px] h-[15px] rotate-[-45deg]"
        toggleOnDark={false}
      />
      <View className=" relative w-[60px] h-[60px] ">
        {percent <= 1 ? (
          <Progress.Circle
            size={60}
            progress={percent}
            borderWidth={0}
            unfilledColor="rgba(0,0,0,0.2)"
            color="rgba(0,0,0,1)"
            strokeCap="round"
            thickness={6}
          />
        ) : (
          <View className={` w-[60px] h-[60px] rounded-[50%] bg-error `} />
        )}
        <View className=" absolute h-[100%] w-[100%]  flex-row justify-center items-center">
          <View
            className={` flex-col justify-center items-center w-[40px] h-[40px] rounded-[50%] bg-${
              colorCycle[index % 3]
            }`}
          >
            <ThemedText toggleOnDark={false}>
              {percent <= 1
                ? (percent * 100).toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })
                : ">100"}
              %
            </ThemedText>
          </View>
        </View>
      </View>
      <ThemedText
        toggleOnDark={false}
        className=" font-urbanistMedium capitalize text-[1.2rem]"
      >
        {value}
      </ThemedText>
      <ThemedText
        toggleOnDark={false}
        className=" font-urbanistBold text-[1.5rem]"
      >
        -Ksh {formatAmount(total, 10000)}
      </ThemedText>
    </Pressable>
  );
};

export default LabelCard;
