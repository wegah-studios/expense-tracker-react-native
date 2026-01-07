import db, { enqueueDB } from "@/db/db";
import { Budget } from "@/types/common";
import { nanoid } from "nanoid/non-secure";
import { updateBudgetQuery } from "./queries";

export const getBudgets = async ({
  search,
  sort,
  page,
  limit,
  filterExpired,
}: {
  search?: string;
  sort?: { direction: "ASC" | "DESC"; property: string };
  page?: number;
  limit?: number;
  filterExpired?: boolean;
}) => {
  let query: string = `SELECT * FROM budgets`;
  let params: (string | number)[] = [];

  if (search) {
    search = `%${search}%`;
    query += ` WHERE title LIKE ? OR end LIKE ? OR start LIKE ? OR label LIKE ? OR total LIKE ? OR current LIKE ? `;
    params.push(search, search, search, search, search, search);
  }

  if (filterExpired) {
    query += `${search ? " AND" : " WHERE"} end >= ?`;
    params.push(new Date().toISOString());
  }

  limit = limit || 5;
  const offset = ((page || 1) - 1) * limit;
  query += ` ORDER BY ${sort?.property || "current"} ${
    sort?.direction || "DESC"
  } LIMIT ${limit} OFFSET ${offset}`;

  const results: Budget[] = await db.getAllAsync(query, params);
  return results;
};

export const getHomeBudget = async (
  scope: number,
  record: Map<number, Budget | null>
) => {
  for (let currentScope = scope; scope < 4; currentScope++) {
    if (currentScope >= 2 && record.has(3)) {
      record.set(currentScope, record.get(3) || null);
      break;
    } else {
      let query = "SELECT * FROM budgets ";
      let params: (string | number)[] = [];

      if (currentScope === 0) {
        query += `WHERE duration = ? `;
        params.push("week");
      } else if (currentScope === 1) {
        query += `WHERE duration = ? `;
        params.push("month");
      } else if (currentScope >= 2) {
        query += `WHERE duration = ? `;
        params.push("year");
      }

      query += `AND end >= ? `;
      params.push(new Date().toISOString());

      query += `ORDER BY current DESC LIMIT 1 OFFSET 0`;

      let data: Budget | null = await enqueueDB(() =>
        db.getFirstAsync(query, params)
      );
      if (data) {
        if (currentScope > 0) {
          for (let i = currentScope - 1; i >= 0; i--) {
            if (record.get(i)) {
              break;
            }
            record.set(i, data);
          }
        }
        record.set(currentScope, data);
        break;
      } else {
        const prev = record.get(currentScope - 1);
        if (prev) {
          record.set(currentScope, prev);
          break;
        } else if (currentScope >= 2) {
          //check for custom budgets
          let customData: Budget | null = await enqueueDB(() =>
            db.getFirstAsync(
              `SELECT * FROM budgets WHERE duration = ? AND end >= ? ORDER BY current DESC LIMIT 1 OFFSET 0 `,
              ["custom", new Date().toISOString()]
            )
          );

          for (let i = currentScope - 1; i >= 0; i--) {
            if (record.get(i)) {
              break;
            }
            record.set(i, customData);
          }
          record.set(currentScope, customData);
          break;
        } else {
          record.set(currentScope, data);
        }
      }
    }
  }
  record = new Map(record);
  let budget: Budget | null = record.get(scope) || null;
  return { budget, record };
};

export const updateExpiredBudgets = async () => {
  const date = new Date();

  const expiredBudgets: Budget[] = await db.getAllAsync(
    `SELECT * FROM budgets WHERE end < ? AND repeat = 1`,
    date.toISOString()
  );

  for (let budget of expiredBudgets) {
    switch (budget.duration) {
      case "year":
        budget.start = new Date(
          Date.UTC(date.getFullYear(), 0, 1)
        ).toISOString();
        budget.end = new Date(
          Date.UTC(date.getFullYear(), 11, 32)
        ).toISOString();
        break;
      case "month":
        budget.start = new Date(
          Date.UTC(date.getFullYear(), date.getMonth(), 1)
        ).toISOString();
        budget.end = new Date(
          Date.UTC(date.getFullYear(), date.getMonth() + 1, 0)
        ).toISOString();
        break;
      case "week":
        let weekStart = date.getDate() - date.getDay();
        let weekEnd = weekStart + 6;
        budget.start = new Date(
          Date.UTC(date.getFullYear(), date.getMonth(), weekStart)
        ).toISOString();
        budget.end = new Date(
          Date.UTC(date.getFullYear(), date.getMonth(), weekEnd)
        ).toISOString();
        break;
      case "custom":
        const customStart = new Date(budget.start);
        const customEnd = new Date(budget.end);
        const yearDiff = customEnd.getFullYear() - customStart.getFullYear();
        let startyear = date.getFullYear() + 1;
        const monthDiff = customStart.getMonth() - date.getMonth();
        const dateDiff = customStart.getDate() - date.getDate();

        if ((monthDiff === 0 && dateDiff > 0) || monthDiff > 0) {
          startyear -= 1;
        }

        budget.start = new Date(
          Date.UTC(startyear, customStart.getMonth(), customStart.getDate())
        ).toISOString();
        budget.end = new Date(
          Date.UTC(
            startyear + yearDiff,
            customEnd.getMonth(),
            customEnd.getDate()
          )
        ).toISOString();
        break;
    }
  }
  await updateBudgets(expiredBudgets, "update");
};

export const updateBudgets = async (
  budgets: Partial<Budget>[],
  mode: "add" | "update"
) => {
  await db.withExclusiveTransactionAsync(async (tx) => {
    let query = "";
    for (let budget of budgets) {
      budget.id = budget.id || nanoid();

      if (budget.start && budget.end) {
        let params: string[] = [budget.start, budget.end];
        if (budget.label) {
          params.push(`%${budget.label}%`);
        }
        const amounts: { amount: number }[] = await tx.getAllAsync(
          `SELECT amount FROM expenses WHERE date >= ? AND date <= ? ${
            budget.label ? ` AND label LIKE ?` : ""
          } `,
          params
        );

        let current = amounts.reduce(
          (total, item) => (total += item.amount),
          0
        );
        budget.current = current;
      }

      const keys = Object.keys(budget);
      query += updateBudgetQuery(keys, budget, mode);
    }
    await tx.execAsync(query);
  });
  return budgets;
};

export const deleteBudgets = async (selected: Set<string>) => {
  const ids = [...selected];
  await db.runAsync(
    `DELETE FROM budgets WHERE id IN (?${", ?".repeat(ids.length - 1)})`,
    ids
  );
};
