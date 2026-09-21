# Profile Update Requests - Implementation Checklist

Use this checklist to ensure complete implementation of the Profile Update Requests system.

## 📋 Pre-Implementation

- [ ] Read `PROFILE_UPDATE_REQUESTS_README.md`
- [ ] Review `PROFILE_UPDATE_REQUESTS_INTEGRATION.md`
- [ ] Understand current profile form structure
- [ ] Identify current user profile page location
- [ ] Confirm admin dashboard access
- [ ] Backup database before starting
- [ ] Test in staging environment first

## 🗄️ Database Setup

### Schema Files
- [x] Created `apps/web/db/schema/userProfileUpdateRequests.ts`
- [x] Updated `apps/web/db/schema/index.ts` with exports
- [x] Added relations in schema index

### Migration
- [ ] Run `npm run db:generate` (or `npx drizzle-kit generate`)
- [ ] Review generated migration SQL file
- [ ] Test migration in staging: `npm run db:migrate`
- [ ] Verify table created: `\d user_profile_update_requests`
- [ ] Verify enums created: Check `request_status`, `admin_approval_field`
- [ ] Verify notification enums updated: `profile_update_approved`, `profile_update_denied`, `profile_update_request`
- [ ] Verify `userNotifications` table updated with `methods` and `emailAddress` columns
- [ ] Verify indexes created
- [ ] Verify foreign key constraints
- [ ] Apply migration to production
- [ ] Take post-migration database backup

### Verification Queries
- [ ] Run: `SELECT COUNT(*) FROM user_profile_update_requests;`
- [ ] Run: `SELECT * FROM pg_indexes WHERE tablename = 'user_profile_update_requests';`
- [ ] Run: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_notifications';`
- [ ] Verify no orphaned records

## 🔌 API Endpoints

### User Endpoints
- [x] Created `apps/web/app/api/profile-update-requests/route.ts`
  - [x] POST handler for creating requests
  - [x] GET handler for fetching user's requests
  - [x] Authentication check
  - [x] Validation logic
  - [x] Error handling

### Admin Endpoints
- [x] Created `apps/web/app/api/admin/profile-update-requests/route.ts`
  - [x] GET handler for fetching all requests
  - [x] Admin permission check
  - [x] Filter by status support
  - [x] Error handling

- [x] Created `apps/web/app/api/admin/profile-update-requests/[requestId]/route.ts`
  - [x] PATCH handler for approve/deny
  - [x] DELETE handler
  - [x] Transaction handling
  - [x] Profile update logic
  - [x] Audit log creation
  - [x] Notification to user on approval/denial
  - [x] Error handling

### Testing
- [ ] Test POST request creation (authenticated user)
- [ ] Test GET user requests (authenticated user)
- [ ] Test GET all requests (admin)
- [ ] Test PATCH approve (admin)
- [ ] Test PATCH deny (admin)
- [ ] Test DELETE (admin)
- [ ] Test authorization (non-admin should fail)
- [ ] Test validation (invalid data should fail)
- [ ] Test duplicate request prevention
- [ ] Test admin notification on request creation
- [ ] Test user notification on approval
- [ ] Test user notification on denial

## 🎨 User-Side Components

### Core Components
- [x] Created `apps/web/components/user-profile/useProfileUpdateRequests.ts`
  - [x] Query for fetching requests
  - [x] Mutation for creating requests
  - [x] Helper functions (hasPendingRequest, getPendingRequestByField)
  - [x] Error handling

- [x] Created `apps/web/components/user-profile/AdminApprovalWarningModal.tsx`
  - [x] Modal UI with ShieldAlert icon
  - [x] Current vs requested value display
  - [x] Confirmation buttons
  - [x] Loading states
  - [x] Responsive design

- [x] Created `apps/web/components/user-profile/PendingChangeIndicator.tsx`
  - [x] ShieldAlert icon with animation
  - [x] Badge component
  - [x] Tooltip with details
  - [x] Inline variant
  - [x] Responsive design

### Integration
- [ ] Import components into user profile form
- [ ] Add hook initialization
- [ ] Implement field change handler
- [ ] Add modal state management
- [ ] Add pending change detection logic
- [ ] Render warning modal
- [ ] Render pending indicators on fields
- [ ] Test user flow end-to-end

### User Profile Form Updates
- [ ] Identify fields requiring admin approval
- [ ] Add change interception logic
- [ ] Display pending indicators for:
  - [ ] Doctor Specialty field
  - [ ] Account Type field
- [ ] Handle request confirmation
- [ ] Show success/error toasts
- [ ] Refresh data after request creation

## 👨‍💼 Admin Dashboard Components

### Core Components
- [x] Created `ProfileUpdateRequestsViewModel.ts`
  - [x] Query for fetching requests
  - [x] Mutations for approve/deny/delete
  - [x] Search and filter logic
  - [x] Helper functions
  - [x] Error handling with toasts

