# Image Storage Section - Quick Reference Guide

## Overview

Quick reference for the Image Storage Section of the Mobile Admin Dashboard.

---

## 📦 Key Features

### Storage Metrics
- **Total Used** - Storage space consumed
- **Total Files** - Number of images stored
- **Usage %** - Percentage of storage used
- **Progress Bar** - Visual usage indicator with color coding

### Image Management
- **Grid View** - 3-column responsive layout
- **Preview** - Full-screen image modal
- **Delete** - Single and bulk deletion
- **Selection** - Multi-select with checkboxes
- **Sort** - By date, name, or size

---

## 🎯 Quick Actions

| Action | How To |
|--------|--------|
| View Images | Tap "Image Storage" section |
| Refresh Data | Pull down on screen |
| Preview Image | Tap on image thumbnail |
| Select Image | Long-press on image |
| Select All | Tap "Select All" in toolbar |
| Clear Selection | Tap selection count when selected |
| Delete Single | Tap image → Preview → Delete |
| Bulk Delete | Select multiple → Tap "Delete" |
| Sort Images | Tap "Sort: ..." button |
| Change Order | In sort menu → Toggle order |

---

## 📱 UI Components

### Storage Stats Header
```
┌─────────────────────────────────┐
│  [💾]     [📄]      [📊]        │
│  2.5 GB    150      75%         │
│  Used      Files    Usage       │
│                                 │
│  ▓▓▓▓▓▓▓▓▓░░░░ 75%              │
│  2.5 GB of 10 GB                │
└─────────────────────────────────┘
```

### Image Grid
```
┌─────┐ ┌─────┐ ┌─────┐
│ IMG │ │ IMG │ │ IMG │
│ ✓   │ │     │ │     │
│name │ │name │ │name │
│123KB│ │456KB│ │789KB│
└─────┘ └─────┘ └─────┘
```

### Preview Modal
```
┌─────────────────────────────────┐
│ Filename.jpg            [X]     │
├─────────────────────────────────┤
│                                 │
│        [  IMAGE  ]              │
│                                 │
├─────────────────────────────────┤
│ 📄 Size: 1.2 MB                 │
│ 📅 Uploaded: Jan 15, 2025       │
│ 👤 By: John Doe                 │
├─────────────────────────────────┤
│     [🗑️ Delete Image]           │
└─────────────────────────────────┘
```

---

## 🔄 Data Operations

### Loading States
- **Initial Load** - Shows loading spinner
- **Refresh** - Pull-to-refresh indicator
- **Load More** - Footer loading indicator
- **Deleting** - Button shows spinner

### Error States
- **API Not Ready** - Yellow warning banner
- **Network Error** - Error state with retry
- **Delete Failed** - Alert dialog with message

### Empty State
- Shows when no images exist
- Different message if API not ready
- Friendly icon and text

---

## 🎨 Visual Indicators

### Progress Bar Colors
| Usage | Color | Meaning |
|-------|-------|---------|
| 0-69% | Blue | Normal |
| 70-89% | Amber | Warning |
| 90-100% | Red | Critical |

### Selection States
| State | Visual | Action |
|-------|--------|--------|
| Not Selected | Normal border | Tap to view |
| Selected | Blue border + ✓ | Tap to deselect |
| In Preview | Full screen | Swipe to dismiss |

---

## 📊 Sort Options

### Available Sorts
- **Date Uploaded** (default) - Newest first
- **File Name** - Alphabetical
- **File Size** - Largest first

### Sort Order
- **Descending** (default) - High to low
- **Ascending** - Low to high

### Changing Sort
1. Tap "Sort: Date" button
2. Select new sort field
3. Toggle order if needed
4. Data auto-refreshes

---

## 🗑️ Delete Operations

### Single Delete
1. Tap image to preview
2. Tap "Delete Image" button
3. Confirm in dialog
4. Image removed immediately

### Bulk Delete
1. Long-press to select first image
2. Tap additional images to select
3. Tap "Delete" in toolbar
4. Confirm bulk action
5. All selected images removed

### Confirmation Dialogs
- **Single Delete** - Shows file name
- **Bulk Delete** - Shows count
- **Cannot Undo** - Warning message
- **Cancel Option** - Always available

---

## 🔒 Permissions Required

- Admin role required
- Valid authentication token
- Network access for API calls

---

## ⚠️ Known Issues

### API Not Implemented
If you see this warning:
```
⚠️ Image storage API endpoints are not yet 
   implemented. Please check the documentation
   for required backend setup.
```

**What it means:**
- Backend endpoints not ready
- Frontend is complete
- Contact technical team

**What you can do:**
- Explore the UI
- Test interactions
- Provide feedback on design
- Wait for backend completion

---

## 🐛 Troubleshooting

### Issue: No Images Showing
**Possible Causes:**
- No images uploaded yet
- API not implemented
- Network connectivity
- Authentication expired

**Solution:**
1. Check warning banner
2. Try pull-to-refresh
3. Check internet connection
4. Re-login if needed

### Issue: Delete Not Working
**Possible Causes:**
- API not implemented
- Network error
- Insufficient permissions

