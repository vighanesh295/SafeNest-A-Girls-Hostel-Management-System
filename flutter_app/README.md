# SafeNest Flutter Mobile App

This folder is the Flutter mobile client for the SafeNest hostel system. The app currently includes the Android platform scaffold plus the shared Dart code for student and parent workflows.

## Current State

- `flutter_app/` is already a Flutter app scaffold. You do not need to run `flutter create .` again unless you want to add missing platforms later.
- Android package name: `com.safenest.hostelapp.safenest_flutter`
- Shared Firebase project id: `jspm-and-tssm-girls-hostel`
- Firestore database id: `ai-studio-604e6bdd-b87b-4d3f-aa29-2ca860e77a22`

## Local Bootstrap

1. Install Flutter and verify the toolchain:
   ```bash
   flutter doctor
   ```
2. Move into the mobile app folder:
   ```bash
   cd "c:\Users\ACER\Desktop\hostel app\flutter_app"
   ```
3. Fetch packages:
   ```bash
   flutter pub get
   ```
4. Confirm a device or emulator is visible:
   ```bash
   flutter devices
   ```

## Firebase Wiring

The repo already contains the shared Firebase values in `../firebase-applet-config.json`, but Android still needs its own Firebase app registration because Firebase requires a valid Android App ID (`mobilesdk_app_id`) for native initialization.

Preferred path:

1. In Firebase console, add an Android app to project `jspm-and-tssm-girls-hostel`.
2. Use the package name `com.safenest.hostelapp.safenest_flutter`.
3. After FlutterFire CLI is installed, regenerate platform config:
   ```bash
   flutterfire configure --project=jspm-and-tssm-girls-hostel --platforms=android
   ```

Fast fallback:

1. Register the Android app in Firebase.
2. Copy the generated Android App ID (`mobilesdk_app_id`).
3. Run:
   ```bash
   flutter run --dart-define=FIREBASE_ANDROID_APP_ID=<mobilesdk_app_id>
   ```

Without that Android-specific App ID, the app now shows a setup screen with the exact missing step instead of failing silently.

## Run

Once Flutter is installed and the Android Firebase app is registered:

```bash
flutter run --dart-define=FIREBASE_ANDROID_APP_ID=<mobilesdk_app_id>
```

If you have multiple devices:

```bash
flutter run -d <device-id> --dart-define=FIREBASE_ANDROID_APP_ID=<mobilesdk_app_id>
```

## Notes

- Students must enter a parent email during sign-up.
- The mobile app includes sign-in, pass requests, QR pass receipts, QR scanning, and parent approvals.
- The root web app remains the admin dashboard.
