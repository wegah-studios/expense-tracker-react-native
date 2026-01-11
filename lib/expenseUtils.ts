import db, { enqueueDB } from "@/db/db";
import { Currency, Expense } from "@/types/common";
import dayjs from "dayjs";
import { nanoid } from "nanoid/non-secure";
import { deleteReceipt } from "react-native-sms-listener";
import * as XLSX from "xlsx";
import { formatQueryValue, normalizeString } from "./appUtils";
import { handleDictionaryUpdates } from "./dictionaryUtils";
import { deleteImage, saveImage } from "./imageUtils";
import {
  addToCollectionQuery,
  deleteExpenseQuery,
  handleExpenseQuery,
  removeFromCollectionQuery,
  updateBudgetsQuery,
} from "./queries";
import { updateStatistics } from "./statisticsUtils";

export const getExpenses = async ({
  search,
  collection,
  exclusion,
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
  exclusion?: string;
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
  let query: string = " SELECT * FROM expenses ";
  let params: (string | number)[] = [];

  if (ids && ids.length) {
    query += ` WHERE id IN (?${`, ?`.repeat(ids.length - 1)}) `;
    params = ids;
  }

  if (search) {
    query += ` ${ids?.length ? "AND" : "WHERE"} 
    (label LIKE ?
    OR recipient LIKE ?
    OR ref LIKE ?
    OR collection LIKE ?
    OR CAST(amount AS TEXT) LIKE ?
    OR date LIKE ?
    OR searchable_date LIKE ?
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
      `%${search}%`,
      `%${search}%`
    );
  }

  if (collection) {
    if (collection !== "expenses") {
      query += ` ${ids?.length || search ? "AND" : "WHERE"} collection = ? `;
      params.push(collection);
    } else {
      query += ` ${
        ids?.length || search ? "AND" : "WHERE"
      } collection != ? AND collection != ? AND collection != ? `;
      params.push("failed", "trash", "exclusions");
    }
  }

  if (exclusion) {
    query += ` ${ids?.length || collection || search ? "AND" : "WHERE"}
    collection = ? AND recipient = ?
    `;
    params.push("exclusions", exclusion);
  }

  if (range) {
    query += ` ${
      ids?.length || collection || search || exclusion ? "AND" : "WHERE"
    } 
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

  const expenses: Partial<Expense>[] = await enqueueDB(() =>
    db.getAllAsync(query, params)
  );
  return expenses;
};

export const getRecipients = async (search?: string) => {
  let results: string[] = [];
  if (search) {
    let record: Record<string, boolean> = {};
    const data: { recipient: string }[] = await enqueueDB(() =>
      db.getAllAsync(
        `SELECT recipient FROM expenses WHERE recipient LIKE ? ORDER BY recipient DESC LIMIT ? OFFSET ? ;`,
        [`%${search}%`, 6, 0]
      )
    );
    results = data.reduce((arr, { recipient }) => {
      if (!record[recipient]) {
        arr.push(recipient);
        record[recipient] = true;
      }
      return arr;
    }, [] as string[]);
  }
  return results;
};

export const deleteExpenses = async (
  selected: Set<number>,
  expenses: Partial<Expense>[],
  collections: {
    map: Map<string, number>;
    names: string[];
    exclusions: string[];
  }
) => {
  let filtered: Partial<Expense>[] = [];
  let removed: Partial<Expense>[] = [];
  collections.map = new Map(collections.map);
  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    if (selected.has(i)) {
      removed.push(expense);

      if (expense.collection) {
        if (expense.collection !== "failed" && expense.collection !== "trash") {
          let count = collections.map.get("trash");
          collections.map.set("trash", (count || 0) + 1);
        }
        let count = collections.map.get(expense.collection);
        collections.map.set(expense.collection, (count || 1) - 1);
        if (expense.collection !== "expenses") {
          count = collections.map.get("expenses");
          collections.map.set("expenses", (count || 1) - 1);
        }
      }
    } else {
      filtered.push(expense);
    }
  }

  await updateExpenses(removed, "delete");

  return { expenses: filtered, collections };
};

export const restoreExpenses = async (
  selected: Set<number>,
  collections: {
    map: Map<string, number>;
    names: string[];
    exclusions: string[];
  },
  expenses: Partial<Expense>[]
) => {
  let filtered: Partial<Expense>[] = [];
  let restored: Partial<Expense>[] = [];

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    if (selected.has(i)) {
      restored.push(expense);
    } else {
      filtered.push(expense);
    }
  }

  collections.map = new Map(collections.map);
  collections.map.set(
    "trash",
    (collections.map.get("trash") || selected.size) - selected.size
  );
  collections.map.set(
    "expenses",
    (collections.map.get("expenses") || 0) + selected.size
  );

  await updateExpenses(restored, "restore");
  return { expenses: filtered, collections };
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

export const onExpenseUpdate = (
  expenses: Partial<Expense>[],
  collections: {
    map: Map<string, number>;
    names: string[];
    exclusions: string[];
  },
  update: Map<number, Partial<Expense>>,
  collection: string
) => {
  let newExpenses: Partial<Expense>[] = [];
  collections.map = new Map(collections.map);
  collections.names = [...collections.names];

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    const edit = update.get(i);

    if (edit) {
      if (
        edit.collection &&
        expense.collection &&
        edit.collection !== expense.collection
      ) {
        if (!collections.map.has(edit.collection)) {
          collections.names.push(edit.collection);
        }
        const expenseCount = collections.map.get(expense.collection) || 1;
        const editCount = collections.map.get(edit.collection) || 0;
        collections.map.set(expense.collection, expenseCount - 1);
        collections.map.set(edit.collection, editCount + 1);

        if (collection === "expenses") {
          newExpenses.push(edit);
        }
      } else {
        newExpenses.push(edit);
      }
    } else {
      newExpenses.push(expense);
    }
  }

  return { expenses: newExpenses, collections };
};