- [x] Created `ProfileUpdateRequestsView.tsx`
  - [x] Statistics cards (pending/approved/denied)
  - [x] Search input
  - [x] Status filter dropdown
  - [x] Table with all requests
  - [x] Action buttons (approve/deny)
  - [x] Review dialog with notes
  - [x] Responsive design

### Integration
- [x] Added to `AdminDashboardView.tsx` sections array
- [x] Imported ProfileUpdateRequestsView component
- [x] Added ShieldAlert icon
- [x] Set proper section ID and title

### Testing
- [ ] Access admin dashboard
- [ ] Verify new section appears
- [ ] Test search functionality
- [ ] Test status filtering
- [ ] Test approve workflow
- [ ] Test deny workflow
- [ ] Test delete workflow
- [ ] Verify statistics update
- [ ] Check responsive layout

## 🔧 Utility Files

### Helpers
- [x] Created `apps/web/lib/profileUpdateHelpers.ts`
  - [x] ADMIN_GATED_FIELDS constant
  - [x] FIELD_DISPLAY_NAMES mapping
  - [x] isAdminGatedField() function
  - [x] getFieldDisplayName() function
  - [x] formatFieldValue() function
  - [x] hasValueChanged() function
  - [x] validateFieldValue() function
  - [x] getFieldHelpText() function
  - [x] getStatusVariant() function
  - [x] getRequestStatusMessage() function
  - [x] canSubmitNewRequest() function

### Notification Service
- [x] Created `apps/web/lib/notifications/profileUpdateNotifications.ts`
  - [x] notifyAdminsOfProfileUpdateRequest() function
  - [x] notifyUserOfProfileUpdateResponse() function
  - [x] markProfileUpdateNotificationAsRead() function
  - [x] getUnreadProfileUpdateNotifications() function
  - [x] Error handling and logging
  - [x] Integration with existing notification schema

### Integration
- [ ] Import helpers in profile form
- [ ] Use isAdminGatedField() for field detection
- [ ] Use formatFieldValue() for display
- [ ] Use validateFieldValue() before submission
- [ ] Import in ViewModel for consistency
- [ ] Verify notification service is called on request creation
- [ ] Verify notification service is called on approval/denial

## 📱 UI Dependencies

### Required Components
- [ ] Verify `Button` component exists
- [ ] Verify `Input` component exists
- [ ] Verify `Dialog` components exist
- [ ] Verify `Badge` component exists
- [ ] Verify `Textarea` component exists
- [ ] Verify `Select` components exist
- [ ] Verify `Label` component exists
- [ ] Verify `Tooltip` components exist
- [ ] Verify `Table` component exists

### Icons
- [ ] Verify lucide-react installed
- [ ] Test ShieldAlert icon renders
- [ ] Test other icons (CheckCircle, XCircle, etc.)

## 🧪 Testing

### Unit Tests
- [ ] Test useProfileUpdateRequests hook
- [ ] Test field validation functions
- [ ] Test value formatting functions
- [ ] Test change detection logic

### Integration Tests
- [ ] Test complete user request flow
- [ ] Test complete admin approval flow
- [ ] Test complete admin denial flow
- [ ] Test duplicate request prevention
- [ ] Test concurrent requests
- [ ] Test database transactions

### E2E Tests
- [ ] User can see modal when changing restricted field
- [ ] User can submit request successfully
- [ ] User sees pending indicator
- [ ] User cannot submit duplicate request
- [ ] Admin can view all pending requests
- [ ] Admin can approve request
- [ ] Admin can deny request
- [ ] Profile updates automatically on approval
- [ ] Audit log is created on approval
- [ ] User receives notification (if implemented)

### Edge Cases
- [ ] Test with invalid field names
- [ ] Test with missing values
- [ ] Test with malformed data
- [ ] Test concurrent approvals
- [ ] Test request deletion while pending
- [ ] Test user deletion with pending requests
- [ ] Test admin permission revocation

## 🔐 Security Checklist

- [ ] All endpoints verify authentication
- [ ] Admin endpoints verify admin status
- [ ] Users can only access their own requests
- [ ] Input validation on all fields
- [ ] SQL injection prevention (via ORM)
- [ ] XSS prevention (via React)
- [ ] CSRF protection (via NextAuth)
- [ ] Rate limiting (if needed)

## 📊 Monitoring & Logging

### Application Logs
- [ ] Log request creation
- [ ] Log approval/denial actions
- [ ] Log errors with context
- [ ] Monitor API response times

### Database Monitoring
- [ ] Set up alerts for high pending count
- [ ] Monitor table growth
- [ ] Track query performance
- [ ] Set up automated cleanup job

### Analytics (Optional)
- [ ] Track request creation rate
- [ ] Track approval/denial rates
- [ ] Track time-to-approval metrics
- [ ] Track most requested changes

## 📬 Notifications Setup

