# Specialty Validation - Visual Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Patient Dashboard                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      PatientTable                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              Column Definitions                      │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │          SpecialtyCell Component             │  │  │  │
│  │  │  │                                               │  │  │  │
│  │  │  │  • Specialty Dropdown                        │  │  │  │
│  │  │  │  • Validation Logic                          │  │  │  │
│  │  │  │  • Modal State Management                    │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## User Interaction Flow

```
                    ┌─────────────────┐
                    │  User clicks    │
                    │ Specialty Cell  │
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │ Opens dropdown  │
                    │ (SpecialtyCell) │
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │ User selects    │
                    │   a specialty   │
                    └────────┬────────┘
                             │
                             ↓
              ┌──────────────────────────────┐
              │   handleSpecialtyChange()    │
              │   (SpecialtyCell.tsx)        │
              └──────────────┬───────────────┘
                             │
                             ↓
              ┌──────────────────────────────┐
              │  Check if clearing specialty │
              │  (newSpecialties.length === 0)│
              └──────┬──────────────┬────────┘
                     │              │
            YES ◄────┘              └────► NO
             │                              │
             ↓                              ↓
    ┌─────────────────┐        ┌────────────────────────┐
    │ Clear specialty │        │  API Call: Check for   │
    │   immediately   │        │  doctors with specialty│
    └─────────────────┘        │  POST /api/doctors/    │
                               │  available-specialties │
                               └──────────┬─────────────┘
                                          │
                                          ↓
                         ┌─────────────────────────────┐
                         │   API Response: hasDoctors  │
                         └───────┬──────────────┬──────┘
                                 │              │
                        NO ◄─────┘              └─────► YES
                         │                             │
                         ↓                             ↓
          ┌────────────────────────────┐    ┌──────────────────────┐
          │ Fetch available            │    │ Update patient       │
          │ specialties list           │    │ specialty in DB      │
          │ GET /api/doctors/          │    │ PATCH /api/patient/  │
          │ available-specialties      │    │ [id]/triage          │
          └────────────┬───────────────┘    └──────────┬───────────┘
                       │                               │
                       ↓                               ↓
          ┌────────────────────────────┐    ┌──────────────────────┐
          │ Show Modal                 │    │ Send notifications   │
          │ NoSpecialtyDoctorsModal    │    │ to doctors           │
          │                            │    │ sendSpecialtyNotif() │
          │ • Selected specialty       │    └──────────┬───────────┘
          │ • Available alternatives   │               │
          │ • Cancel button            │               ↓
          │ • Choose Different button  │    ┌──────────────────────┐
          └────────────┬───────────────┘    │ Show success toast   │
                       │                    │ "X doctors notified" │
                       │                    └──────────────────────┘
                       ↓
              ┌────────────────┐
              │  User Action   │
              └────┬──────┬────┘
                   │      │
        Cancel ◄───┘      └───► Choose Different
           │                        │
           ↓                        ↓
    ┌─────────────┐        ┌────────────────┐
    │ Close modal │        │ Close modal &  │
    │ No changes  │        │ reopen dropdown│
    └─────────────┘        └────────────────┘
```

## API Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              SpecialtyCell Component                       │  │
│  │                                                             │  │
│  │  State:                                                     │  │
│  │  • showModal: boolean                                      │  │
│  │  • selectedSpecialtyForModal: DoctorSpecialtyList | null   │  │
│  │  • availableSpecialties: string[]                          │  │
│  │  • isNotifying: boolean                                    │  │
│  └───────────────┬───────────────────────────┬───────────────┘  │
│                  │                           │                   │
└──────────────────┼───────────────────────────┼───────────────────┘
                   │                           │
                   │ POST                      │ GET
                   │                           │
┌──────────────────▼───────────────────────────▼───────────────────┐
│                           API Layer                               │
│                                                                   │
│  /api/doctors/available-specialties/route.ts                     │
│                                                                   │
│  ┌─────────────────────────┐  ┌────────────────────────────┐    │
│  │  POST Handler            │  │  GET Handler               │    │
│  │                          │  │                            │    │
│  │  Input:                  │  │  Returns:                  │    │
│  │  { specialty: string }   │  │  • availableSpecialties[]  │    │
│  │                          │  │  • doctorCount             │    │
│  │  Returns:                │  │                            │    │
│  │  • hasDoctors: boolean   │  │                            │    │
│  │  • doctorCount: number   │  │                            │    │
│  │  • doctors: Array        │  │                            │    │
│  └────────────┬─────────────┘  └────────────┬───────────────┘    │
│               │                             │                    │
└───────────────┼─────────────────────────────┼────────────────────┘
                │                             │
                │ SQL Query                   │ SQL Query
                │                             │
┌───────────────▼─────────────────────────────▼────────────────────┐
│                        Database (PostgreSQL)                      │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     users Table                          │    │
│  │                                                           │    │
│  │  Columns:                                                │    │
│  │  • id                                                    │    │
│  │  • email                                                 │    │
│  │  • firstName                                             │    │
│  │  • lastName                                              │    │
│  │  • accountType (enum: "Doctor", "Triage", "Evac")       │    │
│  │  • authorized (boolean)                                  │    │
│  │  • doctorSpecialty (text array)                          │    │
│  │  • ... other fields                                      │    │
│  │                                                           │    │
│  │  Query:                                                  │    │
│  │  WHERE accountType = 'Doctor'                            │    │
│  │    AND authorized = true                                 │    │
│  │    AND doctorSpecialty IS NOT NULL                       │    │
│  │    AND doctorSpecialty @> ARRAY['Selected']::text[]     │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SpecialtyCell Component                       │
│                                                                   │
│  Initial State:                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ showModal: false                                         │    │
│  │ selectedSpecialtyForModal: null                          │    │
│  │ availableSpecialties: []                                 │    │
│  │ isNotifying: false                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  User Selects Specialty:                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ isNotifying: true                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  API Check (No Doctors Found):                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ selectedSpecialtyForModal: "Cardiology"                  │    │
│  │ availableSpecialties: ["Dermatology", "Emergency Med"]   │    │
│  │ showModal: true                                          │    │
│  │ isNotifying: false                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  User Closes Modal:                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ showModal: false                                         │    │
│  │ (other state preserved)                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