export const updateExpenses = async (
  expenses: Partial<Expense>[],
  mode: "add" | "delete" | "update" | "restore" = "add",
  previousExpenses?: Map<number, Partial<Expense>>,
  updateDictionary?: boolean
) => {
  await db.withExclusiveTransactionAsync(async (tx) => {
    let query = "";
    let promises: Promise<any>[] = [];
    let updates: { dictionary: Record<string, string> } = {
      dictionary: {},
    };

    for (let i = 0; i < expenses.length; i++) {
      let expense = expenses[i];
      const previousExpense = previousExpenses?.get(i);

      let isTrash = expense.collection === "trash";
      let isFailed = expense.collection === "failed";
      if (expense.id) {
        if (mode === "delete") {
          if (isTrash || isFailed) {
            query += deleteExpenseQuery({ id: expense.id });
            if (expense.image) {
              promises.push(deleteImage(expense.image));
            }
          } else {
            query += deleteExpenseQuery(
              { id: expense.id, modifiedAt: expense.modifiedAt },
              true
            );
            query += addToCollectionQuery("trash");
          }

          if (expense.collection) {
            query += removeFromCollectionQuery(expense.collection);
            if (expense.collection !== "expenses" && !isTrash && !isFailed) {
              query += removeFromCollectionQuery("expenses");
            }
          }
        } else {
          expense.id = expense.id || nanoid();

          if (expense.image && mode !== "restore") {
            const fileName = expense.image.split("/").pop();
            if (fileName) {
              promises.push(saveImage(expense.image, fileName));
              expense.image = fileName;
            }

            if (previousExpense && previousExpense.image) {
              promises.push(deleteImage(previousExpense.image));
            }
          }

          if (
            expense.label &&
            updateDictionary &&
            (expense.recipient || previousExpense?.recipient)
          ) {
            updates.dictionary[
              expense.recipient || previousExpense?.recipient || ""
            ] = expense.label;
          }

          if (expense.date && mode !== "restore") {
            expense.searchable_date = dayjs(new Date(expense.date)).format(
              "dddd DD MMMM YYYY"
            );
          }

          if (mode === "restore" && isTrash) {
            query += removeFromCollectionQuery("trash");
            expense.collection = "expenses";
            isTrash = false;
          }

          const keys = Object.keys(expense);

          if (mode === "add" || mode === "restore") {
            if (mode === "add") {
              query += handleExpenseQuery(keys, expense, "add");
            } else {
              if (expense.collection) {
                query += handleExpenseQuery(keys, expense, "restore");
              }
            }

            if (expense.collection) {
              if (
                expense.collection !== "failed" &&
                expense.collection !== "exclusions"
              ) {
                query += addToCollectionQuery("expenses");
              }
              if (expense.collection !== "expenses") {
                query += addToCollectionQuery(expense.collection);
              }
              if (expense.collection === "exclusions" && expense.recipient) {
                query += addToCollectionQuery("exclusion/" + expense.recipient);
              }
            }
          }
          if (mode === "update") {
            query += handleExpenseQuery(keys, expense, "update");

            if (
              expense.collection &&
              previousExpense &&
              previousExpense.collection
            ) {
              if (previousExpense.collection !== "expenses") {
                query += removeFromCollectionQuery(previousExpense.collection);
              }
              query += addToCollectionQuery(expense.collection);
            }
          }
        }

        if (!isTrash && !isFailed && expense.collection !== "exclusions") {
          const statisticsUpdate =
            previousExpense &&
            ((expense.amount && previousExpense.amount) ||
              (expense.label && previousExpense.label) ||
              (expense.date && previousExpense.date));

          if (mode === "delete" || (mode === "update" && statisticsUpdate)) {
            query += updateStatistics(previousExpense || expense, "delete");
            query += updateBudgetsQuery(previousExpense || expense, "delete");
          }

          if (
            mode === "add" ||
            mode === "restore" ||
            (mode === "update" && statisticsUpdate)
          ) {
            query += updateStatistics({ ...previousExpense, ...expense });
            query += updateBudgetsQuery(
              { ...previousExpense, ...expense },
              "add"
            );
          }
        }
      }
    }
    const dictionaryKeys = Object.keys(updates.dictionary);
    if (dictionaryKeys.length) {
      const data: { id: string; match: string }[] = await tx.getAllAsync(
        `SELECT id, match FROM dictionary WHERE type = ? AND  match IN (?${", ?".repeat(
          dictionaryKeys.length - 1
        )});`,
        ["recipient", ...dictionaryKeys]
      );

      const exists = data.reduce((obj, { id, match }) => {
        obj[match] = id;
        return obj;
      }, {} as Record<string, string>);

      query += handleDictionaryUpdates(
        dictionaryKeys,
        updates.dictionary,
        exists
      );
    }

    await tx.execAsync(query);
    await Promise.all(promises);
  });
};

