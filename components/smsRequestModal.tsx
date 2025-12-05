import icons from "@/constants/icons";
import { toastError } from "@/lib/appUtils";
import { hasSmsPermission } from "@/lib/smsUtils";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const SmsRequestModal = ({
  mode,
  handleClose,
  handleSubmit,
}: {
  mode: "request" | "toggle" | "";
  handleClose: (dnd: boolean) => void;
  handleSubmit: () => void;
}) => {
  const [step, setStep] = useState<number>(0);
  const [dnd, setdnd] = useState<boolean>(false);
  const [permited, setPermited] = useState<boolean>(false);
  const steps = useMemo<{ title: string; description: string }[]>(
    () => [
      {
        title: "Automatic expense capture",
        description:
          "This feature allows the app to automatically capture and track expenses directly from your sms messages. Enable it to track your spending with ease.",
      },
      {
        title: "SMS Permission request",
        description:
          "Automatic expense capture needs access to your sms messages to capture messages from 'Mpesa' you can disable this at any time in the settings.",
      },
    ],
    []
  );
  const content = useMemo(() => steps[step], [step, steps]);

  useEffect(() => {
    if (mode) {
      const checkPermited = async () => {
        try {
          const result = await hasSmsPermission();
          setPermited(result);
        } catch (error) {
          toastError(error);
        }
      };
      checkPermited();
    }
  }, [mode]);

  const onClose = async () => {
    handleClose(dnd);
  };

  const handlePress = useCallback(async () => {
    if (!permited && step < 1) {
      setStep(1);
    } else {
      setStep(0);
      setdnd(false);
      handleSubmit();
    }
  }, [permited, step]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={!!mode}
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
            {content.title}
          </ThemedText>
          <ThemedText className=" tracking-[0.1em] text-center text-[1.2rem] ">
            {content.description}
          </ThemedText>
          {step === 0 && mode === "request" && (
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
          )}
          <View className={` w-[100%] flex-row justify-between `}>
            <Pressable
              onPress={onClose}
              className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] border border-black dark:border-white `}
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handlePress}
              className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white `}
            >
              <ThemedText reverse>{step === 1 ? "Allow" : "Enable"}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default SmsRequestModal;
