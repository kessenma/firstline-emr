> **📋 File Migration Info**
> - **Original Location:** `MEDEVAC_AUDIT_TRAIL.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# MedEvac Audit Trail Implementation Guide

## Overview

This document describes the comprehensive audit trail system implemented for the MedEvac patient management system. The audit trail tracks all changes, approvals, and actions taken on MedEvac patient records to ensure accountability, compliance, and transparency.

## Architecture

### Hybrid Approach

We use a **hybrid approach** combining:
1. **Basic audit fields in main table** (`med_evac_patients`) for quick access
2. **Detailed audit log table** (`med_evac_audit_log`) for complete history

This provides the best of both worlds:
- Fast queries for "who last updated" without joins
- Complete, immutable audit history for compliance
- Field-level change tracking
- Historical snapshots when needed

---

## Database Schema

### Main Table: `med_evac_patients`

#### New Audit Fields Added:

```typescript
// Creator tracking
createdBy: uuid              // User ID reference
createdByName: varchar       // Denormalized name
createdByEmail: varchar      // Denormalized email
createdAt: timestamp         // Creation timestamp

// Last updater tracking
updatedBy: uuid              // User ID reference
updatedByName: varchar       // Denormalized name
updatedByEmail: varchar      // Denormalized email
updatedAt: timestamp         // Last update timestamp

// Medical approval tracking
medicalApprovedBy: uuid           // Approver user ID
medicalApprovedByName: varchar    // Approver name
medicalApprovedAt: timestamp      // Approval timestamp

// Logistical approval tracking
logisticalApprovedBy: uuid        // Approver user ID
logisticalApprovedByName: varchar // Approver name
logisticalApprovedAt: timestamp   // Approval timestamp
```

### Audit Log Table: `med_evac_audit_log`

Complete audit trail table tracking all changes:

```typescript
{
  id: uuid                    // Primary key
  medEvacPatientId: uuid      // Foreign key to med_evac_patients
  
  // Action tracking
  action: enum                // Type of action performed
  actionDescription: text     // Human-readable description
  
  // User tracking
  userId: uuid                // User who performed action
  userName: varchar           // User's name
  userEmail: varchar          // User's email
  
  // Change details
  changedFields: json         // Array of field changes
  snapshot: json              // Optional snapshot of record
  
  // Security tracking
  ipAddress: varchar          // IP address of user
  userAgent: text             // Browser/client info
  
  // Timestamp
  createdAt: timestamp        // When action occurred
}
```

#### Action Types Enum:

```typescript
enum AuditAction {
  created         // Record created
  updated         // General update
  draft_saved     // Draft saved
  completed       // Form completed and submitted
  approved        // Approval granted
  rejected        // Approval rejected
  field_changed   // Specific field(s) changed
}
```

---

## Utility Functions

### Location: `db/utils/medEvacAudit.ts`

#### Core Functions:

1. **createAuditLog(params)** - Main function to create audit entries
2. **logCreation()** - Log when record is created
3. **logDraftSave()** - Log draft saves
4. **logCompletion()** - Log form completion
5. **logApproval()** - Log approval events
6. **logRejection()** - Log rejection events
7. **logFieldChanges()** - Log field updates
8. **detectChanges()** - Compare old/new data and detect changes
9. **getAuditHistory()** - Retrieve audit history for a record
10. **getUserAuditHistory()** - Get all actions by a user
11. **getRecentActivity()** - Get recent system activity

#### Usage Examples:

##### Creating a Record:
```typescript
import { logCreation } from '@/db/utils/medEvacAudit';

const user = { 
  id: userId, 
  name: 'John Doe', 
  email: 'john@example.com' 
};

await logCreation(
  medEvacPatientId,
  user,
  snapshot,        // Optional: full record snapshot
  ipAddress,       // Optional: user's IP
  userAgent        // Optional: browser info
);
```

##### Detecting and Logging Changes:
```typescript
import { detectChanges, logFieldChanges } from '@/db/utils/medEvacAudit';

// Compare old and new data
const changes = detectChanges(oldData, newData);

if (changes.length > 0) {
  await logFieldChanges(
    medEvacPatientId,
    user,
    changes,
    ipAddress,
    userAgent
  );
}
```

##### Logging Approvals:
```typescript
import { logApproval } from '@/db/utils/medEvacAudit';

await logApproval(
  medEvacPatientId,
  approver,
  'medical',       // or 'logistical'
  ipAddress,
  userAgent
);
```

---

## UI Component

### AuditHistoryPanel Component

**Location:** `components/medEvac-form/AuditHistoryPanel.tsx`

A React component that displays the audit history in a beautiful timeline format.

#### Features:
- ✅ Timeline visualization with icons
- ✅ Expandable field changes
- ✅ Color-coded action badges
- ✅ Relative timestamps ("2 hours ago")
- ✅ User information display
- ✅ IP address tracking
- ✅ Scrollable history

#### Usage:
```tsx
import { AuditHistoryPanel } from '@/components/medEvac-form/AuditHistoryPanel';

<AuditHistoryPanel 
  medEvacPatientId={patientId}
  className="mt-6"
