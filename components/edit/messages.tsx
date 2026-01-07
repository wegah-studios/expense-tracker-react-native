import icons from "@/constants/icons";
import { toastError } from "@/lib/appUtils";
import { pasteFromClipboard } from "@/lib/clipboardUtils";
import { parseMessages } from "@/lib/expenseUtils";
import { Status } from "@/types/common";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useState } from "react";
import { Dimensions, Keyboard, Pressable, View } from "react-native";
import InputField from "../inputField";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const Messages = (props: Record<string, any>) => {
  const { handleUpdate, close, setStatus, handleStatusClose } = props as {
    handleUpdate: (report: {
      complete: number;
      incomplete: number;
      excluded: number;
    }) => void;
    close: () => void;
    setStatus: React.Dispatch<React.SetStateAction<Status>>;
    handleStatusClose: () => void;
  };

  const [receipt, setReceipt] = useState<string>("");

  const handleChange = (_name: string, value: string) => {
    setReceipt(value);
  };

  const handlePaste = async () => {
    try {
      const text = await pasteFromClipboard();
      if (text) {
        setReceipt(text);
        Keyboard.dismiss();
      } else {
        throw new Error(`No receipt to copy`, { cause: 1 });
      }
    } catch (error) {
      toastError(error, `An error occured while pasting`);
    }
  };

  const handleDone = async () => {
    setStatus({
      open: true,
      type: "loading",
      title: "Parsing",
      message: "Extracting Information",
      handleClose: handleStatusClose,
      action: { callback() {} },
    });
    try {
      const report = await parseMessages(receipt);
      handleUpdate(report);
      close();
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        title: "Error",
        message:
          "An error occured while extracting information, please try again",
        handleClose: handleStatusClose,
        action: {
          callback: () => {
            setReceipt("");
            handleStatusClose();
          },
        },
      });
    }
  };

  const handleAction = () => {
    if (receipt) {
      handleDone();
    } else {
      close();
    }
  };

  return (
    <>
      <View className=" pl-[10px] pr-[10px] pt-[20px] pb-[20px] flex-row items-center justify-between bg-paper-light dark:bg-paper-dark ">
        <View className=" flex-row items-center gap-2 ">
          <ThemedText className=" font-urbanistBold text-[1.8rem] capitalize ">
            Messages
          </ThemedText>
        </View>
        <Pressable
          onPress={handleAction}
          className={`${
            !!receipt.length ? "p-[20px] pt-[10px] pb-[10px]" : "p-[5px]"
          } bg-black rounded-[20px] dark:bg-white `}
        >
          {!!receipt.length ? (
            <ThemedText reverse>Done</ThemedText>
          ) : (
            <ThemedIcon
              reverse
              source={icons.add}
              className=" w-[15px] h-[15px] rotate-45 "
            />
          )}
        </Pressable>
      </View>
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        className=" pl-[10px] pr-[10px] flex-1 bg-paper-light dark:bg-paper-dark "
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ minHeight: Dimensions.get("window").height }}>
          <View className=" flex-row gap-2 mb-[20px] ">
            <ThemedIcon source={icons.info} className=" w-[15px] h-[15px] " />
            <ThemedText className=" flex-1 ">
              Open the messages app and copy as many M-pesa messages as you
              need, then paste them here.
            </ThemedText>
          </View>
          <View className=" relative ">
            <InputField
              name="receipt"
              value={receipt}
              showLabel={false}
              placeholder="Paste M-pesa messages..."
              handleChange={handleChange}
              handleBlur={() => {}}
              className=" min-h-[300px] "
              multiline
              textAlignVertical="top"
            />
            {!receipt.length && (
              <Pressable
                onPress={handlePaste}
                className=" absolute top-[10] right-[10] p-[20px] pt-[5px] pb-[5px] rounded-[20px] bg-black flex-row items-center gap-2 dark:bg-white "
              >
                <ThemedIcon
                  reverse
                  source={icons.copy}
                  className=" w-[15px] h-[15px] "
                />
                <ThemedText reverse>Paste</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </BottomSheetScrollView>
    </>
  );
};

export default Messages;
