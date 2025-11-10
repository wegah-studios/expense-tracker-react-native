import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { normalizeString, toastError } from "@/lib/appUtils";
import { createCollection } from "@/lib/collectionsUtils";
import validateInput from "@/lib/validateInput";
import React, { useCallback, useState } from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import InputField from "../inputField";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const MoveModal = ({
  open,
  collection,
  collections,
  setCollections,
  handleClose,
  handleSubmit,
}: {
  open: boolean;
  collection?: string;
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
  handleClose: () => void;
  handleSubmit: (collection: string) => void;
}) => {
  const [newCollection, setNewCollection] = useState<string>("");
  const [addMode, setAddMode] = useState<boolean>(false);
  const [error, setError] = useState<string>("must have at least 1 character");
  const [touched, setTouched] = useState<boolean>(false);

  const handleAdd = useCallback(async () => {
    try {
      const normalized = normalizeString(newCollection);
      if (normalized && !error) {
        setCollections((prev) => {
          const newMap = new Map(prev.map);
          newMap.set(normalized, 0);
          return { map: newMap, names: [normalized, ...prev.names] };
        });
        setNewCollection("");
        setAddMode(false);
        await createCollection(normalized);
      } else {
        if (!touched) {
          setTouched(true);
        }
      }
    } catch (error) {
      toastError(error, `An error occured when creating collection`);
    }
  }, [newCollection, error, touched]);

  const handleChange = (_: string, value: string) => {
    setNewCollection(value);
    const normalized = normalizeString(value);
    if (!touched) {
      setTouched(true);
    }
    if (collections.map.has(normalized)) {
      setError("already exists");
    } else {
      setError(validateInput("", normalized, {}, false, 1, 30));
    }
  };

  const handleSelect = (selected: string) => {
    if (selected !== collection) {
      handleSubmit(selected);
    }
    handleClose();
  };

  return (
    <Modal
      animationType="fade"
      visible={open}
      transparent={true}
      onRequestClose={handleClose}
    >
      <Pressable
        onPress={handleClose}
        className=" flex-1 bg-black/50 flex-row justify-center items-center "
      >
        <Pressable
          onPress={() => {}}
          className=" w-[90vw] max-w-[600px] h-[60vh] max-h-[1000px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
        >
          <View className=" flex-row items-center justify-between pb-[5px]  ">
            <ThemedText className=" font-urbanistBold text-[1.5rem] ">
              Select Collection
            </ThemedText>
            <Pressable
              onPress={() => setAddMode((prev) => !prev)}
              className={`p-[10px] pt-[5px] pb-[5px] rounded-[20px]  flex-row gap-2 items-center  ${
                addMode ? "border dark:border-white" : "bg-black dark:bg-white"
              }`}
            >
              {!addMode && (
                <ThemedIcon
                  reverse
                  source={icons.add}
                  className=" w-[10px] h-[10px] "
                />
              )}
              <ThemedText reverse={!addMode} className=" font-urbanistMedium ">
                {addMode ? "Cancel" : "New"}
              </ThemedText>
            </Pressable>
          </View>
          {addMode && (
            <View className=" mt-[20px] flex-row items-start gap-2 ">
              <View className=" flex-1 ">
                <InputField
                  autoFocus
                  name="collection"
                  showLabel={false}
                  placeholder="Collection name"
                  value={newCollection}
                  touched={touched}
                  error={error}
                  handleChange={handleChange}
                  handleBlur={handleAdd}
                  className=" p-[5px] "
                />
              </View>
              <Pressable
                onPress={handleAdd}
                className=" bg-black p-[10px] pt-[5px] pb-[5px] rounded-[10px] dark:bg-white "
              >
                <ThemedText reverse>Save</ThemedText>
              </Pressable>
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false}>
            <Pressable className=" flex-1 flex-col pt-[10px] pb-[20px] ">
              {!!collections.names.length ? (
                collections.names.map((name, index: number) => (
                  <Pressable
                    key={index}
                    onPress={() => handleSelect(name)}
                    className={
                      " flex-row gap-3 justify-between items-center pt-[15px] pb-[15px]"
                    }
                  >
                    <View className=" mb-[5px] flex-1 flex-row items-center gap-2 ">
                      <ThemedIcon
                        source={
                          collection === name
                            ? icons.radio.checked
                            : icons.folder
                        }
                        className=" w-[15px] h-[15px] "
                      />
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <ThemedText className=" capitalize font-urbanistMedium text-[1.2rem] ">
                          {name}
                        </ThemedText>
                      </ScrollView>
                    </View>
                    <View className=" flex-row items-center gap-3 ">
                      <ThemedText
                        toggleOnDark={false}
                        className=" font-urbanistBold text-[1.2rem]  text-divider "
                      >
                        {collections.map.get(name)} items
                      </ThemedText>
                      <ThemedIcon
                        source={
                          icons[collection === name ? "check" : "chevron"]
                        }
                        className={` w-[10px] h-[10px] ${
                          collection === name ? "" : "rotate-[-90deg]"
                        } `}
                      />
                    </View>
                  </Pressable>
                ))
              ) : (
                <View className=" flex-1 flex-col gap-2 justify-center items-center ">
                  <Image
                    source={icons.folder}
                    className=" w-[40px] h-[40px] "
                    tintColor={tintColors.divider}
                  />
                  <ThemedText>No Collections</ThemedText>
                </View>
              )}
            </Pressable>
          </ScrollView>

          <View className={" flex-row justify-center pt-[5px] "}>
            <Pressable
              onPress={handleClose}
              className=" p-[10px] pt-[5px] pb-[5px] border border-black rounded-[20px] dark:border-white "
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default MoveModal;
