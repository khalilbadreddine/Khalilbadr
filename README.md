# Khalil Badr Eddine — 3D dot portfolio

A portfolio where I'm drawn out of ~24,000 3D dots. Scroll and the dots break
loose and chase your cursor; stop and they re-form. Hover over the face to
brush the dots away and watch it heal.

Built with React, TypeScript, Vite and React Three Fiber.

## Run it

```bash
npm install
npm run dev
```

## How it works

- `scripts/make_portrait.py` cuts the photo out of its background (rembg),
  crops it to head and shoulders and writes `public/portrait.png`.
- `src/particles/samplePortrait.ts` samples dots from that image, weighted by
  brightness and Sobel edges, and gives the face depth with an ellipsoid bulge.
- `src/particles/DotField.tsx` runs spring physics on every dot each frame:
  when scrolling, each dot orbits the cursor on its own ring; when scrolling
  stops, the dots spring back to the portrait with a staggered draw-in.
- `src/hooks/useScrollState.ts` feeds scroll, pointer and touch input into a
  small mutable store (`src/state/motion.ts`) that the render loop reads.

## Changing the photo

```bash
pip install pillow numpy "rembg[cpu]"
python scripts/make_portrait.py path/to/photo.jpg
```

The crop box and clean-up polygons at the top of the script are tuned for the
current photo, so adjust them for a new one.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages
(Settings → Pages → Source: **GitHub Actions**).
