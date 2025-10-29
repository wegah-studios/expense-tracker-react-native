import db from "@/db/schema";
import { DictionaryItem, Expense } from "@/types/common";
import { nanoid } from "nanoid/non-secure";
import { deleteReceipt } from "react-native-sms-listener";
import * as XLSX from "xlsx";
import { normalizeString } from "./appUtils";
import { updateBudgets } from "./budgetUtils";
import { addToCollection, removeFromCollection } from "./collectionsUtils";
import { handleExpenseUpdate } from "./dictionaryUtils";
import { deleteImage, saveImage } from "./imageUtils";
import { updateStatistics } from "./statisticsUtils";

export const getExpenses = async ({
  search,
  collection,
  limit,
  page = 1,
  ids,
  range,
  sort,
}: {
  search?: string;
  collection?: string;
  limit?: number;
  page?: number;
  ids?: string[];
  range?: {
    start: string;
    end: string;
  };
  sort?: {
    property: string;
    direction: "ASC" | "DESC";
  };
}) => {
  collection = collection || "expenses";
  let query: string = " SELECT * FROM expenses ";
  let params: (string | number)[] = [];

  if (ids && ids.length) {
    query += ` WHERE id IN (?${`, ?`.repeat(ids.length - 1)}) `;
    params = ids;
  }

  if (collection) {
    if (collection !== "expenses") {
      query += ` ${ids?.length ? "AND" : "WHERE"} collection = ? `;
      params.push(collection);
    } else {
      query += ` ${
        ids?.length ? "AND" : "WHERE"
      } collection != ? AND collection != ? `;
      params.push("failed", "trash");
    }
  }

  if (search) {
    query += ` ${ids?.length || collection ? "AND" : "WHERE"} 
    (label LIKE ?
    OR recipient LIKE ?
    OR ref LIKE ?
    OR collection LIKE ?
    OR CAST(amount AS TEXT) LIKE ?
    OR date LIKE ?
    OR receipt LIKE ?
    ) 
    `;
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  if (range) {
    query += ` ${ids?.length || collection || search ? "AND" : "WHERE"} 
    date >= ? AND date <= ?
     `;
    params.push(range.start, range.end);
  }

  query += ` ORDER BY ${sort?.property || "date"} ${sort?.direction || "DESC"}`;

  if (page && limit) {
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
  }

  const expenses: Partial<Expense>[] = await db.getAllAsync(query, params);
  return expenses;
};

export const deleteExpenses = async (
  selected: Set<number>,
  expenses: Partial<Expense>[],
  collections: {
    map: Map<string, number>;
    names: string[];
  }
) => {
  await db.withTransactionAsync(async () => {
    let promises: Promise<any>[] = [];
    collections.map = new Map(collections.map);
    expenses = expenses.filter((expense, index) => {
      if (selected.has(index)) {
        promises.push(updateExpense(expense, "delete"));

        if (expense.collection) {
          if (
            expense.collection !== "failed" &&
            expense.collection !== "trash"
          ) {
            const count = collections.map.get("trash");
            collections.map.set("trash", (count || 0) + 1);
          }
          const count = collections.map.get(expense.collection);
          collections.map.set(expense.collection, (count || 1) - 1);
        }
        return false;
      } else {
        return true;
      }
    });

    await Promise.all(promises);
  });

  return { expenses, collections };
};

export const restoreExpenses = async (
  selected: Set<number>,
  collections: {
    map: Map<string, number>;
    names: string[];
  },
  expenses: Partial<Expense>[]
) => {
  collections.map = new Map(collections.map);

  let promises: Promise<any>[] = [];

  expenses = expenses.filter((expense, index) => {
    let collection = expense.collection;
    if (selected.has(index)) {
      if (collection) {
        promises.push(removeFromCollection(collection || ""));
        expense.collection = "expenses";
        promises.push(updateExpense(expense));
      }
    } else {
      return true;
    }
  });
  collections.map.set(
    "trash",
    (collections.map.get("trash") || selected.size) - selected.size
  );
  collections.map.set(
    "expenses",
    (collections.map.get("expenses") || 0) + selected.size
  );
  await Promise.all(promises);

  return { expenses, collections };
};

export const groupExpenseSections = (
  expenses: (Partial<Expense> | undefined)[]
) => {
  let groups: { id: string; data: number[] }[] = [];
  let groupIndex: Record<string, number> = {};
  let indices: number[] = [];

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    if (!expense) {
      continue;
    }
    const id = expense.date ? new Date(expense.date).toDateString() : "#";
    if (groupIndex[id] === undefined) {
      groupIndex[id] = groups.length;
      groups.push({ id, data: [i] });
    } else {
      groups[groupIndex[id]].data.push(i);
    }
    indices.push(i);
  }
  return { groups, indices };
};

