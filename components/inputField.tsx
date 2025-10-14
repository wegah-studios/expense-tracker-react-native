import { tintColors } from "@/constants/colorSettings";
import React, { useRef } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";
import ThemedText from "./textThemed";

const InputField = ({
  name,
  label,
  error,
  touched,
  changed,
  required = false,
  showLabel = true,
  handleFocus,
  handleChange,
  handleBlur,
  ...props
}: TextInputProps & {
  name: string;
  label?: string;
  error?: string;
  touched?: boolean;
  changed?: boolean;
  required?: boolean;
  showLabel?: boolean;
  handleFocus?: (ref: React.RefObject<TextInput | null>) => void;
  handleChange: (name: string, value: string) => void;
  handleBlur: (name: string) => void;
}) => {
  const ref = useRef<TextInput>(null);

  return (
    <View className=" flex-col gap-[10px] ">
      {showLabel && (
        <ThemedText className=" capitalize font-urbanistMedium text-[1.2rem] ">
          {label || name}
          {required ? "*" : ""}
        </ThemedText>
      )}
      <View>
        <TextInput
          ref={ref}
          onChangeText={(text) => handleChange(name, text)}
          onFocus={() => handleFocus && handleFocus(ref)}
          onBlur={() => handleBlur(name)}
          placeholderTextColor={tintColors.divider}
          {...props}
          className={` p-[10px] rounded-[10px] border focus:border-black ${
            !!error && touched
              ? "border-error"
              : changed
              ? " border-info"
              : "border-divider"
          } dark:color-white dark:focus:border-white ${props.className} `}
        />
        {error && touched ? (
          <Text className=" text-[0.9rem] text-error ml-[10px]  ">
            {name} {error}
          </Text>
        ) : (
          <></>
        )}
      </View>
    </View>
  );
};

export default InputField;
