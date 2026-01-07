import { PermissionsAndroid, Platform } from "react-native";
import {
  requestSmsPermissions,
  startCapture,
  stopCapture,
} from "react-native-sms-listener";
import { addLog } from "./appUtils";

export const startSMSCapture = async () => {
  const permitted = await requestSmsPermissions();
  if (!permitted) {
    throw new Error(
      "SMS Permission denied. Enable SMS permissions to access this feature.",
      { cause: 1 }
    );
  }
  await startCapture("MPESA", "(?i)(sent to|paid to|you bought|withdraw)");
  addLog({type:"info", date:new Date().toISOString(), content:"SMS capture started"})
};

export const stopSMSCapture = async () => {
  await stopCapture();
  addLog({type:"info", date:new Date().toISOString(), content:"SMS capture stopped"})
};

export const hasSmsPermission = async () => {
  if (Platform.OS !== "android") return false;

  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
  );

  return granted; // true or false
};
