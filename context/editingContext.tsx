import EditBudget from "@/components/edit/budget";
import EditDictionary from "@/components/edit/dictionary";
import EditExpense from "@/components/edit/expense";
import ParseMessages from "@/components/edit/messages";
import AddExpenseModal from "@/components/expenses/addExpenseModal";
import FeedbackModal from "@/components/feedbackModal";
import PinModal from "@/components/pinModal";
import SmsRequestModal from "@/components/smsRequestModal";
import StatusModal from "@/components/statusModal";
import { tintColors } from "@/constants/colorSettings";
import { toastError } from "@/lib/appUtils";
import { handleSmsEvent, importFromSMSListener } from "@/lib/expenseUtils";
import { EditingContextProps, Status } from "@/types/common";
import BottomSheet from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AppState,
  Keyboard,
  NativeEventSubscription,
  ToastAndroid,
} from "react-native";
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
  setPinModal: React.Dispatch<
    React.SetStateAction<{
      mode: "enter" | "create" | "";
      onComplete?: () => void;
      onBack?: () => void;
    }>
  >;
  setAddExpenseModal: React.Dispatch<React.SetStateAction<boolean>>;
  setFeedbackModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleStatusClose: () => void;
  handleSmsCapture: (requestIfNull?: boolean | undefined) => Promise<void>;
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

  const { smsCaptureState, updateSmsCaptureState, pinProtected } =
    useCustomThemeContext();
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
  const [smsRequestModal, setSmsRequestModal] = useState<boolean>(false);
  const [pinModal, setPinModal] = useState<{
    mode: "enter" | "create" | "";
    onComplete?: () => void;
    onBack?: () => void;
  }>({ mode: "" });
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
      } else if (nextAppState === "background") {
        removeMessageCapturedListener();
      }
    });

    return () => subscription.remove();
  }, []);

  const handleSmsCapture = useCallback(
    async (requestIfNull?: boolean) => {
      if (smsCaptureState === "on") {
        addOnMessageCapturedListener((message) => {
          const onSmsEvent = async () => {
            try {
              await handleSmsEvent(message);
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
      } else if (smsCaptureState === null && requestIfNull) {
        setSmsRequestModal(true);
      }
    },
    [smsCaptureState]
  );

  const handleOnActive = () => {
    setShowPathInfo(false);
    handleSmsCapture();
  };

  const ref = useRef<BottomSheet>(null);

  const handleStart = useCallback(() => {
    setShowPathInfo(false);
    if (pinProtected) {
      setPinModal({
        mode: "enter",
        onComplete() {
          setPinModal({ mode: "" });
          handleSmsCapture(true);
        },
      });
    } else {
      handleSmsCapture(true);
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
        const report = await importFromSMSListener(messages);
        await clearStoredReceipts();
        if (!report.complete && !report.incomplete) {
          setStatus({
            open: true,
            type: "info",
            title: "No expenses found.",
            message: "No expenses have been imported.",
            handleClose: handleStatusClose,
            action: {
              callback() {
                handleStatusClose();
                setShowPathInfo(true);
              },
            },
          });
        }
        setStatus({
          open: true,
          type: "info",
          title: "Expenses imported",
          message: `New expenses imported:${
            report.complete
              ? `\n\n✅ ${report.complete} successfully added.`
              : ""
          }${
            report.incomplete
              ? `\n\n❌ ${report.incomplete} incomplete expenses.`
              : ""
          }`,
          handleClose: handleStatusClose,
          action: {
            callback() {
              router.replace({ pathname: pathname as any, params });
              handleStatusClose();
              setShowPathInfo(true);
            },
          },
        });
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

  const open = (props: EditingContextProps) => {
    setProps({ ...props, close, setStatus, handleStatusClose });
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

  const handleSmsRequestSubmit = async () => {
    setSmsRequestModal(false);
    try {
      setStatus({
        open: true,
        type: "loading",
        message: "Enabling automating expense capture.",
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
            setShowPathInfo(true);
          },
        },
      });
    } catch (error: any) {
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
            setShowPathInfo(true);
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
    setSmsRequestModal(false);
    setShowPathInfo(true);
  };

  return (
    <EditingContext.Provider
      value={{
        open,
        close,
        showPathInfo,
        setStatus,
        setPinModal,
        handleStatusClose,
        setAddExpenseModal,
        setFeedbackModal,
        handleSmsCapture,
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
      />
      <SmsRequestModal
        open={smsRequestModal}
        handleClose={handleSmsRequestClose}
        handleSubmit={handleSmsRequestSubmit}
      />
      <PinModal {...{ ...pinModal, setStatus, handleStatusClose }} />
      <AddExpenseModal
        open={addExpenseModal}
        openEditSheet={open}
        setStatus={setStatus}
        handleStatusClose={handleStatusClose}
        handleClose={() => setAddExpenseModal(false)}
      />
    </EditingContext.Provider>
  );
};
