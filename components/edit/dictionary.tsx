import icons from "@/constants/icons";
import { normalizeString, toastError } from "@/lib/appUtils";
import { updateDictionaryItem } from "@/lib/dictionaryUtils";
import validateInput from "@/lib/validateInput";
import { DictionaryItem, DictionaryItemType, Status } from "@/types/common";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, Pressable, ToastAndroid, View } from "react-native";
import InputField from "../inputField";
import LabelInput from "../labelInput";
import RecipientInput from "../recipientInput";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const EditDictionary = (props: Record<string, any>) => {
  const {
    index,
    item,
    mode,
    matchType,
    handleUpdate,
    close,
    setStatus,
    handleStatusClose,
  } = props as {
    mode: "add" | "edit";
    matchType: DictionaryItemType;
    index?: number;
    item: Partial<DictionaryItem>;
    handleUpdate?: (update: Partial<DictionaryItem>, index: number) => void;
    setStatus: React.Dispatch<React.SetStateAction<Status>>;
    handleStatusClose: () => void;
    close: () => void;
  };

  const [form, setForm] = useState<{ label: string; match: string }>({
    label: "",
    match: "",
  });
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [changes, setChanges] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<{ label: string; match: string }>({
    label: "",
    match: "",
  });
  const isEmpty = useMemo(() => !changes.size, [changes]);

  useEffect(() => {
    setForm((prev) => ({
      label: item.label ? item.label : "",
      match: item.match || "",
    }));
    setErrors((prev) => ({
      label: item.label ? "" : "required",
      match: item.match ? "" : "required",
    }));
    if (mode === "edit") {
      setTouched(new Set(["label", "match"]));
    }
  }, [item]);

  const handleChange = (name: string, value: string) => {
    const normalized = normalizeString(value);

    setChanges((prev) => {
      const existing = item[name as keyof typeof form]?.toString() || "";
      let isDiff = normalized !== existing;
      if (name === "label") {
        isDiff = normalized.replace(/\s*,\s*/g, ",") !== existing;
      }

      if (isDiff !== prev.has(name)) {
        const newSet = new Set(prev);
        if (isDiff) {
          newSet.add(name);
        } else {
          newSet.delete(name);
        }
        return newSet;
      }
      return prev;
    });

    setErrors((prev) => ({
      ...prev,
      [name]: validateInput(name, value),
    }));
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (name: string) => {
    if (!touched.has(name)) {
      setTouched((prev) => {
        const newSet = new Set(prev);
        newSet.add(name);
        return newSet;
      });
    }
  };

  const handleAction = () => {
    if (isEmpty) {
      close();
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (errors.label || errors.match) {
      setTouched(new Set(["label", "match"]));
      ToastAndroid.show(`Fix form errors`, ToastAndroid.SHORT);
      return;
    }
    if (!isEmpty) {
      try {
        setStatus({
          open: true,
          type: "loading",
          title: mode === "edit" ? "Updating" : "Adding",
          message: `${mode === "edit" ? "updating" : "adding"} ${matchType}`,
          handleClose: handleStatusClose,
          action: {
            callback() {},
          },
        });

        let update: Record<string, any> = {};

        for (let change of [...changes]) {
          let value: string | number | null = "";
          switch (change) {
            case "label":
              value = form.label
                ? normalizeString(form.label).replace(/\s*,\s*/g, ",")
                : null;
              break;
            default:
              const fktypescript = form[change as keyof typeof form];
              if (typeof fktypescript === "string") {
                value = normalizeString(fktypescript);
              }
              break;
          }
          update[change] = value;
        }
        update.id = item.id;
        update.type = item.type || matchType;

        const result = await updateDictionaryItem(
          update,
          mode === "edit" ? "update" : "add"
        );
        if (handleUpdate) {
          handleUpdate({ ...item, ...result }, index || 0);
        }
        handleStatusClose();
      } catch (error) {
        toastError(error);
        setStatus({
          open: true,
          type: "error",
          message: "An error occured when updating budget, please try again.",
          handleClose: handleStatusClose,
          action: {
            callback() {
              handleStatusClose();
            },
          },
        });
      }
    }
    close();
  };

  return (
    <>
      <View className=" pl-[10px] pr-[10px] pt-[20px] pb-[20px] flex-row items-center justify-between bg-paper-light dark:bg-paper-dark ">
        <View className=" flex-row items-center gap-2 ">
          <ThemedText className=" font-urbanistBold text-[1.8rem] capitalize ">
            {(mode || "Add") + " " + matchType}
          </ThemedText>
        </View>
        <Pressable
          onPress={handleAction}
          className={`${
            !isEmpty ? "p-[20px] pt-[10px] pb-[10px]" : "p-[5px]"
          } bg-black rounded-[20px] dark:bg-white `}
        >
          {!isEmpty ? (
            <ThemedText reverse>Save</ThemedText>
          ) : (
            <ThemedIcon
              reverse
              source={icons.add}
              className=" w-[15px] h-[15px] rotate-45 "
            />
          )}
        </Pressable>
      </View>
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        className=" pl-[10px] pr-[10px] flex-1 bg-paper-light dark:bg-paper-dark "
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ minHeight: Dimensions.get("window").height }}>
          <View className=" mb-[20px] flex-col gap-[10px] p-[20px] rounded-[20px] border border-divider ">
            {matchType === "keyword" ? (
              <InputField
                name={"match"}
                value={form.match}
                label={matchType}
                placeholder={"e.g 'mart'"}
                handleBlur={handleBlur}
                handleChange={handleChange}
                error={errors.match}
                touched={touched.has("match")}
                changed={changes.has("match")}
              />
            ) : (
              <RecipientInput
                name={"match"}
                value={form.match}
                placeHolder="e.g Quickmart Kilimani"
                handleBlur={handleBlur}
                handleChange={handleChange}
                error={errors.match}
                touched={touched.has("match")}
                changed={changes.has("match")}
              />
            )}
            <LabelInput
              required={true}
              value={form.label}
              placeHolder="e.g Groceries"
              helperText={`Enter the label you want to assign for the above ${matchType}.`}
              handleBlur={handleBlur}
              handleChange={handleChange}
              error={errors.label}
              touched={touched.has("label")}
              changed={changes.has("label")}
            />
          </View>
        </View>
      </BottomSheetScrollView>
    </>
  );
};

export default EditDictionary;
