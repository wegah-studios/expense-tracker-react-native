import icons from "@/constants/icons";
import { factoryReset, toastError } from "@/lib/appUtils";
import { removePin, updatePin, verifyPin } from "@/lib/pinUtils";
import { Status } from "@/types/common";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, SafeAreaView, View } from "react-native";
import PinButton from "./pinButton";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const PinModal = ({
  mode,
  onComplete,
  onBack,
  setStatus,
  handleStatusClose,
}: {
  mode: "enter" | "create" | "";
  onComplete?: () => void;
  onBack?: () => void;
  setStatus: React.Dispatch<React.SetStateAction<Status>>;
  handleStatusClose: () => void;
}) => {
  const [pin, setPin] = useState<string>("");
  const [state, setState] = useState<"error" | "success" | "">("");
  const chars = useMemo(
    () => (pin + " ".repeat(4)).slice(0, 4).split(""),
    [pin]
  );
  const numbers = useMemo(
    () => [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
    ],
    []
  );

  useEffect(() => {
    if (pin.length >= 4) {
      const handleVerify = async () => {
        try {
          setStatus({
            open: true,
            type: "loading",
            title: "Verifying",
            message: "Verifying pin",
            handleClose: handleStatusClose,
            action: { callback: handleStatusClose },
          });
          if (mode === "create") {
            await updatePin(pin);
            setState("success");
            setStatus({
              open: true,
              type: "success",
              title: "Pin Updated",
              message:
                "Your pin has been successfully set. Use it when unlocking the app.",
              handleClose: handleStatusClose,
              action: {
                callback() {
                  handleStatusClose();
                  setPin("");
                  setState("")
                  onComplete && onComplete();
                },
              },
            });
          } else if (mode === "enter") {
            const verified = await verifyPin(pin);
            setPin("");
            if (!verified) {
              setState("error");
              setStatus({
                open: true,
                type: "error",
                message: "Wrong pin.",
                handleClose: handleStatusClose,
                action: {
                  callback() {
                    handleStatusClose();
                  },
                },
              });
            } else {
              setState("success");
              handleStatusClose();
              setState("")
              onComplete && onComplete();
            }
          }
        } catch (error) {
          toastError(error);
          setStatus({
            open: true,
            type: "error",
            message: "An error occured while verifying pin, please try again",
            handleClose: handleStatusClose,
            action: {
              callback() {
                setPin("");
                handleStatusClose();
              },
            },
          });
        }
      };
      handleVerify();
    }
  }, [pin]);

  const handleChange = (value: string) => {
    setPin((prev) => (prev += value));
  };

  const handleErase = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  const handleForgot = () => {
    setStatus({
      open: true,
      type: "warning",
      title: "Reset Data?",
      message: "All your data will be lost and the pin removed.",
      handleClose: handleStatusClose,
      action: {
        callback: async () => {
          try {
            setStatus({
              open: true,
              type: "loading",
              title: "Reseting data",
              message: "Deleting data and reseting pin.",
              handleClose: handleStatusClose,
              action: { callback: handleStatusClose },
            });
            await factoryReset();
            handleStatusClose();
            router.replace("/");
          } catch (error) {
            toastError(error);
            setStatus({
              open: true,
              type: "error",
              message: "An error occured while reseting data.",
              handleClose: handleStatusClose,
              action: { callback: handleStatusClose },
            });
          }
        },
      },
    });
  };

  return (
    <Modal visible={!!mode} onRequestClose={handleBack}>
      <SafeAreaView className=" relative pr-[40px] pl-[40px] flex-1 flex-col justify-center items-center gap-[30px] bg-background-light dark:bg-background-dark ">
        {!!onBack && (
          <Pressable
            onPress={handleBack}
            className=" absolute left-5 top-5 p-[10px] rounded-[50%] bg-black/10 dark:bg-white/10 "
          >
            <ThemedIcon
              source={icons.arrow}
              className=" w-[15px] h-[15px] rotate-180 "
            />
          </Pressable>
        )}
        <ThemedIcon source={icons.lock} className=" w-[30px] h-[30px] " />
        <ThemedText className=" text-[1.2rem] font-urbanistMedium ">
          {mode === "create"
            ? "Set a new"
            : mode === "enter"
            ? "Enter your"
            : ""}{" "}
          pin
        </ThemedText>
        <View className=" flex-row gap-[20px] items-center ">
          {chars.map((char, index) => (
            <View
              key={index}
              className={` flex-1 aspect-square flex-row items-center justify-center rounded-[20px] border ${
                state === "success"
                  ? "border-success"
                  : state === "error"
                  ? "border-error"
                  : char
                  ? "border-black dark:border-white"
                  : "border-divider"
              } `}
            >
              <ThemedText>{char}</ThemedText>
            </View>
          ))}
        </View>
        {!!state && (
          <ThemedText
            className={` ${state === "error" ? "text-error" : "text-success"} `}
          >
            {state === "error" ? "Wrong pin" : "Pin verified"}
          </ThemedText>
        )}
        {numbers.map((group, index) => (
          <View key={index} className=" flex-row gap-[20px] items-center ">
            {group.map((num, i) => (
              <PinButton key={i} value={num} onPress={handleChange} />
            ))}
          </View>
        ))}
        <View className=" flex-row gap-[20px] items-center ">
          <View className=" flex-1 "></View>
          <PinButton value="0" onPress={handleChange} />
          {!!pin ? (
            <PinButton value="erase" onPress={handleErase} />
          ) : (
            <View className=" flex-1 "></View>
          )}
        </View>
        {mode === "enter" && (
          <Pressable onPress={handleForgot}>
            <ThemedText>Forgot pin?</ThemedText>
          </Pressable>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default PinModal;
