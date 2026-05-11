import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import 'firebase_options.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/student_screens.dart';
import 'screens/parent_admin_screens.dart';

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
        home: const AuthWrapper(),
      ),
    );
  }
}

// ── Auth state ────────────────────────────────────────────────────────────────
class AuthState extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  User? get user => _auth.currentUser;
  Stream<User?> authStateChanges() => _auth.authStateChanges();
  Future<void> signOut() => _auth.signOut();
}

// ── Auth wrapper ──────────────────────────────────────────────────────────────
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
            if (role == 'admin')  return const AdminHomePage();
            if (role == 'parent') return ParentHomePage(profileData: profileData);
            return StudentHomePage(profileData: profileData);
          },
        );
      },
    );
  }
}

// ── Setup error screen ────────────────────────────────────────────────────────
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

// ── QR Scan Page ──────────────────────────────────────────────────────────────
class QrScanPage extends StatefulWidget {
  const QrScanPage({super.key});
  @override
  State<QrScanPage> createState() => _QrScanPageState();
}

class _QrScanPageState extends State<QrScanPage> {
  final MobileScannerController _ctrl = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  bool _scanned = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Scan Gate QR'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded, color: Colors.white),
            onPressed: () => _ctrl.toggleTorch(),
          ),
        ],
      ),
      body: Stack(children: [
        // Camera
        MobileScanner(
          controller: _ctrl,
          onDetect: (capture) async {
            final messenger = ScaffoldMessenger.of(context);
            final navigator = Navigator.of(context);
            if (_scanned) return;
            final raw = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
            if (raw == null) return;
            setState(() => _scanned = true);
            try {
              final parsed = jsonDecode(raw);
              if (parsed is! Map<String, dynamic>) throw Exception('Invalid QR payload');
              final passId   = parsed['passId']   as String?;
              final studentId = parsed['studentId'] as String?;
              if (passId == null || studentId == null) throw Exception('Invalid QR');

              final passDoc = await firestore.collection('passes').doc(passId).get();
              if (!passDoc.exists) throw Exception('Pass not found');
              final passData = passDoc.data()!;
              if (passData['studentId'] != studentId) throw Exception('Invalid pass for this student');

              final currentStatus = passData['status'] as String? ?? '';
              if (currentStatus == 'pending')   throw Exception('This pass has not been approved yet.');
              if (currentStatus == 'rejected')  throw Exception('This pass was rejected.');
              if (currentStatus == 'completed') throw Exception('This pass has already been used.');

              final Map<String, dynamic> update;
              if (currentStatus == 'approved') {
                update = {'status': 'active', 'actualExitTime': DateTime.now().toIso8601String()};
              } else if (currentStatus == 'active') {
                update = {'status': 'completed', 'actualReturnTime': DateTime.now().toIso8601String()};
              } else {
                throw Exception('Unexpected pass state: $currentStatus');
              }
              await firestore.collection('passes').doc(passId).update(update);

              // Create notification for parent
              try {
                final studentDoc = await firestore.collection('students').doc(studentId).get();
                if (studentDoc.exists) {
                  final studentData = studentDoc.data()!;
                  final parentId = studentData['parentId'] as String?;
                  if (parentId != null) {
                    final userDoc = await firestore.collection('users').doc(studentId).get();
                    final studentName = userDoc.exists ? (userDoc.data()!['name'] as String? ?? 'Student') : 'Student';

                    final notificationData = {
                      'parentId': parentId,
                      'studentId': studentId,
                      'studentName': studentName,
                      'passId': passId,
                      'type': update['status'] == 'active' ? 'exit' : 'return',
                      'message': update['status'] == 'active'
                        ? '$studentName has safely exited the hostel'
                        : '$studentName has safely returned to the hostel',
                      'timestamp': DateTime.now().toIso8601String(),
                      'read': false,
                    };

                    await firestore.collection('notifications').add(notificationData);
                  }
                }
              } catch (e) {
                // Don't fail the main operation if notification creation fails
                debugPrint('Failed to create notification: $e');
              }

              if (!mounted) return;
              final msg = update['status'] == 'active' ? '✅ Exit recorded — safe travels!' : '🏠 Entry marked successfully';
              messenger.showSnackBar(SnackBar(
                content: Text(msg),
                backgroundColor: kSuccess,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ));
              navigator.pop();
            } catch (e) {
              if (!mounted) return;
              messenger.showSnackBar(SnackBar(
                content: Text('Error: $e'),
                backgroundColor: kDanger,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ));
              setState(() => _scanned = false);
            }
          },
        ),
        // Overlay frame
        Center(
          child: Container(
            width: 240, height: 240,
            decoration: BoxDecoration(
              border: Border.all(color: kPrimary, width: 3),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Stack(children: [
              // Corner accents
              const Positioned(top: 0, left: 0,  child: _Corner(true,  true)),
              const Positioned(top: 0, right: 0, child: _Corner(true,  false)),
              const Positioned(bottom: 0, left: 0,  child: _Corner(false, true)),
              const Positioned(bottom: 0, right: 0, child: _Corner(false, false)),
            ]),
          ),
        ),
        // Bottom bar
        Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            decoration: BoxDecoration(
              color: kSurface.withAlpha(220),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kBorder),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(_scanned ? Icons.sync_rounded : Icons.qr_code_rounded,
                  color: _scanned ? kWarning : kAccent, size: 20),
              const SizedBox(width: 10),
              Text(
                _scanned ? 'Processing…' : 'Point camera at QR code',
                style: const TextStyle(color: kText, fontWeight: FontWeight.w600),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _Corner extends StatelessWidget {
  final bool top, left;
  const _Corner(this.top, this.left);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28, height: 28,
      decoration: BoxDecoration(
        border: Border(
          top:    top  ? const BorderSide(color: kAccent, width: 4) : BorderSide.none,
          bottom: !top ? const BorderSide(color: kAccent, width: 4) : BorderSide.none,
          left:   left  ? const BorderSide(color: kAccent, width: 4) : BorderSide.none,
          right:  !left ? const BorderSide(color: kAccent, width: 4) : BorderSide.none,
        ),
        borderRadius: BorderRadius.only(
          topLeft:     (top && left)   ? const Radius.circular(8) : Radius.zero,
          topRight:    (top && !left)  ? const Radius.circular(8) : Radius.zero,
          bottomLeft:  (!top && left)  ? const Radius.circular(8) : Radius.zero,
          bottomRight: (!top && !left) ? const Radius.circular(8) : Radius.zero,
        ),
      ),
    );
  }
}
