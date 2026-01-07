import { normalizeString, toastError } from "@/lib/appUtils";
import { getRecipients } from "@/lib/expenseUtils";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import InputField from "./inputField";
import ThemedText from "./textThemed";

const RecipientInput = ({
  value,
  placeHolder,
  changed,
  touched,
  error,
  disabled,
  handleChange,
  handleBlur,
  handleFocus,
}: {
  value: string;
  placeHolder?: string;
  error?: string;
  touched?: boolean;
  changed?: boolean;
  disabled?: boolean;
  handleChange: (name: string, value: string) => void;
  handleBlur: (name: string) => void;
  handleFocus?: (name: string) => void;
}) => {
  const [editMode, setEditMode] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputTimeout, setInputTimeout] = useState<number | null>(null);

  useEffect(() => {
    setInputTimeout((prev) => {
      if (prev) {
        clearTimeout(prev);
      }
      return setTimeout(async () => {
        await fetchSuggestions(normalizeString(value));
      }, 200);
    });

    return () => {
      setInputTimeout((prev) => {
        if (prev) {
          clearTimeout(prev);
        }
        return null;
      });
    };
  }, [value]);

  const fetchSuggestions = async (search: string) => {
    try {
      const data = await getRecipients(search);
      setSuggestions(data);
    } catch (error) {
      toastError(error, "No suggestions available");
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleChange("recipient", suggestion);
    setEditMode(false);
  };

  const onChange = (name: string, value: string) => {
    if (!editMode) {
      setEditMode(true);
    }
    handleChange(name, value);
  };

  const onFocus = () => {
    setEditMode(true);
    handleFocus && handleFocus("recipient");
  };
  const onBlur = () => {
    setEditMode(false);
    handleBlur("recipient");
  };

  return (
    <View className={` flex-col gap-[10px] `}>
      <InputField
        editable={!disabled}
        name="recipient"
        placeholder={placeHolder}
        required
        value={value}
        handleChange={onChange}
        handleBlur={onBlur}
        onFocus={onFocus}
        error={error}
        touched={touched}
        changed={changed}
      />
      {editMode && !!suggestions.length && (
        <View className=" flex-col gap-[10px] ">
          <ThemedText toggleOnDark={false} className=" text-divider ">
            suggestions:
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className=" flex-row gap-[10px] items-center ">
              {suggestions.map((suggestion, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSuggestionPress(suggestion)}
                  className=" p-[10px] pt-[5px] pb-[5px] border rounded-[10px] border-black dark:border-white "
                >
                  <ThemedText className=" capitalize ">{suggestion}</ThemedText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default RecipientInput;
