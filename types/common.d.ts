export type Theme = "light" | "dark";

export type Expense = {
  id: string;
  label: string;
  recipient: string;
  ref: string;
  collection: string;
  amount: number;
  currency: string;
  date: string;
  receipt: string;
  image: string;
  modifiedAt: string;
};

export type ExpenseForm = {
  label: string[];
  amount?: string;
  recipient?: string;
  ref?: string;
  receipt?: string;
  date?: Date;
  image?: string;
  collection?: string;
};

export type ExpenseFormErrors = {
  label: string;
  amount: string;
  recipient: string;
  ref: string;
  receipt: string;
};

export type QueryParameters = {
  search?: string;
  collection?: string;
  ids?: string[];
};

export type ReceiptModal = {
  open: boolean;
  receipt: string;
  image: string;
};

export type DateParts = {
  year?: number;
  month?: number;
  date?: number;
};

export type Status = {
  open: boolean;
  type: "loading" | "info" | "success" | "warning" | "error" | "confirm";
  title?: string;
  message?: string;
  handleClose: () => void;
  action: {
    title?: string;
    callback: () => void;
  };
};

export type BudgetForm = {
  total: string;
  title: string;
  start: Date;
  end: Date;
};

export type Statistic = {
  path: string;
  value: string;
  total: number;
};

export type StatisticPath = {
  subtitle?: string;
  title: string;
  time: string[];
  label: string[];
  value: string;
  total: number;
  trends: StatisticTrend[];
};

export type StatisticOption = {
  subtitle: string;
  title: string;
  value: string;
  total: number;
};

export type StatisticTrend = {
  title?: string;
  description: string;
};

export type StatisticLabel = {
  total: number;
  value: string;
};

export type HomeScope = {
  subtitle: string;
  title: string;
  path: string[];
};

export type HomeStatisticOption = {
  value: string;
  total: number;
};

export type Budget = {
  id: string;
  start: string;
  end: string;
  label?: string;
  title: string;
  total: number;
  current: number;
  duration: "year" | "month" | "week" | "custom";
  repeat: number;
};

export type DictionaryItemType = "keyword" | "recipient";

export type DictionaryItem = {
  id: string;
  type: DictionaryItemType;
  match: string;
  label: string;
  modifiedAt: string;
};

export type Notification = {
  id: string;
  type: "info" | "error";
  path: string;
  title: string;
  message: string;
  date: string;
  unread: boolean;
};

export type Collection = {
  name: string;
  count: number;
};

export type ManifestEntry = {
  relativePath: any;
  size: number;
  sha256: any;
};

export type Rating = "love" | "hate" | "neutral";

export type Log = {
  type: "info" | "error";
  date: string;
  content: string;
};

export type EditingContextProps = Record<string, any> & {
  type: string;
  snapPoints: string[];
  onClose?: () => void;
};

export type SmsCaptureMode = {
  open: boolean;
  type: "loading" | "request" | "success" | "error";
  title?: string;
  message?: string;
  fetchMessages?:boolean
};
