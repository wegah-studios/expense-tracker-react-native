import EditBudget from "@/components/edit/budget";
import EditDictionary from "@/components/edit/dictionary";
import EditExpense from "@/components/edit/expense";
import ParseMessages from "@/components/edit/messages";
import AddExpenseModal from "@/components/expenses/addExpenseModal";
import FeedbackModal from "@/components/feedbackModal";
import SmsCaptureModal from "@/components/smsCaptureModal";
import StatusModal from "@/components/statusModal";
import { tintColors } from "@/constants/colorSettings";
import { EditingContextProps, SmsCaptureMode, Status } from "@/types/common";
import BottomSheet from "@gorhom/bottom-sheet";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard } from "react-native";

const EditingContext = createContext<{
  open: (props: EditingContextProps) => void;
  close: () => void;
  isSmsCaptureModal: boolean;
  setStatus: React.Dispatch<React.SetStateAction<Status>>;
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
  const [smsCaptureModal, setSmsCaptureModal] = useState<SmsCaptureMode>({
    open: false,
    type: "loading",
  });
  const [smsChecked, setSmsChecked] = useState<boolean>(false);
  const isSmsCaptureModal = useMemo(
    () => smsCaptureModal.open,
    [smsCaptureModal.open]
  );
  useEffect(() => {
    if (!smsChecked) {
      setSmsCaptureModal({
        open: true,
        type: "loading",
        fetchMessages: true,
      });
      setSmsChecked(true);
    }
  }, [smsChecked]);

  const ref = useRef<BottomSheet>(null);

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
  return (
    <EditingContext.Provider
      value={{
        open,
        close,
        isSmsCaptureModal,
        setStatus,
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
      />
      <SmsCaptureModal mode={smsCaptureModal} setMode={setSmsCaptureModal} />
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
