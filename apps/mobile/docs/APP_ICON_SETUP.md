# App icons

App icons are **generated**, not hand-placed. Do not drop files into
`Images.xcassets` or `res/mipmap-*` by hand — the next generator run overwrites them.

## Regenerating

```bash
python3 scripts/brand/generate_brand_assets.py            # everything
python3 scripts/brand/generate_brand_assets.py --only ios
python3 scripts/brand/generate_brand_assets.py --only android
```

Python 3 standard library only — no ImageMagick, no Pillow, no `node_modules`.
The mark's geometry lives in the constants at the top of that script; see
[`brand/README.md`](../../../brand/README.md) for the spec.

## What it writes

**iOS** — `ios/FajrEMR/Images.xcassets/AppIcon.appiconset/`, exactly the 11 files
`Contents.json` references (40, 60, 58, 87, 80, 120, 120, 180, 152, 167, 1024 px).

These are written as **opaque RGB with no alpha channel**. App Store validation
rejects an icon with alpha, so if you ever replace the generator, keep that
property. Verify with:

```bash
sips -g hasAlpha ios/FajrEMR/Images.xcassets/AppIcon.appiconset/icon-ios-1024x1024.png
```

**Android** — `android/app/src/main/res/`:

| Path | Purpose |
|---|---|
| `mipmap-*/ic_launcher.png` | legacy launcher icon, opaque |
| `mipmap-*/ic_launcher_round.png` | circular variant, alpha outside the disc |
| `mipmap-*/ic_launcher_foreground.png` | adaptive foreground, 108dp canvas |
| `mipmap-anydpi-v26/ic_launcher[_round].xml` | adaptive icon definition |
| `drawable/ic_launcher_background.xml` | solid white background layer |

The adaptive icon matters: without `mipmap-anydpi-v26/` the app renders inside a
white squircle badge on Android 8+. That directory was previously generated into
a staging folder and never copied into the project, so the app shipped without
one.

**In-app mark** — `src/assets/firstline-mark{,@2x,@3x}.png`, a black-on-transparent
mask. Render it through `components/icons/FirstlineMark.tsx`, which applies
`tintColor`; used untinted it is invisible in dark mode.

## Small sizes are not scale-downs

The generator thickens the stroke and tightens the inset as the canvas shrinks,
reaching the master geometry at 120px and above. A fixed fractional stroke reads
as a grey hairline at 16–40px because antialiasing softens roughly a constant
pixel at each edge. If you change the mark, re-check the 40px notification icon.
