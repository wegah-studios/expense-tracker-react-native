import icons from "@/constants/icons";
import { normalizeString } from "@/lib/appUtils";
import validateInput from "@/lib/validateInput";
import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import InputField from "../inputField";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const AddCollectionModal = ({
  open,
  collections,
  handleClose,
  handleSubmit,
}: {
  open: boolean;
  collections: Map<string, number>;
  handleClose: () => void;
  handleSubmit: (collection: string) => void;
}) => {
  const [collection, setCollection] = useState<string>("");
  const [error, setError] = useState<string>("must have at least 1 character");
  const [touched, setTouched] = useState<boolean>(false);

  const handleChange = (_: string, value: string) => {
    setCollection(value);
    const normalized = normalizeString(value);
    if (!touched) {
      setTouched(true);
    }
    if (collections.has(normalized)) {
      setError("already exists");
    } else {
      setError(validateInput("", normalized, {}, false, 1, 30));
    }
  };

  const onSubmit = () => {
    handleSubmit(normalizeString(collection));
    setTouched(false);
    setCollection("");
    setError("must have at least 1 character");
    handleClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={open}
      onRequestClose={handleClose}
    >
      <Pressable
        onPress={handleClose}
        className=" flex-1 bg-black/50 flex-row justify-center items-center "
      >
        <Pressable
          onPress={() => {}}
          className=" w-[90vw] max-w-[400px] h-[200px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
        >
          <View className=" flex-row justify-between pb-[5px]  ">
            <ThemedText className=" font-urbanistMedium  text-[1.5rem]">
              New Collection
            </ThemedText>
            <Pressable onPress={handleClose}>
              <ThemedIcon
                source={icons.add}
                className=" w-[20px] h-[20px] rotate-45 "
              />
            </Pressable>
          </View>
          <View className=" flex-1 justify-between flex-col gap-2 ">
            <View className=" flex-1 items-center flex-row  gap-2">
              <View className=" flex-1 ">
                <InputField
                  autoFocus
                  name="collection"
                  placeholder="Collection name"
                  value={collection}
                  showLabel={false}
                  error={error}
                  touched={touched}
                  handleChange={handleChange}
                  handleBlur={() => {}}
                />
              </View>
            </View>
            <View className=" flex-row justify-between ">
              <Pressable
                onPress={handleClose}
                className=" p-[20px] pt-[5px] pb-[5px] rounded-[20px] border dark:border-white "
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={onSubmit}
                className=" p-[20px] pt-[5px] pb-[5px] rounded-[20px] bg-black dark:bg-white "
              >
                <ThemedText reverse>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default AddCollectionModal;
