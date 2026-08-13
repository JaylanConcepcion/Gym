# Powerlifting Tracker

An offline-first PWA for powerlifters. Log lifts with RPE, get instant estimated-1RM numbers, and
watch week-to-week strength and bodyweight trends. Built to be added to an iPhone home screen and
used at the gym with zero connectivity.

## Features

- Fast set logging: weight × reps @ RPE (0.5 steps), with repeat-last-set prefill and live e1RM per set
- RPE-aware estimated 1RM using the standard RTS-style percentage chart (`n = reps + (10 − RPE)`),
  linearly interpolated, with an anchored Epley fallback past 12 effective reps
- Progress charts (Recharts): weekly-best e1RM, top-set weight per session, weekly tonnage
- Bodyweight log with a 7-day rolling average trend line
- PR board: best single, all-time best e1RM, and rep PRs for 1–10 reps
- lb/kg toggle (weights stored unit-agnostic in kg), custom exercises, JSON export/import backup
- All data stays on-device (browser storage) — no accounts, no server

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev        # dev server at http://localhost:5173/Gym/
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build locally
npm run icons      # regenerate PNG icons from public/favicon.svg
```

## Deployment

Every push to `main` builds and deploys to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The Vite `base` is `/Gym/`, which
must match the repo name.

## Install on iPhone

1. Open the GitHub Pages URL in Safari.
2. Tap Share → **Add to Home Screen**.
3. Launch from the home screen — it runs full-screen and works offline.

Data is per-device. Use Settings → Backup to export/import your training history as JSON.
