import db from "@/db/db";
import { Expense } from "@/types/common";
import { updateExpenses } from "./expenseUtils";
import { deleteImage } from "./imageUtils";
import {
  addExpensesToExclusionsQuery,
  addToCollectionQuery,
  deleteExclusionsQuery,
  incrementCollectionQuery,
} from "./queries";

export const deleteExclusions = async (
  selected: Set<string>,
  collections: {
    map: Map<string, number>;
    names: string[];
    exclusions: string[];
  }
) => {
  let images: string[] = [];
  let recipients: string[] = [];
  let names: string[] = [];

  for (let item of selected) {
    recipients.push(item);
    names.push("exclusion/" + item);
  }
  const imageData: { image: string }[] = await db.getAllAsync(
    `SELECT image FROM expenses WHERE collection = "exclusions" AND image != null AND image != "" AND recipient IN (?${`, ?`.repeat(
      recipients.length - 1
    )});`,
    recipients
  );

  images = imageData.reduce((arr, { image }) => {
    arr.push(image);
    return arr;
  }, [] as string[]);

  collections.map = new Map(collections.map);
  collections.exclusions = collections.exclusions.filter((exclusion) => {
    if (selected.has(exclusion)) {
      collections.map.delete(exclusion);
      return false;
    } else {
      return true;
    }
  });
  let count = collections.map.get("exclusions") || selected.size;
  collections.map.set("exclusions", count - selected.size);

  let query = deleteExclusionsQuery(recipients, names, selected.size);
  await db.execAsync(query);

  if (images.length) {
    const promises = [];
    for (let image of images) {
      promises.push(deleteImage(image));
    }
    await Promise.all(images);
  }

  return collections;
};

export const deleteExclusionExpenses = async (
  selected: Set<number>,
  expenses: Partial<Expense>[],
  collections: {
    map: Map<string, number>;
    names: string[];
    exclusions: string[];
  },
  exclusion: string
) => {
  let filtered: Partial<Expense>[] = [];
  let ids: string[] = [];
  let promises = [];

  collections.map = new Map(collections.map);
  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    if (selected.has(i)) {
      if (expense.id) {
        ids.push(expense.id);
      }
      if (expense.image) {
        promises.push(deleteImage(expense.image));
      }
    } else {
      filtered.push(expense);
    }
  }

  await Promise.all(promises);

  let count = collections.map.get("exclusions") || selected.size;
  collections.map.set("exclusions", count - selected.size);
  count = collections.map.get(exclusion) || selected.size;
  collections.map.set(exclusion, count - selected.size);

  await db.runAsync(
    `DELETE FROM expenses WHERE collection = "exclusions" AND recipient = ? AND id IN (?${`, ?`.repeat(
      ids.length - 1
    )});`,
    [exclusion, ...ids]
  );

  await db.runAsync(
    `UPDATE collections SET count = count - ? WHERE name IN (?, ?) ;`,
    [selected.size, "exclusions", "exclusion/" + exclusion]
  );

  return { expenses: filtered, collections };
};

export const restoreExclusionExpenses = async (
  selected: Set<number>,
  expenses: Partial<Expense>[],
  collections: {
    map: Map<string, number>;
    names: string[];
    exclusions: string[];
  },
  exclusion: string
) => {
  let filtered: Partial<Expense>[] = [];
  let restored: Partial<Expense>[] = [];

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    if (selected.has(i)) {
      if (expense.collection) {
        expense.collection = "expenses";
        restored.push(expense);
      }
    } else {
      filtered.push(expense);
    }
  }

  let count = collections.map.get("exclusions") || selected.size;
  collections.map.set("exclusions", count - selected.size);
  count = collections.map.get(exclusion) || selected.size;
  collections.map.set(exclusion, count - selected.size);

  await updateExpenses(restored, "restore");

  await db.runAsync(
    `UPDATE collections SET count = count - ? WHERE name IN (?, ?) ;`,
    [selected.size, "exclusions", "exclusion/" + exclusion]
  );

  return { expenses: filtered, collections };
};

export const addExpensesToExclusions = async (
  selected: Set<number>,
  expenses: Partial<Expense>[],
  collections: {
    map: Map<string, number>;
    names: string[];
    exclusions: string[];
  }
) => {
  let filtered: Partial<Expense>[] = [];
  let deleted: Partial<Expense>[] = [];
  let query = "";
  let ids: string[] = [];

  collections.map = new Map(collections.map);
  collections.exclusions = [...collections.exclusions];

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    if (selected.has(i)) {
      deleted.push(expense);

      if (expense.id) {
        ids.push(expense.id);
      }

      if (expense.collection) {
        let count = collections.map.get(expense.collection);
        collections.map.set(expense.collection, (count || 1) - 1);
        if (expense.collection !== "expenses") {
          count = collections.map.get("expenses");
          collections.map.set("expenses", (count || 1) - 1);
        }
      }

      if (expense.recipient) {
        query += addToCollectionQuery("exclusion/" + expense.recipient);
        if (!collections.map.has(expense.recipient)) {
          collections.exclusions.push(expense.recipient);
          collections.map.set(expense.recipient, 1);
        } else {
          let count = collections.map.get(expense.recipient) || 0;
          collections.map.set(expense.recipient, count + 1);
        }
      }
    } else {
      filtered.push(expense);
    }
  }

  let count = collections.map.get("exclusions") || selected.size;
  collections.map.set("exclusions", count - selected.size);

  query += addExpensesToExclusionsQuery(ids);
  query += incrementCollectionQuery(selected.size, "exclusions");
  query += incrementCollectionQuery(-selected.size, "trash");

  console.log("exclusions query: ", query);
  await updateExpenses(deleted, "delete");
  await db.execAsync(query);

  return { expenses: filtered, collections };
};
