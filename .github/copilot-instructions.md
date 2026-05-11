# Copilot Instructions for SafeNest

This repository is the SafeNest admin web dashboard built with React, TypeScript, Vite, Tailwind CSS, and Firebase.

## Use this file for guidance
- Prefer `AGENTS.md` for broad workspace guidance.
- Use this file only when an explicit Copilot instruction file is needed.

## Key commands
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Important points
- The root app is frontend-only; do not add backend services under the React app unless the request specifically requires it.
- Firebase auth and Firestore are initialized in `src/lib/firebase.ts`.
- Vite uses alias `@` to resolve `./src`.
- Environment variables are defined in `src/vite-env.d.ts` and loaded through Vite.
- The mobile app lives separately in `flutter_app/`.

## Architecture highlights
- `src/App.tsx` routes authenticated users to dashboards based on `profile.role`.
- `src/context/AuthContext.tsx` handles Firebase auth state and user profile loading.
- `src/context/ThemeContext.tsx` manages theme state.
- `src/pages/` contains the main application screens.
- `src/components/` contains reusable UI and design-system components.

## Editing guidance
- Keep changes small and consistent with existing React + Tailwind styles.
- Preserve current Firebase config handling unless the task explicitly modifies auth or Firestore setup.
- Link to `README.md` for run instructions and `flutter_app/README.md` for mobile context.
