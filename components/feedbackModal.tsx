import icons from "@/constants/icons";
import { sendFeedback, toastError } from "@/lib/appUtils";
import { Rating } from "@/types/common";
import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import InputField from "./inputField";
import RatingComponent from "./ratingComponent";
import ThemedText from "./textThemed";
import ThemedIcon from "./themedIcon";

const FeedbackModal = ({
  open,
  handleClose,
  onComplete,
}: {
  open: boolean;
  handleClose: () => void;
  onComplete: () => void;
}) => {
  const [form, setForm] = useState<{
    name: string;
    message: string;
    rating: Rating | null;
  }>({ name: "", message: "", rating: null });

  const handleSubmit = async () => {
    try {
      const feedback = form;
      handleClose();
      setForm({ name: "", message: "", rating: null });
      await sendFeedback(feedback);
      onComplete()
    } catch (error) {
      toastError(error, `There was an error sending feedback`);
    }
  };

  const handleChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleBlur = (name: string) => {};

  const handleRatingPress = (rating: Rating) => {
    setForm((prev) => ({
      ...prev,
      rating: rating === prev.rating ? null : rating,
    }));
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
          <View className=" flex-row justify-between items-center ">
            <ThemedText className=" font-urbanistBold text-[1.5rem] capitalize ">
              Send Feedback
            </ThemedText>
            <Pressable onPress={handleClose}>
              <ThemedIcon
                source={icons.add}
                className=" w-[20px] h-[20px] rotate-45 "
              />
            </Pressable>
          </View>
          <View className=" flex-col gap-2 items-center ">
            <ThemedText className=" font-urbanistMedium ">
              Rate your experience so far
            </ThemedText>
            <View className=" flex-row justify-between items-center ">
              <RatingComponent
                rating={form.rating}
                type="hate"
                onPress={handleRatingPress}
              />
              <RatingComponent
                rating={form.rating}
                type="neutral"
                onPress={handleRatingPress}
              />
              <RatingComponent
                rating={form.rating}
                type="love"
                onPress={handleRatingPress}
              />
            </View>
          </View>
          <InputField
            name="name"
            required
            placeholder="Your name"
            value={form.name}
            handleChange={handleChange}
            handleBlur={handleBlur}
            changed={!!form.name}
          />
          <InputField
            name="message"
            placeholder="Enter message"
            style={{ height: 100 }}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            value={form.message}
            handleChange={handleChange}
            handleBlur={handleBlur}
            changed={!!form.message}
          />
          <View className=" flex-row justify-between items-center ">
            <Pressable
              onPress={handleClose}
              className=" p-[20px] pt-[10px] pb-[10px] border border-black rounded-[20px] dark:border-white "
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white disabled:bg-divider `}
            >
              <ThemedText reverse>Send</ThemedText>
              <ThemedIcon
                reverse
                source={icons.send}
                className=" w-[15px] h-[15px] "
              />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default FeedbackModal;