export const editMultipleExpenses = async (
  edit: Partial<Expense>,
  expenses: Partial<Expense>[],
  indices: number[]
) => {
  let map: Map<number, Partial<Expense>> = new Map();
  let updates: Partial<Expense>[] = [];
  let previousExpenses: Map<number, Partial<Expense>> = new Map();
  for (let i = 0; i < expenses.length; i++) {
    let update = { ...edit };
    const expense = expenses[i];
    update.id = expense.id;
    if (expense.collection === "failed") {
      update.collection = update.collection || "expenses";
      update = { ...expense, ...update };
    }
    updates.push(update);
    previousExpenses.set(i, expense);
    map.set(indices[i], { ...expense, ...update });
  }
  await updateExpenses(updates, "update", previousExpenses, true);
  return map;
};

export const parseMessages = async (str: string, currency: Currency) => {
  let report: {
    complete: number;
    incomplete: number;
    excluded: number;
    currencyChange: Currency | null;
  } = { complete: 0, incomplete: 0, excluded: 0, currencyChange: null };
  let recipients: string[] = [];
  let expenses: Partial<Expense>[] = [];

  const messages: string[] = str.split(/confirmed/i);

  for (let i = 0; i < messages.length; i++) {
    let ref = messages[i].slice(-11).trim();

    if (/^(?=.*\d)[A-Z\d]{10}$/.test(ref)) {
      let message: string = ref + " confirmed " + messages[i + 1].slice(0, -11);
      handleMessage(message, recipients, expenses, currency, report);
    }
  }
  if (expenses.length) {
    await handleExpensesImport(recipients, expenses, report);
  }
  return report;
};

const handleMessage = (
  message: string,
  recipients: string[],
  expenses: Partial<Expense>[],
  existingCurrency: Currency,
  report: {
    complete: number;
    incomplete: number;
    excluded: number;
    currencyChange: Currency | null;
  }
) => {
  if (!/(sent to|paid to|you bought|withdraw)/i.test(message)) {
    return;
  }

  const ref = message.trim().substring(0, 11);

  message = ref + " " + normalizeString(message.slice(10));
  const recipientMatch = message.match(/to (.+?) on|from (.+?) new/i);
  const transactionCostMatch = message.match(
    /transaction cost, (KSh|TSh|MT|FC|GH₵|LE|Br)(\d{1,3}(,\d{3})*(\.\d{2})?)/i
  );
  const airtimeMatch = message.match(
    /you bought (KSh|TSh|MT|FC|GH₵|LE|Br)\d{1,3}(,\d{3})*(\.\d{2})? of airtime/i
  );
  const amountMatch = message.match(
    /(KSh|TSh|MT|FC|GH₵|LE|Br)(\d{1,3}(,\d{3})*(\.\d{2})?)/i
  );
  const dateMatch = message.match(/on (\d{1,2}\/\d{1,2}\/\d{2,4})/);
  const timeMatch = message.match(/at (\d{1,2}:\d{2} (?:am|pm))/i);

  const recipient: string | undefined =
    recipientMatch?.[1]?.trim() ||
    recipientMatch?.[2]?.trim() ||
    (airtimeMatch ? "safaricom" : undefined);

  const amount: number | undefined =
    Number(amountMatch?.[2].replace(/,/g, "")) +
      Number(transactionCostMatch?.[2].replace(/,/g, "") || 0) || undefined;

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

  let currency = amountMatch?.[1]?.trim();
  if (currency) {
    let space = 2;
    if (currency === "br") {
      space = 1;
    }
    currency = currency.slice(0, space).toUpperCase() + currency.slice(space);
    if (currency !== existingCurrency) {
      report.currencyChange = currency as Currency;
    }
  } else {
    currency = "KSh";
  }

  let expense: Partial<Expense> = {
    ref,
    amount,
    recipient,
    currency,
    date: dateTime,
    receipt: message,
  };
  getImportInfo(expense, recipients);
  expenses.push(expense);
};

