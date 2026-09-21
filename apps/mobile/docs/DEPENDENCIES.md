# Mobile App Dependencies

This document lists the required dependencies for the mobile app, particularly for the new form components and patient detail screen.

## Required Dependencies

### Core Dependencies

These should already be in your `package.json`:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.72.0"
  }
}
```

### New Dependencies Required

Install these packages for the form components and patient detail screen:

```bash
npm install lucide-react-native date-fns @react-native-community/datetimepicker
```

Or with yarn:

```bash
yarn add lucide-react-native date-fns @react-native-community/datetimepicker
```

#### Package Details

1. **lucide-react-native** - Icon library
   - Used for: Icons in all form components and UI
   - Version: `^0.263.0` or later
   - Alternative: react-native-vector-icons

2. **date-fns** - Date utility library
   - Used for: Date formatting in DatePickerField
   - Version: `^2.30.0` or later
   - Alternative: moment, dayjs

3. **@react-native-community/datetimepicker** - Native date picker
   - Used for: DatePickerField component
   - Version: `^7.6.0` or later
   - **iOS:** Works out of the box
   - **Android:** May require additional setup

## Platform-Specific Setup

### iOS Setup

After installing dependencies:

```bash
cd ios
pod install
cd ..
```

### Android Setup

The `@react-native-community/datetimepicker` should work automatically, but if you encounter issues:

1. Ensure your `android/build.gradle` has:
```gradle
minSdkVersion = 21
```

2. Sync Gradle files in Android Studio

## Optional Dependencies

### For Enhanced Functionality

```bash
npm install react-native-image-picker react-native-document-picker
```

These are useful for:
- `react-native-image-picker` - Media uploads in patient detail screen
- `react-native-document-picker` - Document uploads

### For Form Validation

```bash
npm install react-hook-form zod
```

These can enhance form handling:
- `react-hook-form` - Advanced form state management
- `zod` - Schema validation

## Dev Dependencies

For TypeScript support:

```bash
npm install --save-dev @types/react @types/react-native
```

## Verification

After installation, verify everything works:

```bash
# Clear cache and reinstall
npm start -- --reset-cache

# iOS
npm run ios

# Android
npm run android
```

## Troubleshooting

### Common Issues

#### Issue: DatePicker not appearing on Android
**Solution:** 
```bash
npm install @react-native-community/datetimepicker
cd android
./gradlew clean
cd ..
npm run android
```

#### Issue: Icons not rendering
**Solution:**
```bash
npm install lucide-react-native
# Clear metro cache
npm start -- --reset-cache
```

#### Issue: TypeScript errors with date-fns
**Solution:**
```bash
npm install --save-dev @types/node
```

#### Issue: Build fails on iOS
**Solution:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

## Version Compatibility

| Package | Minimum Version | Tested Version | React Native |
|---------|----------------|----------------|--------------|
| lucide-react-native | 0.263.0 | 0.300.0 | 0.70+ |
| date-fns | 2.30.0 | 3.0.0 | All |
| @react-native-community/datetimepicker | 7.6.0 | 7.6.2 | 0.70+ |

## Usage in Project

### Import Example

```typescript
// Form Components
import {
  TextInputField,
  DatePickerField,
  SwitchField,
  CheckboxField,
  RadioCardSelector,
  SingleSelectField,
  MultiSelectField,
} from './components/form';

// UI Components
import { Card, CardHeader, CardContent } from './components/ui';
import { Accordion, AccordionItem } from './components/ui';

// Icons
import { User, Mail, Phone, Calendar } from 'lucide-react-native';

// Date utilities
import { format, addDays, subYears } from 'date-fns';
```

### Package.json Example

Your `package.json` should include:

```json
{
  "name": "fajr-medflow-mobile",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.72.0",
    "@react-native-community/datetimepicker": "^7.6.2",
    "date-fns": "^3.0.0",
    "lucide-react-native": "^0.300.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.72.0",
    "typescript": "^5.0.0"
  }
}
```

## Build Configuration

### Metro Config

Ensure your `metro.config.js` includes:

```javascript
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
```

### TypeScript Config

Your `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "commonjs",
    "lib": ["es2017"],
    "jsx": "react-native",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  }
}
```

## License Notes

- **lucide-react-native**: ISC License
- **date-fns**: MIT License
- **@react-native-community/datetimepicker**: MIT License

All dependencies are compatible with commercial projects.

## Support

For issues with specific packages:

- lucide-react-native: https://github.com/lucide-icons/lucide
- date-fns: https://date-fns.org/
- datetimepicker: https://github.com/react-native-datetimepicker/datetimepicker

## Update Schedule

Check for updates monthly:

```bash
npm outdated
npm update
```

Or use automated tools:

```bash
npx npm-check-updates -u
npm install
```
