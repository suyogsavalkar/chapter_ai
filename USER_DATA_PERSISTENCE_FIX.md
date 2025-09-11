# User Data Persistence Fix

## Problem Description

Users were experiencing data loss (chat history and Composio app configurations) after logging out and back in with Google OAuth. This happened due to inconsistent user identity management across login sessions.

## Root Causes Identified

1. **Inconsistent User ID Management**: The `upsertGoogleUser` function wasn't handling all edge cases for existing users, potentially creating duplicate accounts or mismatched IDs.

2. **Local Storage Clearing**: Composio toolkit preferences stored in browser local storage were lost on logout.

3. **Missing Session Change Detection**: The app didn't properly detect when users logged out and back in, failing to reload their preferences.

## Solutions Implemented

### 1. Enhanced User Identity Management (`lib/db/queries.ts`)

- **Improved `upsertGoogleUser` function** to handle multiple lookup scenarios:
  - Find existing users by Google ID
  - Find existing users by email (for account linking)
  - Find existing users by primary ID (backward compatibility)
  - Prevent duplicate account creation

### 2. Better Session Management (`components/composiotoolbar.tsx`)

- **Added session change detection** to reload user preferences when users log in/out
- **Improved local storage handling** with server-side synchronization
- **Added user ID tracking** to detect session changes

### 3. User Experience Improvements

- **Added `UserDataStatus` component** to provide feedback about data persistence
- **Enhanced error handling** in apps dialog with session-aware refreshing
- **Added welcome back notifications** when users return

### 4. Database Repair Tools

- **`fix-google-user-ids.js`**: Fixes missing Google IDs for existing users
- **`repair-user-data.js`**: Analyzes and helps merge duplicate user accounts

## How to Apply the Fix

### For New Deployments

The fixes are automatically included in the updated code.

### For Existing Deployments

1. **Run the Google ID fix** (safe to run multiple times):

   ```bash
   node fix-google-user-ids.js
   ```

2. **Analyze for duplicate accounts** (read-only analysis):

   ```bash
   node repair-user-data.js
   ```

3. **If duplicates are found**, carefully review the output and consider merging accounts manually using SQL queries (backup first!).

### Example Manual Merge (if needed)

```sql
-- BACKUP YOUR DATABASE FIRST!

-- Example: Merge user data from duplicate to primary account
-- Replace 'duplicate_user_id' and 'primary_user_id' with actual IDs

-- Move chats
UPDATE "Chat" SET "userId" = 'primary_user_id' WHERE "userId" = 'duplicate_user_id';

-- Move or merge user toolkits (handle conflicts as needed)
UPDATE "UserToolkit" SET "userId" = 'primary_user_id'
WHERE "userId" = 'duplicate_user_id'
AND "slug" NOT IN (
  SELECT "slug" FROM "UserToolkit" WHERE "userId" = 'primary_user_id'
);

-- Delete duplicate user record
DELETE FROM "User" WHERE "id" = 'duplicate_user_id';
```

## Prevention Measures

1. **Consistent ID Usage**: Google's `profile.sub` is now consistently used as the primary user ID
2. **Account Linking**: Existing accounts are properly linked when users sign in with Google
3. **Session Monitoring**: The app now detects and handles user session changes
4. **Data Synchronization**: Local storage is kept in sync with server-side preferences

## Testing the Fix

1. **Login with Google** → Verify user gets consistent ID
2. **Create some chats and enable apps** → Verify data is saved
3. **Logout and login again** → Verify all data is restored
4. **Check browser console** → Should see "Welcome back!" notification

## Monitoring

- Check server logs for "Failed to upsert Google user" errors
- Monitor for duplicate user creation
- Watch for user complaints about data loss

## Files Modified

- `lib/db/queries.ts` - Enhanced user identity management
- `components/composiotoolbar.tsx` - Session change detection
- `components/apps-dialog.tsx` - Session-aware refreshing
- `components/user-data-status.tsx` - User feedback (new)
- `app/(chat)/layout.tsx` - Added user status component

## Files Added

- `fix-google-user-ids.js` - Database repair script
- `repair-user-data.js` - Duplicate account analysis
- `components/user-data-status.tsx` - User session feedback
- `USER_DATA_PERSISTENCE_FIX.md` - This documentation

The fix ensures that users maintain their chat history and app configurations across login sessions, providing a seamless experience.
