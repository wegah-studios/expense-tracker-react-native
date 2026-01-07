import db, { DB_INTEGRITY } from "@/db/db";
import { Expense, ManifestEntry } from "@/types/common";
import CryptoJS from "crypto-js";
import dayjs from "dayjs";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import ReactNativePdfTextExtractor from "react-native-pdf-text-extractor";
import { unzipWithPassword, zipWithPassword } from "react-native-zip-archive";
import XLSX from "xlsx";
import { parseExcelFile, parsePdfText } from "./expenseUtils";
import { requestMediaLibraryPermissions } from "./imageUtils";

const INTEGRITY_HASH = DB_INTEGRITY;
const IMAGES_PATH = `${FileSystem.documentDirectory}images`;
const EXPORTS_PATH = `${FileSystem.cacheDirectory}exports`;
const IMPORTS_PATH = `${FileSystem.cacheDirectory}imports`;

const tables = [
  "expenses",
  "dictionary",
  "budgets",
  "notifications",
  "collections",
  "statistics",
];

const generateManifest = async (files: string[], unzipDir: string) => {
  const promises: Promise<ManifestEntry>[] = [];

  for (const file of files) {
    const relativePath = file.replace(`${unzipDir}/`, "");
    promises.push(getFileInfo(file, relativePath));
  }

  const manifestEntries = await Promise.all(promises);
  return manifestEntries;
};

const verifyEntry = async (entry: ManifestEntry, filePath: string) => {
  const info = await FileSystem.getInfoAsync(filePath);
  if (!info.exists) throw new Error(`Missing file: ${entry.relativePath}`);
  if (info.size !== entry.size) throw new Error(`Invalid import`, { cause: 1 });

  const fileDataBase64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const sha256 = CryptoJS.SHA256(
    CryptoJS.enc.Base64.parse(fileDataBase64)
  ).toString(CryptoJS.enc.Hex);

  if (sha256 !== entry.sha256) throw new Error(`Invalid import`, { cause: 1 });
};

const getFileInfo = async (fileUri: string, relativePath: string) => {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) throw new Error(`File not found: ${fileUri}`, { cause: 1 });

  const fileDataBase64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const sha256 = CryptoJS.SHA256(
    CryptoJS.enc.Base64.parse(fileDataBase64)
  ).toString(CryptoJS.enc.Hex);

  return {
    relativePath, // keep only file name for zip
    size: info.size,
    sha256,
  };
};

export const selectDbImport = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/zip",
  });

  if (result.canceled) {
    throw new Error(`Operation canceled`, { cause: 1 });
  }

  const file = result.assets[0];
  return file;
};

export const importData = async (uri: string, password: string) => {
  try {
    const fileName = uri.split("/").pop() || "";
    const unzipDir = `${IMPORTS_PATH}/${fileName.replace(".zip", "")}`;

    await ensureDirExists(unzipDir);

    await unzipWithPassword(uri, unzipDir, password);

    const files = await FileSystem.readDirectoryAsync(unzipDir);

    const hmacFileName = "_INTEGRITY.HMAC";
    if (!files.includes(hmacFileName))
      throw new Error("Missing integrity file", { cause: 1 });

    const integrityData = await FileSystem.readAsStringAsync(
      `${unzipDir}/${hmacFileName}`,
      {
        encoding: FileSystem.EncodingType.UTF8,
      }
    );
    const { manifest, hmac: storedHmac } = JSON.parse(integrityData);

    const recomputedHmac = CryptoJS.HmacSHA256(
      JSON.stringify(manifest),
      INTEGRITY_HASH
    ).toString(CryptoJS.enc.Hex);
    if (storedHmac !== recomputedHmac)
      throw new Error("Invalid import", { cause: 1 });

    let promises: Promise<void>[] = [];

    for (const entry of manifest) {
      const filePath = `${unzipDir}/${entry.relativePath}`;
      promises.push(verifyEntry(entry, filePath));
    }

    promises.push(FileSystem.deleteAsync(IMAGES_PATH, { idempotent: true }));

    await Promise.all(promises);

    promises = [];
    const dataFile = `${unzipDir}/data.xlsx`;
    const imagesDir = `${unzipDir}/images`;

    if (await dirExists(imagesDir)) {
      const images = await FileSystem.readDirectoryAsync(imagesDir);

      for (const image of images) {
        promises.push(
          FileSystem.copyAsync({
            from: `${imagesDir}/${image}`,
            to: `${IMAGES_PATH}/${image}`,
          })
        );
      }
    }

    await Promise.all(promises);

    if (await dirExists(dataFile)) {
      await importDb(dataFile);
    }

    await FileSystem.deleteAsync(unzipDir, { idempotent: true });
  } catch (error: any) {
    if ((error.message as string).includes("Wrong password")) {
      throw new Error(`Wrong password`, { cause: 1 });
    } else {
      throw error;
    }
  }
};

export const importDb = async (dataFile: string) => {
  const b64 = await FileSystem.readAsStringAsync(dataFile, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const wb = XLSX.read(b64, { type: "base64" });

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (let name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const data: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);
      let query = data.reduce((str, item) => {
        const keys = Object.keys(item);
        const values = Object.values(item);
        str += `\nINSERT INTO ${name} (${keys.join(", ")}) VALUES (${values
          .map((value) => (typeof value === "string" ? `"${value}"` : value))
          .join(", ")});`;
        return str;
      }, ``);

      await tx.execAsync(`DELETE FROM ${name}; \n${query}`);
    }
  });
};

