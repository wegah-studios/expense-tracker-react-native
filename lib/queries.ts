import {
  Budget,
  DictionaryItem,
  DictionaryItemType,
  Expense,
} from "@/types/common";
import { formatQueryValue } from "./appUtils";

export const deleteExpenseQuery = (
  { id, modifiedAt }: { id: string; modifiedAt?: string },
  moveToTrash?: boolean
) =>
  moveToTrash
    ? `\nUPDATE expenses SET collection = "trash", modifiedAt = ${formatQueryValue(
        modifiedAt
      )} WHERE id = ${formatQueryValue(id)};`
    : `\nDELETE FROM expenses WHERE id = ${formatQueryValue(id)};`;

export const addToCollectionQuery = (
  collection: string
) => `\nINSERT INTO collections (name, count)
      VALUES (${formatQueryValue(collection)}, 1)
      ON CONFLICT(name)
      DO UPDATE SET count = count + 1;
      `;

export const removeFromCollectionQuery = (collection: string) =>
  `\nUPDATE collections SET count = count - 1 WHERE name = ${formatQueryValue(
    collection
  )};`;

export const updateDictionaryFromExpenseQuery = ({
  label,
  modifiedAt,
  id,
}: {
  label: string;
  modifiedAt: string;
  id: string;
}) =>
  `\nUPDATE dictionary SET label = ${formatQueryValue(
    label
  )}, modifiedAt = ${formatQueryValue(
    modifiedAt
  )} WHERE id = ${formatQueryValue(id)} ;`;

export const insertIntoDictionaryFromExpenseQuery = ({
  id,
  label,
  match,
  modifiedAt,
}: {
  id: string;
  label: string;
  match: string;
  modifiedAt: string;
}) =>
  `\nINSERT INTO dictionary ( id, type, label, match, modifiedAt) VALUES (${formatQueryValue(
    id
  )}, "recipient", ${formatQueryValue(label)}, ${formatQueryValue(
    match
  )}, ${formatQueryValue(modifiedAt)});` +
  `\nUPDATE collections SET count = count + 1 WHERE name = "recipients";`;

export const handleExpenseQuery = (
  keys: string[],
  expense: Partial<Expense>,
  mode: "add" | "update" | "restore"
) => {
  return mode === "add"
    ? `\nINSERT INTO expenses (${keys.join(", ")}) VALUES (${keys
        .map((key) => formatQueryValue(expense[key as keyof typeof expense]))
        .join(", ")});`
    : mode === "restore"
    ? `\nUPDATE expenses SET collection = ${formatQueryValue(
        expense.collection
      )} WHERE id = ${formatQueryValue(expense.id)};`
    : `\nUPDATE expenses SET ${keys
        .map(
          (key) =>
            ` ${key} = ${formatQueryValue(
              expense[key as keyof typeof expense]
            )}`
        )
        .join(", ")} WHERE id = ${formatQueryValue(expense.id)};`;
};

export const updateStatisticsQuery = (
  {
    path,
    value,
    total,
  }: {
    path: string;
    value: string;
    total: number;
  },
  mode: "add" | "delete"
) => `\nINSERT INTO statistics (path, value, total) VALUES (${formatQueryValue(
    path
  )}, ${formatQueryValue(value)}, ${formatQueryValue(total)})
          ON CONFLICT(path)
          DO UPDATE SET total = total ${
            mode === "add" ? "+" : "-"
          } ${formatQueryValue(total)};`

export const updateBudgetsQuery = (
  { amount, date, label }: Partial<Expense>,
  action: "add" | "delete"
) =>
  `\nUPDATE budgets SET current = current ${
    action === "add" ? "+" : "-"
  } ${formatQueryValue(amount)} WHERE start <= ${formatQueryValue(
    date
  )} AND end >= ${formatQueryValue(date)} AND (${formatQueryValue(
    label
  )} LIKE '%' || label || '%' OR label IS NULL OR label = "") AND end >= ${formatQueryValue(
    new Date()
  )} ;`;

