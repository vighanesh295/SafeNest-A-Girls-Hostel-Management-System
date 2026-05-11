# SafeNest Agent Instructions

## Purpose
This repository contains the SafeNest admin web dashboard built with React, TypeScript, Vite, Tailwind CSS, and Firebase. It also contains a separate mobile Flutter app under `flutter_app/`, but the main workspace is the React admin app.

## Key workflows
- `npm install` to install dependencies
- `npm run dev` to start the Vite dev server on `http://localhost:4173`
- `npm run build` to create a production build
- `npm run preview` to preview the production build locally
- `npm run lint` to run TypeScript type checking (`tsc --noEmit`)

## Important conventions
- The web app is frontend-only. There is no separate backend service in this repo.
- Firebase is the primary backend: Authentication and Firestore are used from `src/lib/firebase.ts`.
- Configuration is loaded from Vite environment variables in `src/vite-env.d.ts`.
- The app depends on a local `firebase-applet-config.json` file for Firebase project configuration.
- Vite alias: `@` resolves to `./src`.
- Tailwind CSS v4 and React 19 are in use.
- Avoid adding server-side frameworks or backend APIs under the root React app unless the task explicitly requires it.

## Architecture overview
- `src/App.tsx` controls auth state and routes users to dashboards by role.
- `src/context/AuthContext.tsx` manages Firebase auth state and profile data.
- `src/context/ThemeContext.tsx` manages theme state.
- `src/pages/` contains the main page screens:
  - `AdminDashboard.tsx`
  - `StudentDashboard.tsx`
  - `ParentDashboard.tsx`
  - `LoginPage.tsx`
- `src/components/` contains reusable UI components and design-system primitives.
- `src/lib/firebase.ts` initializes Firebase and exports `auth` and `db`.
- `src/types/` contains shared application types.

## Notes for agents
- The root app is the web admin dashboard; treat `flutter_app/` as a separate mobile app area unless asked to work on mobile functionality.
- The repo currently does not depend on Gemini API keys or other AI service credentials.
- `DISABLE_HMR=true` can be used to disable Vite hot module reloading.
- Keep updates small and consistent with existing React + Tailwind styling.

## When editing
- Preserve existing Firebase config handling unless a task specifically updates auth or Firestore setup.
- Prefer modifying or adding files under `src/` for frontend changes.
- Link to existing docs: `README.md` for run instructions and `flutter_app/README.md` for mobile app context.
