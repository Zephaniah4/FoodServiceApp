# FoodServiceApp Change Summary (2026-03-06)

## Scope
This file documents all changes completed during this session to:
- sync local workspace with GitHub `main`
- support 3 locations (Plano/Dallas, Garland, Rowlett)
- isolate each location to separate Firebase projects/databases
- simplify run/build commands
- prepare Firestore admin role model

---

## 1) Repository and build stabilization

### Completed
- Mirrored local workspace to match GitHub `main`.
- Fixed frontend dependency conflicts so normal install/build works without `--legacy-peer-deps`.
- Verified successful client builds for:
  - default Plano/Dallas
  - Garland
  - Rowlett

### Files changed
- `client/package.json`
- `client/package-lock.json`

### Key dependency updates
- Added `cross-env` for location-specific npm scripts.
- Aligned TypeScript/i18n dependency compatibility for `react-scripts@5`.

---

## 2) Multi-location architecture (3 locations)

### Completed
Added a location configuration layer with three locations:
- `planoDallas` (default/current production behavior)
- `garland`
- `rowlett`

### Files added/changed
- Added: `client/src/locationConfig.js`
- Updated: `client/src/firebase.js`
- Updated: `client/src/App.jsx`
- Updated: `client/src/Home.jsx`

### Behavior implemented
- Default remains `planoDallas` if no location is specified.
- Garland/Rowlett require their own Firebase env variables.
- If Garland/Rowlett env variables are missing, app fails fast with clear error.
- Plano/Dallas existing Firebase config remains active and unchanged.

---

## 3) Environment setup files

### Completed
- Added environment template for all 3 locations.
- Added setup guide for running/building per location.
- Created local `.env` and populated Garland + Rowlett values.

### Files added
- `client/.env.locations.example`
- `client/LOCATION_SETUP.md`

### Local-only file
- `client/.env` (contains environment secrets; typically gitignored)

---

## 4) Easy run/build commands (no env var memorization)

### Completed
Added npm scripts:
- Start:
  - `start:plano`
  - `start:garland`
  - `start:rowlett`
- Build:
  - `build:plano`
  - `build:garland`
  - `build:rowlett`

### File changed
- `client/package.json`

---

## 5) One-click launcher files (.cmd)

### Completed
Created start launchers:
- `start-plano.cmd`
- `start-garland.cmd`
- `start-rowlett.cmd`

Created build launchers:
- `build-plano.cmd`
- `build-garland.cmd`
- `build-rowlett.cmd`

### Location
All launchers are in project root:
- `C:\Users\ojzhi\OneDrive\FoodServiceApp - Copy\`

---

## 6) Firebase / Firestore security model guidance provided

### Recommended and walked through
- Keep admin creation controlled only by Firebase Console/manual process.
- Use `adminUsers/{uid}` documents to grant admin role.
- Do **not** use auto-ID for admin docs (doc ID must be Firebase Auth UID).
- Correct collection name: `adminUsers` (exact spelling).

### Manual console tasks (still required per Firebase project)
These are not code changes and must be done in each project console:
1. Firestore Database region verification/selection
2. Firestore Rules publish
3. Authentication provider setup (Email/Password)
4. Admin user creation in Authentication
5. `adminUsers/{uid}` documents creation in Firestore

---

## 7) Current changed file inventory (git status)

### Modified
- `client/package-lock.json`
- `client/package.json`
- `client/src/App.jsx`
- `client/src/Home.jsx`
- `client/src/firebase.js`

### New
- `build-garland.cmd`
- `build-plano.cmd`
- `build-rowlett.cmd`
- `client/.env.locations.example`
- `client/LOCATION_SETUP.md`
- `client/src/locationConfig.js`
- `start-garland.cmd`
- `start-plano.cmd`
- `start-rowlett.cmd`

---

## 8) Operational quick reference

From `client` folder:
- `npm run start:plano`
- `npm run start:garland`
- `npm run start:rowlett`
- `npm run build:plano`
- `npm run build:garland`
- `npm run build:rowlett`

From project root (double-click):
- `start-*.cmd` files to run
- `build-*.cmd` files to build

---

## Notes
- Plano/Dallas is preserved as default and remains active unless another location is selected.
- Garland and Rowlett are configured for separate Firebase projects/databases.
- Firestore/Auth role enforcement is finalized only after rules and `adminUsers` docs are published in each Firebase project.
