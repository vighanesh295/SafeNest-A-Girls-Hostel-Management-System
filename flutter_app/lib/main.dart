
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'firebase_options.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/student_screens.dart';
import 'screens/parent_admin_screens.dart';
import 'screens/splash_screen.dart';
import 'screens/guard_scanner_screen.dart';
import 'screens/security_dashboard.dart';

late final FirebaseFirestore firestore;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  Object? initializationError;
  try {
    final app = await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    firestore = FirebaseFirestore.instanceFor(
      app: app,
      databaseId: firestoreDatabaseId,
    );
  } catch (error, stackTrace) {
    initializationError = error;
    debugPrint('Firebase bootstrap failed: $error');
    debugPrintStack(stackTrace: stackTrace);
  }
  runApp(SafeNestApp(initializationError: initializationError));
}

class SafeNestApp extends StatelessWidget {
  final Object? initializationError;
  const SafeNestApp({super.key, this.initializationError});

  @override
  Widget build(BuildContext context) {
    if (initializationError != null) {
      return MaterialApp(
        title: 'SafeNest Setup',
        theme: buildAppTheme(),
        home: SetupErrorScreen(error: initializationError!),
      );
    }
    return ChangeNotifierProvider<AuthState>(
      create: (_) => AuthState(),
      child: MaterialApp(
        title: 'SafeNest',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        initialRoute: '/',
        routes: {
          '/': (_) => const SplashScreen(),
          '/home': (_) => const AuthWrapper(),
        },
      ),
    );
  }
}

// â”€â”€ Auth state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class AuthState extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  User? get user => _auth.currentUser;
  Stream<User?> authStateChanges() => _auth.authStateChanges();
  Future<void> signOut() => _auth.signOut();
}

// â”€â”€ Auth wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final authState = Provider.of<AuthState>(context, listen: false);
    return StreamBuilder<User?>(
      stream: authState.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: kPrimary)),
          );
        }
        if (!snapshot.hasData) return const LoginScreen();

        final user = snapshot.data!;
        return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
          stream: firestore.collection('users').doc(user.uid).snapshots(),
          builder: (context, profileSnapshot) {
            if (profileSnapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator(color: kPrimary)),
              );
            }
            if (!profileSnapshot.hasData || !profileSnapshot.data!.exists) {
              return Scaffold(
                backgroundColor: kBg,
                body: Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Container(
                      width: 80, height: 80,
                      decoration: BoxDecoration(color: kCard, borderRadius: BorderRadius.circular(24), border: Border.all(color: kBorder)),
                      child: const Icon(Icons.person_off_rounded, size: 40, color: kSubtext),
                    ),
                    const SizedBox(height: 20),
                    const Text('Profile not found', style: TextStyle(color: kText, fontSize: 18, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    const Text('Your account may not be set up correctly.', style: TextStyle(color: kSubtext, fontSize: 13)),
                    const SizedBox(height: 28),
                    GradientButton(
                      label: 'Sign Out',
                      onTap: () => FirebaseAuth.instance.signOut(),
                    ),
                  ]),
                ),
              );
            }
            final profileData = profileSnapshot.data!.data()!;
            final role = profileData['role'] as String? ?? 'student';
            if (role == 'admin')    return const AdminHomePage();
            if (role == 'parent')   return ParentHomePage(profileData: profileData);
            if (role == 'guard')    return const GuardScannerScreen();
            if (role == 'security') return SecurityDashboardScreen(profileData: profileData);
            return StudentHomePage(profileData: profileData);
          },
        );
      },
    );
  }
}

// â”€â”€ Setup error screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class SetupErrorScreen extends StatelessWidget {
  final Object error;
  const SetupErrorScreen({super.key, required this.error});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(title: const Text('Setup Required')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.warning_amber_rounded, color: kWarning, size: 36),
            const SizedBox(height: 12),
            const Text('Firebase Setup Needed', style: TextStyle(color: kText, fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Text('Register this package in the Firebase console and re-run the app.', style: TextStyle(color: kSubtext)),
            const SizedBox(height: 16),
            SelectableText(error.toString(), style: const TextStyle(color: kSubtext, fontSize: 12, fontFamily: 'monospace')),
          ])),
        ]),
      ),
    );
  }
}

