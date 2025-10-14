import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { toastError } from "@/lib/appUtils";
import { getExpenses } from "@/lib/expenseUtils";
import { Expense } from "@/types/common";
import { Link, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import ExpenseCard from "../expenses/expenseCard";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const HomeExpenseWidget = () => {
  const { open } = useEditingContext();
  const [expenses, setExpenses] = useState<Partial<Expense>[]>([]);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await getExpenses({
          collection: "expenses",
          limit: 5,
          page: 1,
        });
        setExpenses(data as Partial<Expense>[]);
      } catch (error) {
        toastError(error, `An error occured while fetching expenses`);
      }
    };
    fetchExpenses();
  }, []);

  const handleUpdate = () => {
    router.replace("/");
  };

  const handleEdit = (index: number) => {
    open({
      type: "expense",
      snapPoints: ["100%"],
      expenses: [expenses[index]],
      mode: "edit",
      indices: [index],
      handleUpdate,
    });
  };

  return (
    <View className=" gap-[30px] ">
      <View className=" flex-row items-center justify-between ">
        <ThemedText className=" font-urbanistBold text-[1.5rem]">
          Expenses
        </ThemedText>
        <Link
          href={{
            pathname: "/expenses/collection",
            params: { collection: "expenses" },
          }}
          asChild
        >
          <Pressable className=" flex-row items-center gap-1 ">
            <ThemedText>View More</ThemedText>
            <ThemedIcon
              source={icons.arrow}
              className=" w-[10px] h-[10px] rotate-[-45deg] "
            />
          </Pressable>
        </Link>
      </View>
      {expenses.length ? (
        <>
          <View className=" flex-col gap-[20px]">
            {expenses.map((expense, index) => (
              <ExpenseCard
                key={index}
                index={index}
                expense={expense}
                handlePress={handleEdit}
              />
            ))}
          </View>
        </>
      ) : (
        <View className=" h-[200px] flex-col gap-2 justify-center items-center ">
          <Image
            source={icons.money}
            className=" w-[40px] h-[40px] "
            tintColor={tintColors.divider}
          />
          <ThemedText>No Expenses</ThemedText>
        </View>
      )}
    </View>
  );
};

export default HomeExpenseWidget;
