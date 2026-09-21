# Statistics Section - Quick Reference Guide

## Overview

Quick reference for the Statistics Section of the Mobile Admin Dashboard.

---

## 📊 Key Metrics Displayed

### User Counts
- **Total Users** - All authorized users in the system
- **New Signups** - Pending approval requests
- **Existing Users** - Approved and active users
- **Denied Users** - Rejected signup requests
- **Admin Users** - Users with admin privileges

### Account Types
- **Doctors** - Medical professionals
- **Triage Staff** - Triage personnel
- **Evac Staff** - Evacuation team members

### Activity Metrics
- **Medical Orders** - Total orders in system
- **Notifications** - Total notifications sent
- **Recent Signups** - Week/month signup counts (planned)

### Specialty Breakdown
- Top 5 doctor specialties
- Count per specialty
- Visual pie chart representation

---

## 🎯 Quick Actions

| Action | How To |
|--------|--------|
| Refresh Data | Pull down on screen |
| Export Report | Tap "Export" button in header |
| View Details | Scroll through sections |
| Share Report | Use system share dialog after export |

---

## 📱 UI Components

### Summary Cards
```
┌─────────────────┐
│  [Icon]         │
│   123           │  ← Count
│  Total Users    │  ← Label
└─────────────────┘
```

### Bar Charts
- User Distribution (Existing, New, Denied, Admins)
- Account Type Distribution (Doctors, Triage, Evac)

### Pie Chart
- Top 5 Doctor Specialties
- Color-coded segments
- Legend with counts

### Activity List
- Icon-based metric rows
- Label and value pairs
- Color-coded indicators

---

## 🔄 Data Refresh

### Auto Refresh
- Data loads on section open
- Pull-to-refresh available
- Last updated timestamp shown

### Manual Actions
```typescript
// Pull down to refresh
// or
// Close and reopen section
```

---

## 📤 Export Format

### Text Export Structure
```
=== Fajr Mission EMR STATISTICS ===

Generated: [timestamp]

--- USER COUNTS ---
Total Users: X
New Signups: X
Existing Users: X
...

--- SPECIALTY BREAKDOWN ---
Specialty Name: Count
...

--- ACTIVITY METRICS ---
Medical Orders: X
...

=== END OF REPORT ===
```

---

## 🎨 Color Scheme

| Metric | Color | Hex |
|--------|-------|-----|
| Primary (Total Users) | Blue | #3B82F6 |
| Success (Existing) | Green | #10B981 |
| Danger (Denied) | Red | #EF4444 |
| Info (Admins) | Purple | #8B5CF6 |
| Warning | Amber | #F59E0B |

---

## 🔌 API Endpoints

### Data Sources
```
GET /admin/GET/statistics/doctor-specialty-spread
GET /admin/GET/new-users?page=1&limit=1
GET /admin/GET/existing-users
GET /admin/GET/denied-users?page=1&limit=1
GET /admin/GET/existing-admins
GET /admin/GET/med-orders?page=1&limit=1
GET /admin/GET/user-notifications?page=1&limit=1
```

---

## 🐛 Troubleshooting

### Issue: No Data Showing
**Possible Causes:**
- Network connectivity
- API server down
- Invalid auth token

**Solution:**
1. Check internet connection
2. Try pull-to-refresh
3. Restart app if needed

### Issue: Export Fails
**Possible Causes:**
- No data loaded
- Share dialog not supported
- App permissions

**Solution:**
1. Wait for data to load
2. Check device share capabilities
3. Grant necessary permissions

### Issue: Charts Not Rendering
**Possible Causes:**
- Missing react-native-svg
- Zero data values
- Screen size issues

**Solution:**
1. Verify dependencies installed
2. Check if data exists
3. Restart app

---

## 💡 Pro Tips

1. **Best Viewing Time**
   - Check statistics during off-peak hours for faster loading

2. **Regular Monitoring**
   - Review daily to spot trends
   - Compare week-over-week growth

3. **Export for Records**
   - Export monthly reports for record-keeping
   - Share with management as needed

4. **Understanding Charts**
   - Bar charts: Compare quantities
   - Pie chart: See proportional distribution
   - Summary cards: Quick overview

---

## 📋 Keyboard Shortcuts

Not applicable - touch-based interface

---

## 🔐 Permissions Required

- Admin role required
- Valid authentication token
- Network access for API calls

---

## 📊 Data Update Frequency

| Data Type | Update Frequency |
|-----------|------------------|
| User Counts | Real-time on refresh |
| Specialty Breakdown | Real-time on refresh |
| Activity Metrics | Real-time on refresh |
| Last Updated | On each fetch |

---

## 🎯 Use Cases

### Daily Monitoring
- Check new signup counts
- Review denied users
- Monitor system activity

### Weekly Reviews
- Export weekly reports
- Track user growth
- Analyze specialty distribution

### Monthly Reports
- Generate comprehensive exports
- Compare month-over-month metrics
- Present to stakeholders

---

## 📝 Notes

- Statistics are aggregated from multiple sources
- Some counts are estimates based on pagination
- Date range filtering coming in future update
- All times shown in device local timezone

---

## 🚀 Quick Start

1. **Open Admin Dashboard**
2. **Tap "Statistics" section**
3. **Wait for data to load** (2-5 seconds)
4. **View metrics and charts**
5. **Pull down to refresh** if needed
6. **Tap "Export"** to save/share

---

## 📞 Support

For issues or questions:
- Check troubleshooting section above
- Review full documentation
- Contact development team

---

## ✨ Quick Reference Commands

```typescript
// Refresh statistics
refreshStatistics()

// Export data
exportData()

// Clear error
clearError()

// Check if data loaded
hasData: boolean
```

---

## 🎓 Learning Resources

- Full implementation docs: `STATISTICS_SECTION_SUMMARY.md`
- Code location: `apps/mobile/src/components/admin/sections/statistics/`
- ViewModel: `useStatisticsViewModel.ts`
- Types: `apps/mobile/src/types/admin.ts`

---

**Last Updated:** 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