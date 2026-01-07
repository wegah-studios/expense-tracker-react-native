import { useEditingContext } from "@/context/editingContext";
import { toastError } from "@/lib/appUtils";
import { getStoreItems } from "@/lib/storeUtils";
import { Href, router, useSegments } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import HelpFab from "../helpFab";
import BottomTabItem from "./bottomTabItem";

const BottomTabs = () => {
  const { setAddExpenseModal } = useEditingContext();
  const [_, tab] = useSegments();
  const paths: Record<string, Href> = useMemo(
    () => ({
      home: "/",
      expenses: "/expenses/collections",
      insights: "/insights",
      budgets: "/budgets",
    }),
    []
  );

  const [showFab, setShowFab] = useState<boolean>(false);

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const storage = await getStoreItems("showFab");
        if (storage["showFab"] === "false") {
          setShowFab(false);
        } else {
          setShowFab(true);
        }
      } catch (error) {
        toastError(error, `An error occured while fetching preferences`);
      }
    };
    fetchStorage();
  }, []);

  const handleTabPress = (
    type: "home" | "expenses" | "add" | "insights" | "budgets"
  ) => {
    if (type !== "add") {
      router.push(paths[type]);
    } else {
      setAddExpenseModal(true);
    }
  };

  return (
    <View className=" h-[50px] flex-row gap-2 rounded-[10px] bg-paper-light dark:bg-paper-dark relative ">
      {showFab && <HelpFab />}
      <BottomTabItem type="home" tab={tab} onPress={handleTabPress} />
      <BottomTabItem type="expenses" tab={tab} onPress={handleTabPress} />
      <BottomTabItem type="add" tab={tab} onPress={handleTabPress} />
      <BottomTabItem type="insights" tab={tab} onPress={handleTabPress} />
      <BottomTabItem type="budgets" tab={tab} onPress={handleTabPress} />
    </View>
  );
};

export default BottomTabs;
