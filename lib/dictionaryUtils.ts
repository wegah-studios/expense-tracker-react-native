import db, { enqueueDB } from "@/db/db";
import { DictionaryItem, DictionaryItemType } from "@/types/common";
import { nanoid } from "nanoid/non-secure";
import {
  addDictionaryItemQuery,
  deleteDictionaryItemsQuery,
  insertIntoDictionaryFromExpenseQuery,
  updateDictionaryFromExpenseQuery,
  updateDictionaryItemQuery,
} from "./queries";

export const getSuggestions = async () => {
  const results: { label: string }[] = await enqueueDB(() =>
    db.getAllAsync(`SELECT label FROM dictionary ORDER BY label `)
  );
  const record = new Set();
  const suggestions: string[] = results.reduce((arr, { label }) => {
    if (!record.has(label)) {
      arr.push(label.replaceAll(",", ", "));
      record.add(label);
    }
    return arr;
  }, [] as string[]);
  return suggestions;
};

export const getDictionaryItems = async ({
  type,
  search,
  page,
}: {
  type: DictionaryItemType;
  search: string;
  page: number;
}) => {
  const limit = 10;
  const offset = (page - 1) * limit;
  let query: string = `SELECT * FROM dictionary WHERE type = ?`;
  let params: string[] = [type];

  if (search) {
    query += ` AND (match LIKE ? OR label LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY modifiedAt DESC LIMIT ${limit} OFFSET ${offset}`;

  const results: DictionaryItem[] = await db.getAllAsync(query, params);
  return results;
};

export const getDictionaryCollections = async () => {
  const collections = (await db.getAllAsync(
    `SELECT * FROM collections WHERE name = ? OR name = ?`,
    "keywords",
    "recipients"
  )) as { name: "keywords" | "recipients"; count: number }[];

  return collections.reduce(
    (obj, collection) => {
      obj[collection.name] = collection.count;
      return obj;
    },
    {} as {
      keywords: number;
      recipients: number;
    }
  );
};

export const updateDictionaryItem = async (
  item: Partial<DictionaryItem>,
  mode: "add" | "update"
) => {
  let query = "";
  item.id = item.id || nanoid();
  item.modifiedAt = new Date().toISOString();

  const keys = Object.keys(item);
  if (mode === "add") {
    const data: { id: string } | null = await db.getFirstAsync(
      `SELECT id FROM dictionary WHERE match = ? AND type = ?;`,
      item.match || null,
      item.type || null
    );
    const exists = data?.id;
    query += addDictionaryItemQuery(keys, item, exists);
  } else {
    query += updateDictionaryItemQuery(keys, item);
  }

  await db.execAsync(query);
  return item;
};

export const handleDictionaryUpdates = (
  recipients: string[],
  labels: Record<string, string>,
  exists: Record<string, string>
) => {
  
  const modifiedAt = new Date().toISOString();
  let query = "";
  for (let recipient of recipients) {
    let id = exists[recipient];
    const label = labels[recipient];
    if (id) {
      query += updateDictionaryFromExpenseQuery({
        id,
        label,
        modifiedAt,
      });
    } else {
      id = nanoid()
      query += insertIntoDictionaryFromExpenseQuery({
        id,
        label,
        modifiedAt,
        match: recipient,
      });
    }
  }
  return query;
};

export const deleteDictionaryItems = async (
  selected: Set<string>,
  type: DictionaryItemType
) => {
  const ids = [...selected];
  let query = deleteDictionaryItemsQuery(ids, type);
  await db.execAsync(query);
};
