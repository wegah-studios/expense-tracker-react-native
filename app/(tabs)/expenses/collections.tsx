import AddCollectionModal from "@/components/expenses/addCollectionModal";
import CollectionCard from "@/components/expenses/collectionCard";
import SelectAction from "@/components/expenses/selectAction";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import icons from "@/constants/icons";
import { useAppProps } from "@/context/propContext";
import { createCollection, deleteCollections } from "@/lib/collectionsUtils";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import * as Progress from "react-native-progress";

const Collections = () => {
  const { loading, collections, setCollections } = useAppProps() as {
    loading: boolean;
    collections: {
      map: Map<string, number>;
      names: string[];
    };
    setCollections: React.Dispatch<
      React.SetStateAction<{
        map: Map<string, number>;
        names: string[];
      }>
    >;
  };

  const [expand, setExpand] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<boolean>(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const allSelected = useMemo<boolean>(
    () => selected.size === collections.names.length,
    [selected, collections.names]
  );

  const handleTitleBtnClick = () => {
    if (selectMode) {
      reset();
    } else {
      router.back();
    }
  };

  const reset = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(collections.names));
    }
  };

  const handleAdd = async (collection: string) => {
    setCollections((prev) => {
      const newMap = new Map(prev.map);
      newMap.set(collection, 0);
      return { map: newMap, names: [collection, ...prev.names] };
    });
    await createCollection(collection);
  };

  const handleNavigate = (collection: string) => {
    router.push({ pathname: "/expenses/collection", params: { collection } });
  };

  const handleCollectionPress = (name: string) => {
    if (selectMode) {
      setSelected((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(name)) {
          newSet.delete(name);
        } else {
          newSet.add(name);
        }
        return newSet;
      });
    } else {
      handleNavigate(name);
    }
  };

  const handleCollectionLongPress = (name: string) => {
    if (!selectMode) {
      setSelectMode(true);
    }
    if (!selected.has(name)) {
      setSelected((prev) => {
        const newSet = new Set(prev);
        newSet.add(name);
        return newSet;
      });
    }
  };

  const handleDelete = async () => {
    const result = await deleteCollections(selected, collections);
    setCollections(result);
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <>
      <View className=" flex-1 ">
        <View className=" pt-[10px] pb-[10px] flex-col gap-2 ">
          <View className=" flex-row justify-between gap-1">
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
                {selectMode ? `${selected.size} Selected` : "Collections"}
              </ThemedText>
            </View>
            {selectMode && (
              <Pressable onPress={handleSelectAll}>
                <ThemedIcon
                  source={icons.checkbox[allSelected ? "checked" : "unchecked"]}
                  className=" w-[20px] h-[20px] "
                />
              </Pressable>
            )}
          </View>
          {selectMode && (
            <View className=" flex-row items-center p-[10px] bg-paper-light rounded-[20px] dark:bg-paper-dark ">
              <SelectAction
                type="delete"
                disabled={!selected.size}
                handlePress={handleDelete}
              />
            </View>
          )}
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {loading ? (
            <View className=" flex-1 flex-col items-center justify-center gap-[20px] ">
              <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
              <ThemedText>Loading</ThemedText>
            </View>
          ) : (
            <View className=" flex-1 flex-col gap-[30px] pt-[10px] pb-[20px] ">
              <View>
                <ScrollView
                  horizontal={!expand}
                  showsHorizontalScrollIndicator={false}
                >
                  <View
                    className={` flex-row items-start gap-[10px] ${
                      expand ? "flex-wrap" : ""
                    } `}
                  >
                    <CollectionCard
                      selected={false}
                      handlePress={() => setAddMode(true)}
                      handleLongPress={() => setAddMode(true)}
                      name="add"
                    />
                    {collections.names.map((name, index) => (
                      <CollectionCard
                        key={index}
                        name={name}
                        count={collections.map.get(name)}
                        selected={selected.has(name)}
                        handlePress={handleCollectionPress}
                        handleLongPress={handleCollectionLongPress}
                      />
                    ))}
                  </View>
                </ScrollView>
                {collections.names.length > 2 && (
                  <Pressable
                    onPress={() => setExpand((prev) => !prev)}
                    className=" pt-[10px] pb-[10px] flex-row items-center justify-center gap-2 "
                  >
                    <ThemedIcon
                      source={icons.chevron}
                      className={` w-[15px] h-[15px] ${
                        expand ? "rotate-180" : "rotate-0"
                      } `}
                    />
                    <ThemedText>{expand ? "Collapse" : "Expand"}</ThemedText>
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={() => handleNavigate("expenses")}
                className=" h-[200px] p-[20px] gap-[20px] bg-primary rounded-[20px] flex-col justify-center "
              >
                <View className=" flex-row justify-between ">
                  <Image source={icons.money} className=" w-[40px]  h-[40px]" />
                  <Image
                    source={icons["arrow"]}
                    className=" w-[20px] h-[20px] rotate-[-45deg]"
                  />
                </View>
                <ThemedText
                  toggleOnDark={false}
                  className=" font-urbanistBold text-[2rem] "
                >
                  Expenses
                </ThemedText>
                <ThemedText toggleOnDark={false}>
                  {`${collections.map.get("expenses")} item${
                    collections.map.get("expenses") === 1 ? "" : "s"
                  }`}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleNavigate("failed")}
                className=" p-[20px] flex-row items-center rounded-[20px] gap-5 bg-secondary "
              >
                <Image source={icons.warning} className=" w-[30px] h-[30px] " />
                <View className=" flex-col flex-1 ">
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistMedium text-[1.3rem] "
                  >
                    Incomplete
                  </ThemedText>
                  <ThemedText toggleOnDark={false}>{`${collections.map.get(
                    "failed"
                  )} item${
                    collections.map.get("failed") === 1 ? "" : "s"
                  }`}</ThemedText>
                </View>
                <Image
                  source={icons.chevron}
                  className=" w-[20px] h-[20px]  rotate-[-90deg] "
                />
              </Pressable>
              <Pressable
                onPress={() => handleNavigate("trash")}
                className=" p-[20px] flex-row items-center rounded-[20px] gap-5 bg-accent "
              >
                <Image source={icons.delete} className=" w-[30px] h-[30px] " />
                <View className=" flex-col flex-1 ">
                  <ThemedText
                    toggleOnDark={false}
                    className=" font-urbanistMedium text-[1.3rem] "
                  >
                    Deleted
                  </ThemedText>
                  <ThemedText toggleOnDark={false}>{`${collections.map.get(
                    "trash"
                  )} item${
                    collections.map.get("trash") === 1 ? "" : "s"
                  }`}</ThemedText>
                </View>
                <Image
                  source={icons.chevron}
                  className=" w-[20px] h-[20px]  rotate-[-90deg] "
                />
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
      <AddCollectionModal
        open={addMode}
        collections={collections.map}
        handleClose={() => setAddMode(false)}
        handleSubmit={handleAdd}
      />
    </>
  );
};

export default Collections;
