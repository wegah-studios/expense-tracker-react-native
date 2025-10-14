import icons from "@/constants/icons";
import { toastError } from "@/lib/appUtils";
import { pickImage, takeImage } from "@/lib/imageUtils";
import React from "react";
import { Modal, Pressable } from "react-native";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const SelectImageModal = ({
  open,
  handleClose,
  handleSubmit,
}: {
  open: boolean;
  handleClose: () => void;
  handleSubmit: (uri: string) => void;
}) => {
  const handleCamera = async () => {
    try {
      const uri = await takeImage();
      handleSubmit(uri);
    } catch (error) {
      toastError(error, `An error occured while taking image`);
    }
    handleClose();
  };

  const handleGallery = async () => {
    try {
      const uri = await pickImage();
      handleSubmit(uri);
    } catch (error) {
      toastError(error, `An error occured while selecting image`);
    }
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
          className=" w-[90vw] max-w-[600px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
        >
          <Pressable
            onPress={handleCamera}
            className=" p-[20px] flex-row items-center gap-2 "
          >
            <ThemedIcon source={icons.camera} className=" w-[20px] h-[20px] " />
            <ThemedText>Take a photo</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleGallery}
            className=" p-[20px] flex-row items-center gap-2 "
          >
            <ThemedIcon source={icons.image} className=" w-[20px] h-[20px] " />
            <ThemedText>Select from gallery</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default SelectImageModal;
