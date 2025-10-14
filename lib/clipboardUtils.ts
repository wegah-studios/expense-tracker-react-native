import * as Clipboard from "expo-clipboard";

export const copyToClipboard = async (text: string) => {
  await Clipboard.setStringAsync(text);
};

export const pasteFromClipboard = async () => {
  const text = await Clipboard.getStringAsync();
  return text;
};
