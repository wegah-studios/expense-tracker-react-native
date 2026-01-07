import CryptoJS from "crypto-js";
import { getStoreItems, removeStoreItems, setStoreItems } from "./storeUtils";

const hashPin = (pin: string) => {
  return CryptoJS.SHA256(pin).toString(CryptoJS.enc.Hex);
};

export const checkPinExists = async () => {
  const store = await getStoreItems("hash");
  return !!store.hash;
};

export const updatePin = async (pin: string) => {
  const hash = hashPin(pin);
  await setStoreItems([["hash", hash]]);
};

export const verifyPin = async (pin: string) => {
  const store = await getStoreItems("hash");
  const hash = hashPin(pin);
  return !store.hash || hash === store.hash;
};

export const removePin = async () => {
  await removeStoreItems("hash");
};
