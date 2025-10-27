import ExpenseCard from "@/components/expenses/expenseCard";
import ExpensesExportModal from "@/components/expenses/exportModal";
import ExpenseSectionHeader from "@/components/expenses/sectionHeader";
import SelectActions from "@/components/expenses/selectActions";
import Filter from "@/components/filter";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { useCustomThemeContext } from "@/context/themeContext";
import { normalizeString, toastError } from "@/lib/appUtils";
import { getExpenses, groupExpenseSections } from "@/lib/expenseUtils";
import { exportExpenses } from "@/lib/exportUtils";
import { Expense } from "@/types/common";
import { MenuView, NativeActionEvent } from "@react-native-menu/menu";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import * as Progress from "react-native-progress";

const Collection = () => {
  const { theme } = useCustomThemeContext();
  const { collection, filter } = useLocalSearchParams() as {
    collection?: string;
    filter?: string;
  };
  const { open, setStatus, handleStatusClose } = useEditingContext();

  const [expenses, setExpenses] = useState<Partial<Expense>[]>([]);
  const [expenseIndicies, setExpenseIndicies] = useState<number[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Map<string, number>>(
    new Map()
  );
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [canGoNext, setCanGoNext] = useState<boolean>(false);

  const expenseCollection = useMemo(
    () => collection || "expenses",
    [collection]
  );
  const sections = useMemo<{ id: string; data: number[] }[]>(() => {
    const data = groupExpenseSections(expenses);
    setExpenseIndicies(data.indices);
    return data.groups;
  }, [expenses]);
  const allSelected = useMemo<boolean>(
    () => selected.size === expenseIndicies.length,
    [selected, expenseIndicies]
  );

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  const [sort, setSort] = useState<{
    property: string;
    direction: "DESC" | "ASC";
  }>({ property: "date", direction: "DESC" });
  const [page, setPage] = useState<number>(1);

  const [exportModal, setExportModal] = useState<{
    open: boolean;
    enableRange: boolean;
    handleSubmit: (
      properties: Set<string>,
      images: boolean,
      range?: { start: string; end: string }
    ) => void;
  }>({
    open: false,
    enableRange: false,
    handleSubmit(properties, images, range) {},
  });

  useEffect(() => {
    fetchExpenses({
      collection: expenseCollection,
      sort: filter ? { property: filter, direction: "DESC" } : undefined,
    });
    if (filter) {
      setSort({ property: filter, direction: "DESC" });
    }
  }, [expenseCollection, filter]);

  useEffect(() => {
    if (selectAll) {
      setSelected(new Set(expenseIndicies));
      setSelectedSections(
        new Map(sections.map(({ id, data }) => [id, data.length]))
      );
    }
  }, [expenseIndicies, selectAll]);

  const fetchExpenses = async (query: {
    search?: string;
    collection?: string;
    page?: number;
    sort?: { property: string; direction: "ASC" | "DESC" };
  }) => {
    try {
      setLoading(true);
      const data = await getExpenses({
        search,
        collection: expenseCollection,
        limit: 10,
        page: 1,
        sort,
        ...query,
      });
      setPage(1);
      setExpenses(data);
      setLoading(false);
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message: "An error occured while fetching expenses, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchTimeout((prev) => {
      if (prev) {
        clearTimeout(prev);
      }
      return setTimeout(async () => {
        await fetchExpenses({ search: normalizeString(text) });
      }, 500);
    });
    setSearch(text);
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
    fetchExpenses({ sort: change });
  };

  const handleNextPage = async () => {
    try {
      setLoading(true);
      const newPage = await getExpenses({
        search,
        collection: expenseCollection,
        sort,
        page: page + 1,
        limit: 10,
      });
      setExpenses((prev) => prev.concat(newPage));
      setLoading(false);

      setPage((prev) => prev + 1);
    } catch (error) {
      toastError(error, `An error occured while fetching expenses`);
    }
  };

  const handleHasReachedEnd = () => {
    if (!loading && canGoNext && expenses.length >= page * 10) {
      setCanGoNext(false);
      handleNextPage();
    }
  };

  const resetSelected = () => {
    setSelected(new Set());
    setSelectedSections(new Map());
    setSelectAll(false);
  };

  const handleTitleBtnClick = () => {
    if (selectMode) {
      resetSelected();
      setSelectMode(false);
    } else {
      router.back();
    }
  };

  const handleSelectAll = () => {
    if (selectMode) {
      if (allSelected) {
        resetSelected();
      } else {
        setSelectAll(true);
      }
    } else {
      setSelectMode(true);
    }
  };

  const handleSearchClear = () => {
    setSearch("");
    fetchExpenses({ search: "" });
  };

  const handleSectionSelect = useCallback(
    (section: { id: string; data: number[] }, selectAll: boolean) => {
      if (!selectMode) {
        setSelectMode(true);
      }
      setSelectedSections((prev) => {
        const newMap = new Map(prev);
        newMap.set(section.id, selectAll ? section.data.length : 0);
        return newMap;
      });
      setSelected((prev) => {
        const newSet = new Set(prev);
        for (let item of section.data) {
          if (selectAll) {
            newSet.add(item);
          } else {
            newSet.delete(item);
          }
        }
        return newSet;
      });
    },
    [selectMode]
  );

  const handleSelectItem = (
    index: number,
    action: "add" | "delete",
    sectionId?: string
  ) => {
    if (sectionId) {
      if (!selectMode) {
        setSelectMode(true);
      }
      setSelectedSections((prev) => {
        const newMap = new Map(prev);
        let count = newMap.get(sectionId) || 0;
        if (action === "delete") {
          count -= 1;
        } else {
          count += 1;
        }
        newMap.set(sectionId, count);
        return newMap;
      });
      setSelected((prev) => {
        const newSet = new Set(prev);
        newSet[action](index);
        return newSet;
      });
    }
  };

  const handleItemEdit = useCallback(
    (index: number) => {
      open({
        type: "expense",
        snapPoints: ["100%"],
        expenses: [expenses[index]],
        mode: "edit",
        indices: [index],
        handleUpdate: handleItemUpdate,
      });
    },
    [expenses]
  );

  const handleItemUpdate = (update: Map<number, Partial<Expense>>) => {
    setExpenses((prev) => {
      const newArr = Array.from(prev);
      for (let [index, expense] of update.entries()) {
        newArr[index] = expense;
      }
      return newArr;
    });
  };

  const handleItemPress = useCallback(
    (index: number, sectionId?: string) => {
      if (selectMode) {
        handleSelectItem(
          index,
          selected.has(index) ? "delete" : "add",
          sectionId
        );
      } else {
        handleItemEdit(index);
      }
    },
    [selected, handleItemEdit]
  );

  const handleItemLongPress = useCallback(
    (index: number, sectionId?: string) => {
      if (!selected.has(index)) {
        handleSelectItem(index, "add", sectionId);
      }
    },
    [selected, handleSelectItem]
  );

  const handleMenuActionClick = ({ nativeEvent }: NativeActionEvent) => {
    if (nativeEvent.event === "select") {
      setSelectMode(true);
    }
    if (nativeEvent.event === "export") {
      setExportModal({
        open: true,
        enableRange: true,
        handleSubmit: handleExportModalSubmit,
      });
    }
  };

  const handleExportModalSubmit = async (
    properties: Set<string>,
    images: boolean,
    range?: { start: string; end: string }
  ) => {
    try {
      if (!range) {
        throw new Error(`No date range selected`, { cause: 1 });
      }
      ToastAndroid.show(`Exporting expenses...`, ToastAndroid.SHORT);

      setStatus({
        open: true,
        type: "loading",
        title: "Exporting",
        message: "Exporting expenses...",
        handleClose: handleStatusClose,
        action: {
          callback() {},
        },
      });
      const data = await getExpenses({ range });

      if (!data.length) {
        handleStatusClose();
        throw new Error(`No expenses in selected date range`, { cause: 1 });
      }
      await exportExpenses(data, [...properties], images);
      ToastAndroid.show(`Expenses exported`, ToastAndroid.SHORT);
      handleStatusClose();
    } catch (error) {
      toastError(error, `An error occured while exporting expenses`);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      router.replace({
        pathname: "/expenses/collection",
        params: { collection, filter },
      });
    }, 500);
  };

  return (
    <>
      <View className=" flex-1 ">
        <View className=" pt-[10px] pb-[20px] flex-col gap-[20px] ">
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
                {selectMode ? `${selected.size} Selected` : expenseCollection}
              </ThemedText>
            </View>
            {selectMode ? (
              <Pressable onPress={handleSelectAll} className=" mt-[4px]">
                <ThemedIcon
                  source={icons.checkbox[allSelected ? "checked" : "unchecked"]}
                  className=" w-[20px] h-[20px] "
                />
              </Pressable>
            ) : (
              <MenuView
                title="Options"
                onPressAction={handleMenuActionClick}
                actions={[
                  {
                    id: "select",
                    title: "Select",
                    subtitle: "select multiple expenses",
                    image: Platform.select({
                      ios: "checkmark.circle",
                      android: "select",
                    }),
                    imageColor: tintColors[theme === "dark" ? "light" : "dark"],
                  },
                  {
                    id: "export",
                    title: "Export",
                    subtitle: "export expenses",
                    image: Platform.select({
                      ios: "square.and.arrow.up",
                      android: "share",
                    }),
                    imageColor: tintColors[theme === "dark" ? "light" : "dark"],
                  },
                ]}
                shouldOpenOnLongPress={false}
              >
                <View>
                  <ThemedIcon
                    source={icons.menu}
                    className=" w-[20px] h-[20px] "
                  />
                </View>
              </MenuView>
            )}
          </View>
          {selectMode ? (
            <SelectActions
              {...{
                collection: expenseCollection as string,
                expenses,
                setExpenses,
                selected,
                setSelectMode,
                resetSelected,
                setExportModal,
              }}
            />
          ) : (
            <View className=" flex-row items-center gap-2 ">
              <View className=" flex-1 flex-row items-center pl-[10px] pr-[10px] bg-paper-light rounded-[20px] dark:bg-paper-dark">
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
            </View>
          )}
        </View>
        {sections.length ? (
          <SectionList
            sections={sections}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            renderItem={({ item, section }) =>
              !!expenses[item] && (
                <ExpenseCard
                  {...{
                    index: item,
                    sectionId: section.id,
                    expense: expenses[item],
                    selected: selected.has(item),
                    handlePress: handleItemPress,
                    handleLongPress: handleItemLongPress,
                  }}
                />
              )
            }
            SectionSeparatorComponent={() => (
              <View className=" p-[10px] "></View>
            )}
            ItemSeparatorComponent={() => <View className=" p-[10px] "></View>}
            renderSectionHeader={({ section }) => (
              <ExpenseSectionHeader
                {...{
                  section,
                  selectMode,
                  selected:
                    selectedSections.get(section.id) === section.data.length,
                  handleSectionSelect,
                }}
              />
            )}
            renderSectionFooter={({ section }) => (
              <View className=" p-[20px] " />
            )}
            ListFooterComponent={() => (
              <View className=" flex-row items-center justify-center ">
                {loading && (
                  <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
                )}
              </View>
            )}
            ListHeaderComponent={() =>
              !selectMode && (
                <View className=" flex-row gap-2 items-center pb-[20px] ">
                  <ThemedText
                    toggleOnDark={false}
                    className=" text-divider font-urbanistMedium "
                  >
                    Sort by:
                  </ThemedText>
                  <Filter
                    title="Date"
                    value="date"
                    direction={sort.direction}
                    active={sort.property === "date"}
                    onPress={handleSortChange}
                  />
                  <Filter
                    title="Recently Edited"
                    value="modifiedAt"
                    direction={sort.direction}
                    active={sort.property === "modifiedAt"}
                    onPress={handleSortChange}
                  />
                </View>
              )
            }
            onEndReached={handleHasReachedEnd}
            onMomentumScrollBegin={() => setCanGoNext(true)}
          />
        ) : (
          <View className=" flex-1 flex-col gap-[10px] justify-center items-center ">
            {loading ? (
              <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
            ) : (
              <>
                <Image
                  source={icons.money}
                  className=" w-[50px] h-[50px] "
                  tintColor={tintColors.divider}
                />
                <ThemedText className=" text-[1.5rem] ">No Expenses</ThemedText>
              </>
            )}
          </View>
        )}
      </View>
      <ExpensesExportModal
        {...exportModal}
        handleClose={() =>
          setExportModal({
            open: false,
            enableRange: false,
            handleSubmit(properties, images, range) {},
          })
        }
      />
    </>
  );
};

export default Collection;
