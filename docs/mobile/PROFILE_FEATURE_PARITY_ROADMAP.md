# Mobile Profile Feature Parity Roadmap

## Overview

This document outlines the plan to bring the mobile user profile screen to feature parity with the web version, following modern React Native best practices and maintaining consistency with the existing mobile architecture.

---

## Current Status (Mobile)

### ✅ What We Have
- Basic profile viewing and editing
- Field management (name, email, account type, etc.)
- Doctor specialty management (add/remove)
- Language and country selection
- Basic form validation
- Save/cancel functionality
- Logout functionality
- **✅ TokenStorage integration** (just fixed)

### ❌ What's Missing (Compared to Web)
- Medical license upload/viewing
- Profile photo upload with camera/gallery
- Profile change history viewer
- Admin approval system for restricted fields
- Theme settings integration
- Form validation with react-hook-form + zod
- Medical license modal viewer
- Settings section
- Pending change indicators
- Copy to clipboard functionality

---

## Web Profile Features (Reference)

### Core Components
1. **UserProfileView.tsx** - Main container with form
2. **ProfileHeader.tsx** - Avatar, name, email, ID with copy
3. **ProfileFields.tsx** - Form fields with validation
4. **DoctorSpecialties.tsx** - Specialty management
5. **MedicalLicenseUploadModal.tsx** - License upload with drag/drop
6. **UserPhotoUploadModal.tsx** - Photo upload with crop/filters
7. **UserProfileLogViewer.tsx** - Change history with pagination
8. **PendingChangeIndicator.tsx** - Shows pending approval status
9. **AdminApprovalWarningModal.tsx** - Warns about admin-gated fields
10. **UserSettingsView.tsx** - Theme and preferences

### Architecture
- **View Models** split into modules:
  - `useProfileState.ts` - State management
  - `useProfileActions.ts` - Action handlers
  - `useProfileSpecialties.ts` - Specialty logic
  - `useProfileMedicalLicense.ts` - License logic
  - `schema.ts` - Zod validation schema
  - `types.ts` - TypeScript types

- **Context Provider** - `UserProfileContext.tsx` for global state
- **Form Management** - react-hook-form with zodResolver
- **API Integration** - Proper error handling and loading states

---

## Mobile Implementation Plan

### Phase 1: Foundation & Token Fix ✅ COMPLETE

**Status**: ✅ Done

**Tasks**:
- [x] Update `useProfileViewModel` to use `TokenStorage.getAuthToken()`
- [x] Remove legacy `storageUtils` dependency
- [x] Test profile loading with new token system
- [x] Test profile saving with new token system

---

### Phase 2: UI/UX Improvements (Week 1)

**Priority**: High  
**Effort**: Medium

#### 2.1 Profile Header Enhancement
**File**: Create `apps/mobile/src/screens/user-profile/components/ProfileHeader.tsx`

```typescript
interface ProfileHeaderProps {
  profile: ProfileFormValues;
  onPhotoPress?: () => void;
  onCopyId?: () => void;
  onCopyEmail?: () => void;
}
```

**Features**:
- Avatar display (initials fallback if no photo)
- Tap avatar to upload photo
- Copy ID button with feedback
- Copy email button with feedback
- Admin badge if applicable
- Clean, card-based layout

#### 2.2 Form Field Components
**Files**: Create reusable field components
- `FieldInput.tsx` - Text input with label/error
- `FieldPicker.tsx` - Single select picker
- `FieldMultiSelect.tsx` - Multi-select with chips
- `FieldDatePicker.tsx` - Date picker component
- `FieldChipList.tsx` - Display array values as chips

**Benefits**:
- Consistent styling
- Reusable across app
- Built-in validation display
- Accessibility support

#### 2.3 Better Error Handling
- Toast notifications for success/error
- Inline validation errors
- Loading states for async operations
- Network error retry functionality

---

### Phase 3: Photo Upload (Week 2)

**Priority**: High  
**Effort**: High

#### 3.1 Photo Selection
**Library**: `react-native-image-picker` or `expo-image-picker`

**Features**:
- Take photo with camera
- Select from gallery
- Basic image validation (size, format)
- Loading state during upload
- Success/error feedback

#### 3.2 Photo Upload Modal
**File**: `apps/mobile/src/screens/user-profile/components/PhotoUploadModal.tsx`

**Features**:
- Camera vs Gallery selection
- Image preview
- Basic cropping (using `react-native-image-crop-picker`)
- Compression before upload
- Upload progress indicator

**API Endpoint**: Reuse existing `/api/upload-user-photo`

---

### Phase 4: Medical License Support (Week 3)

**Priority**: Medium  
**Effort**: Medium

#### 4.1 License Viewing
**File**: `apps/mobile/src/screens/user-profile/components/MedicalLicenseViewer.tsx`

**Features**:
- Display list of uploaded licenses
- View license image/PDF (using `react-native-pdf` or `expo-file-system`)
- Download/share functionality
- Specialty badges for each license

