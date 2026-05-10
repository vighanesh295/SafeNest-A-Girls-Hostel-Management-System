import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

const firestoreDatabaseId = 'ai-studio-604e6bdd-b87b-4d3f-aa29-2ca860e77a22';
const _projectId = 'jspm-and-tssm-girls-hostel';
const _apiKey = 'AIzaSyDYQ3LNvY5VCkJPMSf2iXfOE-g6HkANddI';
const _messagingSenderId = '268238558270';
const _webAppId = '1:268238558270:web:e281de2ff0e229e4c06d6f';
const _authDomain = 'jspm-and-tssm-girls-hostel.firebaseapp.com';
const _storageBucket = 'jspm-and-tssm-girls-hostel.firebasestorage.app';
// Dev fallback: use --dart-define=FIREBASE_ANDROID_APP_ID=<id> to override.
// The web app ID is used as a fallback so hot-reload works without extra flags.
const _androidAppId = String.fromEnvironment(
  'FIREBASE_ANDROID_APP_ID',
  defaultValue: _webAppId, // dev fallback — replace with real Android app ID
);

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.windows:
        return windows;
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
      case TargetPlatform.linux:
        throw UnsupportedError(
          'Firebase options are only configured for Android, web, and Windows in this project.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static FirebaseOptions get android {
    return FirebaseOptions(
      apiKey: _apiKey,
      appId: _androidAppId,
      messagingSenderId: _messagingSenderId,
      projectId: _projectId,
      storageBucket: _storageBucket,
    );
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: _apiKey,
    appId: _webAppId,
    messagingSenderId: _messagingSenderId,
    projectId: _projectId,
    authDomain: _authDomain,
    storageBucket: _storageBucket,
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: _apiKey,
    appId: _webAppId,
    messagingSenderId: _messagingSenderId,
    projectId: _projectId,
    authDomain: _authDomain,
    storageBucket: _storageBucket,
  );
}
