import CryptoJS from "crypto-js";
import Storage from "expo-sqlite/kv-store";

const hashPin = (pin: string) => {
  return CryptoJS.SHA256(pin).toString(CryptoJS.enc.Hex);
};

export const checkPinExists = async () => {
  const value = await Storage.getItemAsync("hash");
  return !!value;
};

export const updatePin = async (pin: string) => {
  const hash = hashPin(pin);
  await Storage.setItemAsync("hash", hash);
};

export const verifyPin = async (pin: string) => {
  const value = await Storage.getItemAsync("hash");
  const hash = hashPin(pin);
  return !value || hash === value;
};

export const removePin = async () => {
  await Storage.removeItemAsync("hash");
};
