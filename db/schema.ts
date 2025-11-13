import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync("app.db");
export const DB_INTEGRITY = `d142b37bd786a9868e4c6eff5e173e3229d3b5591198ddb498345e59c2eb807d`;

const date = new Date();

export const schema = `
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      label TEXT,
      recipient TEXT,
      ref TEXT,
      collection TEXT,
      amount REAL,
      currency TEXT,
      date TEXT,
      receipt TEXT,
      image TEXT,
      modifiedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS collections (
      name TEXT PRIMARY KEY,
      count INTEGER NOT NULL
      );

      INSERT OR IGNORE INTO collections (name, count) VALUES ('expenses', 0);
      INSERT OR IGNORE INTO collections (name, count) VALUES ('failed', 0);
      INSERT OR IGNORE INTO collections (name, count) VALUES ('trash', 0);
      INSERT OR IGNORE INTO collections (name, count) VALUES ('keywords', 7);
      INSERT OR IGNORE INTO collections (name, count) VALUES ('recipients', 0);
      INSERT OR IGNORE INTO collections (name, count) VALUES ('my collection', 0);

      CREATE TABLE IF NOT EXISTS statistics (
        path TEXT PRIMARY KEY,
        value TEXT,
        total REAL NOT NULL
      );

      
      CREATE TABLE IF NOT EXISTS dictionary (
        id TEXT,
        type TEXT,
        match TEXT,
        label TEXT,
        modifiedAt TEXT,
        PRIMARY KEY (match, type)
      );
      INSERT OR IGNORE INTO dictionary (id, type, match, label, modifiedAt) VALUES ("1", "keyword", "naivas", "groceries", "${date.toISOString()}");
      INSERT OR IGNORE INTO dictionary (id, type, match, label, modifiedAt) VALUES ("2", "keyword", "mart", "groceries", "${date.toISOString()}");
      INSERT OR IGNORE INTO dictionary (id, type, match, label, modifiedAt) VALUES ("3", "keyword", "carrefour", "groceries", "${date.toISOString()}");
      INSERT OR IGNORE INTO dictionary (id, type, match, label, modifiedAt) VALUES ("4", "keyword", "shell", "fuel", "${date.toISOString()}");
      INSERT OR IGNORE INTO dictionary (id, type, match, label, modifiedAt) VALUES ("5", "keyword", "totalenergies", "fuel", "${date.toISOString()}");
      INSERT OR IGNORE INTO dictionary (id, type, match, label, modifiedAt) VALUES ("6", "keyword", "supermetro", "transport,public", "${date.toISOString()}");
      INSERT OR IGNORE INTO dictionary (id, type, match, label, modifiedAt) VALUES ("7", "keyword", "metrotrans", "transport,public", "${date.toISOString()}");

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        label TEXT,
        title TEXT,
        total REAL,
        current REAL ,
        start TEXT,
        end TEXT,
        duration TEXT,
        repeat INTEGER
      );

      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT,
      path TEXT,
      title TEXT,
      message TEXT,
      date TEXT,
      unread INTEGER
      );

      INSERT OR IGNORE INTO notifications (id, type, path, title, message, date, unread) VALUES ("1", "info", "/dictionary/main", "Automatically label expenses", "View your dictionary and assign labels to expenses.", "${date.toISOString()}", 1);
      INSERT OR IGNORE INTO notifications (id, type, path, title, message, date, unread) VALUES ("2", "info", "/profile", "Secure your expenses", "Setup a pin to restrict access to your expenses.", "${date.toISOString()}", 1);
      INSERT OR IGNORE INTO notifications (id, type, path, title, message, date, unread) VALUES ("3", "info", "/expenses/collections", "Editing expenses", "You can edit multiple expenses in one go by long pressing then selecting as many expenses as you need and press edit at the top. Only the values entered will be changed.", "${date.toISOString()}", 1);
      `;

export const initDB = async () => {
  await db.execAsync(schema);
};

export default db;
