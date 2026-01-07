import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { toastError } from "@/lib/appUtils";
import { getHomeBudget } from "@/lib/budgetUtils";
import { Budget } from "@/types/common";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import * as Progress from "react-native-progress";
import BudgetCard from "../budget/budgetCard";
import ThemedText from "../textThemed";

const HomeBudgetWidget = ({
  scope,
}: {
  scope: number;
}) => {
  const { open } = useEditingContext();
  const [record, setRecord] = useState<Map<number, Budget | null>>(new Map());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        setLoading(true);
        if (record.has(scope)) {
          setBudget(record.get(scope) || null);
          setLoading(false);
          return;
        }

        const { budget: newBudget, record: newRecord } = await getHomeBudget(
          scope,
          record
        );
        setBudget(newBudget);
        setRecord(newRecord);
        setLoading(false);
      } catch (error) {
        toastError(error, `An error occured while fetching budget`);
      }
    };
    fetchBudget()
  }, [scope]);

  const handlePress = () => {
    if (budget) {
      router.push("/budgets");
    } else {
      open({
        type: "budgets",
        snapPoints: ["80%", "100%"],
        budget: {},
        mode: "add",
        handleUpdate,
      });
    }
  };

  const handleUpdate = (result: Partial<Budget>, index: number) => {
    router.replace("/");
  };

  return loading ? (
    <View className=" p-[10px] min-h-[100px] flex-col items-center justify-center rounded-[20px] bg-secondary">
      <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
    </View>
  ) : budget ? (
    <BudgetCard index={scope + 1} budget={budget} handlePress={handlePress} />
  ) : (
    <Pressable
      onPress={handlePress}
      className=" p-[10px] rounded-[20px] bg-secondary flex-row gap-2"
    >
      <View className=" p-[20px] flex-1 flex-row justify-between items-center ">
        <View className=" flex-row items-center gap-2 ">
          <Image
            source={icons.budgets.filled}
            className=" w-[40px] h-[40px] "
            tintColor={tintColors.divider}
          />
          <View className=" flex-col gap-2 ">
            <View className=" flex-row justify-between ">
              <ThemedText
                toggleOnDark={false}
                className=" font-urbanistMedium text-[1.5rem] "
              >
                No Active Budget
              </ThemedText>
              <Image
                source={icons.arrow}
                className=" w-[20px] h-[20px] rotate-[-45deg] "
              />
            </View>
            <ThemedText toggleOnDark={false} className=" text-divider ">
              Add a budget to start monitoring your spending
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default HomeBudgetWidget;