export const addExpensesToExclusionsQuery = (ids: string[]) =>
  `\nUPDATE expenses SET collection = "exclusions" WHERE id IN (${ids
    .map((id) => formatQueryValue(id))
    .join(", ")});`;

export const incrementCollectionQuery = (
  increment: number,
  collection: string
) =>
  `\nUPDATE collections SET count = count + ${formatQueryValue(
    increment
  )} WHERE name = ${formatQueryValue(collection)} ;`;

export const deleteExclusionsQuery = (
  recipients: string[],
  names: string[],
  count: number
) =>
  `\nDELETE FROM expenses WHERE collection = "exclusions" AND recipient IN (${recipients
    .map((recipient) => formatQueryValue(recipient))
    .join(", ")}});` +
  `\nDELETE FROM collections WHERE name IN (${names
    .map((name) => formatQueryValue(name))
    .join(", ")}});` +
  `\nUPDATE collections SET count = count - ${formatQueryValue(
    count
  )} WHERE name = "exclusions" ;`;

export const addDictionaryItemQuery = (
  keys: string[],
  item: Partial<DictionaryItem>,
  exists?: string
) =>
  exists
    ? `\nUPDATE dictionary SET modifiedAt = ${formatQueryValue(
        item.modifiedAt
      )}, label = ${formatQueryValue(item.label)} WHERE id = ${formatQueryValue(
        exists
      )};`
    : `\nINSERT INTO dictionary (${keys.join(", ")}) VALUES (${keys
        .map((key) => formatQueryValue(item[key as keyof typeof item]))
        .join(", ")});` +
      `\nUPDATE collections SET count = count + 1 WHERE name = ${formatQueryValue(
        item.type + "s"
      )} ;`;

export const updateDictionaryItemQuery = (
  keys: string[],
  item: Partial<DictionaryItem>
) =>
  `\nUPDATE dictionary SET ${keys.map(
    (key) => `${key} = ${formatQueryValue(item[key as keyof typeof item])}`
  )} WHERE id = ${formatQueryValue(item.id)};`;

export const deleteDictionaryItemsQuery = (
  ids: string[],
  type: DictionaryItemType
) =>
  `\nDELETE FROM dictionary WHERE id IN (${ids
    .map((id) => formatQueryValue(id))
    .join(", ")});` +
  `\nUPDATE collections SET count = count - ${formatQueryValue(
    ids.length
  )} WHERE name = ${formatQueryValue(type + "s")};`;

export const deleteCollectionsQuery = (collections: string[]) =>
  `\nUPDATE expenses SET collection = "expenses" WHERE collection IN (${collections
    .map((collection) => formatQueryValue(collection))
    .join(", ")});` +
  `\nDELETE FROM collections WHERE name IN (${collections
    .map((collection) => formatQueryValue(collection))
    .join(", ")});`;

export const setCollectionCountQuery = (collection: string, count: number) =>
  `\nUPDATE collections SET count = ${formatQueryValue(
    count
  )} WHERE name = ${formatQueryValue(collection)};`;

export const updateCollectionsQuery = (ids: string[], collection: string) =>
  `\nUPDATE expenses SET collection = ${formatQueryValue(
    collection
  )} WHERE id IN (${ids.map((id) => formatQueryValue(id)).join(", ")});` +
  `\nUPDATE collections SET count = count + ${formatQueryValue(
    ids.length
  )} WHERE name = ${formatQueryValue(collection)}`;

export const updateBudgetQuery = (
  keys: string[],
  budget: Partial<Budget>,
  mode: "add" | "update"
) =>
  mode === "add"
    ? `\nINSERT INTO budgets (${keys.join(", ")}) VALUES (${keys
        .map((key) => formatQueryValue(budget[key as keyof typeof budget]))
        .join(", ")});`
    : `\nUPDATE budgets SET ${keys
        .map(
          (key) =>
            `${key} = ${formatQueryValue(budget[key as keyof typeof budget])}`
        )
        .join(", ")} WHERE id = ${formatQueryValue(budget.id)};`;
