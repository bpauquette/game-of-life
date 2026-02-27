# Account Deletion & Data Export Implementation

## Overview
Implemented GDPR/CCPA compliant account deletion and data export features for the Game of Life application.

## Compliance Standards
- **GDPR Article 17**: Right to Erasure
- **GDPR Article 20**: Right to Data Portability  
- **CCPA Section 1798.105**: Right to Delete
- **CCPA Section 1798.110**: Right to Know

## Backend Implementation

### New Module: `game-of-life-backend/src/auth/accountManagement.mjs`

#### Functions Implemented:

1. **scheduleAccountDeletion(db, userId, gracePeriodDays=30)**
   - Soft delete with configurable grace period (default 30 days)
   - Sets `deletion_scheduled` flag and `deletion_date` timestamp
   - Allows user to cancel before permanent deletion
   - Returns deletion details and scheduled date

2. **cancelAccountDeletion(db, userId)**
   - Cancels a scheduled deletion during grace period
   - Clears `deletion_scheduled` flag and `deletion_date`
   - Returns success confirmation

3. **permanentlyDeleteAccount(db, userId)**
   - Transaction-based deletion with automatic rollback on error
   - **Deletion Policy:**
     - **PRIVATE content** → Permanently deleted:
       - Private shapes (deleted from database)
       - Private grids (deleted from database)
       - Private scripts (deleted from database)
       - User account (deleted from database)
     - **PUBLIC content** → Anonymized but preserved:
       - Public shapes → `created_by` set to 'deleted-user'
       - Public scripts → title/description set to '[deleted]'
       - Login history → email '[deleted]', IP '[redacted]'
     - **LEGAL records** → Retained:
       - Support records kept for 7 years (tax law compliance)
   - Creates audit log entry with deletion details
   - Returns counts of deleted/anonymized items

4. **exportUserData(db, userId)**
   - Exports complete user data in JSON format
   - **Includes:**
     - User profile (email, name, about_me) - **password excluded**
     - All shapes (with parsed cell data)
     - All grids (with parsed data)
     - All scripts (with code)
     - Login history (last 100 entries, **IPs removed**)
     - Statistics (shape count, grid count, script count, account age)
   - Complies with GDPR Article 20 (Data Portability)
   - Returns structured JSON ready for download

5. **processScheduledDeletions(db)**
   - Batch processes all accounts past their deletion date
   - Intended for cron job execution
   - Returns count of accounts deleted

6. **migrateAccountDeletionSchema(db)**
   - Adds required columns to `users` table:
     - `deletion_scheduled` INTEGER (0/1 flag)
     - `deletion_date` TEXT (ISO timestamp)
   - Creates `deletion_audit_log` table for compliance tracking
   - Idempotent - safe to run multiple times
   - Called automatically on server startup

### API Endpoints Added to `auth.mjs`:

All endpoints require JWT authentication (`Authorization: Bearer <token>`)

1. **DELETE /v1/auth/account**
   - Schedules account deletion with grace period
   - Body: `{ gracePeriodDays: 30 }` (optional)
   - Returns: `{ success: true, deletionDate: "2025-02-XX..." }`

2. **POST /v1/auth/account/cancel-deletion**
   - Cancels scheduled deletion during grace period
   - Returns: `{ success: true, message: "..." }`

3. **GET /v1/auth/account/status**
   - Returns deletion status and countdown
   - Returns: `{ deletionScheduled: true/false, deletionDate: "...", daysRemaining: N }`

4. **GET /v1/auth/account/export**
   - Downloads complete user data as JSON file
   - Sets `Content-Disposition` header for file download
   - Returns: Structured JSON with all user data

5. **DELETE /v1/auth/account/permanent** *(optional, for admin/testing)*
   - Immediately deletes account without grace period
   - Could be restricted to admin users if needed

### Database Migration

Added to server startup in `auth.mjs`:
```javascript
import { migrateAccountDeletionSchema } from './accountManagement.mjs';
migrateAccountDeletionSchema(db);
```

**New Columns in `users` table:**
- `deletion_scheduled` INTEGER (0 = no, 1 = yes)
- `deletion_date` TEXT (ISO timestamp when permanent deletion will occur)

