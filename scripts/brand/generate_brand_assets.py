#!/usr/bin/env python3
"""Generate every Firstline brand raster from one geometry spec.

Zero dependencies -- stdlib only (zlib, struct). No ImageMagick, no Pillow,
no sharp, no node_modules required. Run it any time the mark changes:

    python3 scripts/brand/generate_brand_assets.py

The mark is a single black stroke at 45 degrees, lower-left to upper-right,
inside a square. Everything below is derived from the constants in THE MARK.
Edit those, re-run, and every icon in the repo follows.
"""

from __future__ import annotations

import argparse
import math
import struct
import zlib
from pathlib import Path

# --------------------------------------------------------------------------
# THE MARK -- the whole design lives here
# --------------------------------------------------------------------------

INSET = 0.22          # stroke endpoints, as a fraction of the canvas edge
STROKE_WIDTH = 0.14   # stroke thickness, as a fraction of the canvas edge
# Endpoints run (INSET, 1-INSET) -> (1-INSET, INSET) in normalised, y-down
# coordinates: lower-left to upper-right, i.e. a rising 45-degree line.

FG = (0x00, 0x00, 0x00)   # black line
BG = (0xFF, 0xFF, 0xFF)   # white square

SUPERSAMPLE = 8           # vertical sub-scanlines per pixel row

# -- Optical sizing ---------------------------------------------------------
# Antialiasing softens roughly a constant ~1px at each edge of a 45-degree
# stroke, so a fixed *fractional* width loses proportionally more mass the
# smaller the icon gets: at 16px, STROKE_WIDTH=0.14 is 2.2px and reads as a
# grey hairline rather than a black mark. Icon families normally solve this by
# redrawing at small sizes; here the stroke is thickened and the inset tightened
# on a ramp instead, reaching the master values at OPTICAL_MAX_PX and above.
OPTICAL_MIN_PX = 16
OPTICAL_MAX_PX = 120
SMALL_STROKE = 0.20
SMALL_INSET = 0.15


def optical(size: float) -> tuple[float, float]:
    """(stroke_width, inset) for a given pixel size, as canvas fractions."""
    span = OPTICAL_MAX_PX - OPTICAL_MIN_PX
    t = min(max((size - OPTICAL_MIN_PX) / span, 0.0), 1.0)
    return (SMALL_STROKE + (STROKE_WIDTH - SMALL_STROKE) * t,
            SMALL_INSET + (INSET - SMALL_INSET) * t)

REPO = Path(__file__).resolve().parents[2]


# --------------------------------------------------------------------------
# Geometry
# --------------------------------------------------------------------------

def mark_corners(size: float, scale: float = 1.0) -> list[tuple[float, float]]:
    """The four corners of the stroked segment, in pixel space.

    Butt caps make the stroke an exact rectangle, so the mark is a convex
    quad and can be scanline-filled without any path machinery.
    `scale` shrinks the mark about the canvas centre (used for the Android
    adaptive foreground, which must sit inside the 72/108dp safe zone).
    """
    stroke, inset = optical(size)
    half = stroke / 2.0
    x0, y0 = inset, 1.0 - inset
    x1, y1 = 1.0 - inset, inset

    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    # unit normal to the stroke direction
    nx, ny = -dy / length * half, dx / length * half

    pts = [
        (x0 + nx, y0 + ny),
        (x1 + nx, y1 + ny),
        (x1 - nx, y1 - ny),
        (x0 - nx, y0 - ny),
    ]
    return [((x - 0.5) * scale + 0.5) * size for x, _ in pts], [
        ((y - 0.5) * scale + 0.5) * size for _, y in pts
    ]


def corners_xy(size: float, scale: float = 1.0) -> list[tuple[float, float]]:
    xs, ys = mark_corners(size, scale)
    return list(zip(xs, ys))


# --------------------------------------------------------------------------
# Rasteriser -- convex scanline fill with analytic horizontal coverage
# --------------------------------------------------------------------------

