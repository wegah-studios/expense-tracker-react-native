import db from "@/db/db";

export const setStoreItems = async (items: [string, string][]) => {
  for (let item of items) {
    await db.runAsync(
      `INSERT OR REPLACE INTO store (key, value) VALUES (?, ?);`,
      item
    );
  }
};

export const removeStoreItems = async (...keys: string[]) => {
  await db.runAsync(
    `DELETE FROM store WHERE key IN (?${", ?".repeat(keys.length - 1)});`,
    keys
  );
};

export const getStoreItems = async (...keys: string[]) => {
  const data: { key: string; value: string }[] = await db.getAllAsync(
    `SELECT * FROM store WHERE key IN (?${", ?".repeat(keys.length - 1)});`,
    keys
  );
  return data.reduce((record, item) => {
    record[item.key] = item.value;
    return record;
  }, {} as Record<string, string>);
};