### Database Schema
- [x] Updated `apps/web/db/schema/notifications.ts`
  - [x] Added `methods` field to userNotifications
  - [x] Added `emailAddress` field to userNotifications
  - [x] Added new notification types to enum
  - [x] Added notification method enum

### Notification Service
- [x] Created notification service functions
- [x] Integrated with profile update request creation
- [x] Integrated with approval/denial flow
- [x] Error handling for notification failures

### Testing Notifications
- [ ] Test admin receives notification when user submits request
- [ ] Test all admins receive notification (if multiple)
- [ ] Test notification contains correct information
- [ ] Test notification redirect link works
- [ ] Test user receives notification on approval
- [ ] Test user receives notification on denial
- [ ] Test notification includes review notes
- [ ] Test notification methods are set correctly
- [ ] Test notification doesn't break request if it fails
- [ ] Verify notifications appear in user's notification center
- [ ] Verify notifications can be marked as read
- [ ] Test unread notification count updates

### Email Integration (Optional)
- [ ] Implement email sending service
- [ ] Create email templates for each notification type
- [ ] Test email delivery for profile update requests
- [ ] Test email delivery for approvals/denials
- [ ] Add email preferences for users

## 📚 Documentation

- [x] Created main README
- [x] Created integration guide
- [x] Created migration guide
- [x] Created quick start guide
- [x] Created notifications guide
- [x] Created this checklist
- [ ] Update project README with link to this system
- [ ] Add inline code comments
- [ ] Document API endpoints in OpenAPI/Swagger
- [ ] Create user-facing help documentation
- [ ] Create admin training guide

## 🚀 Deployment

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Staging environment tested
- [ ] Performance tested
- [ ] Security reviewed
- [ ] Database backup taken

### Deployment Steps
- [ ] Deploy database migration
- [ ] Verify migration success
- [ ] Deploy API endpoints
- [ ] Deploy UI components
- [ ] Deploy admin dashboard updates
- [ ] Clear CDN cache (if applicable)
- [ ] Restart application servers

### Post-Deployment
- [ ] Verify endpoints responding
- [ ] Verify UI components loading
- [ ] Test user flow in production
- [ ] Test admin flow in production
- [ ] Monitor error logs for 24 hours
- [ ] Check performance metrics
- [ ] Verify no database issues

## ✅ Production Verification

### Smoke Tests
- [ ] User can access profile page
- [ ] User can attempt to change restricted field
- [ ] Modal appears correctly
- [ ] Request creation works
- [ ] Admin dashboard loads
- [ ] Admin can see requests
- [ ] Approval process works
- [ ] Profile updates correctly

### Health Checks
- [ ] Database connection healthy
- [ ] API endpoints responding
- [ ] No memory leaks
- [ ] No performance degradation
- [ ] Error rates normal

## 📞 Support Preparation

- [ ] Document common issues
- [ ] Prepare troubleshooting guide
- [ ] Train support team
- [ ] Create FAQ document
- [ ] Set up monitoring alerts
- [ ] Prepare rollback procedure

## 🎓 User Training

### For End Users
- [ ] Create how-to guide
- [ ] Record demo video
- [ ] Add in-app help text
- [ ] Send announcement email
- [ ] Schedule Q&A session (optional)

### For Admins
- [ ] Create admin manual
- [ ] Record training video
- [ ] Document approval workflow
- [ ] Document denial workflow
- [ ] Schedule training session

## 🔄 Future Enhancements (Optional)

- [ ] Email notifications to users on approval/denial
- [ ] Email notifications to admins on new requests
- [ ] Batch approval feature
- [ ] Request history/timeline view
- [ ] Request comments/discussion thread
- [ ] Automated approval rules
- [ ] Request expiration (auto-deny after X days)
- [ ] User dashboard showing all requests
- [ ] Analytics dashboard for admins
- [ ] Export requests to CSV
- [ ] Webhook integration

## ✨ Final Checklist

- [ ] All database migrations applied
- [ ] All API endpoints working
- [ ] All UI components functional
- [ ] All tests passing
- [ ] All documentation complete
- [ ] Deployed to staging
- [ ] Tested in staging
- [ ] Deployed to production
- [ ] Verified in production
- [ ] Team trained
- [ ] Users notified
- [ ] Monitoring active
- [ ] Success! 🎉

---

**Notes:**
- Mark items with `[x]` as you complete them
- Items marked `[x]` above are already created in the codebase
- Items marked `[ ]` need to be completed during integration
- Test thoroughly in staging before production deployment
- Keep this checklist updated as you progress

**Estimated Time:**
- Database setup: 1-2 hours
- API endpoints: Already complete
- User components: 4-6 hours (integration)
- Admin components: Already complete
- Testing: 4-6 hours
- Documentation: 2-3 hours
- Deployment: 2-3 hours

**Total: ~15-22 hours** (depending on complexity of existing profile form)