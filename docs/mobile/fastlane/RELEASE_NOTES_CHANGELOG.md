# Plan: Fastlane Release Notes + In-App Changelog

## Context
TestFlight uploads currently have no "What's New" text (hardcoded to `nil` because `SKIP_WAITING_FOR_BUILD_PROCESSING=true`). Goals:
1. Store release notes as files in the repo
2. Upload them to TestFlight automatically
3. Display a compiled changelog in the mobile app's Settings screen

## Approach: Two-step workflow (fast upload + separate distribute)

Keep `skip_waiting=true` for the upload step, then add a `distribute` lane that runs after Apple finishes processing to set changelog and distribute to test groups.

---

### Step 1: Create changelog directory + initial file

Create `apps/mobile/changelogs/` with a TypeScript data file (not raw `.md` — easier to import and iterate in RN):

**New file:** `apps/mobile/changelogs/releases.ts`
```ts
export interface ReleaseNote {
  version: string;
  build: number;
  date: string;
  notes: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.0.114',
    build: 115,
    date: '2026-03-19',
    notes: [
      'Admin notification system for new signups',
      'Consolidated shared types to shared package',
      'Patient anonymity improvements',
    ],
  },
  // Add new entries at the top before each release
];
```

Also create a plain text file for Fastlane to read (Fastlane is Ruby, can't import TS):

**New file:** `apps/mobile/changelogs/LATEST.txt`
```
- Admin notification system for new signups
- Consolidated shared types to shared package
- Patient anonymity improvements
```

### Step 2: Update Fastfile — read changelog + add distribute lane

**File:** `apps/mobile/ios/fastlane/Fastfile`

Add helper after `app_store_connect_key_path!`:
```ruby
def read_changelog
  path = File.expand_path("../../changelogs/LATEST.txt", __dir__)
  File.exist?(path) ? File.read(path).strip : "Bug fixes and improvements"
end
```

Add new `distribute` lane that runs after build processing completes:
```ruby
lane :distribute do |options|
  key_path = app_store_connect_key_path!
  api_key = {
    key_id: ENV['APP_STORE_CONNECT_API_KEY_ID'],
    issuer_id: ENV['APP_STORE_CONNECT_ISSUER_ID'],
    key: File.binread(key_path)
  }

  # Wait for the latest build to finish processing
  upload_to_testflight(
    api_key: api_key,
    skip_upload: true,
    skip_waiting_for_build_processing: false,
    changelog: read_changelog,
    distribute_external: true,
    groups: ["Internal Testers", "External Testers"],
    notify_external_testers: options[:notify] != false,
  )
end
```

Add npm script in `apps/mobile/package.json`:
```json
"deploy:ios:distribute": "cd ios && BUNDLE_GEMFILE=$(pwd)/../Gemfile bundle exec fastlane distribute"
```

### Step 3: Add "What's New" accordion in SettingsSheet

**File:** `apps/mobile/src/screens/settings/SettingsSheet.tsx`

Add a "WHAT'S NEW" section (before the SUPPORT section) using the existing `AccordionItem` from `apps/mobile/src/components/ui/Accordion.tsx`:

```tsx
import { AccordionItem } from '../../components/ui/Accordion';
import { FileText } from 'lucide-react-native';
import { releaseNotes } from '../../../changelogs/releases';

// In the JSX, before SUPPORT section:
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
    WHAT'S NEW
  </Text>
  <View style={styles.sectionContent}>
    {releaseNotes.slice(0, 5).map((release) => (
      <AccordionItem
        key={release.version}
        title={`v${release.version} — ${release.date}`}
        icon={<FileText size={20} color={colors.primary} strokeWidth={2} />}
      >
        {release.notes.map((note, i) => (
          <Text key={i} style={{ color: colors.text, marginBottom: 4 }}>
            • {note}
          </Text>
        ))}
      </AccordionItem>
    ))}
  </View>
</View>
```

---

## Files to create
- `apps/mobile/changelogs/releases.ts` — typed release notes array (for in-app display)
- `apps/mobile/changelogs/LATEST.txt` — plain text for Fastlane to read

## Files to modify
- `apps/mobile/ios/fastlane/Fastfile` — add `read_changelog` helper + `distribute` lane
- `apps/mobile/package.json` — add `deploy:ios:distribute` script
- `apps/mobile/src/screens/settings/SettingsSheet.tsx` — add "What's New" accordion section

## Workflow after implementation
1. Before deploying, update `changelogs/releases.ts` (add entry at top) and `changelogs/LATEST.txt`
2. Run `npm run deploy:ios:rock-beta` — uploads IPA (fast, no waiting)
3. Run `npm run deploy:ios:distribute` — waits for processing, sets "What to Test" text, distributes to both Internal + External Testers groups
4. The changelog is visible in-app immediately (bundled at build time in step 2)

## Verification
- Deploy a build and run the distribute lane — check TestFlight shows "What to Test" text
- Open the app → Settings → confirm "What's New" accordion shows release entries
