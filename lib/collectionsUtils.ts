import db from "@/db/db";
import { Collection, Expense } from "@/types/common";
import {
  deleteCollectionsQuery,
  setCollectionCountQuery,
  updateCollectionsQuery,
} from "./queries";

export const getCollections = async () => {
  const data: Collection[] = await db.getAllAsync(
    `SELECT * FROM collections ORDER BY count DESC`
  );
  let map: Map<string, number> = new Map();
  let names: string[] = [];
  let exclusions: string[] = [];

  for (let item of data) {
    let name = item.name;
    if (
      ![
        "expenses",
        "failed",
        "trash",
        "keywords",
        "recipients",
        "exclusions",
      ].includes(item.name)
    ) {
      if (item.name.startsWith("exclusion/")) {
        name = item.name.replace("exclusion/", "");
        exclusions.push(name);
      } else {
        names.push(item.name);
      }
    }
    map.set(name, item.count);
  }
  return { map, names, exclusions };
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
  let names = [...selected];
  let query = deleteCollectionsQuery(names);

  collections.map = new Map(collections.map);
  collections.names = collections.names.filter((name) => {
    if (selected.has(name)) {
      collections.map.delete(name);
      return false;
    } else {
      return true;
    }
  });

  await db.execAsync(query);

  return collections;
};

export const updateCollections = async (
  selected: Set<number>,
  collection: string,
  collections: {
    map: Map<string, number>;
    names: string[];
    exclusions: string[];
},
  expenses: Partial<Expense>[],
  isExpenses: boolean = false
) => {
  collections.map = new Map(collections.map);

  let query = "";
  let ids: string[] = [];
  let filtered: Partial<Expense>[] = [];
  let decrements: Set<string> = new Set();

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i];
      if (selected.has(i)) {
        if (expense.collection) {
          ids.push(expense.id || "");
          if (expense.collection !== "expenses") {
            decrements.add(expense.collection);
            collections.map.set(
              expense.collection,
              (collections.map.get(expense.collection) || 1) - 1
            );
          }

          if (isExpenses) {
            expense.collection = collection;
            filtered.push(expense);
          }
        }
      } else {
        filtered.push(expense);
      }
    }
  });

  collections.map.set(
    collection,
    (collections.map.get(collection) || 0) + ids.length
  );

  for (let decrement of decrements) {
    const count = collections.map.get(decrement) || 0;
    query += setCollectionCountQuery(decrement, count);
  }

  query += updateCollectionsQuery(ids, collection);

  await db.execAsync(query);

  return { expenses, collections };
};
