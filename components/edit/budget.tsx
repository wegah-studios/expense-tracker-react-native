import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { useCustomThemeContext } from "@/context/themeContext";
import { normalizeString, toastError } from "@/lib/appUtils";
import { updateBudgets } from "@/lib/budgetUtils";
import validateInput from "@/lib/validateInput";
import { Budget, Status } from "@/types/common";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MenuView, NativeActionEvent } from "@react-native-menu/menu";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ToastAndroid,
  View,
} from "react-native";
import InputField from "../inputField";
import LabelInput from "../labelInput";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const EditBudget = (props: Record<string, any>) => {
  const { theme } = useCustomThemeContext();

  const {
    index,
    mode,
    budget,
    handleUpdate,
    close,
    setStatus,
    handleStatusClose,
  } = props as {
    mode: "add" | "edit";
    index?: number;
    budget: Partial<Budget>;
    handleUpdate?: (update: Partial<Budget>, index: number) => void;
    setStatus: React.Dispatch<React.SetStateAction<Status>>;
    handleStatusClose: () => void;
    close: () => void;
  };

  const [form, setForm] = useState<{
    total: string;
    label: string[] | undefined;
    start: Date;
    end: Date;
    repeat: boolean;
    title: string;
    duration: "year" | "month" | "week" | "custom";
  }>({
    label: [],
    total: "",
    repeat: true,
    title: "this year",
    duration: "year",
    end: new Date(Date.UTC(new Date().getFullYear(), 11, 32)),
    start: new Date(Date.UTC(new Date().getFullYear(), 0, 1)),
  });
  const [labelInput, setLabelInput] = useState<string>("");
  const [errors, setErrors] = useState<{
    label: string;
    total: string;
    title: string;
    end: string;
  }>({
    label: "",
    total: "",
    title: "",
    end: "",
  });
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [changes, setChanges] = useState<Set<string>>(new Set());
  const [datePicker, setDatePicker] = useState<{
    open: boolean;
    type: "end" | "start";
  }>({ open: false, type: "end" });

  const isEmpty = useMemo(
    () =>
      !changes.size ||
      (!budget.start &&
        !budget.end &&
        !budget.title &&
        !budget.duration &&
        !budget.repeat &&
        changes.size < 6),
    [changes, budget]
  );

  const ranges = useMemo<{
    year: { start: Date; end: Date };
    month: { start: Date; end: Date };
    week: { start: Date; end: Date };
  }>(() => {
    const date = new Date();
    let year = {
      start: new Date(Date.UTC(date.getFullYear(), 0, 1)),
      end: new Date(Date.UTC(date.getFullYear(), 11, 32)),
    };
    let month = {
      start: new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)),
      end: new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0)),
    };
    let weekStart = date.getDate() - date.getDay();
    let weekEnd = weekStart + 6;
    let week = {
      start: new Date(Date.UTC(date.getFullYear(), date.getMonth(), weekStart)),
      end: new Date(Date.UTC(date.getFullYear(), date.getMonth(), weekEnd)),
    };
    return { year, month, week };
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      label: budget.label ? budget.label.split(",") : undefined,
      total: budget.total ? String(budget.total) : "",
      start: budget.start ? new Date(budget.start) : prev.start,
      end: budget.end ? new Date(budget.end) : prev.end,
      title: budget.title || prev.title,
      duration: budget.duration || prev.duration,
      repeat: budget.repeat !== undefined ? !!budget.repeat : prev.repeat,
    }));
    setLabelInput(budget.label?.replaceAll(",", ", ") || "");
    setErrors({
      label: "",
      title: "",
      total: budget.total ? "" : "required",
      end: "",
    });
    setChanges((prev) => {
      const newSet = new Set(prev);

      if (budget.repeat) {
        newSet.delete("repeat");
      } else {
        newSet.add("repeat");
      }

      return newSet;
    });

    if (mode === "edit") {
      setTouched(new Set(["label", "total"]));
    }
  }, [budget]);

  useEffect(() => {
    let keys = ["year", "month", "week"];
    let title = "";
    let duration = "";
    let startISO = form.start.toISOString();
    let endISO = form.end.toISOString();

    for (let key of keys) {
      if (
        startISO === ranges[key as keyof typeof ranges].start.toISOString() &&
        endISO === ranges[key as keyof typeof ranges].end.toISOString()
      ) {
        title = "this " + key;
        duration = key;
      }
    }

    if (!title || !duration) {
      title =
        budget.duration === "custom" ? budget.title || "custom" : "custom";
      duration = "custom";
    }

    setForm((prev) => ({
      ...prev,
      title,
      duration: duration as typeof form.duration,
    }));

    setChanges((prev) => {
      const newSet = new Set(prev);
      if (startISO !== budget.start) {
        newSet.add("start");
      } else {
        newSet.delete("start");
      }

      if (endISO !== budget.end) {
        newSet.add("end");
      } else {
        newSet.delete("end");
      }

      if (duration !== budget.duration) {
        newSet.add("duration");
      } else {
        newSet.delete("duration");
      }

      if (title !== budget.title) {
        newSet.add("title");
      } else {
        newSet.delete("title");
      }

      return newSet;
    });
  }, [form.start, form.end]);

  const handleChange = (name: string, value: string) => {
    const normalized = normalizeString(value);

    setChanges((prev) => {
      const existing = budget[name as keyof typeof form];
      const isDiff = normalized !== (existing ? String(existing) : "");
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
      [name]: validateInput(
        name,
        value,
        name !== "title",
        undefined,
        name === "title" ? 30 : undefined
      ),
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

  const handleDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
    setDatePicker((prev) => ({ ...prev, open: Platform.OS === "ios" }));
    if (newDate) {
      const utcDate = new Date(
        Date.UTC(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
      );
      if (utcDate.toISOString() !== form[datePicker.type].toISOString()) {
        setForm((prev) => {
          prev[datePicker.type] = utcDate;
          const error = prev.start.toISOString() >= prev.end.toISOString();
          if (error) {
            setErrors((err) => ({ ...err, end: "invalid duration" }));
          } else {
            setErrors((err) => ({ ...err, end: "" }));
          }
          return { ...prev };
        });
      }
    }
  };

  const openDatePicker = (type: "end" | "start") => {
    setDatePicker({ open: true, type });
  };

  const handleMenuItemClick = ({ nativeEvent }: NativeActionEvent) => {
    if (nativeEvent.event !== form.duration) {
      setForm((prev) => ({
        ...prev,
        ...ranges[nativeEvent.event as keyof typeof ranges],
      }));
    }
  };

  const handleRepeat = () => {
    setChanges((prev) => {
      const newSet = new Set(prev);
      if (!form.repeat === !!budget.repeat) {
        newSet.delete("repeat");
      } else {
        newSet.add("repeat");
      }
      return newSet;
    });
    setForm((prev) => ({ ...prev, repeat: !prev.repeat }));
  };

  const handleAction = () => {
    if (isEmpty) {
      close();
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    if (errors.label || errors.total || errors.end || errors.title) {
      setTouched(new Set(["label", "total", "end", "title"]));
      ToastAndroid.show(`Fix form errors`, ToastAndroid.SHORT);
      return;
    }
    try {
      if (!isEmpty) {
        setStatus({
          open: true,
          type: "loading",
          title: mode === "edit" ? "Updating" : "Adding",
          message: `${mode === "edit" ? "updating" : "adding"} budget`,
          handleClose: handleStatusClose,
          action: {
            callback() {},
          },
        });

        let update: Record<string, any> = {};
        let updates = new Set(changes);
        if (changes.has("start") || changes.has("end")) {
          updates.add("start");
          updates.add("end");
          if (form.label !== undefined) {
            updates.add("label");
          }
        }

        if (changes.has("label")) {
          updates.add("start");
          updates.add("end");
        }

        for (let change of [...updates]) {
          let value: string | number | null = "";
          switch (change) {
            case "label":
              value =
                form.label?.map((str) => normalizeString(str)).join(",") ||
                null;
              break;
            case "start":
              value = form.start.toISOString();
              break;
            case "end":
              value = form.end.toISOString();
              break;
            case "total":
              value = Number(normalizeString(form.total || "")) || 0;
              break;
            case "duration":
              value = form.duration;
              break;
            case "repeat":
              value = form.repeat ? 1 : 0;
              break;
            case "title":
              value = normalizeString(form.title);
              break;
            default:
              break;
          }
          update[change] = value;
        }
        update.id = budget.id;

        let [result] = await updateBudgets(
          [update],
          mode === "edit" ? "update" : "add"
        );
        result = { ...budget, ...result };
        handleStatusClose();
        if (handleUpdate) {
          handleUpdate(result, index || 0);
        }
      }
      close();
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
  };

  return (
    <>
      <View className=" pl-[10px] pr-[10px] pt-[20px] pb-[20px] flex-row items-center justify-between bg-paper-light dark:bg-paper-dark ">
        <View className=" flex-row items-center gap-2 ">
          <ThemedText className=" font-urbanistBold text-[1.8rem] capitalize ">
            {(mode || "Add") + " Budget"}
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
          <View className=" mb-[20px] flex-row gap-2 items-center ">
            <ThemedIcon source={icons.info} className=" w-[15px] h-[15px] " />
            <ThemedText className=" flex-1 ">
              Set a budget for a specific expense by entering a label or leave
              it empty for tracking all expenses.
            </ThemedText>
          </View>
          <View className=" mb-[20px] flex-col gap-[20px] p-[20px] rounded-[20px] border border-divider ">
            <LabelInput
              {...{
                expenseValue: budget.label,
                value: form.label,
                input: labelInput,
                changed: changes.has("label"),
                touched: changes.has("label"),
                required: false,
                showBorder: false,
                placeholderText: "e.g Groceries",
                helperText:
                  "Enter the label you want to set a budget for. (Leave this empty if you want to track all expenses)",
                error: errors.label,
                setForm,
                setErrors,
                setChanges,
                setInput: setLabelInput,
                setTouched,
              }}
            />
            <InputField
              name="total"
              label="Maximum"
              placeholder="e.g Ksh 50,000"
              required
              value={form.total}
              handleChange={handleChange}
              handleBlur={handleBlur}
              error={errors.total}
              touched={touched.has("total")}
              changed={changes.has("total")}
              keyboardType="numeric"
            />
            <View className=" flex-col gap-[10px]  ">
              <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                Duration
              </ThemedText>
              <MenuView
                title="Options"
                onPressAction={handleMenuItemClick}
                actions={[
                  {
                    id: "year",
                    title: "This year",
                    subtitle: "set a budget for this year",
                    imageColor: tintColors[theme === "dark" ? "light" : "dark"],
                    state: form.duration === "year" ? "on" : "off",
                  },
                  {
                    id: "month",
                    title: "This month",
                    subtitle: "set a budget for this month",
                    imageColor: tintColors[theme === "dark" ? "light" : "dark"],
                    state: form.duration === "month" ? "on" : "off",
                  },
                  {
                    id: "week",
                    title: "This week",
                    subtitle: "set a budget for this week",
                    imageColor: tintColors[theme === "dark" ? "light" : "dark"],
                    state: form.duration === "week" ? "on" : "off",
                  },
                ]}
                shouldOpenOnLongPress={false}
              >
                <View
                  className={` p-[10px] rounded-[10px] border ${
                    changes.has("duration")
                      ? "border-info"
                      : "border-black dark:border-white"
                  } `}
                >
                  <ThemedText className=" capitalize ">
                    {(form.duration !== "custom" ? "This " : "") +
                      form.duration}
                  </ThemedText>
                </View>
              </MenuView>
            </View>
            {!form.label?.length && form.duration === "custom" && (
              <InputField
                name={"title"}
                value={form.title}
                label={"Custom Title (optional)"}
                placeholder={"e.g. My title"}
                handleBlur={handleBlur}
                handleChange={handleChange}
                error={errors.title}
                touched={touched.has("title")}
                changed={changes.has("title")}
              />
            )}
            <View className=" flex-row gap-[20px] ">
              <View className=" flex-1 flex-col gap-[10px] ">
                <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                  Start
                </ThemedText>
                <Pressable
                  onPress={() => openDatePicker("start")}
                  className={` p-[10px] rounded-[10px] border ${
                    changes.has("start")
                      ? "border-info"
                      : "border-black dark:border-white"
                  }`}
                >
                  <ThemedText>{form.start.toDateString()}</ThemedText>
                </Pressable>
              </View>
              <View className=" flex-1 flex-col gap-[10px] ">
                <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                  End
                </ThemedText>
                <View>
                  <Pressable
                    onPress={() => openDatePicker("end")}
                    className={` p-[10px] rounded-[10px] border ${
                      errors.end
                        ? "border-error"
                        : changes.has("end")
                        ? "border-info"
                        : "border-black dark:border-white"
                    }`}
                  >
                    <ThemedText>{form.end.toDateString()}</ThemedText>
                  </Pressable>
                  {!!errors.end && (
                    <ThemedText toggleOnDark={false} className=" text-error ">
                      {errors.end}
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
            <Pressable
              onPress={handleRepeat}
              className=" flex-row gap-[10px] items-center "
            >
              <ThemedIcon
                source={icons.checkbox[form.repeat ? "checked" : "unchecked"]}
                className=" w-[20px] h-[20px] "
              />
              <ThemedText>Repeat</ThemedText>
            </Pressable>
          </View>
        </View>
      </BottomSheetScrollView>
      {datePicker.open && (
        <DateTimePicker
          value={form[datePicker.type]}
          onChange={handleDateChange}
        />
      )}
    </>
  );
};

export default EditBudget;
