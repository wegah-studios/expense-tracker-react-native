import { normalizeString, toastError } from "@/lib/appUtils";
import { getSuggestions } from "@/lib/dictionaryUtils";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import LabelChip from "./expenses/labelChip";
import InputField from "./inputField";
import ThemedText from "./textThemed";

const LabelInput = ({
  name,
  value,
  required = true,
  showBorder = true,
  changed,
  touched,
  error,
  disabled,
  helperText,
  placeHolder,
  handleChange,
  handleBlur,
  handleFocus,
}: {
  showBorder?: boolean;
  required?: boolean;
  value: string;
  name?: string;
  placeHolder?: string;
  helperText?: string;
  error?: string;
  touched?: boolean;
  changed?: boolean;
  disabled?: boolean;
  handleChange: (name: string, value: string) => void;
  handleBlur: (name: string) => void;
  handleFocus?: (name: string) => void;
}) => {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [editMode, setEditMode] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputName = useMemo(() => name || "label", [name]);
  const label = useMemo(
    () =>
      !!value
        ? normalizeString(value)
            .replace(/\s*,\s*/g, ",")
            .split(",")
        : [],
    [value]
  );

  useEffect(() => {
    setFilteredSuggestions(
      suggestions.filter((str) => str.includes(normalizeString(value || "")))
    );
  }, [value, suggestions]);

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

  const handleLabelCancel = (index: number) => {
    const filtered = label.filter((_str, i) => i !== index);
    let newValue = filtered.join(", ");
    setSelection({ start: newValue.length, end: newValue.length });
    handleChange(inputName, newValue);
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleChange(inputName, suggestion);
    setSelection({ start: suggestion.length, end: suggestion.length });
  };

  const onChange = (name: string, value: string) => {
    if (!editMode) {
      setEditMode(true);
    }
    handleChange(name, value);
  };

  const onFocus = () => {
    setEditMode(true);
    handleFocus && handleFocus(inputName);
  };
  const onBlur = () => {
    setEditMode(false);
    handleBlur(inputName);
  };

  return (
    <View
      className={` flex-col gap-[10px] rounded-[20px] ${
        showBorder ? "p-[20px] border border-divider" : ""
      } `}
    >
      {editMode || !label.length ? (
        <InputField
          autoFocus={!!label.length}
          editable={!disabled}
          required={required}
          name={inputName}
          placeholder={placeHolder || "Enter label"}
          value={value}
          error={error}
          touched={touched}
          changed={changed}
          helperText={helperText || `Separate Labels with commas ,`}
          handleChange={onChange}
          handleFocus={onFocus}
          handleBlur={onBlur}
          // selection={selection}
          // onSelectionChange={({ nativeEvent }) => {
          //   setSelection(nativeEvent.selection);
          // }}
        />
      ) : (
        <Pressable
          disabled={!!disabled}
          onPress={handlePress}
          className={` flex-row p-[10px] rounded-[10px] border dark:border-white `}
        >
          <View className=" flex-row gap-[10px] flex-wrap items-center ">
            {label.map((item, index) => (
              <LabelChip
                key={index}
                disabled={!!disabled}
                name={item}
                index={index}
                onPress={handlePress}
                onCancel={handleLabelCancel}
              />
            ))}
          </View>
        </Pressable>
      )}
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
