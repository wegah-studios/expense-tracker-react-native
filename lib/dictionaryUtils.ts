import db from "@/db/schema";
import { DictionaryItem, DictionaryItemType } from "@/types/common";
import { nanoid } from "nanoid/non-secure";

export const getSuggestions = async () => {
  const results: { label: string }[] = await db.getAllAsync(
    `SELECT label FROM dictionary ORDER BY label `
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
  item.id = item.id || nanoid();
  item.modifiedAt = new Date().toISOString();
  item.type = item.type || "keyword";

  const keys = Object.keys(item);
  const values = Object.values(item);
  if (mode === "add") {
    const result = await db.runAsync(
      `INSERT OR REPLACE INTO dictionary (${keys.join(
        ", "
      )}) VALUES (?${`, ?`.repeat(keys.length - 1)})`,
      values
    );
    if (result.changes === 1) {
      await db.runAsync(
        `UPDATE collections SET count = count + 1 WHERE name = ? `,
        item.type + "s"
      );
    }
  } else {
    values.push(item.id);
    await db.runAsync(
      `UPDATE dictionary SET ${keys.map((key) => `${key} = ?`)} WHERE id = ?`,
      values
    );
  }
  return item;
};

export const handleExpenseUpdate = async (label: string, recipient: string) => {
  const modifiedAt = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT OR REPLACE INTO dictionary (type, label, match, modifiedAt) VALUES (?, ?, ?, ?)`,
    "recipient",
    label,
    recipient,
    modifiedAt
  );
  if (result.changes === 1) {
    await Promise.all([
      db.runAsync(
        `UPDATE collections SET count = count + 1 WHERE name = ? `,
        "recipients"
      ),
      db.runAsync(
        `UPDATE dictionary SET id = ? WHERE match = ? AND type = ? `,
        nanoid(),
        recipient,
        "recipient"
      ),
    ]);
  }
};

export const deleteDictionaryItems = async (
  selected: Set<string>,
  type: DictionaryItemType
) => {
  const ids = [...selected];
  await Promise.all([
    db.runAsync(
      `DELETE FROM dictionary WHERE id IN (?${`, ?`.repeat(ids.length - 1)}) `,
      ids
    ),
    db.runAsync(
      `UPDATE collections SET count = count - ${ids.length} WHERE name = ? `,
      type + "s"
    ),
  ]);
};
