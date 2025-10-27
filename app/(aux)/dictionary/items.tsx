import DictionaryItemComponent from "@/components/dictionary/item";
import SelectAction from "@/components/expenses/selectAction";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { normalizeString, toastError } from "@/lib/appUtils";
import {
  deleteDictionaryItems,
  getDictionaryItems,
} from "@/lib/dictionaryUtils";
import { DictionaryItem, DictionaryItemType } from "@/types/common";
import { router, useLocalSearchParams } from "expo-router";
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

const DictionaryItems = () => {
  const { type } = useLocalSearchParams() as { type: DictionaryItemType };
  const { open, setStatus, handleStatusClose } = useEditingContext();

  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [canGoNext, setCanGoNext] = useState<boolean>(false);

  const ids = useMemo<string[]>(() => items.map((item) => item.id), [items]);
  const allSelected = useMemo<boolean>(
    () => selected.size === ids.length,
    [ids, selected]
  );

  useEffect(() => {
    fetchItems({});
  }, []);

  useEffect(() => {
    if (selectAll) {
      setSelected(new Set(ids));
    }
  }, [ids, selectAll]);

  const handleSearchChange = (text: string) => {
    setSearchTimeout((prev) => {
      if (prev) {
        clearTimeout(prev);
      }
      return setTimeout(async () => {
        await fetchItems({ search: normalizeString(text) });
      }, 500);
    });
    setSearch(text);
  };

  const fetchItems = async (query: { search?: string; page?: number }) => {
    try {
      setLoading(true);
      const data = await getDictionaryItems({
        type,
        search,
        page: 1,
        ...query,
      });
      setItems(data);
      setPage(1);
      setLoading(false);
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message:
          "An error occured while fetching dictionary items, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleNextPage = async () => {
    try {
      setLoading(true);
      const newPage = await getDictionaryItems({
        type,
        search,
        page: page + 1,
      });
      setItems((prev) => prev.concat(newPage));
      setLoading(false);

      setPage((prev) => prev + 1);
    } catch (error) {
      toastError(error, `An error occured while fetching more items`);
    }
  };

  const handleHasReachedEnd = () => {
    if (!loading && canGoNext && items.length >= page * 10) {
      setCanGoNext(false);
      handleNextPage();
    }
  };

  const resetSelected = () => {
    setSelected(new Set());
    setSelectMode(false);
    setSelectAll(false);
  };

  const handleTitleBtnClick = () => {
    if (selectMode) {
      resetSelected();
    } else {
      router.back();
    }
  };

  const handleAction = () => {
    if (selectMode) {
      handleSelectAll();
    } else {
      handleAdd();
    }
  };

  const handleAdd = () => {
    open({
      type: "dictionary",
      snapPoints: ["80%"],
      index: 0,
      item: {},
      mode: "add",
      matchType: type,
      handleUpdate: onItemAdd,
    });
  };

  const onItemAdd = (update: DictionaryItem) => {
    setItems((prev) => [update, ...prev]);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
      setSelectAll(false);
    } else {
      setSelectAll(true);
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
      type: "dictionary",
      snapPoints: ["80%"],
      index,
      item: items[index],
      mode: "edit",
      matchType: type,
      handleUpdate: onItemUpdate,
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

  const onItemUpdate = (update: Partial<DictionaryItem>, index: number) => {
    setItems((prev) => {
      const newArr = Array.from(prev);
      newArr[index] = update as DictionaryItem;
      return newArr;
    });
  };

  const handleDelete = async () => {
    try {
      setStatus({
        open: true,
        type: "loading",
        title: "Deleting Items",
        message: "Deleting selected items, please wait.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      await deleteDictionaryItems(selected, type);
      setItems((prev) => prev.filter((item) => !selected.has(item.id)));
      resetSelected();
      handleStatusClose();
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message: "An error occured while deleting items, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleSearchClear = () => {
    setSearch("");
    fetchItems({ search: "" });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      router.replace("/dictionary/items");
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
              {selectMode ? `${selected.size} Selected` : type + "s"}
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
      {!!items.length ? (
        <FlatList
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
          data={items}
          renderItem={({ item, index }) => (
            <DictionaryItemComponent
              {...{
                index,
                item,
                selected: selected.has(item.id),
                handlePress: handleItemPress,
                handleLongPress: handleItemLongPress,
              }}
            />
          )}
          ListHeaderComponent={() => <View className=" p-[10px] "></View>}
          ItemSeparatorComponent={() => <View className=" p-[10px] "></View>}
          ListFooterComponent={() => (
            <View className=" p-[10px] flex-row items-center justify-center ">
              {loading && (
                <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
              )}
            </View>
          )}
          onEndReached={handleHasReachedEnd}
          onMomentumScrollBegin={() => setCanGoNext(true)}
        />
      ) : (
        <View className=" flex-1 flex-col justify-center items-center gap-2 ">
          <Image
            source={icons[type === "keyword" ? "keyword" : "dictionary"]}
            className=" w-[40px] h-[40px] "
            tintColor={tintColors.divider}
          />
          <ThemedText>No {type}s</ThemedText>
        </View>
      )}
    </View>
  );
};

export default DictionaryItems;
