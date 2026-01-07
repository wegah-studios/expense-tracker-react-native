import icons from "@/constants/icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const ExpensesExportModal = ({
  open,
  enableRange,
  handleClose,
  handleSubmit,
}: {
  open: boolean;
  enableRange: boolean;
  handleClose: () => void;
  handleSubmit: (
    properties: Set<string>,
    images: boolean,
    range?: { start: string; end: string }
  ) => void;
}) => {
  const options = useMemo(
    () => [
      { title: "labels", value: "label" },
      { title: "Recipients", value: "recipient" },
      { title: "Amounts", value: "amount" },
      { title: "Reference IDs", value: "ref" },
      { title: "Receipts", value: "receipt" },
    ],
    []
  );

  const values = useMemo(
    () => ["label", "recipient", "amount", "ref", "receipt", "date"],
    []
  );

  const [images, setImages] = useState<boolean>(true);
  const [selection, setSelection] = useState<Set<string>>(new Set(values));
  const [range, setRange] = useState<{ start: Date; end: Date }>({
    end: new Date(Date.UTC(new Date().getFullYear(), 11, 32)),
    start: new Date(Date.UTC(new Date().getFullYear(), 0, 1)),
  });
  const [rangeError, setRangeError] = useState<boolean>(false);
  const [datePicker, setDatePicker] = useState<{
    open: boolean;
    type: "end" | "start";
  }>({ open: false, type: "end" });

  const allSelected = useMemo(
    () => selection.size === values.length,
    [selection, options]
  );

  const handleSelect = (option: string) => {
    setSelection((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      return newSet;
    });
  };

  const handleDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
    setDatePicker((prev) => ({ ...prev, open: Platform.OS === "ios" }));
    if (newDate) {
      const utcDate = new Date(
        Date.UTC(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
      );
      setRange((prev) => {
        prev[datePicker.type] = utcDate;
        setRangeError(prev.start >= prev.end);
        return { ...prev };
      });
    }
  };

  const openDatePicker = (type: "end" | "start") => {
    setDatePicker({ open: true, type });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelection(new Set());
    } else {
      setSelection(new Set(values));
    }
  };

  const onSubmit = () => {
    handleSubmit(
      selection,
      images,
      enableRange
        ? { start: range.start.toISOString(), end: range.end.toISOString() }
        : undefined
    );
    handleClose();
  };

  return (
    <>
      <Modal
        animationType="fade"
        transparent={true}
        visible={open}
        onRequestClose={handleClose}
      >
        <Pressable
          onPress={handleClose}
          className=" flex-1 bg-black/50 flex-row justify-center items-center "
        >
          <Pressable
            onPress={() => {}}
            style={{ height: "auto" }}
            className=" flex-col gap-[20px] w-[90vw] max-w-[600px] p-[20px] bg-white rounded-[20px] dark:bg-paper-dark "
          >
            <View className=" flex-row items-center justify-between pb-[5px]  ">
              <ThemedText className=" font-urbanistMedium text-[1.5rem] ">
                Select What To Export
              </ThemedText>
              <Pressable onPress={handleClose}>
                <ThemedIcon
                  source={icons.add}
                  className=" w-[20px] h-[20px] rotate-45 "
                />
              </Pressable>
            </View>
            {enableRange && (
              <>
                <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                  Export expenses from:
                </ThemedText>
                <View className=" flex-col gap-2 ">
                  <View className="  flex-row gap-[20px] ">
                    <Pressable
                      onPress={() => openDatePicker("start")}
                      className={` flex-1 p-[10px] rounded-[10px] border ${
                        rangeError
                          ? "border-error"
                          : "border-black dark:border-white"
                      }`}
                    >
                      <ThemedText className=" text-center ">
                        {range.start.toDateString()}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => openDatePicker("end")}
                      className={`flex-1 p-[10px] rounded-[10px] border ${
                        rangeError
                          ? "border-error"
                          : "border-black dark:border-white"
                      }`}
                    >
                      <ThemedText className={` text-center `}>
                        {range.end.toDateString()}
                      </ThemedText>
                    </Pressable>
                  </View>
                  {rangeError && (
                    <ThemedText
                      toggleOnDark={false}
                      className=" text-error text-center "
                    >
                      Invalid range
                    </ThemedText>
                  )}
                </View>
              </>
            )}
            <View>
              <Pressable
                onPress={handleSelectAll}
                className={" pt-[10px] pb-[10px] flex-row items-center gap-2 "}
              >
                <ThemedIcon
                  source={icons.checkbox[allSelected ? "checked" : "unchecked"]}
                  className=" w-[20px] h-[20px] "
                />
                <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                  All
                </ThemedText>
              </Pressable>
              {options.map((option, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSelect(option.value)}
                  className={
                    " ml-[25px] pt-[10px] pb-[10px] flex-row items-center gap-2 "
                  }
                >
                  <ThemedIcon
                    source={
                      icons.checkbox[
                        selection.has(option.value) ? "checked" : "unchecked"
                      ]
                    }
                    className=" w-[20px] h-[20px] "
                  />
                  <ThemedText className=" capitalize text-[1.1rem] ">
                    {option.title}
                  </ThemedText>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setImages((prev) => !prev)}
                className={
                  " ml-[25px] pt-[10px] pb-[10px] flex-row items-center gap-2 "
                }
              >
                <ThemedIcon
                  source={icons.checkbox[images ? "checked" : "unchecked"]}
                  className=" w-[20px] h-[20px] "
                />
                <ThemedText className=" capitalize text-[1.1rem] ">
                  Images
                </ThemedText>
              </Pressable>
            </View>
            <View className={" flex-row justify-between gap-1 pt-[10px] "}>
              <Pressable
                onPress={handleClose}
                className=" p-[20px] pt-[10px] pb-[10px] border border-black rounded-[20px] dark:border-white "
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                disabled={!selection.size || rangeError}
                onPress={onSubmit}
                className={` flex-row gap-2 p-[20px] pt-[10px] pb-[10px] rounded-[20px] bg-black dark:bg-white disabled:bg-divider `}
              >
                <ThemedIcon
                  reverse
                  source={icons.export}
                  className=" w-[15px] h-[15px] "
                />
                <ThemedText reverse className=" text-white ">
                  Export
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {datePicker.open && (
        <DateTimePicker
          value={range[datePicker.type]}
          onChange={handleDateChange}
        />
      )}
    </>
  );
};

export default ExpensesExportModal;