**Solution:**
1. Check error message
2. Verify admin access
3. Check backend status
4. Contact support

### Issue: Images Not Loading
**Possible Causes:**
- Signed URLs expired
- S3/MinIO unavailable
- Network issues

**Solution:**
1. Pull to refresh
2. Wait and retry
3. Check storage service status

---

## 💡 Pro Tips

1. **Efficient Browsing**
   - Use sort to find files quickly
   - Check file size before preview
   - Use search (coming soon)

2. **Bulk Operations**
   - Select all visible for quick cleanup
   - Sort by size to find large files
   - Review before deleting

3. **Storage Management**
   - Monitor usage percentage
   - Delete unused images regularly
   - Check progress bar color

4. **Performance**
   - Thumbnails load faster
   - Grid is paginated for speed
   - Pull-to-refresh updates stats

---

## 📋 Keyboard Shortcuts

Not applicable - touch-based interface

---

## 📊 Data Format

### File Sizes
Displayed in human-readable format:
- B (Bytes)
- KB (Kilobytes)
- MB (Megabytes)
- GB (Gigabytes)

### Dates
- Shown in local timezone
- Format: Jan 15, 2025
- Relative times (coming soon)

---

## 🎯 Use Cases

### Daily Monitoring
- Check storage usage
- Review recent uploads
- Clean up old images

### Bulk Cleanup
- Sort by size
- Select large files
- Bulk delete
- Free up space

### Image Audit
- Review all uploads
- Check uploaded by info
- Verify file names
- Delete unauthorized

---

## 📝 Notes

- Images are stored in S3/MinIO
- Thumbnails improve performance
- Signed URLs expire after time
- All deletions are permanent
- Audit log tracks deletions (backend)

---

## 🚀 Quick Start

1. **Open Admin Dashboard**
2. **Tap "Image Storage"**
3. **View statistics** at top
4. **Browse images** in grid
5. **Tap to preview** any image
6. **Long-press to select** multiple
7. **Use Delete** to remove

---

## 📞 Support

### For Issues
- Check troubleshooting section
- Review backend status
- Contact technical team

### For Features
- Request enhancements
- Provide UI feedback
- Suggest improvements

---

## ✨ Quick Reference Commands

```typescript
// Refresh images and stats
refreshData()

// Load next page
loadMore()

// Delete single image
deleteImage(imageId, key)

// Delete selected images
bulkDeleteImages()

// Toggle selection
toggleImageSelection(imageId)

// Select all visible
selectAllImages()

// Clear selection
clearSelection()

// Change sort
setSortBy('uploadedAt' | 'fileName' | 'fileSize')

// Toggle order
toggleSortOrder()
```

---

## 🎓 Learning Resources

- Full implementation: `IMAGE_STORAGE_IMPLEMENTATION_COMPLETE.md`
- Code location: `apps/mobile/src/components/admin/sections/imageStorage/`
- ViewModel: `useImageStorageViewModel.ts`
- Types: `apps/mobile/src/types/admin.ts`
- API spec: See implementation doc

---

## 🔗 Related Sections

- **Statistics** - View storage metrics
- **Analytics** - Usage trends
- **User Management** - See who uploaded

---

## 📈 Metrics Displayed

### Storage Stats
- **Total Size** - Maximum available
- **Used Space** - Currently consumed
- **Available** - Remaining space
- **File Count** - Number of images
- **Usage %** - Percentage used

### Per Image
- **File Name** - Original name
- **File Size** - In readable format
- **Upload Date** - When uploaded
- **Uploader** - Who uploaded
- **MIME Type** - File type (internal)

---

## 🎨 Color Coding

| Element | Color | Usage |
|---------|-------|-------|
| Normal Usage | Blue (#3B82F6) | < 70% |
| Warning | Amber (#F59E0B) | 70-89% |
| Danger | Red (#EF4444) | > 90% |
| Selected | Primary | Selected items |
| Delete | Red | Destructive actions |

---

## 🔄 Status Indicators

### Loading
- Spinner in center (initial)
- Pull indicator (refresh)
- Footer spinner (load more)
- Button spinner (deleting)

### Selection
- Blue border + checkmark
- Count in toolbar
- "X selected" text

### Empty
- Large icon
- "No images" message
- Helpful description

---

## 📖 Glossary

- **Storage Stats** - Usage metrics
- **Grid View** - Thumbnail layout
- **Preview Modal** - Full-screen view
- **Bulk Selection** - Multiple items
- **Signed URL** - Temporary access link
- **Thumbnail** - Small preview image
- **S3/MinIO** - Object storage system
- **Bucket** - Storage container

---

## 🎯 Success Metrics

### User Goals
- ✅ Easy to view storage usage
- ✅ Simple image browsing
- ✅ Quick preview
- ✅ Efficient deletion
- ✅ Clear feedback

### Performance Goals
- ✅ Fast grid loading
- ✅ Smooth scrolling
- ✅ Quick actions
- ✅ Minimal lag

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Production Ready (Frontend) ✅  
**Backend:** Pending Implementation ⏳