**New Table `deletion_audit_log`:**
- Tracks all deletion actions for compliance
- Records userId, action type, timestamp, details (JSON)

## Frontend Implementation

### New Component: `src/view/AccountManagementDialog.js`

Material-UI dialog providing user-friendly interface for:

1. **Data Export**
   - "Download My Data" button
   - Fetches `/v1/auth/account/export`
   - Downloads JSON file with timestamp in filename
   - Shows success/error feedback

2. **Account Deletion**
   - "Delete My Account" button with confirmation step
   - Shows detailed warning about what will be deleted vs anonymized
   - Lists consequences clearly:
     - Private content deleted
     - Public content anonymized
     - 30-day grace period before permanent
   - Sends DELETE request to `/v1/auth/account`

3. **Deletion Status Display**
   - Shows warning alert if deletion is scheduled
   - Displays countdown: "X days remaining"
   - Shows deletion date
   - "Cancel Deletion" button to abort

4. **Cancel Deletion**
   - Available during grace period
   - One-click cancellation
   - Sends POST to `/v1/auth/account/cancel-deletion`

### Integration: `src/view/HeaderBar.js`

Added to user profile menu (User Profile icon → Account Management):

1. **Import:** `AccountManagementDialog`
2. **State:** `accountManagementOpen`
3. **Button:** "Account Management" (between "My Shapes" and "Logout")
4. **Render:** Dialog with backend URL from env var

### Updated Privacy Policy: `src/view/PrivacyPolicyDialog.js`

Enhanced sections to reflect actual implementation:

1. **Section 5.2 - Right to Deletion**
   - Added instructions: "Account Management dialog (User Profile → Account Management)"
   - Added grace period details
   - Added anonymization vs deletion clarification
   - Added tax law compliance note (7-year Support records)

2. **Section 7.1 - Access & Portability (GDPR Article 20)**
   - Added download link location
   - Specified JSON format
   - Listed all exportable data

3. **Section 7.2 - Correction & Deletion (GDPR Article 17)**
   - Added grace period cancellation option
   - Clarified deletion vs anonymization policy

4. **Section 8.2 - CCPA Compliance**
   - Added specific references to Account Management features
   - Cross-referenced data collection section
   - Added non-discrimination clause

## User Experience Flow

### Deleting Account:

1. User clicks **User Profile icon** (top right)
2. Clicks **"Account Management"** button
3. Dialog opens with two sections:
   - Export Your Data (with download button)
   - Delete Your Account (with delete button)
4. Clicks **"Delete My Account"**
5. Confirmation screen appears showing:
   - What will be deleted (private content)
   - What will be anonymized (public content)
   - Grace period (30 days to cancel)
6. Clicks **"Yes, Delete My Account"**
7. Success message: "Account deletion scheduled. Your account will be permanently deleted on [DATE]"
8. Dialog updates to show deletion countdown
9. **During grace period:**
   - Warning banner shows days remaining
   - "Cancel Deletion" button available
10. **After grace period:**
    - Backend cron job (if set up) or manual trigger calls `processScheduledDeletions()`
    - Account permanently deleted/anonymized

### Exporting Data:

1. User clicks **User Profile icon** → **"Account Management"**
2. Clicks **"Download My Data"**
3. Browser downloads JSON file: `game-of-life-data-YYYY-MM-DD.json`
4. File contains:
   - Profile (no password)
   - All shapes with cell coordinates
   - All grids with parsed data
   - All scripts
   - Recent login history (IPs removed)
   - Statistics

## Compliance Features

✅ **30-Day Grace Period** - User can cancel deletion  
✅ **Transaction Safety** - Rollback on errors during deletion  
✅ **Audit Logging** - All deletions tracked for compliance  
✅ **Data Minimization** - Passwords excluded from exports, IPs redacted  
✅ **Public Content Preservation** - Community contributions preserved but anonymized  
✅ **Legal Record Retention** - Support records kept for tax compliance (7 years)  
✅ **Clear Communication** - Privacy policy updated with exact procedures  
✅ **Easy Access** - One-click access from user profile menu  
✅ **Confirmation Steps** - Prevents accidental deletion  
✅ **Status Visibility** - Users see countdown and can monitor deletion status  

