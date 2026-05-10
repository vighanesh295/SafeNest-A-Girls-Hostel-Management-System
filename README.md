# SafeNest — Girls Hostel Management System

A React + Firebase frontend for managing hostel passes, student status, and parent approvals.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Make sure `firebase-applet-config.json` contains your Firebase project configuration.
3. Start the dev server:
   `npm run dev`
4. Open the app at `http://localhost:4173`

## Notes

- This app is a frontend-only project and does not require a separate Express backend.
- The app currently does not depend on Gemini API keys.
- If needed, `DISABLE_HMR=true` can be set to disable Vite hot module reload.
- To verify type checking, run:
   `npm run lint`

## Admin / Mobile split

- The root React app is the admin web dashboard.
- Parent and student functionality is implemented in the mobile Flutter app under `flutter_app/`.
- Student sign-up requires a parent email and mobile users can request passes, generate QR receipts, and scan QR codes.