def rasterise(size: int, corners: list[tuple[float, float]],
              ss: int = SUPERSAMPLE) -> list[float]:
    """Antialiased coverage in [0,1] per pixel, row-major, length size*size.

    Horizontal coverage is exact (the span endpoints are real numbers and the
    partial end pixels get their true fraction); only the vertical direction
    is supersampled. That is what keeps this fast enough in pure Python to
    render a 1024px icon in well under a second.
    """
    cov = [0.0] * (size * size)
    n = len(corners)
    inv = 1.0 / ss

    for py in range(size):
        base = py * size
        for s in range(ss):
            y = py + (s + 0.5) * inv
            lo = None
            hi = None
            for i in range(n):
                ax, ay = corners[i]
                bx, by = corners[(i + 1) % n]
                if ay == by:
                    continue
                if (ay <= y < by) or (by <= y < ay):
                    x = ax + (y - ay) / (by - ay) * (bx - ax)
                    if lo is None or x < lo:
                        lo = x
                    if hi is None or x > hi:
                        hi = x
            if lo is None or hi <= lo:
                continue
            if hi <= 0 or lo >= size:
                continue
            lo = max(lo, 0.0)
            hi = min(hi, float(size))

            ia = int(lo)
            ib = int(math.ceil(hi)) - 1
            if ia == ib:
                cov[base + ia] += (hi - lo) * inv
            else:
                cov[base + ia] += (ia + 1 - lo) * inv
                for px in range(ia + 1, ib):
                    cov[base + px] += inv
                if ib < size:
                    cov[base + ib] += (hi - ib) * inv
    return cov


def circle_alpha(size: int, ss: int = 4) -> list[float]:
    """Coverage of the inscribed circle -- the mask for ic_launcher_round."""
    r = size / 2.0
    cx = cy = r
    inv = 1.0 / ss
    out = [0.0] * (size * size)
    step = 1.0 / (ss * ss)
    for py in range(size):
        base = py * size
        for px in range(size):
            # cheap accept/reject before subsampling the boundary
            d = math.hypot(px + 0.5 - cx, py + 0.5 - cy)
            if d < r - 1.5:
                out[base + px] = 1.0
                continue
            if d > r + 1.5:
                continue
            acc = 0
            for sy in range(ss):
                for sx in range(ss):
                    if math.hypot(px + (sx + 0.5) * inv - cx,
                                  py + (sy + 0.5) * inv - cy) <= r:
                        acc += 1
            out[base + px] = acc * step
    return out


# --------------------------------------------------------------------------
# PNG / ICO writers
# --------------------------------------------------------------------------

def _chunk(tag: bytes, data: bytes) -> bytes:
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def encode_png(size: int, pixels: bytes, colour_type: int) -> bytes:
    """colour_type 2 = RGB (opaque), 6 = RGBA."""
    bpp = 3 if colour_type == 2 else 4
    stride = size * bpp
    raw = bytearray()
    for y in range(size):
        raw.append(0)                       # filter: none
        raw += pixels[y * stride:(y + 1) * stride]
    return (b"\x89PNG\r\n\x1a\n"
            + _chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8,
                                          colour_type, 0, 0, 0))
            + _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
            + _chunk(b"IEND", b""))


def compose(size: int, *, opaque: bool, scale: float = 1.0,
            fg=FG, bg=BG, round_mask: bool = False) -> bytes:
    """Render the mark and return packed pixel bytes.

    opaque=True  -> RGB, line composited over the solid square (store icons,
                    which must have no alpha channel at all).
    opaque=False -> RGBA, line on transparency (tintable mask).
    """
    cov = rasterise(size, corners_xy(size, scale))
    mask = circle_alpha(size) if round_mask else None
    out = bytearray()
    for i in range(size * size):
        c = cov[i]
        if opaque:
            out += bytes(round(bg[k] + (fg[k] - bg[k]) * c) for k in range(3))
        else:
            if mask is not None:
                # white disc behind the line, both clipped to the circle
                a = mask[i]
                out += bytes(round(bg[k] + (fg[k] - bg[k]) * c)
                             for k in range(3)) + bytes([round(a * 255)])
                continue
            out += bytes(fg) + bytes([round(c * 255)])
    return bytes(out)


