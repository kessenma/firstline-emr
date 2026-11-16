# Firstline brand assets

The mark is a single black stroke at 45°, rising left to right, inside a square.

## Don't hand-edit the rasters

Every PNG and ICO in this repo is generated from one geometry spec by
[`scripts/brand/generate_brand_assets.py`](../scripts/brand/generate_brand_assets.py).
Change the constants at the top of that file and re-run it:

```bash
python3 scripts/brand/generate_brand_assets.py           # everything
python3 scripts/brand/generate_brand_assets.py --only web
```

It needs nothing installed — Python 3 standard library only, no ImageMagick,
no Pillow, no `node_modules`. It writes 33 files in about two seconds.

## The spec

| | |
|---|---|
| Angle | 45°, lower-left → upper-right |
| Stroke width | 14% of the canvas edge |
| Inset | endpoints at 22% / 78% |
| Caps | butt — so the stroke is an exact rectangle |
| Colour | `#000000` on `#FFFFFF` |

### Optical sizing

Small icons are **not** simple scale-downs. Antialiasing softens roughly a
constant pixel at each edge of a 45° stroke, so a fixed fractional width loses
proportionally more mass the smaller the icon gets — at 16px a 14% stroke is
2.2px and reads as a grey hairline. The generator ramps the stroke to 20% and
tightens the inset to 15% as size falls to 16px, reaching the master values at
120px and above. Large icons are therefore exactly the spec in the table; the
favicon is deliberately a slightly different drawing.

## Files

| File | What it is |
|---|---|
| `firstline-mark.svg` | **The master.** Uses `currentColor`, so it inherits theme colour. |
| `firstline-mark-1024.png` | Flat preview for anywhere that can't render SVG. |
| `playstore-icon.png` | 512×512 Play Console listing icon. |
| `firstline-mark.af` | Affinity source — see below. Not generated. |

Generated into the apps, and not to be edited there:
`apps/web/public/assets/images/logo.svg`, `apps/web/public/favicon.ico`,
`apps/web/app/{icon,apple-icon,opengraph-image}.png`,
`apps/mobile/src/assets/firstline-mark{,@2x,@3x}.png`,
the 11 referenced sizes in `AppIcon.appiconset/`, and the Android `mipmap-*`
launcher icons plus `mipmap-anydpi-v26/` adaptive XML.

## Editing in Affinity

SVG is the interchange format on purpose: it diffs in git, reviews in a pull
request, and opens losslessly in Affinity Designer, Illustrator, Figma and
Inkscape. For a mark that is one stroked rectangle, it is exact.

To keep a native Affinity source alongside it, open `firstline-mark.svg` in
Affinity Designer and save `firstline-mark.af` next to it. That file is for
humans — the generator does not read it, so if you change the design there,
mirror the numbers back into the constants in the generator or the two will
drift.

`.ai` is deliberately not used here: it is Adobe's proprietary format, Affinity
cannot save to it, and a binary master would lock out contributors who don't
own the app.

## Using the mark in code

**Web** — import the inline component so it follows light/dark:

```tsx
import { FirstlineMark } from "@/components/brand/FirstlineMark";
<FirstlineMark className="h-8 w-8 text-foreground" />
```

An `<img src="logo.svg">` cannot inherit theme colour; use the component for
anything that sits on a themed surface.

**Mobile** — the PNG is a black-on-transparent mask, so tint it:

```tsx
<Image source={require('@/assets/firstline-mark.png')}
       style={{ tintColor: theme.colors.text }} />
```

Without `tintColor` the mark is invisible in dark mode.