const getExpenseLabel = (
  recipient: string,
  dictionary: Record<string, string>
) => {
  let label = dictionary[recipient];
  if (label) {
    return label;
  }

  label = recipient.split(" ").slice(0, 2).join(" ");

  let accountIndex = recipient.indexOf("for account");
  if (accountIndex !== -1) {
    accountIndex += 12;
    let account = recipient.substring(accountIndex).split(" ")[0];
    label += "," + account;
  }

  return label;
};

export const parsePdfText = async (text: string, currency: Currency) => {
  const receipts = text.match(
    /\b(?=[A-Z0-9]{10}\b)(?=.*[A-Z])(?=.*\d)[A-Z0-9]{10}\b(\s+|\n+|\s+\n+|\n+\s+)\b\d{4}-\d{2}-\d{2}(\s+|\n+|\s+\n+|\n+\s+)\d{2}:\d{2}:\d{2}\b([\s\S]*?)completed(\s+|\n+|\s+\n+|\n+\s+)(.+?)(\s+|\n+|\s+\n+|\n+\s+)(.+?)(\s+|\n+|\s+\n+|\n+\s+)/gi
  );

  let expenses: Partial<Expense>[] = [];
  let record: Record<string, { index: number; isTransactionCost: boolean }> =
    {};

  let report: {
    complete: number;
    incomplete: number;
    excluded: number;
    currencyChange: Currency | null;
  } = { complete: 0, incomplete: 0, excluded: 0, currencyChange: null };
  let recipients: string[] = [];

  if (!receipts || !receipts.length) {
    return report;
  }

  for (let receipt of receipts) {
    handlePdfReceipt(receipt, currency, expenses, recipients, record);
  }
  if (expenses.length) {
    await handleExpensesImport(recipients, expenses, report);
  }

  return report;
};

const getImportInfo = (expense: Partial<Expense>, recipients: string[]) => {
  expense.id = nanoid();
  if (expense.recipient) {
    recipients.push(expense.recipient);
  }
  if (!expense.date || !expense.recipient || !expense.amount) {
    expense.collection = "failed";
  } else {
    expense.collection = "expenses";
  }
};

const getDictionary = async (recipients: string[]) => {
  let query = "SELECT label, match FROM dictionary WHERE";

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    query += ` ${i === 0 ? "" : "OR"} ${formatQueryValue(
      recipient
    )} LIKE '%' || match || '%'`;
  }

  query += ` ORDER BY
  CASE type
    WHEN 'keyword' THEN 0
    WHEN 'recipient' THEN 1
    ELSE 2
  END;`;

  const data: { match: string; label: string }[] = await db.getAllAsync(query);
  return data.reduce((obj, { match, label }) => {
    for (let recipient of recipients) {
      if (recipient.includes(match)) {
        obj[recipient] = label;
      }
    }

    return obj;
  }, {} as Record<string, string>);
};

const handleExpensesImport = async (
  recipients: string[],
  expenses: Partial<Expense>[],
  report: {
    complete: number;
    incomplete: number;
    excluded: number;
  }
) => {
  const data: { name: string }[] = await db.getAllAsync(
    `SELECT name FROM collections WHERE name IN (${recipients
      .map((recipient) => formatQueryValue("exclusion/" + recipient))
      .join(", ")});`
  );
  const exclusions = data.reduce((obj, { name }) => {
    obj[name.replace("exclusion/", "")] = true;
    return obj;
  }, {} as Record<string, boolean>);
  const dictionary = await getDictionary(recipients);

  for (let expense of expenses) {
    if (expense.collection === "failed") {
      report.incomplete += 1;
    } else {
      if (expense.recipient) {
        if (exclusions[expense.recipient]) {
          report.excluded += 1;
          expense.collection = "exclusions";
        } else {
          report.complete += 1;
        }
      }
    }
    if (expense.recipient) {
      expense.label = getExpenseLabel(expense.recipient, dictionary);
    }
  }
  await updateExpenses(expenses);
};