export const updateExpense = async (
  expense: Partial<Expense>,
  mode: "add" | "delete" | "update" = "add",
  previousExpense?: Partial<Expense>,
  updateDictionary?: boolean
) => {
  let query: string = ``;
  let params: (string | number)[] = [];
  const promises: Promise<any>[] = [];

  let isTrash = expense.collection === "trash";
  let isFailed = expense.collection === "failed";

  expense.modifiedAt = new Date().toISOString();

  if (mode === "delete" && expense.id) {
    if (isTrash || isFailed) {
      query = "DELETE FROM expenses";
    } else {
      query = `UPDATE expenses SET collection = ?, modifiedAt = ?`;
      params.push("trash", expense.modifiedAt);

      if (expense.image) {
        promises.push(deleteImage(expense.image));
      }

      promises.push(addToCollection("trash"));
    }
    query += ` WHERE id = ?`;
    params.push(expense.id);

    if (expense.collection) {
      promises.push(removeFromCollection(expense.collection));
    }
  } else {
    expense.id = expense.id || nanoid();
    expense.currency = expense.currency || "Ksh";

    if (expense.image) {
      const fileName = expense.image.split("/").pop() || "";
      promises.push(saveImage(expense.image, fileName));
      expense.image = fileName;

      if (previousExpense && previousExpense.image) {
        promises.push(deleteImage(previousExpense.image));
      }
    }

    if (
      expense.label &&
      updateDictionary &&
      (expense.recipient || previousExpense?.recipient)
    ) {
      promises.push(
        handleExpenseUpdate(
          expense.label,
          expense.recipient || previousExpense?.recipient || ""
        )
      );
    }

    const keys = Object.keys(expense);
    const values = Object.values(expense);

    if (mode === "add") {
      query = `INSERT INTO expenses (${keys.join(
        ", "
      )}) VALUES ( ?${", ?".repeat(keys.length - 1)})`;
      params = values;

      promises.push(addToCollection("expenses"));
      if (expense.collection && expense.collection !== "expenses") {
        promises.push(addToCollection(expense.collection));
      }
    }
    if (mode === "update") {
      query = `UPDATE expenses SET ${keys.map(
        (key) => ` ${key} = ?`
      )} WHERE id = ?`;
      params = [...values, expense.id];

      if (expense.collection && previousExpense && previousExpense.collection) {
        if (previousExpense.collection !== "expenses") {
          promises.push(removeFromCollection(previousExpense.collection));
        }
        promises.push(addToCollection(expense.collection));
      }
    }
  }

  promises.push(db.runAsync(query, params));

  if (!isTrash && !isFailed) {
    const statisticsUpdate =
      previousExpense &&
      ((expense.amount && previousExpense.amount) ||
        (expense.label && previousExpense.label) ||
        (expense.date && previousExpense.date));

    if (mode === "delete" || (mode === "update" && statisticsUpdate)) {
      updateStatistics(previousExpense || expense, promises, "delete");
      promises.push(updateBudgets(previousExpense || expense, "delete"));
    }

    if (mode === "add" || (mode === "update" && statisticsUpdate)) {
      updateStatistics({ ...previousExpense, ...expense }, promises);
      promises.push(updateBudgets({ ...previousExpense, ...expense }, "add"));
    }
  }
  await Promise.all(promises);
  return expense;
};

export const updateMultipleExpenses = async (
  edit: Partial<Expense>,
  expenses: Partial<Expense>[],
  indices: number[]
) => {
  let map: Map<number, Partial<Expense>> = new Map();
  await db.withTransactionAsync(async () => {
    let promises: Promise<any>[] = [];
    for (let index of indices) {
      const update = { ...edit };
      const expense = expenses[index];
      update.id = expense.id;
      if (expense.collection === "failed") {
        update.collection = update.collection || "expenses";
      }
      promises.push(updateExpense(update, "update", expense, true));
      map.set(index, { ...expense, ...update });
    }
    await Promise.all(promises);
  });
  return map;
};

export const parseMessages = async (str: string) => {
  const expenses: Partial<Expense>[] = [];
  const messages: string[] = await new Promise((resolve, reject) => {
    const data = str.split(/confirmed/i);
    resolve(data);
  });

  await db.withTransactionAsync(async () => {
    const promises = [];
    for (let i = 0; i < messages.length; i++) {
      let ref = messages[i].slice(-11).trim();

      if (/^(?=.*\d)[A-Z\d]{10}$/.test(ref)) {
        let message: string =
          ref + " confirmed " + messages[i + 1].slice(0, -11);
        promises.push(handleMessage(message, expenses));
      }
    }
    await Promise.all(promises);
  });
  return expenses;
};

