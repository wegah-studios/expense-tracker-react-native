import { colorCycle } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { formatAmount } from "@/lib/appUtils";
import { Expense } from "@/types/common";
import dayjs from "dayjs";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";
import LabelChip from "./labelChip";

const ExpenseCard = React.memo(
  ({
    index,
    expense,
    selected = false,
    sectionId,
    handlePress,
    handleLongPress,
  }: {
    index: number;
    expense: Partial<Expense>;
    selected?: boolean;
    sectionId?: string;
    handlePress?: (index: number, sectionId?: string) => void;
    handleLongPress?: (index: number, sectionId?: string) => void;
  }) => {
    const labels = useMemo(
      () =>
        expense.label && expense.label.length ? expense.label.split(",") : [],
      [expense]
    );

    const onPress = () => {
      if (handlePress) {
        handlePress(index, sectionId);
      }
    };

    const onLongPress = () => {
      if (handleLongPress) {
        handleLongPress(index, sectionId);
      } else if (handlePress) {
        handlePress(index, sectionId);
      }
    };

    return (
      <Pressable
        onLongPress={onLongPress}
        onPress={onPress}
        className={` flex-col p-[20px] rounded-[20px] gap-3 ${
          selected ? "bg-black dark:bg-white" : `bg-${colorCycle[index % 3]}`
        }`}
      >
        <View className=" flex-row items-center flex-wrap gap-[10px]">
          {selected && (
            <ThemedIcon
              reverse
              source={icons.checkbox.checked}
              className=" w-[15px] h-[15px]"
            />
          )}
          {labels.length ? (
            labels.map((label, index) => (
              <LabelChip
                key={index}
                index={index}
                name={label}
                onPress={onPress}
                color={selected ? "theme" : "dark"}
              />
            ))
          ) : (
            <ThemedText toggleOnDark={false} className=" text-error ">
              label: missing
            </ThemedText>
          )}
        </View>
        <View className=" flex-row justify-between gap-2 items-start">
          <ThemedText
            toggleOnDark={selected && !!expense.recipient}
            reverse={selected && !!expense.recipient}
            className={` capitalize font-urbanistMedium text-[1.2rem] flex-1 flex-row items-center ${
              !expense.recipient ? "text-error text-[1rem]" : ""
            } `}
          >
            {expense.recipient || "recipient: missing"}
          </ThemedText>
          <View className=" flex-1 flex-row items-center gap-1 justify-end ">
            <ThemedText
              toggleOnDark={selected && !!expense.amount}
              reverse={selected && !!expense.amount}
              className={` capitalize font-urbanistMedium text-[1.2rem]  text-right ${
                !expense.amount ? "text-error text-[1rem] " : ""
              } `}
            >
              {expense.amount
                ? "-" +
                  expense.currency +
                  " " +
                  formatAmount(expense.amount, 10000)
                : "amount: missing"}
            </ThemedText>
          </View>
        </View>
        <View className=" flex-row justify-between gap-2 items-start">
          <ThemedText
            toggleOnDark={false}
            className={` capitalize flex-1 flex-row items-center ${
              !expense.date ? "text-error" : "text-divider"
            } `}
          >
            {expense.date
              ? dayjs(new Date(expense.date)).format(`ddd DD MMM YYYY`)
              : "date: missing"}
          </ThemedText>
          {expense.date && (
            <View className=" flex-1 flex-row items-center gap-1 justify-end ">
              <ThemedText
                toggleOnDark={false}
                className={` capitalize text-divider `}
              >
                {dayjs(new Date(expense.date)).format(`hh:MM A`)}
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    );
  }
);

export default ExpenseCard;