## Component Tree

```
DashboardView
│
├─── PatientTable
│    │
│    └─── Table Component
│         │
│         └─── TableBody
│              │
│              └─── TableRow (for each patient)
│                   │
│                   └─── TableCell (specialty column)
│                        │
│                        └─── SpecialtyCell ◄─── YOU ARE HERE
│                             │
│                             ├─── SpecialtyDropdown
│                             │    │
│                             │    └─── Dialog with checkbox list
│                             │
│                             └─── NoSpecialtyDoctorsModal
│                                  │
│                                  └─── Modal (from @/components/ui/modal)
│                                       │
│                                       ├─── Dialog
│                                       ├─── DialogContent
│                                       ├─── DialogHeader
│                                       ├─── DialogTitle
│                                       ├─── Warning message
│                                       ├─── Available list
│                                       └─── DialogFooter
│                                            │
│                                            ├─── Cancel Button
│                                            └─── Choose Different Button
```

## Conditional Rendering Logic

```
┌────────────────────────────────────────────────────────────────┐
│                     Specialty Cell Rendering                    │
│                                                                  │
│  if (isStatusOrPriorityMissing || !isTriageUser || disabled)    │
│    ┌──────────────────────────────────────────────────────┐    │
│    │  Render: Disabled dropdown with tooltip              │    │
│    │  • Show hover tooltip explaining why disabled        │    │
│    │  • Prevent any interaction                           │    │
│    └──────────────────────────────────────────────────────┘    │
│  else                                                            │
│    ┌──────────────────────────────────────────────────────┐    │
│    │  Render: Active dropdown                             │    │
│    │  • Allow specialty selection                         │    │
│    │  • Show loading state if isNotifying = true          │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                  │
│  if (showModal)                                                  │
│    ┌──────────────────────────────────────────────────────┐    │
│    │  Render: NoSpecialtyDoctorsModal                     │    │
│    │  • Display warning message                           │    │
│    │  • Show selected specialty                           │    │
│    │  • List available alternatives                       │    │
│    │  • Provide action buttons                            │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
                    ┌─────────────────┐
                    │ API Call Made   │
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │  Try Block      │
                    └────┬───────┬────┘
                         │       │
                   Success      Error
                         │       │
                         │       ↓
                         │  ┌──────────────────────┐
                         │  │ Catch Block          │
                         │  │ • console.error()    │
                         │  │ • setToast(error)    │
                         │  │ • Don't update state │
                         │  └──────────────────────┘
                         │
                         ↓
                    ┌─────────────────┐
                    │  Finally Block  │
                    │  • isNotifying  │
                    │    = false      │
                    └─────────────────┘
```

## Toast Notification Flow

```
Success Path:
┌─────────────────┐
│ Specialty       │
│ Assigned        │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│ setToast({                      │
│   title: "Specialty Updated"    │
│   description: "X doctors       │
│               will be notified" │
│   variant: "default"            │
│ })                              │
└─────────────────────────────────┘
         │
         ↓
┌─────────────────┐
│ Toast appears   │
│ (bottom center) │
│ Auto-dismiss    │
│ after 3s        │
└─────────────────┘

Error Path:
┌─────────────────┐
│ API Error       │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│ setToast({                      │
│   title: "Update Failed"        │
│   description: "Could not..."   │
│   variant: "destructive"        │
│ })                              │
└─────────────────────────────────┘
         │
         ↓
┌─────────────────┐
│ Error toast     │
│ (red/destructive)│
│ Auto-dismiss    │
│ after 3s        │
└─────────────────┘
```

## Timeline of Events

```
T=0ms    User clicks specialty dropdown
T=50ms   Dropdown opens
T=100ms  User selects "Cardiology"
T=150ms  handleSpecialtyChange() called
T=160ms  isNotifying = true (loading state shown)
T=200ms  POST /api/doctors/available-specialties sent
T=400ms  API response received: hasDoctors = false
T=450ms  GET /api/doctors/available-specialties sent
T=600ms  API response with available list received
T=650ms  State updated: showModal = true
T=700ms  Modal renders and animates in
T=800ms  isNotifying = false (loading state removed)
         
         [User decides what to do]
         
T=5000ms User clicks "Cancel"
T=5050ms showModal = false
T=5100ms Modal animates out and unmounts
```

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     Key Integration Points                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. DashboardView                                                │
│     └─► Renders PatientTable                                     │
│                                                                   │
│  2. PatientTable                                                 │
│     └─► Uses column definitions                                  │
│                                                                   │
│  3. Column Definitions                                           │
│     └─► Includes SpecialtyCell with validation logic             │
│                                                                   │
│  4. SpecialtyCell                                                │
│     ├─► Calls API to check doctors                               │
│     ├─► Shows NoSpecialtyDoctorsModal when needed                │
│     └─► Handles specialty assignment                             │
│                                                                   │
│  5. API Endpoint                                                 │
│     └─► Queries database for doctor availability                 │
│                                                                   │
│  6. Database                                                     │
│     └─► Stores user/doctor information with specialties          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```
