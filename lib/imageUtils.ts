import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

export const requestCameraPermissions = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === "granted";
};

export const takeImage = async () => {
  const permitted = await requestCameraPermissions();

  if (!permitted) {
    throw new Error(`Camera permisions denied`, { cause: 1 });
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1, // best quality
  });

  if (result.canceled) {
    throw new Error(`Operation canceled`, { cause: 1 });
  }

  return result.assets[0].uri;
};

export const pickImage = async () => {
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
  });

  if (result.canceled) {
    throw new Error(`Operation canceled`, { cause: 1 });
  }

  return result.assets[0].uri;
};

export const saveImage = async (uri: string, fileName: string) => {
  await FileSystem.copyAsync({
    from: uri,
    to: `${FileSystem.documentDirectory}images/${fileName}`,
  });

  //delete from cache
  await FileSystem.deleteAsync(uri, {idempotent:true});
  return fileName;
};

export const deleteImage = async (fileName: string) => {
  const uri = `${FileSystem.documentDirectory}images/${fileName}`;
  await FileSystem.deleteAsync(uri, { idempotent: true });
};

export const requestMediaLibraryPermissions = async () => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === "granted";
};

export const dowloadImage = async (uri: string) => {
  const permitted = await requestMediaLibraryPermissions();

  if (!permitted) {
    throw new Error(`Permission denied`, { cause: 1 });
  }

  await MediaLibrary.saveToLibraryAsync(uri);
};
