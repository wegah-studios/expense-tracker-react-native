import { colorCycle, tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { formatAmount } from "@/lib/appUtils";
import { Budget } from "@/types/common";
import dayjs from "dayjs";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import LabelChip from "../expenses/labelChip";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const BudgetCard = React.memo(
  ({
    index,
    budget,
    selected = false,
    handlePress,
    handleLongPress,
  }: {
    index: number;
    budget: Budget;
    selected?: boolean;
    handlePress?: (id: string, index: number) => void;
    handleLongPress?: (id: string, index: number) => void;
  }) => {
    const [barWidth, setBarWidth] = useState<number>(0);
    const labels = useMemo(() => budget.label?.split(",") || [], [budget]);

    const expired = useMemo<boolean>(
      () => new Date().toISOString() > budget.end,
      [budget]
    );
    const percent = useMemo(() => budget.current / budget.total, [budget]);
    const percentWidth = useMemo(() => {
      let width = barWidth;
      if (percent < 1) {
        width = barWidth * percent;
      }
      return width;
    }, [barWidth, percent]);
    const percentColor = useMemo(
      () =>
        percent >= 0.9
          ? tintColors.error
          : percent >= 0.8
          ? tintColors.warning
          : undefined,
      [percent]
    );
    const onPress = () => {
      if (handlePress) {
        handlePress(budget.id, index);
      }
    };
    const onLongPress = () => {
      if (handleLongPress) {
        handleLongPress(budget.id, index);
      } else if (handlePress) {
        handlePress(budget.id, index);
      }
    };

    // const handlePress = () => {
    //   if (selectMode && handleSelect) {
    //     handleSelect(budget.id || "", selected ? "delete" : "add");
    //   } else {
    //     handleEdit(index);
    //   }
    // };
    // const handleLongPress = () => {
    //   if (!selected && handleSelect) {
    //     handleSelect(budget.id || "", "add");
    //   }
    // };

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        className={` p-[20px] rounded-[20px] flex-col gap-[20px] ${
          selected
            ? `bg-black dark:bg-white`
            : expired
            ? "bg-paper-light dark:bg-paper-dark"
            : `bg-${colorCycle[(index % 3) as keyof typeof colorCycle]}`
        } `}
      >
        <View className=" flex-row items-center justify-between gap-2 ">
          <View className=" flex-1 flex-row items-center gap-2 ">
            {selected && (
              <ThemedIcon
                reverse
                source={icons.checkbox.checked}
                className=" w-[15px] h-[15px] "
              />
            )}
            {labels.length ? (
              <View className=" flex-row gap-[10px] flex-wrap ">
                {labels.map((label, index) => (
                  <LabelChip
                    key={index}
                    index={index}
                    name={label}
                    onPress={onPress}
                    color={selected ? "theme" : "dark"}
                  />
                ))}
              </View>
            ) : (
              <ThemedText
                toggleOnDark={selected}
                reverse={selected}
                className={` capitalize flex-1 font-urbanistMedium text-[1.5rem] ${
                  expired ? "text-divider" : ""
                } `}
              >
                {budget.title}
              </ThemedText>
            )}
          </View>
          {expired || percent >= 1 ? (
            <View
              className={` p-[5px] rounded-[5px] border ${
                expired ? "border-warning" : "border-error"
              } `}
            >
              <ThemedText
                toggleOnDark={false}
                className={` ${expired ? "text-warning" : "text-error"} `}
              >
                {expired ? "expired" : "overbudget"}
              </ThemedText>
            </View>
          ) : (
            !!budget.repeat && (
              <ThemedIcon
                toggleOnDark={selected}
                reverse={selected}
                source={icons.history}
                className=" w-[15px] h-[15px] "
              />
            )
          )}
        </View>
        <View className=" flex-row gap-2 ">
          <View className=" flex-1 flex-col gap-1 ">
            <ThemedText
              toggleOnDark={selected}
              reverse={selected}
              style={{ color: expired ? tintColors.divider : percentColor }}
              className=" font-urbanistBold "
            >
              Spent:
            </ThemedText>
            <ThemedText
              toggleOnDark={selected}
              reverse={selected}
              style={{ color: expired ? tintColors.divider : percentColor }}
              className=" font-urbanistMedium text-[1.5rem] "
            >
              -Ksh {formatAmount(budget.current, 10000)}
            </ThemedText>
          </View>
          <View className=" flex-1 flex-row justify-end ">
            <View className=" flex-col gap-1 ">
              <ThemedText
                toggleOnDark={selected}
                reverse={selected}
                style={{
                  color: expired ? tintColors.divider : undefined,
                }}
                className=" font-urbanistBold "
              >
                Max:
              </ThemedText>
              <ThemedText
                toggleOnDark={selected}
                reverse={selected}
                style={{
                  color: expired ? tintColors.divider : undefined,
                }}
                className=" font-urbanistMedium text-[1.5rem] "
              >
                Ksh {formatAmount(budget.total, 10000)}
              </ThemedText>
            </View>
          </View>
        </View>
        <View className=" flex-row justify-between gap-2 items-start">
          <ThemedText
            toggleOnDark={false}
            className={` capitalize flex-1 flex-row items-center text-divider `}
          >
            {dayjs(new Date(budget.start)).format(`ddd DD MMM YYYY`) +
              " - " +
              dayjs(new Date(budget.end)).format(`ddd DD MMM YYYY`)}
          </ThemedText>
        </View>
        <View className=" flex-row items-center gap-2 ">
          <View
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              setBarWidth(width);
            }}
            className={` h-[5px] relative rounded-[5px] flex-1 ${
              expired
                ? "bg-divider/20"
                : percent >= 0.9
                ? "bg-error/20"
                : percent >= 0.8
                ? "bg-warning/20"
                : selected
                ? "bg-white/20 dark:bg-black/20"
                : "bg-black/20"
            } `}
          >
            <View
              style={{ width: percentWidth }}
              className={` flex-1 rounded-[5px] ${
                expired
                  ? "bg-divider"
                  : percent >= 0.9
                  ? "bg-error"
                  : percent >= 0.8
                  ? "bg-warning"
                  : selected
                  ? "bg-white dark:bg-black"
                  : "bg-black"
              } `}
            />
          </View>
          <ThemedText
            style={{ color: expired ? tintColors.divider : percentColor }}
            toggleOnDark={selected}
            reverse={selected}
          >
            {(percent * 100).toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}
            %
          </ThemedText>
        </View>
      </Pressable>
    );
  }
);

export default BudgetCard;
