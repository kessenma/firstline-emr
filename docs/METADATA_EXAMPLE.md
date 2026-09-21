> **📋 File Migration Info**
> - **Original Location:** `LIVEKIT_SETUP_SUMMARY.md`
> - **Moved Date:** 2024-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# LiveKit Setup Summary

This is an example of what a migrated file looks like. The migration script adds metadata at the top of each moved file showing:

1. **Original Location** - Where the file used to be (full path from project root)
2. **Moved Date** - When the migration happened
3. **Moved By** - Which script performed the migration

This metadata helps you:
- Track the history of documentation reorganization
- Understand where files came from
- Update any broken links (you know the old path)
- Audit the migration process

## Original Content Starts Here

Everything below the metadata line (---) is your original file content, completely preserved and unchanged.

The metadata is in a blockquote format (>) so it appears as a note at the top of the document when rendered in markdown viewers.

## Benefits of This Approach

- ✅ Non-intrusive - Appears as a note, not part of main content
- ✅ Preserves original content exactly as it was
- ✅ Helps with link updates and troubleshooting
- ✅ Creates an audit trail for documentation changes
- ✅ Makes it easy to find original references if needed

## Example: Updating a Broken Link

If another file referenced this as:
```
[Setup Guide](./LIVEKIT_SETUP_SUMMARY.md)
```

You now know it should be:
```
[Setup Guide](./docs/features/livekit/setup-summary.md)
```

The metadata at the top tells you the original path!