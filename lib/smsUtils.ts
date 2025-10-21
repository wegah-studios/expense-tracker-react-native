import {
  clearStoredReceipts,
  getStoredReceipts,
  requestSmsPermissions,
  startCapture,
  stopCapture,
} from "react-native-sms-listener";

export const startSMSCapture = async () => {
  const permitted = await requestSmsPermissions();
  if (!permitted) {
    throw new Error("Permission denied.", { cause: 1 });
  }
  await startCapture("MPESA", "(?i)(sent to|paid to|you bought|withdraw)");
};

export const stopSMSCapture = async () => {
  await stopCapture();
};

export const syncSMSCapture = async () => {
  const receipts = await getStoredReceipts();
  console.log("Fetched receipts:", receipts);
  // Store to expo-sqlite or backend...
  await clearStoredReceipts();
};
