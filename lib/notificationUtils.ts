import db from "@/db/db";
import { Notification } from "@/types/common";
import { nanoid } from "nanoid/non-secure";

export const checkForUnread = async () => {
  let result: { unread: 1 | 0 } | null = await db.getFirstAsync(
    `SELECT unread FROM notifications ORDER BY date DESC LIMIT 1 `
  );
  return !!result?.unread;
};

export const getNotifications = async (page: number = 1) => {
  let limit = 10;
  let offset = (page - 1) * limit;
  let results: Notification[] = await db.getAllAsync(
    `SELECT * FROM notifications ORDER BY date DESC LIMIT ${limit} OFFSET ${offset} `
  );
  return results;
};

export const addNotification = async (notification: Partial<Notification>) => {
  const keys = Object.keys(notification);
  const values = Object.values(notification);

  notification.id = nanoid();
  notification.unread = 1;
  await db.runAsync(
    `INSERT INTO notifications (${keys.join(", ")}) VALUES (?${`, ?`.repeat(
      keys.length - 1
    )}) `,
    values
  );
};

export const deleteNofications = async (selected: Set<string>) => {
  const ids = [...selected];
  await db.runAsync(
    `DELETE FROM notifications WHERE id IN (?${`, ?`.repeat(ids.length - 1)})`,
    ids
  );
};

export const clearUnread = async (ids: string[]) => {
  await db.runAsync(
    `UPDATE notifications SET unread = 0 WHERE id IN (?${`, ?`.repeat(
      ids.length - 1
    )})`,
    ids
  );
};
