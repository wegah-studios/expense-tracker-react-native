import icons from "@/constants/icons";
import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const SmsCaptureModal = ({
  open,
  handleClose,
  handleSubmit,
}: {
  open: boolean;
  handleClose: (dnd: boolean) => void;
  handleSubmit: () => void;
}) => {
  const [dnd, setdnd] = useState<boolean>(false);

  const onClose = async () => {
    handleClose(dnd);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={open}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className=" flex-1 bg-black/50 flex-row justify-center items-center "
      >
        <Pressable
          onPress={() => {}}
          style={{ height: "auto" }}
          className=" flex-col gap-[20px] items-center w-[90vw] max-w-[600px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
        >
          <ThemedIcon source={icons.sms} className=" w-[30px] h-[30px]" />
          <ThemedText className=" font-urbanistBold text-[1.5rem] text-center ">
            Automatic expense capture
          </ThemedText>
          <ThemedText className=" tracking-[0.1em] text-center text-[1.2rem] ">
            This feature allows the app to automatically capture and track
            expenses directly from your sms messages. Enable it to track your
            spending with ease.
          </ThemedText>
          <Pressable
            className=" flex-row gap-2 items-center "
            onPress={() => setdnd((prev) => !prev)}
          >
            <ThemedIcon
              source={icons.checkbox[dnd ? "checked" : "unchecked"]}
              className=" w-[20px] h-[20px] "
            />
            <ThemedText>Don't ask again</ThemedText>
          </Pressable>
          <View className={` w-[100%] flex-row justify-between `}>
            <Pressable
              onPress={onClose}
              className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] border border-black dark:border-white `}
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white `}
            >
              <ThemedText reverse>Enable</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default SmsCaptureModal;