def write_png(path: Path, size: int, **kw) -> None:
    opaque = kw.get("opaque", True)
    data = compose(size, **kw)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encode_png(size, data, 2 if opaque else 6))
    print(f"  {size:>5}px  {path.relative_to(REPO)}")


def write_ico(path: Path, sizes=(16, 32, 48)) -> None:
    """ICO with embedded PNGs -- supported by every browser and Windows Vista+."""
    blobs = [encode_png(s, compose(s, opaque=True), 2) for s in sizes]
    header = struct.pack("<HHH", 0, 1, len(sizes))
    offset = 6 + 16 * len(sizes)
    entries = b""
    for s, blob in zip(sizes, blobs):
        entries += struct.pack("<BBBBHHII", s if s < 256 else 0,
                               s if s < 256 else 0, 0, 0, 1, 32,
                               len(blob), offset)
        offset += len(blob)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(header + entries + b"".join(blobs))
    print(f"  {'/'.join(str(s) for s in sizes)}  {path.relative_to(REPO)}")


def write_wide_png(path: Path, w: int, h: int) -> None:
    """Opengraph card: the mark centred on the square, letterboxed to w x h."""
    side = min(w, h)
    cov = rasterise(side, corners_xy(side, 0.62))
    ox, oy = (w - side) // 2, (h - side) // 2
    rows = []
    for y in range(h):
        row = bytearray()
        for x in range(w):
            c = 0.0
            if oy <= y < oy + side and ox <= x < ox + side:
                c = cov[(y - oy) * side + (x - ox)]
            row += bytes(round(BG[k] + (FG[k] - BG[k]) * c) for k in range(3))
        rows.append(bytes(row))
    raw = bytearray()
    for r in rows:
        raw.append(0)
        raw += r
    blob = (b"\x89PNG\r\n\x1a\n"
            + _chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
            + _chunk(b"IEND", b""))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(blob)
    print(f"  {w}x{h}  {path.relative_to(REPO)}")


# --------------------------------------------------------------------------
# Vector masters
# --------------------------------------------------------------------------

def svg_mark(vb: int = 1024, colour: str = "currentColor") -> str:
    x0, y0 = INSET * vb, (1 - INSET) * vb
    x1, y1 = (1 - INSET) * vb, INSET * vb
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb} {vb}" '
        f'width="{vb}" height="{vb}" role="img" aria-label="Firstline">\n'
        f'  <title>Firstline</title>\n'
        f'  <line x1="{x0:g}" y1="{y0:g}" x2="{x1:g}" y2="{y1:g}"\n'
        f'        stroke="{colour}" stroke-width="{STROKE_WIDTH * vb:g}" '
        f'stroke-linecap="butt" />\n'
        f'</svg>\n'
    )


ANDROID_BG_XML = """<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/brand/generate_brand_assets.py -- do not edit. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#FFFFFF" android:pathData="M0,0h108v108h-108z"/>
</vector>
"""

ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/brand/generate_brand_assets.py -- do not edit. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""


# --------------------------------------------------------------------------
# Targets
# --------------------------------------------------------------------------

WEB = REPO / "apps/web"
MOBILE = REPO / "apps/mobile"
IOS_ICONS = MOBILE / "ios/FajrEMR/Images.xcassets/AppIcon.appiconset"
ANDROID_RES = MOBILE / "android/app/src/main/res"

# The 11 iOS files Contents.json actually references, and their real pixel sizes.
IOS_SIZES = {
    "icon-ios-20x20@2x.png": 40,
    "icon-ios-20x20@3x.png": 60,
    "icon-ios-29x29@2x.png": 58,
    "icon-ios-29x29@3x.png": 87,
    "icon-ios-40x40@2x.png": 80,
    "icon-ios-40x40@3x.png": 120,
    "icon-ios-60x60@2x.png": 120,
    "icon-ios-60x60@3x.png": 180,
    "icon-ios-76x76@2x.png": 152,
    "icon-ios-83.5x83.5@2x.png": 167,
    "icon-ios-1024x1024.png": 1024,
}

