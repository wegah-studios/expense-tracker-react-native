import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { Status } from "@/types/common";
import React from "react";
import { Image, Modal, Pressable, View } from "react-native";
import * as Progress from "react-native-progress";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const StatusModal = ({ status }: { status: Status }) => {
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
                <ThemedText className=" text-[1.2rem] ">
                  {status.message}
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
