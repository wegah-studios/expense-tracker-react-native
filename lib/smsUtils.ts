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
    throw new Error("Permission denied.", { cause: 1 });
  }
  await startCapture("MPESA", "(?i)(sent to|paid to|you bought|withdraw)");
  await setPreferences({ smsCapture: "on" });
};

export const stopSMSCapture = async () => {
  await stopCapture();
  await setPreferences({ smsCapture: "off" });
};
