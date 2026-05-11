# SafeNest Flutter Mobile App Agent Instructions

This folder contains the Flutter mobile client for the SafeNest hostel system. It is separate from the root React admin dashboard and should be treated as the mobile app workspace.

## Key workflows
- `flutter doctor` to verify the Flutter toolchain
- `flutter pub get` to fetch Dart/Flutter dependencies
- `flutter devices` to list available emulators/devices
- `flutter run --dart-define=FIREBASE_ANDROID_APP_ID=<mobilesdk_app_id>` to run the app on Android

## Important conventions
- The mobile app is a Flutter app scaffold and does not need `flutter create .` again unless adding new platforms.
- Android package name: `com.safenest.hostelapp.safenest_flutter`
- Firebase project id: `jspm-and-tssm-girls-hostel`
- Firestore database id: `ai-studio-604e6bdd-b87b-4d3f-aa29-2ca860e77a22`
- The mobile app depends on Android-specific Firebase registration for `mobilesdk_app_id`.

## Firebase setup
- The repo contains shared Firebase values in `../firebase-applet-config.json`.
- Android still requires its own Firebase app registration and app ID.
- Preferred path:
  1. Add an Android app in Firebase for `jspm-and-tssm-girls-hostel`.
  2. Use `com.safenest.hostelapp.safenest_flutter` as the package name.
  3. Run `flutterfire configure --project=jspm-and-tssm-girls-hostel --platforms=android`.
- Fast fallback:
  1. Register the Android app in Firebase.
  2. Copy `mobilesdk_app_id`.
  3. Run `flutter run --dart-define=FIREBASE_ANDROID_APP_ID=<mobilesdk_app_id>`.

## Notes for agents
- Focus mobile/Flutter changes only inside `flutter_app/` unless asked to integrate with the web dashboard.
- Preserve existing Android Firebase wiring and avoid changing the main React app unless the task explicitly spans both apps.
- Student and parent workflows are implemented in this Flutter app.
