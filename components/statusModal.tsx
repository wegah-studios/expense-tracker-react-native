import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { Status } from "@/types/common";
import React, { useMemo } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import * as Progress from "react-native-progress";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const StatusModal = ({ status }: { status: Status }) => {
  const messageParts = useMemo(
    () =>
      status.message?.split("^").map((part, index) => {
        const [a, b] = part.split("|");
        if (b) {
          return (
            <View key={index} className="  ">
              <Image
                source={icons[b as keyof typeof icons]}
                tintColor={tintColors[b as keyof typeof tintColors] as any}
                className=" w-[15px] h-[15px] "
              />
            </View>
          );
        }
        return (
          <ThemedText key={index} className=" text-[1.2rem] ">
            {a}
          </ThemedText>
        );
      }) || [],
    [status.message]
  );
  const handleCancel = () => {
    if (
      status.type === "info" ||
      status.type === "warning" ||
      status.type === "confirm"
    ) {
      status.handleClose();
    } else if (status.type === "loading") {
    } else {
      status.action.callback();
    }
  };
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={status.open}
      onRequestClose={handleCancel}
    >
      <Pressable
        onPress={handleCancel}
        className=" flex-1 bg-black/50 flex-row justify-center items-center "
      >
        <Pressable
          onPress={() => {}}
          style={{ height: "auto" }}
          className=" flex-col gap-[30px] w-[90vw] max-w-[600px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
        >
          <View className=" flex-row justify-between items-center ">
            <View className=" flex-1 flex-row items-center gap-2 ">
              {status.type !== "confirm" && status.type !== "loading" && (
                <Image
                  source={icons[status.type]}
                  className=" w-[20px] h-[20px] "
                  tintColor={tintColors[status.type]}
                />
              )}
              <ThemedText className=" font-urbanistBold text-[1.5rem] capitalize ">
                {status.title || status.type}
              </ThemedText>
            </View>
            {status.type !== "loading" && (
              <Pressable onPress={handleCancel}>
                <ThemedIcon
                  source={icons.add}
                  className=" w-[20px] h-[20px] rotate-45 "
                />
              </Pressable>
            )}
          </View>
          {(status.type === "loading" || status.message) && (
            <View
              className={` flex-col gap-[20px] ${
                status.type === "loading" ? "items-center justify-center" : ""
              } `}
            >
              {status.type === "loading" && (
                <Progress.CircleSnail color={["#3b82f6", "#10b981"]} />
              )}
              {status.message && (
                <ThemedText className=" flex-row items-center gap-1  flex-wrap ">
                  {messageParts}
                </ThemedText>
              )}
            </View>
          )}
          <View className=" flex-row justify-between items-center ">
            {status.type === "info" ||
            status.type === "warning" ||
            status.type === "confirm" ? (
              <Pressable
                onPress={handleCancel}
                className=" p-[20px] pt-[5px] pb-[5px] border border-black rounded-[20px] dark:border-white "
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
            ) : (
              <View></View>
            )}
            {status.type !== "loading" && (
              <Pressable
                onPress={status.action.callback}
                className={` p-[20px] pt-[5px] pb-[5px] rounded-[20px] bg-black dark:bg-white `}
              >
                <ThemedText reverse>{status.action.title || "OK"}</ThemedText>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default StatusModal;
