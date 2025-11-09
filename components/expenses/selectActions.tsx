import { useEditingContext } from "@/context/editingContext";
import { useAppProps } from "@/context/propContext";
import { toastError } from "@/lib/appUtils";
import { updateCollections } from "@/lib/collectionsUtils";
import {
  deleteExpenses,
  onExpenseUpdate,
  restoreExpenses,
} from "@/lib/expenseUtils";
import { exportExpenses } from "@/lib/exportUtils";
import { Expense } from "@/types/common";
import React, { useState } from "react";
import { View } from "react-native";
import MoveModal from "./moveModal";
import SelectAction from "./selectAction";

const SelectActions = ({
  expenses,
  setExpenses,
  collection,
  selected,
  resetSelected,
  setSelectMode,
  setExportModal,
}: {
  expenses: Partial<Expense>[];
  setExpenses: React.Dispatch<React.SetStateAction<Partial<Expense>[]>>;
  collection: string;
  selected: Set<number>;
  resetSelected: () => void;
  setSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
  setExportModal: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      enableRange: boolean;
      handleSubmit: (
        properties: Set<string>,
        images: boolean,
        range?: {
          start: string;
          end: string;
        }
      ) => void;
    }>
  >;
}) => {
  const { setStatus, handleStatusClose, open } = useEditingContext();

  const [moveModal, setMoveModal] = useState<boolean>(false);

  const handleReset = () => {
    resetSelected();
    setSelectMode(false);
  };

  const { collections, setCollections } = useAppProps() as {
    collections: {
      map: Map<string, number>;
      names: string[];
    };
    setCollections: React.Dispatch<
      React.SetStateAction<{
        map: Map<string, number>;
        names: string[];
      }>
    >;
  };

  const handleMove = () => {
    setMoveModal(true);
  };

  const handleMoveModalSubmit = async (newCollection: string) => {
    setStatus({
      open: true,
      type: "loading",
      title: "Updating",
      message: "Updating expenses",
      handleClose: handleStatusClose,
      action: {
        callback() {},
      },
    });

    try {
      const results = await updateCollections(
        selected,
        newCollection,
        collections,
        expenses,
        collection === "expenses"
      );
      setExpenses(results.expenses);
      setCollections(results.collections);
      handleStatusClose();
      handleReset();
    } catch (error) {
      setStatus({
        open: true,
        type: "error",
        message: "An error occured while updating expenses please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      toastError(error);
    }
  };

  const handleExport = () => {
    setExportModal({
      open: true,
      enableRange: false,
      handleSubmit: handleExportModalSubmit,
    });
  };

  const handleExportModalSubmit = async (
    properties: Set<string>,
    images: boolean
  ) => {
    try {
      setStatus({
        open: true,
        type: "loading",
        title: "Exporting",
        message: "Exporting selected expenses",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      let data: Partial<Expense>[] = [];

      for (let index of [...selected]) {
        data.push(expenses[index] as Partial<Expense>);
      }

      await exportExpenses(data, [...properties], images);

      handleReset();
      setStatus({
        open: true,
        type: "success",
        message: "Selected expenses exported",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
    } catch (error: any) {
      setStatus({
        open: true,
        type: "error",
        message: "An error occured while exporting expenses",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      toastError(error);
    }
  };

  const handleEdit = () => {
    if (selected.size > 1) {
      let indices: number[] = [];
      let editList: Partial<Expense>[] = [];
      for (let item of selected) {
        indices.push(item);
        editList.push(expenses[item]);
      }
      open({
        type: "expense",
        snapPoints: ["100%"],
        mode: "multiple",
        expenses: editList,
        indices,
        handleUpdate: handleMultipleUpdate,
      });
    } else {
      const index = Number(selected.values().next().value);
      open({
        type: "expense",
        snapPoints: ["100%"],
        mode: "edit",
        indices: [index],
        expenses: [expenses[index]],
        handleUpdate: handleItemUpdate,
      });
    }
  };

  const handleItemUpdate = (update: Map<number, Partial<Expense>>) => {
    const { newExpenses, newCollections } = onExpenseUpdate(
      expenses,
      collections,
      update,
      collection
    );
    setExpenses(newExpenses);
    setCollections(newCollections);
    setStatus({
      open: true,
      type: "success",
      title: "Expense updated",
      message: "Expense successfully updated",
      handleClose: handleStatusClose,
      action: {
        callback() {
          handleReset();
          handleStatusClose();
        },
      },
    });
  };

  const handleMultipleUpdate = (update: Map<number, Partial<Expense>>) => {
    const { newExpenses, newCollections } = onExpenseUpdate(
      expenses,
      collections,
      update,
      collection
    );
    setExpenses(newExpenses);
    setCollections(newCollections);
    setStatus({
      open: true,
      type: "success",
      title: "Expenses updated",
      message: `${update.size} expenses successfully updated`,
      handleClose: handleStatusClose,
      action: {
        callback() {
          handleReset();
          handleStatusClose();
        },
      },
    });
  };

  const handleRestore = async () => {
    try {
      setStatus({
        open: true,
        type: "loading",
        title: "Restoring items",
        message: "This may take a while",
        handleClose: handleStatusClose,
        action: {
          callback() {},
        },
      });

      const results = await restoreExpenses(selected, collections, expenses);
      setExpenses(results.expenses);
      setCollections(results.collections);
      handleStatusClose();
      handleReset();
    } catch (error) {
      setStatus({
        open: true,
        type: "error",
        message: "An error occured while restoring expenses",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      toastError(error);
    }
  };

  const onDelete = () => {
    setStatus({
      open: true,
      type: "warning",
      title: "Delete expenses?",
      message: "Are you sure you want to delete the selected expenses?",
      handleClose: handleStatusClose,
      action: {
        title: "Delete",
        async callback() {
          setStatus({
            open: true,
            type: "loading",
            title: "Deleting expenses",
            message: "This may take a while",
            handleClose: handleStatusClose,
            action: {
              callback() {},
            },
          });
          try {
            await handleDelete();
            handleStatusClose();
            handleReset();
          } catch (error) {
            setStatus({
              open: true,
              type: "error",
              message: "An error occured while deleting expenses",
              handleClose: handleStatusClose,
              action: {
                callback: handleStatusClose,
              },
            });
            toastError(error);
          }
        },
      },
    });
  };

  const handleDelete = async () => {
    const results = await deleteExpenses(selected, expenses, collections);
    setExpenses(results.expenses);
    setCollections(results.collections);
  };

  return (
    <>
      <View className=" p-[10px] bg-paper-light rounded-[20px] flex-row justify-between gap-[20px] dark:bg-paper-dark ">
        {collection === "failed" ? (
          <SelectAction
            type={"delete"}
            handlePress={onDelete}
            disabled={selected.size < 1}
          />
        ) : collection === "trash" ? (
          <SelectAction
            type={"restore"}
            handlePress={handleRestore}
            disabled={selected.size < 1}
          />
        ) : (
          <SelectAction
            type={collection === "expenses" ? "collection" : "move"}
            handlePress={handleMove}
            disabled={selected.size < 1}
          />
        )}
        {collection === "failed" ? (
          <SelectAction
            type="edit"
            handlePress={handleEdit}
            disabled={selected.size < 1}
          />
        ) : collection === "trash" ? (
          <SelectAction
            type="delete"
            handlePress={onDelete}
            disabled={selected.size < 1}
          />
        ) : (
          <SelectAction
            type="export"
            handlePress={handleExport}
            disabled={selected.size < 1}
          />
        )}
        {collection !== "trash" && collection !== "failed" && (
          <>
            <SelectAction
              type="delete"
              handlePress={onDelete}
              disabled={selected.size < 1}
            />
            <SelectAction
              type="edit"
              handlePress={handleEdit}
              disabled={selected.size < 1}
            />
          </>
        )}
      </View>
      <MoveModal
        open={moveModal}
        collection={collection}
        collections={collections}
        setCollections={setCollections}
        handleClose={() => setMoveModal(false)}
        handleSubmit={handleMoveModalSubmit}
      />
    </>
  );
};

export default SelectActions;