export const exportData = async (password: string) => {
  let promises = [];
  let allFiles = [];
  const export_dir_name = `export_${dayjs(new Date()).format(
    "YYYY_MMM_DD_HH_mm_ss"
  )}`;
  const export_dir = `${EXPORTS_PATH}/${export_dir_name}`;
  await ensureDirExists(export_dir);

  if (await dirExists(IMAGES_PATH)) {
    const images = await FileSystem.readDirectoryAsync(IMAGES_PATH);

    for (let image of images) {
      const image_file = `${export_dir}/images/${image}`;
      promises.push(
        FileSystem.copyAsync({
          from: `${IMAGES_PATH}/${image}`,
          to: image_file,
        })
      );
      allFiles.push(image_file);
    }
  }

  await Promise.all(promises);

  const data_file = `${export_dir}/data.xlsx`;
  await exportDb(data_file);
  allFiles.push(data_file);

  const manifest = await generateManifest(allFiles, export_dir);
  const manifestJson = JSON.stringify(manifest);

  const hmac = CryptoJS.HmacSHA256(manifestJson, INTEGRITY_HASH).toString(
    CryptoJS.enc.Hex
  );

  const integrityData = JSON.stringify({ manifest, hmac });
  const hmacFile = `${export_dir}/_INTEGRITY.HMAC`;
  await FileSystem.writeAsStringAsync(hmacFile, integrityData, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const zipUri = `${export_dir}.zip`;
  await zipWithPassword(export_dir, zipUri, password);

  await downloadFile(
    `${export_dir_name}.zip`,
    zipUri,
    "application/zip",
    "public.zip-archive"
  );

  await FileSystem.deleteAsync(export_dir, { idempotent: true });
};

export const exportDb = async (export_file: string) => {
  const wb = XLSX.utils.book_new();

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (let table of tables) {
      const data: Record<string, any>[] = await tx.getAllAsync(
        `SELECT * FROM ${table}`
      );
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, table);
    }
  });

  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  await FileSystem.writeAsStringAsync(export_file, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });
};

export const exportExpenses = async (
  expenses: Partial<Expense>[],
  properties: string[],
  images: boolean
) => {
  if (images) {
    const permitted = await requestMediaLibraryPermissions();

    if (!permitted) {
      throw new Error(`Permission denied`, { cause: 1 });
    }
  }

  let promises = [];
  let data = [];

  for (let expense of expenses) {
    data.push(
      properties.reduce((obj, property) => {
        obj[property] = expense[property as keyof typeof expense];
        return obj;
      }, {} as Record<string, string | number | undefined>)
    );

    if (images && expense.image) {
      promises.push(
        MediaLibrary.saveToLibraryAsync(
          `${FileSystem.documentDirectory}images/${expense.image}`
        )
      );
    }
  }

  await Promise.all(promises);

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");

  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  await ensureDirExists(EXPORTS_PATH);
  const fileName = `expenses_${dayjs(new Date()).format(
    "YYYY_MMM_DD_HH_mm_ss"
  )}.xlsx`;
  const excelUri = `${EXPORTS_PATH}/${fileName}`;

  await FileSystem.writeAsStringAsync(excelUri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await downloadFile(
    fileName,
    excelUri,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "com.microsoft.excel.xlsx"
  );
};

export const selectExpensesImport = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  if (result.canceled) {
    throw new Error(`Operation canceled`, { cause: 1 });
  }
  const { name, uri } = result.assets[0];
  return { name, uri };
};

export const importExpenses = async (uri: string) => {
  if (!dirExists(uri)) {
    throw new Error(`File doesn't exist`, { cause: 1 });
  }

  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return await parseExcelFile(b64);
};

export const selectStatementImport = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
  });

  if (result.canceled) {
    throw new Error(`Operation canceled`, { cause: 1 });
  }
  const { name, uri } = result.assets[0];
  return { name, uri };
};

export const importStatement = async (uri: string) => {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error(`File doesn't exist`, { cause: 1 });
  }

  const pdfText = await ReactNativePdfTextExtractor.extractTextFromPdf(uri);
  return await parsePdfText(pdfText);
};

export const dirExists = async (uri: string) => {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
};

export const ensureDirExists = async (dir: string) => {
  const exists = await dirExists(dir);
  if (!exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
};

export const selectDocument = async (type: "pdf" | "excel" | "zip") => {
  const types = {
    pdf: "application/pdf",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
  };
  const result = await DocumentPicker.getDocumentAsync({
    type: types[type],
  });

  if (result.canceled) {
    throw new Error(`Operation canceled`, { cause: 1 });
  }
  const { name, uri } = result.assets[0];
  return { name, uri };
};

const downloadFile = async (
  fileName: string,
  fileUri: string,
  mimeType: string,
  UTI?: string
) => {
  if (Platform.OS === "android") {
    // Ask the user to pick a folder
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
      throw new Error(`Permissions denied`, { cause: 1 });
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Create the file in the chosen folder
    const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      mimeType
    );

    // Write the file
    await FileSystem.writeAsStringAsync(newUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    // iOS — use Save to Files (this will prompt the user)
    await Sharing.shareAsync(fileUri, {
      mimeType,
      UTI, // Helps iOS identify the file type
    });
  }
};
