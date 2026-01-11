import EditBudget from "@/components/edit/budget";
import EditDictionary from "@/components/edit/dictionary";
import EditExpense from "@/components/edit/expense";
import ParseMessages from "@/components/edit/messages";
import AddExpenseModal from "@/components/expenses/addExpenseModal";
import FeedbackModal from "@/components/feedbackModal";
import PinModal from "@/components/pinModal";
import RatingModal from "@/components/ratingModal";
import SmsRequestModal from "@/components/smsRequestModal";
import StatusModal from "@/components/statusModal";
import { tintColors } from "@/constants/colorSettings";
import { toastError } from "@/lib/appUtils";
import { handleSmsEvent, importFromSMSListener } from "@/lib/expenseUtils";
import { setStoreItems } from "@/lib/storeUtils";
import { Currency, EditingContextProps, Status } from "@/types/common";
import BottomSheet from "@gorhom/bottom-sheet";
import { Href, router, useLocalSearchParams, usePathname } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Keyboard, ToastAndroid } from "react-native";
import {
  addOnMessageCapturedListener,
  clearStoredReceipts,
  deleteReceipt,
  getStoredReceipts,
  removeMessageCapturedListener,
} from "react-native-sms-listener";
import { useCustomThemeContext } from "./themeContext";

const EditingContext = createContext<{
  open: (props: EditingContextProps) => void;
  close: () => void;
  showPathInfo: boolean;
  setStatus: React.Dispatch<React.SetStateAction<Status>>;
  setSmsRequestModal: React.Dispatch<
    React.SetStateAction<"request" | "toggle" | "">
  >;
  setPinModal: React.Dispatch<
    React.SetStateAction<{
      mode: "enter" | "create" | "";
      onComplete?: () => void;
      onBack?: () => void;
    }>
  >;
  setRatingModal: React.Dispatch<React.SetStateAction<boolean>>;
  setAddExpenseModal: React.Dispatch<React.SetStateAction<boolean>>;
  setFeedbackModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleStatusClose: () => void;
} | null>(null);

export const useEditingContext = () => {
  const context = useContext(EditingContext);
  if (!context) {
    throw new Error(
      "useEditingContext must be used within a EditingContextProvider"
    );
  }
  return context;
};

