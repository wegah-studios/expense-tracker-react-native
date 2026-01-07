import icons from "@/constants/icons";
import { normalizeString } from "@/lib/appUtils";
import validateInput from "@/lib/validateInput";
import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import RecipientInput from "../recipientInput";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const AddExclusionModal = ({
  open,
  collections,
  handleClose,
  handleSubmit,
}: {
  open: boolean;
  collections: Map<string, number>;
  handleClose: () => void;
  handleSubmit: (exclusion: string) => void;
}) => {
  const [recipient, setRecipient] = useState<string>("");
  const [error, setError] = useState<string>("must have at least 1 character");
  const [touched, setTouched] = useState<boolean>(false);

  const handleChange = (_: string, value: string) => {
    setRecipient(value);
    const normalized = normalizeString(value);
    if (!touched) {
      setTouched(true);
    }
    if (collections.has(normalized)) {
      setError("already exists");
    } else if (/exclusion\//i.test(normalized)) {
      setError("name invalid");
    } else {
      setError(validateInput("", normalized, false, 1));
    }
  };

  const onSubmit = () => {
    if (!error) {
      handleSubmit(normalizeString(recipient));
      setTouched(false);
      setRecipient("");
      setError("must have at least 1 character");
      handleClose();
    }
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
          className=" flex-col gap-[20px] w-[90vw] max-w-[600px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
        >
          <View className=" flex-row justify-between  ">
            <ThemedText className=" font-urbanistMedium  text-[1.5rem]">
              New Exclusion
            </ThemedText>
            <Pressable onPress={handleClose}>
              <ThemedIcon
                source={icons.add}
                className=" w-[20px] h-[20px] rotate-45 "
              />
            </Pressable>
          </View>
          <RecipientInput
            value={recipient}
            placeHolder="Expense recipient..."
            error={error}
            touched={touched}
            changed={false}
            handleChange={handleChange}
            handleBlur={() => {}}
          />
          <View className=" flex-row justify-between ">
            <Pressable
              onPress={handleClose}
              className=" p-[20px] pt-[5px] pb-[5px] rounded-[20px] border dark:border-white "
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              disabled={!!error}
              onPress={onSubmit}
              className=" p-[20px] pt-[5px] pb-[5px] rounded-[20px] bg-black dark:bg-white disabled:bg-divider "
            >
              <ThemedText reverse>Save</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default AddExclusionModal;