export const handleMessage = async (
  message: string,
  expenses: Partial<Expense>[]
) => {
  if (!/(sent to|paid to|you bought|withdraw)/i.test(message)) {
    return;
  }

  let data: Partial<Expense> = await new Promise((resolve, reject) => {
    const result = parseMessage(message);
    resolve(result);
  });

  let label = await fetchExpenseLabel(data.recipient);

  data = {
    ...data,
    id: nanoid(),
    receipt: message,
    label,
    currency: "Ksh",
  };

  if (data.amount === undefined || !data.date || !data.recipient) {
    data.collection = "failed";
  } else {
    data.collection = "expenses";
  }
  await updateExpense(data);
  expenses.push(data);
};

const parseMessage = (message: string) => {
  const ref = message.trim().substring(0, 11);
  message = ref + " " + normalizeString(message.slice(10));
  const recipientMatch = message.match(/to (.+?) on|from (.+?) new/i);
  const amountMatch = message.match(/ksh(\d{1,3}(,\d{3})*(\.\d{2})?)/i);
  const transactionCostMatch = message.match(
    /transaction cost, ksh(\d{1,3}(,\d{3})*(\.\d{2})?)/i
  );
  const airtimeMatch = message.match(
    /you bought ksh\d{1,3}(,\d{3})*(\.\d{2})? of airtime/i
  );
  const dateMatch = message.match(/on (\d{1,2}\/\d{1,2}\/\d{2,4})/);
  const timeMatch = message.match(/at (\d{1,2}:\d{2} (?:am|pm))/i);

  const recipient: string | undefined =
    recipientMatch?.[1]?.trim() ||
    recipientMatch?.[2]?.trim() ||
    (airtimeMatch ? "safaricom" : undefined);

  const amount: number | undefined =
    Number(amountMatch?.[1].replace(/,/g, "")) +
      Number(transactionCostMatch?.[1].replace(/,/g, "") || 0) || undefined;

  let date = dateMatch?.[1] || null;
  let time = timeMatch?.[1] || null;

  if (time) {
    let [hour, rest] = time.split(":");
    const [minute, ampm] = rest.split(" ");

    hour =
      ampm === "pm"
        ? hour === "12"
          ? "12"
          : String(Number(hour) + 12)
        : hour === "12"
        ? `00`
        : ("0" + hour).slice(-2);
    time = `${hour}:${minute}`;
  }

  if (date) {
    const [day, month, year] = date.split("/");
    date = `${("20" + year).slice(-4)}-${("0" + month).slice(-2)}-${(
      "0" + day
    ).slice(-2)}`;
  }

  let dateTime = undefined;

  if (date && time) {
    const newDate = new Date(`${date}T${time}`);
    if (newDate instanceof Date && !isNaN(Number(newDate))) {
      dateTime = newDate.toISOString();
    }
  }

  return {
    ref,
    amount,
    recipient,
    date: dateTime,
  };
};

export const fetchExpenseLabel = async (recipient?: string) => {
  let label: string = "";
  if (!recipient) {
    return label;
  }

  const dictionaryResult: DictionaryItem | null = await db.getFirstAsync(
    "SELECT * FROM dictionary WHERE match = ? ORDER BY modifiedAt DESC LIMIT 1 OFFSET 0 ",
    recipient
  );

  if (dictionaryResult) {
    label = dictionaryResult.label;
  } else {
    const keywordResult: DictionaryItem | null = await db.getFirstAsync(
      "SELECT * FROM dictionary WHERE ? LIKE '%' || match || '%' ORDER BY modifiedAt DESC LIMIT 1 OFFSET 0 ",
      recipient
    );

    if (keywordResult) {
      label = keywordResult.label;
    }
  }

  if (!label) {
    label = recipient.split(" ").slice(0, 2).join(" ");

    let accountIndex = recipient.indexOf("for account");
    if (accountIndex !== -1) {
      accountIndex += 12;
      label += "," + recipient.substring(accountIndex);
    }
  }

  return label;
};