const handlePdfReceipt = (
  receipt: string,
  currency: Currency,
  expenses: Partial<Expense>[],
  recipients: string[],
  record: Record<
    string,
    {
      index: number;
      isTransactionCost: boolean;
    }
  >
) => {
  const [_a, _b, _c, _d, withdrawn] =
    receipt.match(
      /completed(\s+|\n+|\s+\n+|\n+\s+)(.+?)(\s+|\n+|\s+\n+|\n+\s+)(.+?)(\s+|\n+|\s+\n+|\n+\s+)/i
    ) || [];
  const amount = Number(withdrawn?.replace(/,/g, ""));

  if (!amount) {
    return;
  }

  const ref = receipt.substring(0, 10);
  const date = new Date(
    receipt
      .match(
        /\b\d{4}-\d{2}-\d{2}(\s+|\n+|\s+\n+|\n+\s+)\d{2}:\d{2}:\d{2}\b/
      )?.[0]
      ?.replace(" ", "T") || ""
  ).toISOString();

  const details =
    receipt
      .match(
        /\b\d{4}-\d{2}-\d{2}(\s+|\n+|\s+\n+|\n+\s+)\d{2}:\d{2}:\d{2}\b([\s\S]*?)completed/i
      )?.[2]
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

  const isTransactionCost =
    /(\s+|\n+|\s+\n+|\n+\s+)charge(\s+|\n+|\s+\n+|\n+\s+)completed/i.test(
      receipt
    );

  if (record[ref]) {
    const expense = expenses[record[ref].index];

    if (record[ref].isTransactionCost) {
      expense.receipt = `${details}, transaction cost: ${currency} ${(
        expense.amount || 0
      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      expense.recipient = recipient;
    } else if (isTransactionCost) {
      expense.receipt += `, transaction cost: ${currency} ${amount.toLocaleString(
        undefined,
        { maximumFractionDigits: 2 }
      )}`;
    }
    expense.amount = (expense.amount || 0) + amount;
    record[ref].isTransactionCost = isTransactionCost;
  } else {
    record[ref] = { index: expenses.length, isTransactionCost };
    const expense: Partial<Expense> = {
      ref,
      date,
      amount,
      recipient,
      currency,
      receipt: details,
    };
    getImportInfo(expense, recipients);
    expenses.push(expense);
  }
};

export const parseExcelFile = async (b64: string, currency: string) => {
  let report: {
    complete: number;
    incomplete: number;
    excluded: number;
    currencyChange: Currency | null;
  } = { complete: 0, incomplete: 0, excluded: 0, currencyChange: null };
  let recipients: string[] = [];
  let expenses: Partial<Expense>[] = [];

  const wb = XLSX.read(b64, { type: "base64" });

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
      if (
        item.currency &&
        /(KSh|TSh|MT|FC|GH₵|LE|Br)/.test(String(item.currency))
      ) {
        if (item.currency !== currency) {
          report.currencyChange = item.currency as Currency;
        }
        expense.currency = item.currency;
      } else {
        expense.currency = currency;
      }

      if (Object.keys(expense).length) {
        getImportInfo(expense, recipients);
        expenses.push(expense);
      }
    }
  }
  if (expenses.length) {
    await handleExpensesImport(recipients, expenses, report);
  }
  return report;
};

export const importFromSMSListener = async (
  messages: string[],
  currency: Currency
) => {
  let report: {
    complete: number;
    incomplete: number;
    excluded: number;
    currencyChange: Currency | null;
  } = { complete: 0, incomplete: 0, excluded: 0, currencyChange: null };
  let recipients: string[] = [];
  let expenses: Partial<Expense>[] = [];

  for (let message of messages) {
    handleMessage(message, recipients, expenses, currency, report);
  }
  if (expenses.length) {
    await handleExpensesImport(recipients, expenses, report);
  }
  return report;
};

export const handleSmsEvent = async (
  message: { id: number; body: string },
  currency: Currency
) => {
  let report: {
    complete: number;
    incomplete: number;
    excluded: number;
    currencyChange: Currency | null;
  } = { complete: 0, incomplete: 0, excluded: 0, currencyChange: null };
  let recipients: string[] = [];
  let expenses: Partial<Expense>[] = [];
  handleMessage(message.body, recipients, expenses, currency, report);
  await handleExpensesImport(recipients, expenses, report);
  await deleteReceipt(message.id);
  return report;
};