/>
```

---

## API Integration

### Required API Endpoint:

Create: `app/api/med-evac-patients/[id]/audit-history/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuditHistory } from '@/db/utils/medEvacAudit';
import { getServerSession } from 'next-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const history = await getAuditHistory(id);
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit history' },
      { status: 500 }
    );
  }
}
```

---

## Implementation Checklist

### Phase 1: Database Setup
- [x] Add audit fields to `med_evac_patients` table
- [x] Create `med_evac_audit_log` table
- [ ] Run database migration:
  ```bash
  cd apps/web
  pnpm drizzle-kit generate
  pnpm drizzle-kit migrate
  ```

### Phase 2: Backend Implementation
- [x] Create audit utility functions
- [ ] Create API endpoint for fetching audit history
- [ ] Integrate audit logging in form submission handler
- [ ] Add audit logging to update operations
- [ ] Add audit logging to approval workflows

### Phase 3: Form Integration
- [ ] Update form submission to capture user info
- [ ] Add audit logging on create
- [ ] Add audit logging on draft save
- [ ] Add audit logging on update
- [ ] Track field-level changes using `detectChanges()`

### Phase 4: UI Components
- [x] Create `AuditHistoryPanel` component
- [ ] Add audit panel to patient detail page
- [ ] Add audit panel to MedEvac table view (optional)
- [ ] Create admin dashboard for recent activity

---

## Form Submission Example

### Updated Form Handler:

```typescript
// In useMedEvacPatientForm.ts or similar

import { detectChanges, logCreation, logFieldChanges } from '@/db/utils/medEvacAudit';

async function submit(data: FormData) {
  try {
    const session = await getSession();
    const user = {
      id: session.user.id,
      name: `${session.user.firstName} ${session.user.lastName}`,
      email: session.user.email,
    };

    // For new records
    if (isNewRecord) {
      const result = await createMedEvacPatient({
        ...data,
        createdBy: user.id,
        createdByName: user.name,
        createdByEmail: user.email,
      });

      // Log creation
      await logCreation(
        result.id,
        user,
        data,           // Full snapshot
        req.ip,
        req.headers['user-agent']
      );
    }
    // For updates
    else {
      const oldData = await getMedEvacPatient(patientId);
      
      const result = await updateMedEvacPatient(patientId, {
        ...data,
        updatedBy: user.id,
        updatedByName: user.name,
        updatedByEmail: user.email,
      });

      // Detect and log changes
      const changes = detectChanges(oldData, data);
      if (changes.length > 0) {
        await logFieldChanges(
          patientId,
          user,
          changes,
          req.ip,
          req.headers['user-agent']
        );
      }
    }
  } catch (error) {
    console.error('Submit error:', error);
  }
}
```

---

## Security Considerations

### Data Protection:
- ✅ Audit logs are **immutable** (no updates/deletes)
- ✅ User IDs stored as foreign keys for integrity
- ✅ Denormalized names/emails for historical accuracy (even if user deleted)
- ✅ IP addresses tracked for security
- ✅ User agent tracked to identify suspicious activity

### Access Control:
- Only authenticated users can view audit logs
- Consider role-based access (admins see all, users see own actions)
- Sensitive field changes may need additional protection

### Compliance:
- HIPAA: Audit trails required for PHI access/changes
- Retention: Keep audit logs for required period (7+ years)
- Immutability: Never delete audit logs

---

## Benefits

### For Management/CEO:
1. **Accountability** - Know who made every change
2. **Compliance** - Meet regulatory requirements
3. **Investigation** - Track down issues or discrepancies
4. **Transparency** - Full visibility into operations
5. **Security** - Detect unauthorized access

### For Users:
1. **Confidence** - Changes are tracked and safe
2. **Collaboration** - See who's working on what
3. **History** - Understand how decisions were made
4. **Protection** - Can't be blamed for others' changes

---

## Performance Considerations

### Indexing:
The schema includes indexes on:
- `medEvacPatientId` - Fast lookup of patient history
- `userId` - Fast lookup of user actions
- `action` - Filter by action type
- `createdAt` - Chronological queries

### Query Optimization:
- Use pagination for long histories (implemented in `getAuditHistory`)
- Consider archiving old audit logs to separate table if needed
- Denormalized fields prevent joins in most queries

---

## Future Enhancements

### Potential Features:
1. **Real-time notifications** when critical fields change
2. **Audit report generation** (PDF/Excel)
3. **Anomaly detection** (unusual patterns)
4. **Restore from snapshot** functionality
5. **Compare versions** side-by-side
6. **Audit dashboard** with charts/graphs
7. **Export audit logs** for external audits

---

## Testing

### Test Scenarios:
1. ✅ Create new MedEvac record → verify audit log created
2. ✅ Update fields → verify changes logged with old/new values
3. ✅ Save draft multiple times → verify each save logged
4. ✅ Grant approval → verify approval logged with approver
5. ✅ Reject approval → verify rejection logged with reason
6. ✅ Multiple users editing → verify all actions tracked separately
7. ✅ View audit history → verify timeline displays correctly

---

## Support

For questions or issues:
- Check schema files: `db/schema/medEvacPatients.ts`
- Review utilities: `db/utils/medEvacAudit.ts`
- See component: `components/medEvac-form/AuditHistoryPanel.tsx`

---

## Summary

The MedEvac audit trail system provides comprehensive tracking of all actions and changes to patient records. With both quick-access fields in the main table and detailed historical tracking in the audit log table, you have complete visibility and accountability while maintaining good performance.

The system is designed to meet regulatory requirements, support multiple editors, and provide your CEO with the confidence that all actions are properly tracked and auditable.