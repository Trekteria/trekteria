import * as SQLite from 'expo-sqlite';

const DB_NAME = 'weather_cache.db';
const TABLE_NAME = 'weather_cache';
const ONE_HOUR = 60 * 60 * 1000;

let db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);
  }
  return db;
}

export async function getCachedWeatherData(key: string): Promise<any | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string; timestamp: number }>(
    `SELECT data, timestamp FROM ${TABLE_NAME} WHERE key = ?`,
    [key]
  );
  if (row) {
    if (Date.now() - row.timestamp < ONE_HOUR) {
      try {
        return JSON.parse(row.data);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function cacheWeatherData(key: string, data: any): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TABLE_NAME} (key, data, timestamp) VALUES (?, ?, ?)`,
    key,
    JSON.stringify(data),
    Date.now()
  );
}

export async function clearExpiredWeatherCache(): Promise<void> {
  const db = await getDb();
  const expirationTimestamp = Date.now() - ONE_HOUR;
  await db.runAsync(
    `DELETE FROM ${TABLE_NAME} WHERE timestamp < ?`,
    expirationTimestamp
  );
} 