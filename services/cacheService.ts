import * as SQLite from 'expo-sqlite';

const DB_NAME = 'weather_cache.db';
const WEATHER_TABLE = 'weather_cache';
const IMAGE_TABLE = 'image_cache';
const ONE_HOUR = 60 * 60 * 1000;

let db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${WEATHER_TABLE} (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${IMAGE_TABLE} (
        query TEXT PRIMARY KEY,
        url TEXT NOT NULL
      );
    `);
  }
  return db;
}

export async function getCachedWeatherData(key: string): Promise<any | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string; timestamp: number }>(
    `SELECT data, timestamp FROM ${WEATHER_TABLE} WHERE key = ?`,
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
    `INSERT OR REPLACE INTO ${WEATHER_TABLE} (key, data, timestamp) VALUES (?, ?, ?)`,
    key,
    JSON.stringify(data),
    Date.now()
  );
}

export async function clearExpiredWeatherCache(): Promise<void> {
  const db = await getDb();
  const expirationTimestamp = Date.now() - ONE_HOUR;
  await db.runAsync(
    `DELETE FROM ${WEATHER_TABLE} WHERE timestamp < ?`,
    expirationTimestamp
  );
}

export async function getCachedImageUrl(query: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ url: string }>(
    `SELECT url FROM ${IMAGE_TABLE} WHERE query = ?`,
    [query]
  );
  return row ? row.url : null;
}

export async function cacheImageUrl(query: string, url: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ${IMAGE_TABLE} (query, url) VALUES (?, ?)`,
    query,
    url
  );
}


// Helper function to check all cached images in the database
export async function logAllImageCache(): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ query: string; url: string }>(
    `SELECT query, url FROM ${IMAGE_TABLE}`
  );
  console.log('All image cache rows:', rows);
} 