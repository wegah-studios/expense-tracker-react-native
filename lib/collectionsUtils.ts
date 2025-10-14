import db from "@/db/schema";
import { Collection, Expense } from "@/types/common";

export const getCollections = async () => {
  const data: Collection[] = await db.getAllAsync(
    `SELECT * FROM collections ORDER BY count DESC`
  );
  let map: Map<string, number> = new Map();
  let names: string[] = [];

  for (let item of data) {
    map.set(item.name, item.count);
    if (
      item.name !== "expenses" &&
      item.name !== "failed" &&
      item.name !== "trash" &&
      item.name !== "keywords" &&
      item.name !== "recipients"
    ) {
      names.push(item.name);
    }
  }
  return { map, names };
};

export const addToCollection = async (collection: string) => {
  await db.runAsync(
    `
  INSERT INTO collections (name, count)
  VALUES (?, 1)
  ON CONFLICT(name)
  DO UPDATE SET count = count + 1;
  `,
    [collection]
  );
};

export const removeFromCollection = async (collection: string) => {
  await db.runAsync(
    `UPDATE collections SET count = count - 1 WHERE name = ?`,
    collection
  );
};

export const createCollection = async (collection: string) => {
  await db.runAsync(
    `INSERT OR IGNORE INTO collections (name, count) VALUES (?, 0);`,
    collection
  );
};

export const deleteCollections = async (
  selected: Set<string>,
  collections: { map: Map<string, number>; names: string[] }
) => {
  let params = [...selected];
  await Promise.all([
    db.runAsync(
      `UPDATE expenses SET collection = "expenses" WHERE collection IN (?${`, ?`.repeat(
        params.length - 1
      )});`,
      params
    ),
    db.runAsync(
      `DELETE FROM collections WHERE name IN (?${`, ?`.repeat(
        params.length - 1
      )});`,
      params
    ),
  ]);

  collections.map = new Map(collections.map);
  collections.names = collections.names.filter((name) => {
    if (selected.has(name)) {
      collections.map.delete(name);
      return false;
    } else {
      return true;
    }
  });

  return collections;
};

export const updateCollections = async (
  selected: Set<number>,
  collection: string,
  collections: {
    map: Map<string, number>;
    names: string[];
  },
  expenses: Partial<Expense>[],
  isExpenses: boolean = false
) => {
  collections.map = new Map(collections.map);

  let promises = [];
  let ids: string[] = [];

  expenses = expenses.filter((expense, index) => {
    if (selected.has(index)) {
      if (expense.collection) {
        ids.push(expense.id || "");
        if (expense.collection !== "expenses") {
          promises.push(removeFromCollection(expense.collection || ""));
          collections.map.set(
            expense.collection,
            (collections.map.get(expense.collection) || 1) - 1
          );
        }

        if (isExpenses) {
          expense.collection = collection;
          return true;
        } else {
          return false;
        }
      }
    } else {
      return true;
    }
  });
  promises.push(
    db.runAsync(
      `UPDATE expenses SET collection = ? WHERE id IN (?${`, ?`.repeat(
        ids.length - 1
      )});`,
      [collection, ...ids]
    ),
    db.runAsync(
      `UPDATE collections SET count = count + ${ids.length} WHERE name = ?`,
      collection
    )
  );
  collections.map.set(
    collection,
    (collections.map.get(collection) || 0) + ids.length
  );
  await Promise.all(promises);

  return { expenses, collections };
};