export const parsePdfText = async (text: string) => {
  const receipts = text.match(
    /\b(?=[A-Z0-9]{10}\b)(?=.*[A-Z])(?=.*\d)[A-Z0-9]{10}\b(\s|\n|\s\n)\b\d{4}-\d{2}-\d{2}(\s|\n|\s\n)\d{2}:\d{2}:\d{2}\b([\s\S]*?)COMPLETED(\s|\n|\s\n)(.+?)(\s|\n|\s\n)(.+?)(\s|\n|\s\n)(.+?)(\s|\n|\s\n)/g
  );

  let expenses: Partial<Expense>[] = [];
  let record: Record<string, { index: number; isTransactionCost: boolean }> =
    {};

  if (!receipts || !receipts.length) {
    return expenses;
  }

  for (let receipt of receipts) {
    handlePdfReceipt(receipt, expenses, record);
  }

  await db.withTransactionAsync(async () => {
    let promises = [];
    for (let expense of expenses) {
      promises.push(
        new Promise<void>(async (resolve) => {
          expense.id = nanoid();
          expense.currency = "Ksh";
          expense.label = await fetchExpenseLabel(expense.recipient);

          if (
            expense.amount === undefined ||
            !expense.date ||
            !expense.recipient
          ) {
            expense.collection = "failed";
          } else {
            expense.collection = "expenses";
          }
          await updateExpense(expense);
          resolve();
        })
      );
    }
    await Promise.all(promises);
  });

  return expenses;
};

export const handlePdfReceipt = (
  receipt: string,
  expenses: Partial<Expense>[],
  record: Record<
    string,
    {
      index: number;
      isTransactionCost: boolean;
    }
  >
) => {
  const [_a, _b, withdrawn] = receipt.match(/COMPLETED (.+?) (.+?) /) || [];
  const amount = Number(withdrawn.replace(/,/g, ""));

  if (!amount) {
    return;
  }

  const ref = receipt.substring(0, 10);
  const date = new Date(
    receipt
      .match(/\b\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\b/)?.[0]
      ?.replace(" ", "T") || ""
  ).toISOString();

  const details =
    receipt
      .match(/\b\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\b([\s\S]*?)COMPLETED/)?.[1]
      ?.replace(/\s+/g, " ")
      .trim()
      .toLowerCase() || "";

  let recipient =
    details
      .split(" to ")
      .slice(-1)
      .pop()
      ?.split(" - ")
      .slice(-1)
      .pop()
      ?.trim() || "";

  const isTransactionCost = / Charge([\s\S]*?)COMPLETED/.test(receipt);

  if (record[ref]) {
    const expense = expenses[record[ref].index];

    if (record[ref].isTransactionCost) {
      expense.receipt = `${details}, transaction cost: Ksh ${(
        expense.amount || 0
      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      expense.recipient = recipient;
    } else if (isTransactionCost) {
      expense.receipt += `, transaction cost: Ksh ${amount.toLocaleString(
        undefined,
        { maximumFractionDigits: 2 }
      )}`;
    }
    expense.amount = (expense.amount || 0) + amount;
    record[ref].isTransactionCost = isTransactionCost;
  } else {
    record[ref] = { index: expenses.length, isTransactionCost };
    expenses.push({ ref, date, amount, recipient, receipt: details });
  }
};

export const parseExcelFile = async (b64: string) => {
  let expenses: Partial<Expense>[] = [];
  await db.withTransactionAsync(async () => {
    const wb = XLSX.read(b64, { type: "base64" });
    let promises = [];

    for (let name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const data: Partial<Expense>[] = XLSX.utils.sheet_to_json(ws);
      for (let item of data) {
        const expense: Partial<Expense> = {};
        if (item.label) {
          expense.label = String(item.label);
        }
        if (item.recipient) {
          expense.recipient = String(item.recipient);
        }
        if (item.amount && Number(item.amount)) {
          expense.amount = Number(item.amount);
        }
        if (item.ref) {
          expense.ref = String(item.ref);
        }
        if (item.receipt) {
          expense.receipt = String(item.receipt);
        }
        if (item.date) {
          const date = new Date(item.date);
          if (!isNaN(date.getTime())) {
            expense.date = date.toISOString();
          }
        }

        if (Object.keys(expense).length) {
          if (
            !expense.label ||
            !expense.date ||
            !expense.recipient ||
            !expense.amount
          ) {
            expense.collection = "failed";
          } else {
            expense.collection = "expenses";
          }
          expense.id = nanoid();
          expense.currency = "Ksh";
          expenses.push(expense);
          promises.push(updateExpense(expense));
        }
      }
    }

    await Promise.all(promises);
  });
  return expenses;
};

export const importFromSMSListener = async (messages: string[]) => {
  const expenses: Partial<Expense>[] = [];
  await db.withTransactionAsync(async () => {
    const promises: Promise<any>[] = [];
    for (let message of messages) {
      promises.push(handleMessage(message, expenses));
    }
    await Promise.all(promises);
  });
  return expenses;
};

export const handleSmsEvent = async (message: { id: number; body: string }) => {
  const expenses: Partial<Expense>[] = [];
  await handleMessage(message.body, expenses);
  await deleteReceipt(message.id);
  return expenses[0];
};
