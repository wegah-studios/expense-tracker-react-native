import { PermissionsAndroid, Platform } from "react-native";
import {
  requestSmsPermissions,
  startCapture,
  stopCapture,
} from "react-native-sms-listener";
import { setPreferences } from "./preferenceUtils";

export const startSMSCapture = async () => {
  console.log("start sms capture");
  const permitted = await requestSmsPermissions();
  if (!permitted) {
    throw new Error(
      "SMS Permission denied. Enable SMS permissions to access this feature.",
      { cause: 1 }
    );
  }
  await startCapture("MPESA", "(?i)(sent to|paid to|you bought|withdraw)");
  await setPreferences({ smsCapture: "on" });
};

export const stopSMSCapture = async () => {
  await stopCapture();
  await setPreferences({ smsCapture: "off" });
};

export const hasSmsPermission = async () => {
  if (Platform.OS !== "android") return false;

  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
  );

  return granted; // true or false
};
