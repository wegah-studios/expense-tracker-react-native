import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { toastError } from "@/lib/appUtils";
import { importFromSMSListener } from "@/lib/expenseUtils";
import { getPreferences } from "@/lib/preferenceUtils";
import { startSMSCapture } from "@/lib/smsUtils";
import { SmsCaptureMode } from "@/types/common";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import * as Progress from "react-native-progress";
import {
  getStoredReceipts,
  isCaptureActive,
  stopCapture,
} from "react-native-sms-listener";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const SmsCaptureModal = ({
  mode,
  setMode,
}: {
  mode: SmsCaptureMode;
  setMode: React.Dispatch<React.SetStateAction<SmsCaptureMode>>;
}) => {
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const [dnd, setdnd] = useState<boolean>(false);

  useEffect(() => {
    if (mode.type === "loading" && mode.fetchMessages) {
      const handleMessages = async () => {
        try {
          const [isCapture, prefrences] = await Promise.all([
            isCaptureActive(),
            getPreferences("smsCapture"),
          ]);
          if (isCapture && prefrences.smsCapture === "on") {
            try {
              const messages = await getStoredReceipts();
              if (messages.length) {
                setMode((prev) => ({
                  ...prev,
                  message: `Importing ${messages.length} messages, please wait`,
                  fetchMessages: false,
                }));
                const expenses = await importFromSMSListener(messages);
                setMode({
                  open: true,
                  type: "success",
                  title: "New expenses added",
                  message: `Successfully added ${expenses.length} new expenses.`,
                });
              } else {
                handleClose();
              }
            } catch (error) {
              toastError(error);
              setMode({
                open: true,
                type: "error",
                message:
                  "An error occured while attempting to import new expenses.",
              });
            }
          } else if (
            isCapture &&
            (prefrences.smsCapture === "off" || prefrences.smsCapture === "dnd")
          ) {
            await stopCapture();
            handleClose();
          } else if (
            !prefrences.smsCapture ||
            (!isCapture && prefrences.smsCapture === "on")
          ) {
            setMode({ open: true, type: "request" });
          } else {
            handleClose();
          }
        } catch (error) {
          toastError(error);
          setMode({
            open: true,
            type: "error",
            message: "An error occured while checking for new expenses.",
          });
        }
      };
      handleMessages();
    }
  }, [mode.type, mode.fetchMessages]);

  const handleAction = async () => {
    try {
      if (mode.type === "request") {
        setMode({
          open: true,
          type: "loading",
          message: "Activating sms capture",
        });
        await startSMSCapture();
        const isCapture = await isCaptureActive();
        if (isCapture) {
          setMode({
            open: true,
            type: "success",
            title: "Automatic sms capture enabled",
            message:
              "The app will now automatically capture your mpesa expenses. All data is stored securely on your device.",
          });
        } else {
          setMode({
            open: true,
            type: "error",
            message:
              "An error occured while attempting to enable automatic capture for new expenses, please try again.",
          });
        }
      } else {
        if (mode.type === "success") {
          router.replace({ pathname: pathname as any, params });
        }
        handleClose();
      }
    } catch (error: any) {
      if (error?.cause === 1) {
      } else {
        setMode({
          open: true,
          type: "error",
          message: `An error occured while activating sms capture, please try again`,
        });
      }
      toastError(error);
    }
  };

  const handleClose = () => {
    if (mode.type !== "loading") {
      setMode({ open: false, type: "loading" });
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={mode.open}
      onRequestClose={handleClose}
    >
      <Pressable
        onPress={handleClose}
        className=" flex-1 bg-black/50 flex-row justify-center items-center "
      >
        <Pressable
          onPress={() => {}}
          style={{ height: "auto" }}
          className=" flex-col gap-[20px] items-center w-[90vw] max-w-[600px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
        >
          <ThemedIcon
            toggleOnDark={mode.type !== "error" && mode.type !== "success"}
            source={icons.sms}
            className=" w-[30px] h-[30px]"
            tintColor={
              mode.type === "error"
                ? tintColors.error
                : mode.type === "success"
                ? tintColors.success
                : undefined
            }
          />
          {mode.type === "loading" ? (
            <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
          ) : (
            <ThemedText className=" font-urbanistBold text-[1.5rem] text-center ">
              {mode.title || mode.type}
            </ThemedText>
          )}
          {!!mode.message && (
            <ThemedText className=" tracking-[0.1em] text-center text-[1.2rem] ">
              {mode.message}
            </ThemedText>
          )}
          {mode.type === "request" && (
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
          {mode.type !== "loading" && (
            <View className=" w-[100%] flex-row justify-between ">
              {mode.type === "request" && (
                <Pressable
                  onPress={handleClose}
                  className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] border border-black dark:border-white `}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
              )}
              <Pressable
                onPress={handleAction}
                className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white `}
              >
                <ThemedText reverse>
                  {mode.type === "request" ? "enable" : "OK"}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default SmsCaptureModal;
