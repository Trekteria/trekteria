import * as SQLite from 'expo-sqlite';

const DB_NAME = 'weather_cache.db';
const WEATHER_TABLE = 'weather_cache';
const IMAGE_TABLE = 'image_cache';
const TRAIL_TABLE = 'trail_cache';
const CHAT_TABLE = 'chat_cache';
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
      CREATE TABLE IF NOT EXISTS ${TRAIL_TABLE} (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${CHAT_TABLE} (
        trip_id TEXT,
        message_id TEXT PRIMARY KEY,
        sender TEXT,
        text TEXT,
        timestamp INTEGER,
        pending INTEGER DEFAULT 0
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

export async function getCachedTrailData(trailId: string): Promise<any | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    `SELECT data FROM ${TRAIL_TABLE} WHERE id = ?`,
    [trailId]
  );
  if (row) {
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  }
  return null;
}

export async function cacheTrailData(trailId: string, data: any): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TRAIL_TABLE} (id, data) VALUES (?, ?)`,
    trailId,
    JSON.stringify(data)
  );
}

export async function getCachedChatMessages(tripId: string): Promise<any[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM ${CHAT_TABLE} WHERE trip_id = ? ORDER BY timestamp ASC`,
    [tripId]
  );
  return rows;
}

export async function cacheChatMessage(tripId: string, message: { message_id: string, sender: string, text: string, timestamp: number, pending?: boolean }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ${CHAT_TABLE} (trip_id, message_id, sender, text, timestamp, pending) VALUES (?, ?, ?, ?, ?, ?)`,
    tripId,
    message.message_id,
    message.sender,
    message.text,
    message.timestamp,
    message.pending ? 1 : 0
  );
}

export async function getPendingChatMessages(): Promise<any[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM ${CHAT_TABLE} WHERE pending = 1`
  );
  return rows;
}

export async function markChatMessageAsSynced(message_id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${CHAT_TABLE} SET pending = 0 WHERE message_id = ?`,
    message_id
  );
}

export async function deleteCachedTrailData(trailId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM ${TRAIL_TABLE} WHERE id = ?`,
    trailId
  );
  console.log('Deleted trail cache for trip:', trailId);
}

export async function deleteCachedChatMessages(tripId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM ${CHAT_TABLE} WHERE trip_id = ?`,
    tripId
  );
  console.log('Deleted chat cache for trip:', tripId);
} 