ANDROID_DENSITIES = {
    "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192,
}
# Adaptive foreground is a 108dp canvas where the legacy icon is 48dp.
ADAPTIVE_SCALE = 108 / 48
# Only the inner 72 of those 108dp are guaranteed visible, and the launcher may
# mask the rest to ANY shape -- including a circle. So the binding constraint is
# the mark's corner *radius* from the centre, not its bounding box: a diagonal
# stroke whose box fits a square safe zone can still have its tips clipped by a
# circular mask. Derive the scale from the geometry instead of guessing it, so
# it stays correct if the mark changes.
ADAPTIVE_SAFE_FRACTION = 72 / 108
ADAPTIVE_SAFE_MARGIN = 0.96


def _adaptive_safe_scale() -> float:
    cx = 0.5
    unit_radius = max(math.hypot(x / 1000.0 - cx, y / 1000.0 - cx)
                      for x, y in corners_xy(1000.0, 1.0))
    return (0.5 * ADAPTIVE_SAFE_FRACTION) / unit_radius * ADAPTIVE_SAFE_MARGIN


ADAPTIVE_SAFE_SCALE = _adaptive_safe_scale()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", choices=["brand", "web", "ios", "android"],
                    action="append", help="limit to one target group")
    args = ap.parse_args()
    want = set(args.only or ["brand", "web", "ios", "android"])

    if "brand" in want:
        print("brand/")
        d = REPO / "brand"
        d.mkdir(parents=True, exist_ok=True)
        (d / "firstline-mark.svg").write_text(svg_mark())
        print(f"  svg    {(d / 'firstline-mark.svg').relative_to(REPO)}")
        write_png(d / "firstline-mark-1024.png", 1024, opaque=True)

    if "web" in want:
        print("apps/web/")
        img = WEB / "public/assets/images"
        (img / "logo.svg").write_text(svg_mark())
        print(f"  svg    {(img / 'logo.svg').relative_to(REPO)}")
        write_ico(WEB / "public/favicon.ico")
        write_png(WEB / "app/icon.png", 512, opaque=True)
        write_png(WEB / "app/apple-icon.png", 180, opaque=True)
        write_wide_png(WEB / "app/opengraph-image.png", 1200, 630)

    if "ios" in want:
        print("apps/mobile/ios/  (opaque RGB -- App Store rejects alpha)")
        for name, px in IOS_SIZES.items():
            write_png(IOS_ICONS / name, px, opaque=True)
        print("apps/mobile/src/assets/  (transparent mask for tintColor)")
        for suffix, mult in (("", 1), ("@2x", 2), ("@3x", 3)):
            write_png(MOBILE / f"src/assets/firstline-mark{suffix}.png",
                      180 * mult, opaque=False)

    if "android" in want:
        print("apps/mobile/android/")
        for density, px in ANDROID_DENSITIES.items():
            write_png(ANDROID_RES / f"mipmap-{density}/ic_launcher.png",
                      px, opaque=True)
            write_png(ANDROID_RES / f"mipmap-{density}/ic_launcher_round.png",
                      px, opaque=False, round_mask=True)
            write_png(ANDROID_RES / f"mipmap-{density}/ic_launcher_foreground.png",
                      round(px * ADAPTIVE_SCALE), opaque=False,
                      scale=ADAPTIVE_SAFE_SCALE)
        anydpi = ANDROID_RES / "mipmap-anydpi-v26"
        anydpi.mkdir(parents=True, exist_ok=True)
        (anydpi / "ic_launcher.xml").write_text(ADAPTIVE_XML)
        (anydpi / "ic_launcher_round.xml").write_text(ADAPTIVE_XML)
        (ANDROID_RES / "drawable/ic_launcher_background.xml").write_text(ANDROID_BG_XML)
        print(f"  xml    {anydpi.relative_to(REPO)}/ic_launcher[_round].xml")
        print(f"  xml    res/drawable/ic_launcher_background.xml")
        write_png(REPO / "brand/playstore-icon.png", 512, opaque=True)


if __name__ == "__main__":
    main()