export const EditingContexProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const params = useLocalSearchParams();

  const {
    currency,
    setCurrency,
    isRated,
    smsCaptureState,
    pinProtected,
    updateSmsCaptureState,
  } = useCustomThemeContext();
  const [addExpenseModal, setAddExpenseModal] = useState<boolean>(false);
  const [feedbackModal, setFeedbackModal] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>({
    open: false,
    type: "info",
    handleClose() {},
    action: {
      callback() {},
    },
  });
  const [props, setProps] = useState<EditingContextProps>({
    type: "",
    snapPoints: ["75%"],
  });
  const [smsRequestModal, setSmsRequestModal] = useState<
    "request" | "toggle" | ""
  >("");
  const [pinModal, setPinModal] = useState<{
    mode: "enter" | "create" | "";
    onComplete?: () => void;
    onBack?: () => void;
  }>({ mode: "" });
  const [ratingModal, setRatingModal] = useState<boolean>(false);
  const [showPathInfo, setShowPathInfo] = useState<boolean>(false);
  const [initialCheck, setInitialCheck] = useState<boolean>(false);

  useEffect(() => {
    if (!initialCheck) {
      handleStart();
      setInitialCheck(true);
    }
  }, [initialCheck]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        handleOnActive();
      } else {
        removeMessageCapturedListener();
      }
    });

    return () => subscription.remove();
  }, []);

  const handleSmsCapture = useCallback(async () => {
    if (smsCaptureState === "on") {
      addOnMessageCapturedListener((message) => {
        const onSmsEvent = async () => {
          try {
            await handleSmsEvent(message, currency);
            await deleteReceipt(message.id);
            ToastAndroid.show(
              "New expense imported, reload to see changes",
              ToastAndroid.LONG
            );
          } catch (error) {
            toastError(error, "An error occured while adding new expense");
          }
        };
        onSmsEvent();
      });
      await fetchMessages();
    } else {
      setShowPathInfo(true);
    }
  }, [smsCaptureState]);

  const handleOnActive = async () => {
    setShowPathInfo(false);
    await handleSmsCapture();
  };

  const ref = useRef<BottomSheet>(null);

  const handleStart = useCallback(() => {
    setShowPathInfo(false);
    if (pinProtected) {
      setPinModal({
        mode: "enter",
        onComplete() {
          setPinModal({ mode: "" });
          handleSmsCapture();
        },
      });
    } else {
      handleSmsCapture();
    }
  }, [pinProtected]);

  const fetchMessages = async () => {
    try {
      setStatus({
        open: true,
        type: "loading",
        message: "Checking for new messages.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      const messages = await getStoredReceipts();
      if (messages.length) {
        setStatus({
          open: true,
          type: "loading",
          message: `Importing ${messages.length} new messages, please wait.`,
          handleClose: handleStatusClose,
          action: {
            callback: handleStatusClose,
          },
        });
        const report = await importFromSMSListener(messages, currency);
        await clearStoredReceipts();
        handleReport(report);
      } else {
        handleStatusClose();
        setShowPathInfo(true);
      }
    } catch (error) {
      setStatus({
        open: true,
        type: "error",
        message:
          "An error occured while checking for new expenses, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback() {
            handleStatusClose();
            setShowPathInfo(true);
          },
        },
      });
    }
  };

  const handleReport = (report: {
    complete: number;
    incomplete: number;
    excluded: number;
    currencyChange: Currency | null;
  }) => {
    if (!report.complete && !report.incomplete && !report.excluded) {
      setStatus({
        open: true,
        type: "info",
        title: "No expenses found.",
        message: "No expenses have been imported, please try again.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      return
    }
    setStatus({
      open: true,
      type: "info",
      title: "Expenses imported",
      message: `New expenses imported:${
        report.complete
          ? `\n\n^icon|success^ ${report.complete} successfully added.`
          : ""
      }${
        report.excluded
          ? `\n\n^icon|info^ ${report.excluded} excluded expenses.`
          : ""
      }${
        report.incomplete
          ? `\n\n^icon|error^ ${report.incomplete} incomplete expenses.`
          : ""
      }`,
      handleClose: handleStatusClose,
      action: {
        title: "View",
        callback() {
          if (report.currencyChange) {
            setStatus({
              open: true,
              type: "warning",
              title: "Update currency?",
              message: `Currency change detected: \n\nChange currency from ^b|'${currency}'^ to ^b|'${report.currencyChange}'^`,
              handleClose: handleStatusClose,
              action: {
                async callback() {
                  try {
                    setStatus({
                      open: true,
                      type: "loading",
                      message: "Updating currency, please wait",
                      handleClose: handleStatusClose,
                      action: {
                        callback: handleStatusClose,
                      },
                    });
                    await setStoreItems([
                      ["currency", report.currencyChange as any],
                    ]);
                    setCurrency(report.currencyChange as any);
                    setStatus({
                      open: true,
                      type: "success",
                      title: "Currency updated.",
                      message: `Currency successfully updated to ^b|'${report.currencyChange}'^`,
                      handleClose: handleStatusClose,
                      action: {
                        callback() {
                          handleReportPath();
                          handleStatusClose();
                        },
                      },
                    });
                  } catch (error) {
                    setStatus({
                      open: true,
                      type: "error",
                      message:
                        "An error occured while updating currency, please try again",
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
          } else {
            handleReportPath();
            handleStatusClose();
          }
        },
      },
    });
  };

  const handleReportPath = () => {
    const path: Href = "/expenses/collections";
    if (pathname !== "/expenses/collections") {
      router.push(path);
    } else {
      router.replace(path);
    }
  };

  const handleSmsRequestSubmit = async () => {
    setSmsRequestModal("");
    try {
      setStatus({
        open: true,
        type: "loading",
        message: "Enabling automatic expense capture.",
        handleClose: handleStatusClose,
        action: {
          callback: handleStatusClose,
        },
      });
      await updateSmsCaptureState("on");
      setStatus({
        open: true,
        type: "success",
        title: "Automatic Capture enabled",
        message: "Automatic expense capture is now ebabled.",
        handleClose: handleStatusClose,
        action: {
          callback: () => {
            handleStatusClose();
            handleSmsCapture();
          },
        },
      });
    } catch (error: any) {
      toastError(error);
      setStatus({
        open: true,
        type: "error",
        message:
          error.cause === 1
            ? error.message
            : "An error occured while enabling auto expense capture.",
        handleClose: handleStatusClose,
        action: {
          callback() {
            handleStatusClose();
          },
        },
      });
    }
  };

  const handleSmsRequestClose = async (dnd: boolean) => {
    if (dnd) {
      try {
        setStatus({
          open: true,
          type: "loading",
          message: "please wait.",
          handleClose: handleStatusClose,
          action: {
            callback: handleStatusClose,
          },
        });
        await updateSmsCaptureState("dnd");
        handleStatusClose();
      } catch (error) {
        toastError(error);
      }
    }
    setSmsRequestModal("");
  };

  const handleFeedback = () => {
    if (!isRated) {
      setRatingModal(true);
    }
  };

  const open = (props: EditingContextProps) => {
    setProps({ ...props, currency, close, setStatus, handleStatusClose });
    ref.current?.snapToIndex(0);
  };

  const close = () => {
    ref.current?.close();
  };

  const handleOnClose = () => {
    Keyboard.dismiss();
    setProps({
      type: "",
      snapPoints: ["75%"],
    });
    if (props.onClose) {
      props.onClose();
    }
  };

  const handleStatusClose = () => {
    setStatus({
      open: false,
      type: "info",
      handleClose() {},
      action: {
        callback() {},
      },
    });
  };

  return (
    <EditingContext.Provider
      value={{
        open,
        close,
        showPathInfo,
        setStatus,
        setPinModal,
        setRatingModal,
        setSmsRequestModal,
        handleStatusClose,
        setAddExpenseModal,
        setFeedbackModal,
      }}
    >
      {children}
      <BottomSheet
        ref={ref}
        snapPoints={props.snapPoints}
        style={{ backgroundColor: tintColors.paper.dark }}
        onClose={handleOnClose}
        enablePanDownToClose
      >
        {props.type === "expense" && <EditExpense {...props} />}
        {props.type === "budgets" && <EditBudget {...props} />}
        {props.type === "dictionary" && <EditDictionary {...props} />}
        {props.type === "messages" && <ParseMessages {...props} />}
      </BottomSheet>
      <StatusModal status={status} />
      <FeedbackModal
        open={feedbackModal}
        handleClose={() => setFeedbackModal(false)}
        onComplete={handleFeedback}
      />
      <RatingModal open={ratingModal} setOpen={setRatingModal} />
      <PinModal {...{ ...pinModal, setStatus, handleStatusClose }} />
      <AddExpenseModal
        open={addExpenseModal}
        openEditSheet={open}
        setStatus={setStatus}
        handleStatusClose={handleStatusClose}
        handleClose={() => setAddExpenseModal(false)}
        currency={currency}
        handleReport={handleReport}
      />
      <SmsRequestModal
        mode={smsRequestModal}
        handleClose={handleSmsRequestClose}
        handleSubmit={handleSmsRequestSubmit}
      />
    </EditingContext.Provider>
  );
};
