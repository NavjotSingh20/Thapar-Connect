# Brand Assets: Thapar Connect

This directory contains visual brand assets for Thapar Connect, tailored for the Thapar Institute of Engineering and Technology (TIET) community.

## Logo Specifications

- **File**: `thapar-logo.png` (or `thapar-logo.svg`)
- **Default Resolution**: 512x512 pixels (square)
- **Format**: PNG with alpha transparency or Scalable Vector Graphics (SVG)
- **Color Palette**:
  - Primary Brand Maroon: `#800000` (RGB: 128, 0, 0)
  - Deep Campus Maroon: `#4A0404` (RGB: 74, 4, 4)
  - Gold Accent: `#D4AF37` (RGB: 212, 175, 55)

## Replacement Guide

To replace this placeholder with the official Thapar Institute seal or updated high-resolution crest:
1. Export the official crest at 512x512 PNG with a transparent background.
2. Save the file to `frontend/src/assets/thapar-logo.png` (and copy to `frontend/public/thapar-logo.png`).
3. Generate PWA app icons (192x192 and 512x512) and place in `frontend/public/icon-192.png` and `frontend/public/icon-512.png`.
4. Rebuild the frontend (`npm run build`) to bundle the new asset.
