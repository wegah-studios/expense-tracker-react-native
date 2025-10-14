import { Slot } from "expo-router";
import React from "react";
import { View } from "react-native";

const AuxLayout = () => {
  return (
    <View className={` flex-1 pr-[10px] pl-[10px] `}>
      <Slot />
    </View>
  );
};

export default AuxLayout;
