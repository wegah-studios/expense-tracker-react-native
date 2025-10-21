import { tintColors } from "@/constants/colorSettings";
import { openBrowserAsync } from "expo-web-browser";
import React from "react";
import { Pressable } from "react-native";
import ThemedText from "./textThemed";

const ExternalLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  const handlePress = async () => {
    await openBrowserAsync(href);
  };

  return (
    <Pressable onPress={handlePress} className=" flex-row items-end pr-[5px] ">
      <ThemedText style={{ color: tintColors.info }} className=" mr-[10px] ">
        {children}
      </ThemedText>
    </Pressable>
  );
};

export default ExternalLink;
