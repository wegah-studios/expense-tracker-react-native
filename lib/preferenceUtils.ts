import db from "@/db/schema";

export const getPreferences = async (...preferences: string[]) => {
  const results: { key: string; value: string }[] = await db.getAllAsync(
    `SELECT * FROM preferences ${
      preferences.length
        ? `WHERE key IN (?${", ?".repeat(preferences.length - 1)})`
        : ""
    }`,
    preferences
  );

  let record = results.reduce((obj, result) => {
    obj[result.key] = result.value;
    return obj;
  }, {} as Record<string, string>);
  return record;
};

export const setPreferences = async (preferences: Record<string, string>) => {
  const keys = Object.keys(preferences);
  let query = "";
  let params: string[] = [];
  for (let key of keys) {
    query += `
      INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?);`;
    params.push(key, preferences[key]);
  }
  await db.runAsync(query, params);
};
