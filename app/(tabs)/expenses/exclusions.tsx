import AddExclusionModal from "@/components/expenses/addExclusionModal";
import ExclusionCard from "@/components/expenses/exclusionCard";
import SelectAction from "@/components/expenses/selectAction";
import FormattedText from "@/components/formattedText";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useEditingContext } from "@/context/editingContext";
import { useAppProps } from "@/context/propContext";
import { normalizeString, toastError } from "@/lib/appUtils";
import { createCollection } from "@/lib/collectionsUtils";
import { deleteExclusions } from "@/lib/exclusionUtils";
import { getStoreItems, setStoreItems } from "@/lib/storeUtils";
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

const ExclusionsPage = () => {
  const { setStatus, handleStatusClose } = useEditingContext();
  const { collections, setCollections, fetchCollections } = useAppProps() as {
    collections: {
      map: Map<string, number>;
      names: string[];
      exclusions: string[];
    };
    setCollections: React.Dispatch<
      React.SetStateAction<{
        map: Map<string, number>;
        names: string[];
        exclusions: string[];
      }>
    >;
    fetchCollections: () => Promise<void>;
  };

  const [add, setAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [showInfo, setShowInfo] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const info = useMemo(
    () =>
      "These are expenses that are ^b|not included^ in your spending when imported from ^b|Mpesa messages^ and ^b|statements^. \nExpenses sent to the ^b|recipients^ below will be ^b|excluded^ from your total.",
    []
  );
  const filteredExclusions = useMemo(
    () =>
      collections.exclusions?.filter((item) =>
        item.includes(normalizeString(search))
      ) || [],
    [search, collections.exclusions]
  );
  const allSelected = useMemo<boolean>(
    () => selected.size === filteredExclusions.length,
    [filteredExclusions, selected]
  );

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const storage = await getStoreItems("disableExclusionsInfo");
        if (!storage.disableExclusionsInfo) {
          setShowInfo(true);
        }
      } catch (error) {
        toastError(error, "Error fetching preferences.");
      }
    };
    fetchStorage();
  }, []);

  const handleSearchChange = (text: string) => {
    setSearch(text);
  };

  const handleGotIt = async () => {
    setStoreItems([["disableExclusionsInfo", "true"]]);
    setShowInfo(false);
  };

  const resetSelected = () => {
    setSelected(new Set());
    setSelectMode(false);
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
    setAdd(true);
  };

  const handleAddSubmit = async (exclusion: string) => {
    try {
      setStatus({
        open: true,
        type: "loading",
        title: "Updating",
        message: "Adding new exclusion",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      await createCollection("exclusion/" + exclusion);
      setCollections((prev) => {
        prev.map = new Map(prev.map);
        prev.map.set(exclusion, 0);
        prev.exclusions = [exclusion, ...prev.exclusions];
        return { ...prev };
      });
      setStatus({
        open: true,
        type: "info",
        title: "Success",
        message: `Expenses sent to to ^b|"${exclusion}"^ wont be added to your spending.`,
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message: "An error occured while adding exclusion, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredExclusions));
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

  const handleItemPress = (exclusion: string) => {
    if (selectMode) {
      handleItemSelect(exclusion, selected.has(exclusion) ? "delete" : "add");
    } else {
      router.push({ pathname: "/expenses/collection", params: { exclusion } });
    }
  };

  const handleItemLongPress = (exclusion: string) => {
    if (!selected.has(exclusion)) {
      handleItemSelect(exclusion, "add");
    }
  };

  const handleDelete = async () => {
    try {
      setStatus({
        open: true,
        type: "warning",
        title: "Delete exclusions?",
        message:
          "Are you sure you want to delete the selected exclusions? All excluded expenses will also be deleted.",
        handleClose: handleStatusClose,
        action: {
          title: "Delete",
          async callback() {
            setStatus({
              open: true,
              type: "loading",
              title: "Deleting",
              message: "Deleting selected exclusions",
              handleClose: handleStatusClose,
              action: {
                callback: handleStatusClose,
              },
            });
            const results = await deleteExclusions(selected, collections);
            setCollections(results);
            setStatus({
              open: true,
              type: "success",
              message: "Selected exclusions deleted",
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
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      fetchCollections();
      router.replace({ pathname: "/expenses/exclusions" });
    }, 500);
  };

  return (
    <>
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
                {selectMode ? `${selected.size} Selected` : "Exclusions"}
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

        {filteredExclusions.length ? (
          <FlatList
            ListHeaderComponent={() => (
              <View className=" pt-[10px] pb-[10px] ">
                {showInfo && (
                  <View className=" p-[20px] mb-[10px] bg-primary rounded-[20px] flex-col gap-4 items-start  ">
                    <Image
                      source={icons.info}
                      className=" w-[20px] h-[20px] "
                    />
                    <FormattedText
                      text={info}
                      props={{
                        container: { toggleOnDark: false },
                        text: { toggleOnDark: false },
                      }}
                    />
                    <Pressable
                      onPress={handleGotIt}
                      className=" p-[20px] pt-[5px] pb-[5px] bg-black rounded-[20px] "
                    >
                      <ThemedText toggleOnDark={false} reverse>
                        Got it
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
            data={filteredExclusions}
            renderItem={({ item, index }) => (
              <ExclusionCard
                index={index + 1}
                value={item}
                count={collections.map.get(item) || 0}
                selected={selected.has(item)}
                handlePress={handleItemPress}
                handleLongPress={handleItemLongPress}
              />
            )}
            ItemSeparatorComponent={() => <View className=" p-[10px] "></View>}
          />
        ) : (
          <View
            className={` flex-1 flex-col items-center gap-[30px] ${
              showInfo ? "" : "justify-center"
            } `}
          >
            {showInfo && (
              <View className=" p-[20px] bg-primary rounded-[20px] flex-col gap-4 items-start  ">
                <Image source={icons.info} className=" w-[20px] h-[20px] " />
                <FormattedText
                  text={info}
                  props={{
                    container: { toggleOnDark: false },
                    text: { toggleOnDark: false },
                  }}
                />
                <Pressable
                  onPress={handleGotIt}
                  className=" p-[20px] pt-[5px] pb-[5px] bg-black rounded-[20px] "
                >
                  <ThemedText toggleOnDark={false} reverse>
                    Got it
                  </ThemedText>
                </Pressable>
              </View>
            )}
            <View className=" p-[10px] rounded-[50%] border-[3px] border-divider ">
              <Image
                source={icons.add}
                className=" w-[30px] h-[30px] rotate-45 "
                tintColor={tintColors.divider}
              />
            </View>
            <ThemedText className=" text-[1.5rem] ">No Exclusions</ThemedText>
            <Pressable
              onPress={handleAdd}
              className=" flex-row gap-2 items-center p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white "
            >
              <ThemedIcon
                reverse
                source={icons.add}
                className=" w-[10px] h-[10px] "
              />
              <ThemedText reverse className=" text-white ">
                Add New Exclusion
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
      <AddExclusionModal
        open={add}
        collections={collections.map}
        handleClose={() => setAdd(false)}
        handleSubmit={handleAddSubmit}
      />
    </>
  );
};

export default ExclusionsPage;
