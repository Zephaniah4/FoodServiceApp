# Multi-location setup (Plano/Dallas, Garland, Rowlett)

This app now supports 3 locations with separate Firebase databases.

## 1) Keep current Plano/Dallas active (default)
- No extra env values are required.
- `REACT_APP_LOCATION` defaults to `planoDallas`.
- Existing Firebase project (`food-service-app-slc`) remains active.

## 2) Add Garland and Rowlett Firebase projects
Create separate Firebase projects under the same Google account:
- one for Garland
- one for Rowlett

Use Firestore in each project.

## 3) Configure env file
1. Copy `.env.locations.example` to `.env`.
2. Set `REACT_APP_LOCATION` for the deployment you are building:
   - `planoDallas`
   - `garland`
   - `rowlett`
3. Fill Firebase keys for Garland/Rowlett.

## 4) Build per location
From `client`:

- Plano/Dallas:
  - `npm run build:plano`

- Garland:
  - `npm run build:garland`

- Rowlett:
  - `npm run build:rowlett`

## 4b) Start locally per location
From `client`:

- Plano/Dallas: `npm run start:plano`
- Garland: `npm run start:garland`
- Rowlett: `npm run start:rowlett`

Note: On PowerShell, use `$env:REACT_APP_LOCATION='garland'` style.

## 5) Safety behavior
If `REACT_APP_LOCATION` is `garland` or `rowlett` and required Firebase keys are missing, app startup will fail with a clear error. This prevents accidental database sharing.
