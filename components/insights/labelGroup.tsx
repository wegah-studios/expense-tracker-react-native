import { Currency, Statistic } from "@/types/common";
import React from "react";
import { View } from "react-native";
import LabelCard from "./labelCard";

const StatisticLabelGroup = ({
  total,
  index,
  group,
  currency,
  handleLabelPress,
}: {
  total: number;
  index: number;
  group: Statistic[];
  currency:Currency
  handleLabelPress: (value: string) => void;
}) => {
  return (
    <View className=" flex-row flex-wrap gap-[20px] ">
      {group.map((stat, i) => (
        <LabelCard
          key={i}
          {...stat}
          currency={currency}
          index={index + i}
          percent={stat.total / total}
          onPress={handleLabelPress}
        />
      ))}
      {group.length % 2 !== 0 && <View className=" grow w-[150px] "></View>}
    </View>
  );
};

export default StatisticLabelGroup;
