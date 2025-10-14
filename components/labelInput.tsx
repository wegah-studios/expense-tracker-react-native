import { tintColors } from "@/constants/colorSettings";
import { normalizeString, toastError } from "@/lib/appUtils";
import { getSuggestions } from "@/lib/dictionaryUtils";
import React, { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import LabelChip from "./expenses/labelChip";
import ThemedText from "./textThemed";

const LabelInput = ({
  expenseValue,
  value,
  input,
  required = true,
  showBorder = true,
  changed,
  touched,
  error,
  helperText,
  placeholderText,
  setErrors,
  setTouched,
  setChanges,
  setForm,
  setInput,
  handleInputFocus,
}: {
  showBorder?: boolean;
  required?: boolean;
  expenseValue: string | undefined;
  value: string[] | undefined;
  input: string;
  changed: boolean;
  touched: boolean;
  error: string;
  helperText?: string;
  placeholderText?: string;
  setErrors: any;
  setChanges: any;
  setTouched: any;
  setForm: any;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleInputFocus?: (scrollY: number) => void;
}) => {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [editMode, setEditMode] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setFilteredSuggestions(
      suggestions.filter((str) => str.includes(normalizeString(input || "")))
    );
  }, [input, suggestions]);

  useEffect(() => {
    try {
      const fetchSuggestions = async () => {
        const results = await getSuggestions();
        setSuggestions(results);
      };
      fetchSuggestions();
    } catch (error) {
      toastError(error, `Error fetching suggestions`);
    }
  }, []);

  const handlePress = () => {
    if (!editMode) {
      setEditMode(true);
    }
  };

  const handleblur = () => {
    setEditMode(false);
    if (!touched) {
      setTouched((prev: any) => {
        const newSet = new Set(prev);
        newSet.add("label");
        return newSet;
      });
    }
  };

  const handleLabelCancel = (index: number) => {
    if (value) {
      let labels = value.filter((_str, i) => i !== index);
      let newInput = labels.join(", ");
      setInput(newInput);
      setSelection({ start: newInput.length, end: newInput.length });
      handleUpdate(labels as string[]);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    const newValue = suggestion.split(",");
    handleUpdate(newValue as string[]);
    setInput(suggestion);
    setSelection({ start: suggestion.length, end: suggestion.length });
  };

  const handleChange = (text: string) => {
    setInput(text);
    handleUpdate(text.split(/,|-|\//));
  };

  const handleUpdate = (update: string[]) => {
    let normalizedArr: string[] = [];

    for (let str of update) {
      const normalized = normalizeString(str);
      if (normalized) {
        normalizedArr.push(normalized);
      }
    }

    setForm((prev: Record<string, any>) => ({ ...prev, label: normalizedArr }));
    const isDiff = normalizedArr.join(",") !== (expenseValue || "");
    setChanges((prev: Set<string>) => {
      if (isDiff !== prev.has("label")) {
        const newSet = new Set(prev);
        if (isDiff) {
          newSet.add("label");
        } else {
          newSet.delete("label");
        }
        return newSet;
      }
      return prev;
    });
    if (required) {
      setErrors((prev: Record<string, any>) => {
        if (normalizedArr.length) {
          if (prev.label === "required") {
            return { ...prev, label: "" };
          }
        } else {
          if (prev.label !== "required") {
            return { ...prev, label: "required" };
          }
        }
        return prev;
      });
    }
  };

  return (
    <View
      className={` flex-col gap-[10px] rounded-[20px] ${
        showBorder ? "p-[20px] border border-divider" : ""
      } `}
    >
      <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
        Label
      </ThemedText>
      <View className=" flex-col gap-[5px] ">
        <Pressable
          onPress={handlePress}
          className={` flex-row p-[10px] rounded-[10px] border ${
            touched && error
              ? "border-error"
              : changed
              ? "border-info"
              : input
              ? "border-black dark:border-white"
              : "border-divider"
          } `}
        >
          {!value?.length && !editMode && (
            <ThemedText toggleOnDark={false} className=" text-divider ">
              {placeholderText || "e.g. Transport, Uber"}
            </ThemedText>
          )}
          {editMode ? (
            <TextInput
              autoFocus
              placeholder={placeholderText || "Enter label"}
              value={input}
              onChangeText={handleChange}
              onFocus={() => handleInputFocus && handleInputFocus(0)}
              onBlur={handleblur}
              placeholderTextColor={tintColors.divider}
              className=" p-[0px] min-w-[100px] dark:color-white "
              selection={selection}
              onSelectionChange={({ nativeEvent }) => {
                setSelection(nativeEvent.selection);
              }}
            />
          ) : (
            <View className=" flex-row gap-[10px] flex-wrap items-center ">
              {value?.map((item, index) => (
                <LabelChip
                  key={index}
                  name={item}
                  index={index}
                  onPress={handlePress}
                  onCancel={handleLabelCancel}
                />
              ))}
            </View>
          )}
        </Pressable>
        <ThemedText
          toggleOnDark={false}
          className={` ml-[5px] ${
            touched && !!error ? " text-error" : " text-divider"
          } `}
        >
          {touched && !!error
            ? "label " + error
            : helperText || `Separate Labels with commas ,`}
        </ThemedText>
      </View>
      {editMode && !!filteredSuggestions.length && (
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
              {filteredSuggestions.map((suggestion, index) => (
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

export default LabelInput;