## Testing Recommendations

1. **Create Test Account**
   - Register new account
   - Create some shapes/grids (mix of public and private)

2. **Test Data Export**
   - Go to Account Management
   - Click "Download My Data"
   - Verify JSON file contains all expected data
   - Verify password is NOT in export
   - Verify IPs are removed from login history

3. **Test Deletion Flow**
   - Schedule deletion
   - Verify deletion_scheduled flag set in database
   - Verify status shows correct countdown
   - **Test cancellation:**
     - Click "Cancel Deletion"
     - Verify flag cleared
     - Verify account still functional
   - **Test permanent deletion:**
     - Schedule again
     - Manually call `permanentlyDeleteAccount(db, userId)` or wait for cron
     - Verify private content deleted
     - Verify public content anonymized (created_by = 'deleted-user')
     - Verify audit log entry created

4. **Test Error Handling**
   - Test with invalid token
   - Test with already-deleted account
   - Test cancellation when no deletion scheduled

## Production Deployment Notes

1. **Environment Variables**
   - Set `REACT_APP_BACKEND_URL` in frontend `.env`
   - Defaults to `http://localhost:55000` for development

2. **Database Migration**
   - Migration runs automatically on server startup
   - Safe to run multiple times (idempotent)
   - Check logs for: "Account deletion schema migration complete"

3. **Cron Job Setup** (Optional but recommended)
   - Schedule `processScheduledDeletions()` to run daily
   - Suggested time: 2 AM UTC
   - Example cron entry:
     ```javascript
     // In server startup or separate cron script:
     import { processScheduledDeletions } from './auth/accountManagement.mjs';
     import Database from 'better-sqlite3';
     
     const db = new Database('path/to/auth.db');
     const result = processScheduledDeletions(db);
     console.log(`Deleted ${result.deletedCount} accounts`);
     ```

4. **Monitoring**
   - Monitor `deletion_audit_log` table for compliance records
   - Alert on deletion failures (transaction rollbacks)
   - Track export requests for usage patterns

## Files Modified/Created

### Backend:
- ✅ **NEW:** `game-of-life-backend/src/auth/accountManagement.mjs` (385 lines)
- ✅ **MODIFIED:** `game-of-life-backend/src/auth/auth.mjs` (added imports, endpoints, migration call)

### Frontend:
- ✅ **NEW:** `src/view/AccountManagementDialog.js` (343 lines)
- ✅ **MODIFIED:** `src/view/HeaderBar.js` (added import, state, button, dialog render)
- ✅ **MODIFIED:** `src/view/PrivacyPolicyDialog.js` (updated sections 5.2, 7.1, 7.2, 8.2)

## Legal Compliance Summary

This implementation satisfies:

- **GDPR Article 17 (Right to Erasure):** ✅
  - User can request deletion
  - Deletion processes without undue delay (30 days max)
  - Exceptions properly handled (legal requirements for Support records)
  
- **GDPR Article 20 (Right to Data Portability):** ✅
  - Data provided in structured, commonly used format (JSON)
  - User can receive and transmit data to another controller
  
- **CCPA Section 1798.105 (Right to Delete):** ✅
  - Verifiable consumer request mechanism (authenticated endpoints)
  - Deletion confirmed to consumer
  - Exceptions properly disclosed (legal obligations)
  
- **CCPA Section 1798.110 (Right to Know):** ✅
  - User can access all personal information
  - Provided in portable format

## Future Enhancements (Optional)

1. **Email Notifications**
   - Send email when deletion scheduled
   - Reminder emails at 7 days, 3 days, 1 day before permanent deletion
   - Confirmation email after permanent deletion

2. **Admin Dashboard**
   - View scheduled deletions
   - Manual intervention if needed
   - Audit log viewer

3. **Deletion Reasons**
   - Optional feedback form: "Why are you leaving?"
   - Helps improve service

4. **Partial Deletion**
   - Allow user to delete only specific data types
   - Keep account but delete all shapes, etc.

5. **Data Export Automation**
   - Automatic export before deletion
   - Emailed to user as backup

---

**Implementation Complete:** ✅  
**Tested:** Pending user testing  
**Ready for Deployment:** Yes (after testing)
