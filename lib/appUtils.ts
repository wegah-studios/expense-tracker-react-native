import db, { schema } from "@/db/schema";
import { Log, Rating } from "@/types/common";
import { enc, HmacSHA256 } from "crypto-js";
import dayjs from "dayjs";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system/legacy";
import * as MailComposer from "expo-mail-composer";
import { ToastAndroid } from "react-native";
import { zip } from "react-native-zip-archive";

const LOGS_INTEGRITY = `308c92676fa959739801af19e74098d15d5813627ff6f3ae65b267c1a1676605`;
export const logs: string[] = [];

export const addLog = (log: Partial<Log>) => {
  log.date = log.date || new Date().toISOString();
  log.type = log.type || "info";
  log.content = log.content || "---empty---";

  logs.push(
    `${log.date}: ${
      log.type === "info" ? "ℹ️" : "🛑"
    } ${log.type.toUpperCase()}: ${log.content}`
  );
};

export const normalizeString = (str: string) => {
  return str.replace(/\s+/g, " ").trim().toLowerCase();
};

export const formatAmount = (amount: number, max: number = 1000) => {
  let suffix = "";
  if (amount > max) {
    if (amount > 1000000000) {
      suffix = "B";
      amount = amount / 1000000000;
    } else if (amount > 1000000) {
      suffix = "M";
      amount = amount / 1000000;
    } else if (amount > 1000) {
      suffix = "K";
      amount = amount / 1000;
    }
  }

  return (
    amount.toLocaleString(undefined, { maximumFractionDigits: 1 }) + suffix
  );
};

export const getDateSuffix = (date: string) => {
  const lastChar = date.slice(-1);
  const no = Number(date);

  if (lastChar === "1" && (no < 10 || no > 20)) {
    return "st";
  } else if (lastChar === "2" && (no < 10 || no > 20)) {
    return "nd";
  } else if (lastChar === "3" && (no < 10 || no > 20)) {
    return "rd";
  } else {
    return "th";
  }
};

export const getTimeAgo = (endDate:Date, startDate?:Date) => {}

export const toastError = (error: any, fallback?: string) => {
  ToastAndroid.show(
    error.cause === 1 ? error.message : fallback || `An error occured`,
    ToastAndroid.SHORT
  );
  addLog({ type: "error", content: `${error}` });
  // console.error(error);
};

export const factoryReset = async () => {
  await Promise.all([
    db.execAsync(`
    DROP TABLE expenses;
    DROP TABLE statistics;
    DROP TABLE collections;
    DROP TABLE dictionary;
    DROP TABLE budgets;
    DROP TABLE preferences;
    DROP TABLE notifications;
    ${schema}
    `),
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}images`, {
      idempotent: true,
    }),
  ]);
};

const saveLogs = async () => {
  const logName = `log_${dayjs(new Date()).format("YYYY_MMM_DD_HH_mm_ss")}`;
  const logDir = `${FileSystem.cacheDirectory}logs/${logName}`;

  await FileSystem.makeDirectoryAsync(logDir, { intermediates: true });

  let logData = `---start---\n`;
  logData += logs.join(`\n\n`);
  logData += `\n\n---App metadata---\n\n${JSON.stringify(
    getAppMetadata(),
    null,
    4
  )}\n\n---end---`;
  const hmacFile = `${logDir}/_INTEGRITY.HMAC`;
  const logFile = `${logDir}/logs.txt`;
  const zipFile = `${logDir}.zip`;

  const hmac = HmacSHA256(logData, LOGS_INTEGRITY).toString(enc.Hex);

  await Promise.all([
    FileSystem.writeAsStringAsync(hmacFile, hmac, {
      encoding: FileSystem.EncodingType.UTF8,
    }),
    FileSystem.writeAsStringAsync(logFile, logData),
  ]);

  await zip(logDir, zipFile);
  await FileSystem.deleteAsync(logDir, { idempotent: true });

  return zipFile;
};

export const getAppMetadata = () => ({
  appName: Application.applicationName,
  appVersion: Application.nativeApplicationVersion,
  buildNumber: Application.nativeBuildVersion,
  osName: Device.osName,
  osVersion: Device.osVersion,
  deviceModel: Device.modelName,
  manufacturer: Device.manufacturer,
  brand: Device.brand,
  isDevice: Device.isDevice,
  timestamp: new Date().toISOString(),
});

export const sendFeedback = async (feedback: {
  name: string;
  message: string;
  rating: Rating | null;
}) => {
  const logsZip = await saveLogs();

  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("Mail services are not available on this device");
  }

  let ratingString = "";

  switch (feedback.rating) {
    case "love":
      ratingString = `😍 I'm loving it.`;
      break;

    case "hate":
      ratingString = `😡 I'm hating it.`;

    case "neutral":
      ratingString = `👍 It's decent.`;

    default:
      break;
  }

  let body = `
  ${feedback.message}
  ${
    feedback.rating
      ? `

  Overall experience: ${ratingString}
    `
      : ""
  }

  - ${feedback.name}
  `;

  await MailComposer.composeAsync({
    recipients: ["wegahstudios@gmail.com"],
    subject: "Expense tracker Feedback 🗣️",
    body,
    attachments: [logsZip],
  });
};