#### 4.2 License Upload (Optional)
**Note**: File uploads are complex on mobile. Consider:
- Option A: Link to web version for uploads
- Option B: Simple camera capture → upload
- Option C: Document picker integration

**Recommendation**: Start with Option A (link to web), add native upload in future if needed.

---

### Phase 5: Profile Change History (Week 4)

**Priority**: Low  
**Effort**: Low

#### 5.1 History Viewer Modal
**File**: `apps/mobile/src/screens/user-profile/components/ProfileHistoryModal.tsx`

**Features**:
- Collapsible section (like web)
- Paginated list of changes
- Change detail view (field, old value, new value)
- Timestamp with relative time
- Filter by date range (optional)

**API Endpoint**: Reuse `/api/user-profile-logs/${userId}`

---

### Phase 6: Admin Approval System (Week 5)

**Priority**: Medium  
**Effort**: Medium

#### 6.1 Profile Update Requests
**File**: `apps/mobile/src/screens/user-profile/hooks/useProfileUpdateRequests.ts`

**Features**:
- Check for pending requests on mount
- Detect admin-gated fields (doctorSpecialty, accountType)
- Show warning modal when user tries to change gated field
- Submit request to admin
- Display pending indicator next to field

#### 6.2 Warning Modal
**File**: `apps/mobile/src/screens/user-profile/components/AdminApprovalModal.tsx`

**Features**:
- Explain admin approval requirement
- Show current vs requested value
- Confirm/cancel buttons
- Loading state during submission

#### 6.3 Pending Indicator
**Component**: Small badge/icon next to fields with pending changes

**API Endpoints**: Reuse existing
- `POST /api/profile-update-requests` - Create request
- `GET /api/profile-update-requests` - Get user's requests

---

### Phase 7: Settings Integration (Week 6)

**Priority**: Low  
**Effort**: Low

#### 7.1 Settings Section
**File**: `apps/mobile/src/screens/user-profile/components/SettingsSection.tsx`

**Features**:
- Theme selection (Light/Dark/System)
- Language preference
- Notification settings
- Data sync settings

**Note**: Leverage existing `UserSettings` infrastructure if available.

---

### Phase 8: Form Validation (Ongoing)

**Priority**: Medium  
**Effort**: Medium

#### 8.1 Schema Validation
**Option A**: Port zod schema from web
**Option B**: Use custom validation

**Recommendation**: Keep it simple on mobile - basic required field checks and format validation.

```typescript
// apps/mobile/src/screens/user-profile/validation.ts
export const profileValidation = {
  firstName: (value: string) => value.trim().length > 0,
  lastName: (value: string) => value.trim().length > 0,
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  // ... etc
};
```

---

## Architecture Changes

### Recommended Structure

```
apps/mobile/src/screens/user-profile/
├── index.ts                          # Exports
├── ProfileScreen.tsx                 # Main screen (navigator)
├── ProfileScreenView.tsx             # Main view component
├── useProfileViewModel.ts            # View model hook
├── components/
│   ├── ProfileHeader.tsx
│   ├── ProfileFields.tsx
│   ├── FieldInput.tsx
│   ├── FieldPicker.tsx
│   ├── FieldMultiSelect.tsx
│   ├── PhotoUploadModal.tsx
│   ├── MedicalLicenseViewer.tsx
│   ├── ProfileHistoryModal.tsx
│   ├── AdminApprovalModal.tsx
│   ├── PendingIndicator.tsx
│   └── SettingsSection.tsx
├── hooks/
│   ├── usePhotoUpload.ts
│   ├── useMedicalLicense.ts
│   ├── useProfileUpdateRequests.ts
│   └── useProfileHistory.ts
└── validation.ts
```

---

## API Endpoints (Existing - Reuse)

### User Profile
- `GET /api/user/:userId` - Fetch profile ✅
- `PATCH /api/user/:userId` - Update profile ✅

### Photo Upload
- `POST /api/upload-user-photo` - Upload profile photo
- `DELETE /api/user-photo/:userId` - Delete photo

### Medical License
- `POST /api/upload-license` - Upload license
- `GET /api/user/:userId/licenses` - Get user's licenses

### Profile Logs
- `GET /api/user-profile-logs/:userId` - Get change history

### Profile Update Requests
- `GET /api/profile-update-requests` - Get user's requests
- `POST /api/profile-update-requests` - Create new request

---

## Testing Strategy

### Unit Tests
- [ ] Profile view model hooks
- [ ] Form validation logic
- [ ] Specialty add/remove logic
- [ ] Token storage integration

### Integration Tests
- [ ] Profile load → edit → save flow
- [ ] Photo upload flow
- [ ] Medical license viewing
- [ ] Admin approval request flow

### E2E Tests
- [ ] Complete profile update journey
- [ ] Photo upload → crop → save
- [ ] Logout → login → verify changes persisted

---

## Performance Considerations

### Optimization Strategies
1. **Lazy load components**:
   - History viewer (only load when opened)
   - License viewer (only load when opened)
   - Photo upload modal (only load when triggered)

