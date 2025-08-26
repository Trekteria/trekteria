# Timestamp-Based Syncing Implementation

## Overview

This document describes the implementation of a **last-to-win** conflict resolution strategy using `updatedAt` timestamps for syncing data between local SQLite and cloud Supabase databases.

## How It Works

### 1. **Timestamp Management**

- Every time data is saved locally, `updatedAt` is automatically set to the current timestamp
- This ensures local changes are always marked with the current time
- Timestamps are stored as ISO strings for consistent comparison

### 2. **Conflict Resolution Strategy**

- **Last-to-Win**: The most recently updated data (based on `updatedAt`) takes precedence
- **Local vs Cloud Comparison**: Before syncing, timestamps are compared to determine which data is newer
- **Automatic Resolution**: Conflicts are resolved automatically without user intervention

### 3. **Sync Operations**

#### **Pull Data (Cloud → Local)**

- Downloads data from Supabase to local SQLite
- **Before saving each item**: Compares `updatedAt` timestamps
- **Only updates local data** if cloud data is newer
- **Skips updates** if local data is newer or same age

#### **Sync All Data (Local → Cloud)**

- Uploads local data to Supabase
- **Before uploading each item**: Compares `updatedAt` timestamps
- **Only uploads** if local data is newer than cloud data
- **Skips upload** if cloud data is newer

## Implementation Details

### **SQLite Service Updates**

- All `save*` methods now automatically set `updatedAt` to current timestamp
- Added `shouldUpdate*` methods for timestamp comparison
- Database schema includes `updatedAt` column for all tables

### **Sync Service Updates**

- `pullData()` now uses timestamp comparison before saving locally
- `syncAllData()` now uses timestamp comparison before uploading to cloud
- `saveData()` uses timestamp comparison for real-time sync
- New `saveToSupabaseWithTimestampCheck()` method for conflict resolution

### **Data Flow**

```
Local Save → updatedAt = now() → Check Cloud Timestamp → Upload if newer
Cloud Pull → Check Local Timestamp → Download if newer → Update local
```

## Usage Examples

### **Basic Sync Operations**

```typescript
const { pullData, syncAllData } = useOfflineData();

// Download latest data from cloud (with conflict resolution)
await pullData(userId);

// Upload local changes to cloud (with conflict resolution)
await syncAllData(userId);
```

### **Automatic Conflict Resolution**

```typescript
// When saving data locally
await saveTrip(trip); // automatically sets updatedAt = now()

// When syncing to cloud
// - If local updatedAt > cloud updatedAt → Upload
// - If cloud updatedAt > local updatedAt → Skip (cloud wins)
// - If timestamps equal → Skip (no conflict)
```

## Benefits

1. **Automatic Conflict Resolution**: No manual intervention needed
2. **Data Integrity**: Prevents data loss from overwriting newer changes
3. **Efficient Syncing**: Only syncs data that actually needs updating
4. **Offline-First**: Local changes are always preserved and synced when online
5. **Real-Time Updates**: Immediate sync when online with conflict resolution

## Edge Cases Handled

1. **Missing Timestamps**: If data has no timestamp, it's treated as "old" and will be updated
2. **Network Failures**: Failed syncs are queued and retried when connection is restored
3. **Partial Updates**: Individual items can be updated without affecting others
4. **Timestamp Precision**: Uses ISO strings for consistent timezone handling

## Database Schema

All tables now include the `updatedAt` column:

```sql
-- Users table
"updatedAt" TEXT

-- Plans table
"updatedAt" TEXT

-- Trips table
"updatedAt" TEXT

-- Feedback table
"updatedAt" TEXT
```

## Performance Considerations

- **Minimal Overhead**: Timestamp comparison is fast (string comparison)
- **Selective Updates**: Only necessary data is transferred
- **Batch Operations**: Multiple items can be synced efficiently
- **Caching**: Local timestamps are cached for quick comparison

## Testing Recommendations

1. **Test Conflict Scenarios**: Create conflicts by modifying same data on different devices
2. **Verify Timestamp Updates**: Ensure `updatedAt` is always updated on local saves
3. **Test Offline/Online Transitions**: Verify sync behavior when network status changes
4. **Performance Testing**: Measure sync performance with large datasets
5. **Edge Case Testing**: Test with missing timestamps and malformed data

## Future Enhancements

1. **Conflict Logging**: Track and log all conflict resolutions
2. **User Notifications**: Alert users when conflicts are automatically resolved
3. **Manual Conflict Resolution**: Allow users to choose which version to keep
4. **Sync History**: Maintain a log of all sync operations and conflicts
5. **Batch Conflict Resolution**: Handle multiple conflicts in a single operation
