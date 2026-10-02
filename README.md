# Khalil Badr Eddine — 3D dot portfolio

A portfolio drawn in ~24,000 3D dots. Scroll and the dots break loose and
chase your cursor; stop and they re-form into a scene for the section you're
on:

| Section | Scene |
|---|---|
| Hero | My face, sampled from a photo, with a dotted orbit |
| About me | A big-headed me that waves; the head tilts toward your cursor |
| The Recipe Seeker | A bowl with steam, floating leaves and a recipe card |
| Payments | A card with a glowing chip and "3D SECURE", on an orbit |
| Projects | Me at a desk at night: monitors typing code and project titles, flashing keys, a lamp, a city window |
| Contact | An envelope that opens and a "LET'S TALK" letter rises out |

Some dots sparkle, a band of light sweeps across each scene, the cursor
glows, and bloom makes the bright dots bleed light.

Built with React, TypeScript, Vite and React Three Fiber.

## Run it

```bash
npm install
npm run dev
```

## How it works

- `scripts/make_portrait.py` removes the photo's background (rembg), levels
  the eyes, corrects the low camera angle, eases the smile, and writes
  `public/portrait.png` (hero) and `public/head.png` (the figure's head).
- `src/particles/sampleImage.ts` samples dots from those images, weighted by
  brightness and Sobel edges, and gives the face depth.
- `src/scenes/` builds one dot scene per section. `rig.ts` groups dots into
  rigid parts with per-frame transforms; `figure.ts` is the posable
  big-headed body; `orbit.ts` the dotted orbit with a satellite.
- `src/particles/DotField.tsx` runs spring physics on every dot: when
  scrolling, each dot orbits the cursor; when scrolling stops, the dots spring
  into the active section's scene with a staggered draw-in.
- `src/particles/shaders.ts` draws the dots: halftone tone, sparkles, the
  light sweep, cursor glow, and the monitor's code and titles.
- `src/content.ts` holds all page text and which scene each section uses.

## Changing the photo

```bash
pip install pillow numpy "rembg[cpu]"
python scripts/make_portrait.py path/to/photo.jpg
```

The eye, mouth and crop coordinates at the top of the script are tuned for
the current photo, so re-measure them for a new one.

## Deploy

Deployed on Vercel (`vercel.json`). Import the repository at
[vercel.com/new](https://vercel.com/new); Vercel detects Vite, builds with
`npm run build` and serves `dist`. Every push then redeploys.