2. **Image optimization**:
   - Compress photos before upload
   - Cache profile photos locally
   - Use thumbnails for license previews

3. **API caching**:
   - Cache profile data in TokenStorage
   - Invalidate on save
   - Background refresh on app open

4. **Form performance**:
   - Debounce validation
   - Memo expensive renders
   - Optimize re-renders with React.memo

---

## Migration Strategy

### Phase-by-Phase Rollout

1. **Phase 1-2**: Internal testing
   - Deploy to dev environment
   - Test with team
   - Gather feedback

2. **Phase 3-4**: Beta testing
   - Deploy to staging
   - Test with small user group
   - Fix critical issues

3. **Phase 5-6**: Full rollout
   - Deploy to production
   - Monitor analytics
   - Hot-fix if needed

4. **Phase 7-8**: Polish
   - Gather user feedback
   - Add nice-to-have features
   - Performance tuning

---

## Dependencies

### New Libraries Needed

```json
{
  "react-native-image-picker": "^5.0.0",        // Photo selection
  "react-native-image-crop-picker": "^0.40.0",  // Photo cropping
  "react-native-pdf": "^6.7.0",                 // PDF viewing (optional)
  "@react-native-community/clipboard": "^1.5.1", // Copy to clipboard
  "react-native-toast-message": "^2.1.0"        // Toast notifications
}
```

### Optional (If using react-hook-form)
```json
{
  "react-hook-form": "^7.48.0",
  "zod": "^3.22.0",
  "@hookform/resolvers": "^3.3.0"
}
```

---

## Success Criteria

### Definition of Done

- [x] **Phase 1**: Token integration working ✅
- [ ] **Phase 2**: UI matches web design (90% similarity)
- [ ] **Phase 3**: Photo upload works on iOS & Android
- [ ] **Phase 4**: Can view medical licenses on device
- [ ] **Phase 5**: History viewer displays changes
- [ ] **Phase 6**: Admin approval flow functional
- [ ] **Phase 7**: Settings persist correctly
- [ ] **Phase 8**: Form validation prevents bad data

### Quality Metrics

- **Performance**: Profile loads < 1 second
- **Reliability**: < 1% error rate on save
- **UX**: < 3 taps to complete any action
- **Accessibility**: Full screen reader support

---

## Known Limitations & Trade-offs

### Mobile vs Web Differences

1. **No drag-and-drop**: Mobile uses camera/gallery picker instead
2. **Simpler cropping**: Mobile crop tools are less sophisticated
3. **No inline editing**: Mobile uses full-screen edit mode
4. **Limited filters**: Photo filters simplified on mobile
5. **Smaller screens**: Some info moved to tabs/modals

### Acceptable Compromises

- Link to web for complex license uploads (initially)
- Simpler history viewer (no advanced filters)
- Basic photo editing (crop only, no filters initially)
- Paginated lists instead of infinite scroll

---

## Timeline Estimate

| Phase | Features | Effort | Duration |
|-------|----------|--------|----------|
| **Phase 1** | Token fix | 1 day | ✅ Done |
| **Phase 2** | UI improvements | 3-4 days | Week 1 |
| **Phase 3** | Photo upload | 4-5 days | Week 2 |
| **Phase 4** | Medical license | 3-4 days | Week 3 |
| **Phase 5** | History viewer | 2-3 days | Week 4 |
| **Phase 6** | Admin approval | 3-4 days | Week 5 |
| **Phase 7** | Settings | 2-3 days | Week 6 |
| **Phase 8** | Polish & testing | Ongoing | Continuous |

**Total Estimated Time**: 6-7 weeks for full feature parity

**MVP (Phases 1-3)**: 2-3 weeks

---

## Next Steps

### Immediate Actions

1. **Review this roadmap** with team
2. **Prioritize phases** based on user needs
3. **Set up dev environment** with new dependencies
4. **Start Phase 2** (UI improvements)
5. **Create Jira tickets** for each phase

### Questions to Answer

- Do we need full feature parity or just core features?
- Should we add native license upload or link to web?
- Do we want photo filters or just basic crop?
- Is admin approval system critical for mobile?
- When is the target release date?

---

## Resources

### Web Reference Files
- `apps/web/components/user-profile/` - All web components
- `apps/web/components/user-profile/viewModel/` - View models
- See attached files for full implementation details

### Mobile Current Files
- `apps/mobile/src/screens/user-profile/ProfileScreenView.tsx`
- `apps/mobile/src/screens/user-profile/useProfileViewModel.ts`

### Documentation
- [React Native Image Picker](https://github.com/react-native-image-picker/react-native-image-picker)
- [React Native Crop Picker](https://github.com/ivpusic/react-native-image-crop-picker)
- [TokenStorage Guide](../../docs/power-sync/ENTERPRISE_TOKEN_SYSTEM_DEPLOYMENT.md)

---

**Status**: 🚧 Phase 1 Complete - Ready for Phase 2  
**Last Updated**: 2025-01-01  
**Next Review**: Start of Phase 2