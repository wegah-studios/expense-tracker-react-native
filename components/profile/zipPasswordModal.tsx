import icons from "@/constants/icons";
import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import InputField from "../inputField";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const ZipPasswordModal = ({
  open,
  type,
  handleClose,
  handleSubmit,
}: {
  open: boolean;
  type: "import" | "export";
  handleClose: () => void;
  handleSubmit: (password: string) => void;
}) => {
  const [password, setPassword] = useState<string>("");

  const handleChange = (name: string, value: string) => {
    setPassword(value);
  };

  const onSubmit = () => {
    handleSubmit(password);
    setPassword("");
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
          style={{ height: "auto" }}
          className=" w-[90vw] max-w-[600px] p-[20px] bg-white flex-col gap-[20px] rounded-[20px] dark:bg-paper-dark "
        >
          <View className=" flex-row justify-between items-center ">
            <View className=" flex-row items-center gap-1 ">
              <ThemedIcon source={icons.lock} className=" w-[15px] h-[15px] " />
              <ThemedText className=" font-urbanistBold text-[1.2rem] ">
                {type === "export" ? "Set" : "Enter"} Password
              </ThemedText>
            </View>
            <Pressable onPress={handleClose}>
              <ThemedIcon
                source={icons.add}
                className=" w-[20px] h-[20px] rotate-45 "
              />
            </Pressable>
          </View>
          <ThemedText>{`${
            type === "export" ? "Set" : "Enter"
          } a password for the zip file (required).`}</ThemedText>
          <InputField
            name="password"
            value={password}
            showLabel={false}
            handleChange={handleChange}
            handleBlur={() => {}}
          />
          <View className=" flex-row justify-between items-center ">
            <Pressable
              onPress={handleClose}
              className=" p-[20px] pt-[5px] pb-[5px] rounded-[20px] border border-black dark:border-white "
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              disabled={!password}
              onPress={onSubmit}
              className=" p-[20px] pt-[5px] pb-[5px] rounded-[20px] bg-black dark:bg-white disabled:bg-divider "
            >
              <ThemedText reverse>Submit</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ZipPasswordModal;
