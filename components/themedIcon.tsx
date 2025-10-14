import { tintColors } from "@/constants/colorSettings";
import { useCustomThemeContext } from "@/context/themeContext";
import React from "react";
import { Image, ImageProps } from "react-native";

const ThemedIcon = ({
  toggleOnDark = true,
  reverse = false,
  ...props
}: ImageProps & { toggleOnDark?: boolean; reverse?: boolean }) => {
  const { theme } = useCustomThemeContext();
  return (
    <Image
      {...props}
      tintColor={
        props.tintColor ||
        (theme === "dark" && toggleOnDark
          ? tintColors[reverse ? theme : "light"]
          : reverse
          ? tintColors[theme]
          : undefined)
      }
    />
  );
};

export default ThemedIcon;
