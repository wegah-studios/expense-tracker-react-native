import icons from "@/constants/icons";
import { toastError } from "@/lib/appUtils";
import { importExpenses, importStatement } from "@/lib/exportUtils";
import { EditingContextProps, Expense, Status } from "@/types/common";
import { Href, router, usePathname } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import ImportFileModal from "../importFileModal";
import ThemedText from "../textThemed";
import ThemedIcon from "../themedIcon";

const AddExpenseModal = ({
  open,
  openEditSheet,
  setStatus,
  handleStatusClose,
  handleClose,
}: {
  open: boolean;
  openEditSheet: (props: EditingContextProps) => void;
  setStatus: React.Dispatch<React.SetStateAction<Status>>;
  handleStatusClose: () => void;
  handleClose: () => void;
}) => {
  const pathname = usePathname();
  const [fileModal, setFileModal] = useState<{
    open: boolean;
    type: "pdf" | "excel";
    title?: string;
    info?: string;
  }>({ open: false, type: "pdf" });

  const handleManualFormSubmit = () => {
    setStatus({
      open: true,
      type: "success",
      title: "Expense added",
      message: `New expense added`,
      handleClose: handleStatusClose,
      action: {
        title: "View",
        callback() {
          const path: Href = {
            pathname: "/expenses/collection",
            params: { collection: "expenses", filter: "modifiedAt" },
          };
          if (pathname !== "/expenses/collection") {
            router.push(path);
          } else {
            router.replace(path);
          }
          handleStatusClose();
        },
      },
    });
    router.replace(pathname as Href);
  };

  const handleManualForm = () => {
    openEditSheet({
      type: "expense",
      mode: "add",
      expenses: [{}],
      snapPoints: ["100%"],
      handleUpdate: handleManualFormSubmit,
    });
    handleClose();
  };

  const handleMessages = () => {
    openEditSheet({
      type: "messages",
      snapPoints: ["80%", "100%"],
      handleUpdate: handleMessagesSubmit,
    });
    handleClose();
  };

  const handleMessagesSubmit = (data: Partial<Expense>[]) => {
    setStatus({
      open: true,
      type: "success",
      title: "Expenses imported",
      message: `${data.length} new expenses imported.`,
      handleClose: handleStatusClose,
      action: {
        title: "View",
        callback() {
          const path: Href = {
            pathname: "/expenses/collection",
            params: { collection: "expenses", filter: "modifiedAt" },
          };
          if (pathname !== "/expenses/collection") {
            router.push(path);
          } else {
            router.replace(path);
          }
          handleStatusClose();
        },
      },
    });
  };

  const handleStatement = () => {
    handleClose();
    setFileModal({
      open: true,
      type: "pdf",
      title: "Import Statements",
      info: "Open the M-pesa app and export your statements, then select the file here to import it.",
    });
  };

  const handleExcelFile = () => {
    handleClose();
    setFileModal({
      open: true,
      type: "excel",
      title: "Import Statements",
      info: "Open the M-pesa app and export your statements, then select the file here to import it.",
    });
  };

  const handleFileModalSubmit = async (uri: string) => {
    try {
      setStatus({
        open: true,
        type: "loading",
        title: "Importing expenses",
        message: "This may take a while.",
        handleClose: handleStatusClose,
        action: {
          callback() {},
        },
      });
      let data: Partial<Expense>[] = [];
      if (fileModal.type === "excel") {
        data = await importExpenses(uri);
      } else if (fileModal.type === "pdf") {
        data = await importStatement(uri);
      }
      if (!data.length) {
        toastError(
          new Error(`No expenses found`, { cause: 1 }),
          `No expenses found`
        );
        return;
      }
      setStatus({
        open: true,
        type: "success",
        title: "Expenses added",
        message: `${data.length} new expenses added.`,
        handleClose: handleStatusClose,
        action: {
          title: "View",
          callback() {
            const path: Href = {
              pathname: "/expenses/collection",
              params: { collection: "expenses", filter: "modifiedAt" },
            };
            if (pathname !== "/expenses/collection") {
              router.push(path);
            } else {
              router.replace(path);
            }
            handleStatusClose();
          },
        },
      });
    } catch (error) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        title: "Error importing data",
        message: "An error occured while importing data",
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
            <View className=" flex-row items-center justify-center ">
              <ThemedText className=" font-urbanistBold text-[1.5rem] ">
                Add Expense
              </ThemedText>
            </View>
            <View className=" flex-col gap-[20px] ">
              <View className=" flex-row gap-[20px] ">
                <Pressable
                  onPress={handleStatement}
                  className=" flex-col gap-2 justify-center items-center flex-1 aspect-square rounded-[20px] border border-black dark:border-white "
                >
                  <ThemedIcon
                    source={icons.pdf}
                    className=" w-[30px] h-[30px] "
                  />
                  <ThemedText>M-pesa statement</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleMessages}
                  className=" flex-col gap-2 justify-center items-center flex-1 aspect-square rounded-[20px] border border-black dark:border-white "
                >
                  <ThemedIcon
                    source={icons.receipt}
                    className=" w-[30px] h-[30px] "
                  />
                  <ThemedText>M-pesa messages</ThemedText>
                </Pressable>
              </View>
              <View className=" flex-row gap-[20px] ">
                <Pressable
                  onPress={handleExcelFile}
                  className=" flex-col gap-2 justify-center items-center flex-1 aspect-square rounded-[20px] border border-black dark:border-white "
                >
                  <ThemedIcon
                    source={icons.excel}
                    className=" w-[30px] h-[30px] "
                  />
                  <ThemedText>Excel file</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleManualForm}
                  className=" flex-col gap-2 justify-center items-center flex-1 aspect-square rounded-[20px] border border-black dark:border-white "
                >
                  <ThemedIcon
                    source={icons.form}
                    className=" w-[30px] h-[30px] "
                  />
                  <ThemedText>Manual form</ThemedText>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <ImportFileModal
        {...fileModal}
        setStatus={setStatus}
        handleStatusClose={handleStatusClose}
        handleClose={() => setFileModal((prev) => ({ ...prev, open: false }))}
        handleSubmit={handleFileModalSubmit}
      />
    </>
  );
};

export default AddExpenseModal;
