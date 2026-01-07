import SelectImageModal from "@/components/expenses/selectImageModal";
import InputField from "@/components/inputField";
import ThemedText from "@/components/textThemed";
import ThemedIcon from "@/components/themedIcon";
import { tintColors } from "@/constants/colorSettings";
import icons from "@/constants/icons";
import { normalizeString, toastError } from "@/lib/appUtils";
import { copyToClipboard, pasteFromClipboard } from "@/lib/clipboardUtils";
import { getCollections } from "@/lib/collectionsUtils";
import { editMultipleExpenses, updateExpenses } from "@/lib/expenseUtils";
import { dowloadImage } from "@/lib/imageUtils";
import validateInput from "@/lib/validateInput";
import {
  Expense,
  ExpenseForm,
  ExpenseFormErrors,
  Status,
} from "@/types/common";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import * as FileSystem from "expo-file-system/legacy";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, ToastAndroid, View } from "react-native";
import MoveModal from "../expenses/moveModal";
import ViewImageModal from "../expenses/viewImageModal";
import LabelInput from "../labelInput";
import RecipientInput from "../recipientInput";

const EditExpense = (props: Record<string, any>) => {
  const scrollViewRef = useRef<any>(null);

  const {
    indices,
    mode,
    readonly,
    expenses,
    handleUpdate,
    close,
    setStatus,
    handleStatusClose,
  } = props as {
    mode: "add" | "edit" | "multiple";
    readonly?: boolean;
    indices?: number[];
    expenses: Partial<Expense>[];
    handleUpdate?: (update: Map<number, Partial<Expense>>) => void;
    setStatus: React.Dispatch<React.SetStateAction<Status>>;
    handleStatusClose: () => void;
    close: () => void;
  };
  const [form, setForm] = useState<ExpenseForm>({ label: [] });
  const [labelInput, setLabelInput] = useState<string>("");
  const [errors, setErrors] = useState<ExpenseFormErrors>({
    label: "",
    amount: "",
    recipient: "",
    ref: "",
    receipt: "",
  });
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [changes, setChanges] = useState<Set<string>>(new Set());
  const [selectImageModal, setSelectImageModal] = useState<boolean>(false);
  const [viewImageModal, setViewImageModal] = useState<string>("");
  const [collectionModal, setCollectionModal] = useState<boolean>(false);
  const [collections, setCollections] = useState<{
    map: Map<string, number>;
    names: string[];
  }>({ map: new Map(), names: [] });
  const [datePicker, setDatePicker] = useState<{
    open: boolean;
    type: "date" | "time";
  }>({ open: false, type: "date" });

  const expense = useMemo<Partial<Expense>>(
    () => (mode !== "multiple" ? expenses[0] || {} : {}),
    [expenses, mode]
  );
  const isEmpty = useMemo(
    () =>
      !changes.size ||
      (mode !== "multiple" &&
        !expense.date &&
        expense.collection !== "failed" &&
        changes.size <= 1),
    [mode, changes, expense]
  );
  const noCollection = useMemo(
    () =>
      !form.collection ||
      form.collection === "expenses" ||
      form.collection === "failed" ||
      form.collection === "exclusions",
    [form.collection]
  );

  useEffect(() => {
    const fetchCollections = async () => {
      const data = await getCollections();
      setCollections(data);
    };
    fetchCollections();
  }, []);

  useEffect(() => {
    setForm({
      ...expense,
      label: expense.label ? expense.label.split(",") : [],
      date: expense.date
        ? new Date(expense.date)
        : mode === "multiple"
        ? undefined
        : new Date(),
      amount: expense.amount ? String(expense.amount) : undefined,
      image: expense.image
        ? `${FileSystem.documentDirectory}images/${expense.image}`
        : undefined,
    });
    setLabelInput(expense.label?.replaceAll(",", ", ") || "");
    setErrors({
      label: expense.label || mode === "multiple" ? "" : "required",
      amount: expense.amount || mode === "multiple" ? "" : "required",
      recipient: expense.recipient || mode === "multiple" ? "" : "required",
      ref: "",
      receipt: "",
    });

    if (mode === "edit") {
      setTouched(new Set(["label", "amount", "recipient", "ref", "receipt"]));
    } else {
      setTouched(new Set());
    }

    if (!expense.date && mode !== "multiple") {
      setChanges((prev) => {
        const newSet: Set<string> = new Set(prev);
        newSet.add("date");
        return newSet;
      });
    } else {
      setChanges(new Set());
    }
  }, [expense]);

  const handleChange = (name: string, value: string) => {
    const normalized = normalizeString(value);

    setChanges((prev) => {
      const existing = expense[name as keyof typeof form];
      const isDiff = normalized !== (existing ? String(existing) : "");
      if (isDiff !== prev.has(name)) {
        const newSet = new Set(prev);
        if (isDiff && (mode !== "multiple" || normalized)) {
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
        mode !== "multiple" && name !== "ref" && name !== "receipt"
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
      setForm((prev) => ({ ...prev, date: newDate }));

      setChanges((prev) => {
        const newSet = new Set(prev);
        newSet.add("date");
        return newSet;
      });
    }
  };

  const openDatePicker = (type: "date" | "time") => {
    setDatePicker({ open: true, type });
  };

  const handleInputFocus = (scrollY: number) => {
    scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
  };

  const handleSave = async () => {
    if (
      errors.label ||
      errors.amount ||
      errors.recipient ||
      errors.ref ||
      errors.receipt
    ) {
      setTouched(new Set(["label", "amount", "recipient", "ref", "receipt"]));
      ToastAndroid.show(`Fix Form errors`, ToastAndroid.SHORT);
      return;
    }

    if (!isEmpty) {
      setStatus({
        open: true,
        type: "loading",
        title: mode === "add" ?  "Adding" : "Updating",
        message: `${mode === "add" ? "adding" : "Updating"} expense${mode === "multiple" ? "s" :""}, please wait`,
        handleClose: handleStatusClose,
        action: {
          callback() {},
        },
      });
      try {
        let edit: Record<string, any> = {};
        let update: Map<number, Partial<Expense>> = new Map();

        for (let change of [...changes]) {
          let value: string | number = "";
          switch (change) {
            case "label":
              value =
                form.label?.map((str) => normalizeString(str)).join(",") || "";
              break;
            case "date":
              value = form.date?.toISOString() || "";
              break;
            case "amount":
              value = Number(normalizeString(form.amount || "")) || 0;
              break;
            case "image":
              value = form.image || "";
              break;
            default:
              const fktypescript = form[change as keyof typeof form];
              if (typeof fktypescript === "string") {
                value = normalizeString(fktypescript);
              }
              break;
          }
          edit[change] = value;
        }
        if (mode !== "multiple") {
          edit.id = expense.id;
          if (
            (expense.collection === "failed" || mode === "add") &&
            !edit.collection
          ) {
            edit.collection = "expenses";
          }
          if (expense.collection === "failed") {
            const edits = edit;
            edit = { ...expense, ...edits };
          }
          await updateExpenses(
            [edit],
            mode === "add" ? "add" : "update",
            mode === "edit" ? new Map([[0, expense]]) : undefined,
            true
          );
          edit = { ...expense, ...edit };
          if (indices) {
            update.set(indices[0], edit);
          }
        } else {
          if (indices) {
            update = await editMultipleExpenses(edit, expenses, indices);
          }
        }
        handleStatusClose();
        if (handleUpdate) {
          handleUpdate(update);
        }
      } catch (error) {
        toastError(error);
        setStatus({
          open: true,
          type: "error",
          message: "An error occured while updating expenses, please try again.",
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

  // const handleBack = () => {
  //   if (!isEmpty) {
  //     setStatus({
  //       type: "warning",
  //       open: true,
  //       title: "Unsaved data?",
  //       message: "The changes you've made will be lost",
  //       handleClose: handleStatusClose,
  //       action: {
  //         title: "Leave",
  //         callback() {
  //           router.back();
  //         },
  //       },
  //     });
  //   } else {
  //     handleClose();
  //   }
  // };

  const handleReceiptPaste = async () => {
    try {
      const text = await pasteFromClipboard();
      if (text) {
        setForm((prev) => ({ ...prev, receipt: text }));
        setErrors((prev) => ({
          ...prev,
          receipt: validateInput("receipt", text, false),
        }));
        setChanges((prev) => {
          const newSet = new Set(prev);
          newSet.add("receipt");
          return newSet;
        });
        ToastAndroid.show(`Receipt pasted`, ToastAndroid.SHORT);
      } else {
        ToastAndroid.show(`No receipt to paste`, ToastAndroid.SHORT);
      }
    } catch (error) {
      toastError(error, `An error occured while pasting receipt`);
    }
  };

  const handleCopy = async () => {
    try {
      if (form.receipt) {
        await copyToClipboard(form.receipt);
      } else {
        toastError({}, `No receipt to copy`);
      }
    } catch (error) {
      toastError(error, `An error occured while copying receipt`);
    }
  };

  const handleDownload = async () => {
    try {
      if (form.image) {
        await dowloadImage(form.image);
        ToastAndroid.show(`Image downloaded`, ToastAndroid.SHORT);
      } else {
        toastError({}, `No image`);
      }
    } catch (error) {
      toastError(error, `An error occured while downloading image`);
    }
  };

  const handleImagePress = () => {
    if (form.image) {
      setViewImageModal(form.image);
    } else if (!readonly) {
      setSelectImageModal(true);
    }
  };

  const handleImageSubmit = async (uri: string) => {
    setForm((prev) => ({ ...prev, image: uri }));
    setChanges((prev) => {
      const newSet = new Set(prev);
      newSet.add("image");
      return newSet;
    });
    setSelectImageModal(false);
  };

  const handleCollectionSubmit = (collection: string) => {
    setForm((prev) => ({ ...prev, collection }));
    setChanges((prev) => {
      const newSet = new Set(prev);
      if (collection !== expense.collection) {
        newSet.add("collection");
      } else {
        newSet.delete("collection");
      }
      return newSet;
    });
    setCollectionModal(false);
  };

  const handleAction = () => {
    if (!isEmpty) {
      handleSave();
    } else {
      close();
    }
  };

  return (
    <>
      <View className=" relative pl-[10px] pr-[10px] pt-[20px] pb-[20px] flex-row items-center justify-between bg-paper-light dark:bg-paper-dark ">
        <View className=" flex-row items-center gap-2 ">
          <ThemedText className=" font-urbanistBold text-[1.8rem] capitalize ">
            {(readonly ? "View" : mode || "Add") +
              " Expense" +
              (mode === "multiple" ? "s" : "")}
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
        {!!readonly && (
          <View
            style={{ zIndex: 1 }}
            className=" absolute bottom-[-120%] left-[50%] transform -translate-x-1/2 p-[10px] rounded-[10px] bg-info "
          >
            <ThemedText toggleOnDark={false} reverse>
              View Only Mode
            </ThemedText>
          </View>
        )}
      </View>
      <BottomSheetScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        className=" pl-[10px] pr-[10px] flex-1 bg-paper-light dark:bg-paper-dark "
        keyboardShouldPersistTaps="handled"
      >
        <View className=" flex-col gap-[20px] ">
          {mode === "multiple" && (
            <View className=" flex-row gap-2 items-center ">
              <ThemedIcon source={icons.info} className=" w-[15px] h-[15px] " />
              <ThemedText className=" flex-1 ">
                You are editing multiple expenses. The values that you fill out
                below will be assigned to every selected expense.
              </ThemedText>
            </View>
          )}
          <LabelInput
            {...{
              disabled: readonly,
              expenseValue: expense.label,
              value: form.label,
              input: labelInput,
              required: mode !== "multiple",
              changed: changes.has("label"),
              touched: changes.has("label"),
              error: errors.label,
              setForm,
              setErrors,
              setChanges,
              setTouched,
              setInput: setLabelInput,
              handleInputFocus,
            }}
          />
          <Pressable
            disabled={!!readonly}
            onPress={() => setCollectionModal(true)}
            className={`  flex-row items-center gap-[10px] p-[10px] rounded-[10px] border ${
              changes.has("collection")
                ? "border-info"
                : noCollection
                ? "border-divider"
                : "border-black dark:border-white"
            } `}
          >
            <ThemedIcon
              source={icons.folder}
              className=" w-[15px] h-[15px] "
              tintColor={noCollection ? tintColors.divider : undefined}
            />
            <ThemedText
              toggleOnDark={!noCollection}
              className={` flex-1 capitalize ${
                noCollection ? "text-divider" : ""
              } `}
            >
              {noCollection ? "No collection selected" : form.collection}
            </ThemedText>
          </Pressable>
          <View className="  flex-col gap-[10px] p-[20px] rounded-[20px] border border-divider ">
            <RecipientInput
              {...{
                disabled: readonly,
                value: form.recipient || "",
                placeHolder: "e.g Mr John",
                changed: changes.has("recipient"),
                touched: changes.has("recipient"),
                error: errors.recipient,
                handleBlur,
                handleChange,
                handleFocus: () => handleInputFocus(50),
              }}
            />
            <InputField
              editable={!readonly}
              name="amount"
              placeholder="e.g Ksh 500"
              required
              value={form.amount}
              handleChange={handleChange}
              handleBlur={handleBlur}
              onFocus={() => handleInputFocus(100)}
              error={errors.amount}
              touched={touched.has("amount")}
              changed={changes.has("amount")}
              keyboardType="numeric"
            />
          </View>

          <View className="  flex-col gap-[10px] p-[20px] rounded-[20px] border border-divider ">
            <View className=" flex-col gap-[10px] ">
              <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                Date
              </ThemedText>
              <Pressable
                disabled={!!readonly}
                onPress={() => openDatePicker("date")}
                className={` p-[10px] rounded-[10px] border ${
                  changes.has("date")
                    ? "border-info"
                    : form.date
                    ? " border-black dark:border-white"
                    : "border-divider"
                } `}
              >
                <ThemedText
                  toggleOnDark={!!form.date}
                  className={`${!form.date ? "text-divider" : ""}`}
                >
                  {form.date ? form.date.toDateString() : "Select Date"}
                </ThemedText>
              </Pressable>
            </View>
            <View className=" flex-col gap-[10px] ">
              <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                Time
              </ThemedText>
              <Pressable
                disabled={!!readonly}
                onPress={() => openDatePicker("time")}
                className={` p-[10px] rounded-[10px] border ${
                  changes.has("date")
                    ? "border-info"
                    : form.date
                    ? " border-black dark:border-white"
                    : "border-divider"
                } `}
              >
                <ThemedText
                  toggleOnDark={!!form.date}
                  className={`${!form.date ? "text-divider" : ""}`}
                >
                  {form.date
                    ? dayjs(form.date).format("hh:mm a")
                    : "Select time"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
          <View className="  flex-col gap-[10px] p-[20px] rounded-[20px] border border-divider ">
            <InputField
              editable={!readonly}
              name="ref"
              label="Reference ID"
              placeholder="e.g HMDLX123"
              value={form.ref}
              handleChange={handleChange}
              handleBlur={handleBlur}
              onFocus={() => handleInputFocus(300)}
              error={errors.ref}
              touched={touched.has("ref")}
              changed={changes.has("ref")}
            />
            <View className=" relative flex-col gap-[10px] ">
              <View className=" flex-row justify-between ">
                <ThemedText className=" font-urbanistMedium text-[1.2rem] ">
                  Receipt
                </ThemedText>
                {!!form.receipt && (
                  <Pressable
                    onPress={handleCopy}
                    className=" flex-row gap-1 items-center p-[10px] pt-[3px] pb-[3px] bg-black rounded-[20px] dark:bg-white "
                  >
                    <ThemedIcon
                      reverse
                      source={icons.copy}
                      className=" w-[10px] h-[10px] "
                    />
                    <ThemedText reverse>Copy</ThemedText>
                  </Pressable>
                )}
              </View>
              <InputField
                editable={!readonly}
                name="receipt"
                value={form.receipt}
                showLabel={false}
                placeholder="Enter or paste receipt..."
                className=" p-[0px] border-none min-h-[100px] "
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                handleChange={handleChange}
                handleBlur={handleBlur}
                onFocus={() => handleInputFocus(400)}
                error={errors.receipt}
                touched={touched.has("receipt")}
                changed={changes.has("receipt")}
              />
              {!form.receipt && (
                <Pressable
                  disabled={!!readonly}
                  onPress={handleReceiptPaste}
                  className=" absolute top-[38] right-[10]  p-[10px] pt-[3px] pb-[3px] bg-black rounded-[20px] dark:bg-white "
                >
                  <ThemedText reverse>Paste</ThemedText>
                </Pressable>
              )}
            </View>
          </View>
          <ThemedText className="  font-urbanistMedium text-[1.2rem] ">
            Image
          </ThemedText>
          <Pressable
            onPress={handleImagePress}
            className={` relative overflow-hidden rounded-[20px] flex-row aspect-square border ${
              changes.has("image") ? "border-info" : "border-divider"
            } `}
          >
            {form.image && (
              <Image
                src={form.image}
                className=" w-[100%] h-[100%] "
                resizeMode="contain"
              />
            )}
            <View
              style={{ zIndex: 1 }}
              className=" absolute w-[100%] h-[100%] bg-black/5 flex-col gap-2 items-center justify-center "
            >
              {!form.image && (
                <>
                  <Image
                    source={icons.image}
                    className=" w-[40px] h-[40px] "
                    tintColor={tintColors.divider}
                  />
                  <ThemedText className=" text-divider ">No Image</ThemedText>
                  <View className=" p-[20px] pt-[5px] pb-[5px] bg-black rounded-[20px] dark:bg-white ">
                    <ThemedText reverse>Add</ThemedText>
                  </View>
                </>
              )}
            </View>
          </Pressable>
          {!!form.image && (
            <View className=" mt-[20px] pb-[20px] flex-row gap-[10px] ">
              {!!readonly ? (
                <View></View>
              ) : (
                <Pressable
                  onPress={() => setSelectImageModal(true)}
                  className=" flex-1 items-center justify-center p-[20px] pt-[10px] pb-[10px] flex-row gap-2 rounded-[20px] border border-black dark:border-white "
                >
                  <ThemedIcon
                    source={icons.image}
                    className=" w-[15px] h-[15px] "
                  />
                  <ThemedText>Change</ThemedText>
                </Pressable>
              )}
              <Pressable
                onPress={handleDownload}
                className=" flex-1 items-center justify-center p-[20px] pt-[10px] pb-[10px] flex-row gap-2 bg-black rounded-[20px] dark:bg-white "
              >
                <ThemedIcon
                  reverse
                  source={icons.download}
                  className=" w-[15px] h-[15px] "
                />
                <ThemedText reverse>Download</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </BottomSheetScrollView>
      {datePicker.open && (
        <DateTimePicker
          value={form.date || new Date()}
          onChange={handleDateChange}
          mode={datePicker.type}
        />
      )}
      <SelectImageModal
        open={selectImageModal}
        handleClose={() => setSelectImageModal(false)}
        handleSubmit={handleImageSubmit}
      />
      <ViewImageModal
        uri={viewImageModal}
        open={!!viewImageModal}
        handleClose={() => setViewImageModal("")}
      />
      <MoveModal
        open={collectionModal}
        handleClose={() => setCollectionModal(false)}
        collection={form.collection}
        collections={collections}
        setCollections={setCollections}
        handleSubmit={handleCollectionSubmit}
      />
    </>
  );
};

export default EditExpense;
