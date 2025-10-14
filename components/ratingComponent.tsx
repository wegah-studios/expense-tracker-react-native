import icons from "@/constants/icons";
import { Rating } from "@/types/common";
import React, { useMemo } from "react";
import { Image, Pressable } from "react-native";
import ThemedText from "./textThemed";

const RatingComponent = ({
  rating,
  type,
  onPress,
}: {
  rating: Rating | null;
  type: Rating;
  onPress: (rating: Rating) => void;
}) => {
  const picked = useMemo(() => !!rating && rating === type, [rating, type]);
  return (
    <Pressable
      onPress={() => onPress(type)}
      className=" flex-1 flex-col gap-2 items-center "
    >
      <Image
        source={icons.rating[type][picked || !rating ? "enabled" : "disabled"]}
        className=" w-[20px] h-[20px] "
      />
      <ThemedText
        className={` capitalize ${picked ? "font-urbanistBold" : ""} `}
      >
        {type === "neutral" ? "it's alright" : type + " it"}
      </ThemedText>
    </Pressable>
  );
};

export default RatingComponent;
