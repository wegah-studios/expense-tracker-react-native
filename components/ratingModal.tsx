import icons from "@/constants/icons";
import { toastError } from "@/lib/appUtils";
import { setStoreItems } from "@/lib/storeUtils";
import * as StoreReview from "expo-store-review";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const RatingModal = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [dnd, setDnd] = useState<boolean>(false);

  const handleClose = useCallback(async () => {
    if (dnd) {
      await handleRated();
    }
    setOpen(false);
  }, [dnd]);

  const handlePress = async () => {
    await StoreReview.requestReview();
    await handleRated();
  };

  const handleRated = async () => {
    try {
      setStoreItems([["rated", "true"]]);
    } catch (error) {
      toastError(error);
    }
  };

  useEffect(() => {
    if (open) {
      const check = async () => {
        const available = await StoreReview.isAvailableAsync();
        if (available) {
          setShow(true);
        } else {
          setOpen(false);
        }
      };
      check();
    } else {
      setShow(false);
    }
  }, [open]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={show}
      onRequestClose={handleClose}
    >
      <Pressable
        onPress={handleClose}
        className=" flex-1 bg-black/50 flex-row justify-center items-center "
      >
        <Pressable
          onPress={() => {}}
          style={{ height: "auto" }}
          className=" flex-col gap-[20px] w-[90vw] max-w-[600px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
        >
          <View className=" flex-row justify-end items-center ">
            <Pressable onPress={handleClose}>
              <ThemedIcon
                source={icons.add}
                className=" w-[20px] h-[20px] rotate-45 "
              />
            </Pressable>
          </View>
          <ThemedText className=" tracking-[0.1em] text-center text-[1.2rem] ">
            Would you like to rate the app?
          </ThemedText>
          <Pressable
            className=" flex-row gap-2 items-center "
            onPress={() => setDnd((prev) => !prev)}
          >
            <ThemedIcon
              source={icons.checkbox[dnd ? "checked" : "unchecked"]}
              className=" w-[20px] h-[20px] "
            />
            <ThemedText>Don't ask again</ThemedText>
          </Pressable>
          <View className={` w-[100%] flex-row justify-between `}>
            <Pressable
              onPress={handleClose}
              className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] border border-black dark:border-white `}
            >
              <ThemedText>No</ThemedText>
            </Pressable>
            <Pressable
              onPress={handlePress}
              className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white `}
            >
              <ThemedText reverse>Yes</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default RatingModal;
