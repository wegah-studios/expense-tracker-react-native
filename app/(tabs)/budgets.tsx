import BudgetCard from "@/components/budget/budgetCard";
import SelectAction from "@/components/expenses/selectAction";
import Filter from "@/components/filter";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { useCustomThemeContext } from "@/context/themeContext";
import { normalizeString, toastError } from "@/lib/appUtils";
import { deleteBudgets, getBudgets } from "@/lib/budgetUtils";
import { Budget } from "@/types/common";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";
import * as Progress from "react-native-progress";

const Budgets = () => {
  const { currency } = useCustomThemeContext();
  const { open, setStatus, handleStatusClose } = useEditingContext();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const ids = useMemo<string[]>(
    () => budgets.map((budget) => budget.id) || [],
    [budgets]
  );
  const [page, setPage] = useState<number>(1);
  const [sort, setSort] = useState<{
    property: string;
    direction: "DESC" | "ASC";
  }>({ property: "current", direction: "DESC" });
  const [search, setSearch] = useState<string>("");
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [canGoNext, setCanGoNext] = useState<boolean>(false);
  const allSelected = useMemo<boolean>(
    () => selected.size === ids.length,
    [ids, selected]
  );

  const handleAdd = () => {
    open({
      type: "budgets",
      snapPoints: ["80%"],
      budget: {},
      mode: "add",
      handleUpdate: onAdd,
    });
  };

  const onAdd = (update: Budget) => {
    setBudgets((prev) => [update, ...prev]);
    setStatus({
      open: true,
      type: "success",
      message: "New budget added.",
      handleClose: handleStatusClose,
      action: {
        callback: handleStatusClose,
      },
    });
  };

  useEffect(() => {
    fetchBudgets({});
  }, []);

  useEffect(() => {
    if (selectAll) {
      setSelected(new Set(ids));
    }
  }, [ids, selectAll]);

  const fetchBudgets = async (query: {
    search?: string;
    page?: number;
    sort?: { direction: "ASC" | "DESC"; property: string };
  }) => {
    try {
      setLoading(true);
      const results = await getBudgets({ search, page: 1, ...query });
      setPage(1);
      setBudgets(results);
      setLoading(false);
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message: "An error occured while fetching budgets, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleSortChange = (value: string, direction: "DESC" | "ASC") => {
    let change = { ...sort };
    if (change.property === value) {
      if (direction === "ASC") {
        change.direction = "DESC";
      } else {
        change.direction = "ASC";
      }
    } else {
      change = { property: value, direction: "DESC" };
    }
    setSort(change);
    fetchBudgets({ sort: change });
  };

  const handleSearchChange = (text: string) => {
    setSearchTimeout((prev) => {
      if (prev) {
        clearTimeout(prev);
      }
      return setTimeout(async () => {
        await fetchBudgets({ search: normalizeString(text) });
      }, 500);
    });
    setSearch(text);
  };

  const handleSearchClear = () => {
    setSearch("");
    fetchBudgets({ search: "" });
  };

  const handleNextPage = async () => {
    try {
      setLoading(true);
      const newPage = await getBudgets({
        search,
        page: page + 1,
      });
      setBudgets((prev) => prev.concat(newPage));
      setLoading(false);
      setPage((prev) => prev + 1);
    } catch (error) {
      toastError(error, `An error occured while fetching expenses`);
    }
  };

  const handleHasReachedEnd = () => {
    if (!loading && canGoNext && budgets.length >= page * 5) {
      setCanGoNext(false);
      handleNextPage();
    }
  };

  const handleItemSelect = (id: string, action: "add" | "delete") => {
    if (!selectMode) {
      setSelectMode(true);
    }
    setSelected((prev) => {
      const newSet = new Set(prev);
      newSet[action](id);
      return newSet;
    });
  };

  const handleItemEdit = (index: number) => {
    open({
      mode: "edit",
      type: "budgets",
      snapPoints: ["80%"],
      budget: budgets[index],
      index,
      handleUpdate: onItemUpdate,
    });
  };

  const onItemUpdate = (update: Budget, index: number) => {
    setBudgets((prev) => {
      const newArr = Array.from(prev);
      newArr[index] = update;
      return newArr;
    });
    setStatus({
      open: true,
      type: "success",
      message: "Budget successfully updated.",
      handleClose: handleStatusClose,
      action: {
        callback: handleStatusClose,
      },
    });
  };

  const handleItemPress = (id: string, index: number) => {
    if (selectMode) {
      handleItemSelect(id, selected.has(id) ? "delete" : "add");
    } else {
      handleItemEdit(index);
    }
  };

  const handleItemLongPress = (id: string, index: number) => {
    if (!selected.has(id)) {
      handleItemSelect(id, "add");
    }
  };

  const resetSelected = () => {
    setSelected(new Set());
    setSelectMode(false);
    setSelectAll(false);
  };

  const handleAction = () => {
    if (selectMode) {
      handleSelectAll();
    } else {
      handleAdd();
    }
  };

  const handleTitleBtnClick = () => {
    if (selectMode) {
      resetSelected();
    } else {
      router.back();
    }
  };

  const handleSelectAll = () => {
    if (selected.size !== ids.length) {
      setSelectAll(true);
    } else {
      setSelected(new Set());
      setSelectAll(false);
    }
  };

  const handleDelete = async () => {
    try {
      setStatus({
        open: true,
        type: "warning",
        title: "Delete budgets?",
        message: "Are you sure you want to delete the selected budgets?",
        handleClose: handleStatusClose,
        action: {
          title: "Delete",
          async callback() {
            setStatus({
              open: true,
              type: "loading",
              title: "Deleting",
              message: "Deleting selected budgets",
              handleClose: handleStatusClose,
              action: {
                callback: handleStatusClose,
              },
            });
            await deleteBudgets(selected);
            setBudgets((prev) =>
              prev ? prev.filter((budget) => !selected.has(budget.id)) : prev
            );
            setStatus({
              open: true,
              type: "success",
              message: "Selected budgets deleted",
              handleClose: handleStatusClose,
              action: {
                callback() {
                  resetSelected();
                  handleStatusClose();
                },
              },
            });
          },
        },
      });
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message: "An error occured while deleting budgets, please try again",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      router.replace("/budgets");
    }, 500);
  };

  return (
    <View className=" flex-1 ">
      <View className=" pt-[10px] pb-[10px] flex-col gap-[20px] ">
        <View className=" flex-row justify-between items-center  gap-1 ">
          <View className=" flex-row items-center">
            <Pressable
              onPress={handleTitleBtnClick}
              className=" w-[40px] h-[40px] flex-row items-center   "
            >
              <ThemedIcon
                source={icons[selectMode ? "add" : "arrow"]}
                className={` w-[20px] h-[20px] ${
                  selectMode ? "rotate-45" : "rotate-180"
                }`}
              />
            </Pressable>
            <ThemedText className=" font-urbanistBold text-[2rem] capitalize">
              {selectMode ? `${selected.size} Selected` : "Budgets"}
            </ThemedText>
          </View>
          <Pressable onPress={handleAction} className="">
            {selectMode ? (
              <ThemedIcon
                source={icons.checkbox[allSelected ? "checked" : "unchecked"]}
                className=" w-[25px] h-[25px] "
              />
            ) : (
              <View className=" p-[10px] rounded-[50%] bg-black dark:bg-white ">
                <ThemedIcon
                  reverse
                  source={icons.add}
                  className=" w-[15px] h-[15px] "
                />
              </View>
            )}
          </Pressable>
        </View>
        <View>
          {selectMode ? (
            <View className=" flex-row items-center p-[10px] bg-paper-light rounded-[20px] dark:bg-paper-dark ">
              <SelectAction
                type="delete"
                disabled={!selected.size}
                handlePress={handleDelete}
              />
            </View>
          ) : (
            <View className=" flex-row items-center pl-[10px] pr-[10px] bg-paper-light rounded-[20px] dark:bg-paper-dark ">
              <Image
                source={icons.search}
                className=" w-[15px] h-[15px] "
                tintColor={tintColors.divider}
              />
              <TextInput
                onChangeText={handleSearchChange}
                value={search}
                placeholder="Search"
                className=" flex-1 dark:color-white "
                placeholderTextColor={tintColors.divider}
              />
              {!!search.length && (
                <Pressable onPress={handleSearchClear}>
                  <ThemedIcon
                    source={icons.add}
                    className=" w-[15px] h-[15px] rotate-45 "
                  />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
      {!!budgets.length ? (
        <FlatList
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          data={budgets}
          ListFooterComponent={() => (
            <View className=" p-[10px] flex-row items-center justify-center ">
              {loading && (
                <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
              )}
            </View>
          )}
          ListHeaderComponent={() =>
            !selectMode && (
              <View className=" pt-[10px] pb-[10px] flex-row gap-2 items-center mb-[10px] ">
                <ThemedText
                  toggleOnDark={false}
                  className=" text-divider font-urbanistMedium "
                >
                  Sort by:
                </ThemedText>
                <Filter
                  title="Amount Spent"
                  value="current"
                  direction={sort.direction}
                  active={sort.property === "current"}
                  onPress={handleSortChange}
                />
                <Filter
                  title="Maximum Amount"
                  value="total"
                  direction={sort.direction}
                  active={sort.property === "total"}
                  onPress={handleSortChange}
                />
              </View>
            )
          }
          onEndReached={handleHasReachedEnd}
          onMomentumScrollBegin={() => setCanGoNext(true)}
          ItemSeparatorComponent={() => <View className=" p-[10px]"></View>}
          renderItem={({ item, index }) => (
            <BudgetCard
              {...{
                index,
                currency,
                budget: item,
                selected: selected.has(item.id),
                handlePress: handleItemPress,
                handleLongPress: handleItemLongPress,
              }}
            />
          )}
        />
      ) : (
        <View className=" flex-1 flex-col gap-2 items-center justify-center ">
          {loading ? (
            <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
          ) : (
            <>
              <Image
                source={icons.budgets.filled}
                className=" w-[40px] h-[40px] "
                tintColor={tintColors.divider}
              />
              <ThemedText>No Budget</ThemedText>
              <Pressable
                onPress={handleAdd}
                className=" mt-[30px] mb-[20px] flex-row gap-2 items-center p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white "
              >
                <ThemedIcon
                  reverse
                  source={icons.add}
                  className=" w-[10px] h-[10px] "
                />
                <ThemedText reverse className=" text-white ">
                  Add Budget
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
};

export default Budgets;
