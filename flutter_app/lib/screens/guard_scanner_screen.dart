import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../main.dart' show firestore;
import '../theme.dart';

// ── Guard Scanner Home ────────────────────────────────────────────────────────
class GuardScannerScreen extends StatelessWidget {
  const GuardScannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        title: const Text('Gate Scanner'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => FirebaseAuth.instance.signOut(),
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Container(
              width: 110, height: 110,
              decoration: BoxDecoration(
                gradient: kGradientTeal,
                borderRadius: BorderRadius.circular(32),
                boxShadow: [BoxShadow(color: kAccent.withAlpha(80), blurRadius: 24, offset: const Offset(0, 8))],
              ),
              child: const Icon(Icons.qr_code_scanner_rounded, size: 56, color: Colors.white),
            ),
            const SizedBox(height: 28),
            const Text('Gate Verification', style: TextStyle(color: kText, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text('Scan a student\'s pass QR code to verify and record gate entry or exit.', textAlign: TextAlign.center, style: TextStyle(color: kSubtext, fontSize: 14, height: 1.6)),
            const SizedBox(height: 36),
            GradientButton(
              label: 'Open Scanner',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const _QrScannerPage())),
            ),
          ]),
        ),
      ),
    );
  }
}

// ── QR Scanner Page ───────────────────────────────────────────────────────────
class _QrScannerPage extends StatefulWidget {
  const _QrScannerPage();
  @override
  State<_QrScannerPage> createState() => _QrScannerPageState();
}

class _QrScannerPageState extends State<_QrScannerPage> {
  final MobileScannerController _ctrl = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    torchEnabled: false,
  );
  bool _processing = false;

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.black.withAlpha(160),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Scan Pass QR', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded, color: Colors.white),
            onPressed: () => _ctrl.toggleTorch(),
          ),
        ],
      ),
      body: Stack(children: [
        MobileScanner(
          controller: _ctrl,
          onDetect: _onDetect,
          // C-03: handle camera permission denied gracefully
          errorBuilder: (context, error, child) {
            final isPermission = error.errorCode == MobileScannerErrorCode.permissionDenied;
            return Container(
              color: Colors.black,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(
                      isPermission ? Icons.no_photography_rounded : Icons.error_outline_rounded,
                      color: Colors.white70, size: 72,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      isPermission ? 'Camera Permission Required' : 'Scanner Error',
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      isPermission
                          ? 'Please go to Settings → App Permissions\nand enable Camera for SafeNest.'
                          : error.errorCode.toString(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white60, fontSize: 13, height: 1.6),
                    ),
                  ]),
                ),
              ),
            );
          },
        ),
        // Scan frame overlay
        Center(
          child: Container(
            width: 260, height: 260,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white.withAlpha(60), width: 1),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Stack(children: const [
              Positioned(top: 0, left: 0,   child: _Corner(true, true)),
              Positioned(top: 0, right: 0,  child: _Corner(true, false)),
              Positioned(bottom: 0, left: 0,  child: _Corner(false, true)),
              Positioned(bottom: 0, right: 0, child: _Corner(false, false)),
            ]),
          ),
        ),
        // Bottom hint
        Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            margin: const EdgeInsets.fromLTRB(24, 0, 24, 40),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.black.withAlpha(180),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withAlpha(30)),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(
                _processing ? Icons.sync_rounded : Icons.qr_code_rounded,
                color: _processing ? kWarning : kAccent, size: 20,
              ),
              const SizedBox(width: 10),
              Text(
                _processing ? 'Verifying pass…' : 'Point camera at student\'s QR',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ]),
          ),
        ),
      ]),
    );
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing) return;
    final raw = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    if (raw == null) return;
    setState(() => _processing = true);

    try {
      // Parse QR payload
      Map<String, dynamic> payload;
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) {
          payload = decoded;
        } else {
          payload = {'passId': raw.trim()};
        }
      } catch (_) {
        payload = {'passId': raw.trim()};
      }

      final passId = payload['passId'] as String?;
      final qrStudentId = payload['studentId'] as String?;
      if (passId == null || passId.isEmpty) throw Exception('Invalid QR code');



      // ── Run atomic Firestore transaction ────────────────────────────────────
      final guardId = FirebaseAuth.instance.currentUser?.uid ?? 'unknown';
      final now     = DateTime.now().toIso8601String();

      // Result holders filled inside transaction
      bool   txIsExit    = true;
      String txStudentId = '';
      String txPassType  = '';
      String txParentId  = '';
      String txStudentName = '';
      String txRoomNo      = '';

      await firestore.runTransaction((tx) async {
        final passRef  = firestore.collection('passes').doc(passId);
        final passSnap = await tx.get(passRef);

        if (!passSnap.exists) throw Exception('Pass not found in system');
        final p = passSnap.data()!;

        // Validate QR studentId if encoded
        if (qrStudentId != null && p['studentId'] != qrStudentId) {
          throw Exception('QR does not match pass record');
        }

        final adminApproval  = p['adminApproval']  as String? ?? '';
        final parentApproval = p['parentApproval'] as String? ?? '';
        final status         = p['status']         as String? ?? '';
        final scanCount      = (p['scanCount']      as num?)?.toInt() ?? 0;
        final completed      = p['completed']       as bool? ?? false;
        final expectedRet    = p['expectedReturnTime'] as String?;
        final studentId      = p['studentId']       as String? ?? '';
        final passType       = p['type']            as String? ?? 'pass';

        // ── Hard rejections ──────────────────────────────────────────────────
        if (completed || scanCount >= 2) {
          throw Exception('QR already used — pass completed.\nThis pass cannot be scanned again.');
        }
        if (adminApproval  != 'approved') throw Exception('Admin has not approved this pass yet');
        if (parentApproval != 'approved') throw Exception('Parent approval is still pending');
        if (status == 'rejected') throw Exception('This pass was rejected');
        if (status == 'violated') throw Exception('This pass is marked as violated');
        if (status == 'pending')  throw Exception('Pass is not yet approved');

        final studentRef = firestore.collection('students').doc(studentId);

        // ── Scan 1: EXIT (scanCount == 0) ────────────────────────────────────
        if (scanCount == 0) {
          if (status != 'approved') {
            throw Exception('Pass must be approved for exit scan');
          }
          tx.update(passRef, {
            'status': 'active', 'scanCount': 1,
            'currentState': 'OUT', 'exitTime': now,
            'scannedByExit': guardId, 'completed': false,
          });
          tx.update(studentRef, {
            'currentStatus': 'OUT', 'lastExitTime': now, 'activePassId': passId,
          });
          txIsExit    = true;
          txStudentId = studentId;
          txPassType  = passType;

        // ── Scan 2: RETURN (scanCount == 1) ─────────────────────────────────
        } else {
          if (status != 'active') {
            throw Exception('Unexpected state for return scan: $status');
          }
          // Expiry check with 2-hour grace
          if (expectedRet != null) {
            final deadline = DateTime.tryParse(expectedRet);
            if (deadline != null && DateTime.now().isAfter(deadline.add(const Duration(hours: 2)))) {
              throw Exception('Pass expired — expected return was ${_fmt(deadline)}');
            }
          }
          tx.update(passRef, {
            'status': 'completed', 'scanCount': 2,
            'currentState': 'IN', 'returnTime': now,
            'scannedByReturn': guardId, 'completed': true,
          });
          tx.update(studentRef, {
            'currentStatus': 'IN', 'lastReturnTime': now,
            'activePassId': FieldValue.delete(),
          });
          txIsExit    = false;
          txStudentId = studentId;
          txPassType  = passType;
        }
      });

      // ── Fetch student details for result screen (post-transaction) ──────────
      final studentDoc  = await firestore.collection('students').doc(txStudentId).get();
      final userDoc     = await firestore.collection('users').doc(txStudentId).get();
      final studentData = studentDoc.exists ? studentDoc.data()! : <String, dynamic>{};
      final userData    = userDoc.exists    ? userDoc.data()!    : <String, dynamic>{};
      txStudentName = userData['name']       as String? ?? 'Student';
      txRoomNo      = studentData['roomNo']  as String? ?? 'N/A';
      txParentId    = studentData['parentId'] as String? ?? '';

      // ── Parent notification (fire-and-forget, non-critical) ─────────────────
      if (txParentId.isNotEmpty) {
        final msg = txIsExit
            ? '$txStudentName has safely exited the hostel ($txPassType pass)'
            : '$txStudentName has safely returned to the hostel';
        firestore.collection('notifications').add({
          'parentId': txParentId, 'studentId': txStudentId, 'studentName': txStudentName,
          'passId': passId, 'type': txIsExit ? 'exit' : 'return',
          'message': msg, 'createdAt': now, 'read': false,
        }).catchError((dynamic _) => firestore.collection('notifications').doc());
      }

      HapticFeedback.heavyImpact();
      if (!mounted) return;
      await Navigator.push(context, MaterialPageRoute(
        builder: (_) => _ScanResultScreen(
          isSuccess: true, isExit: txIsExit,
          studentName: txStudentName, roomNo: txRoomNo,
          passType: txPassType, timestamp: now,
        ),
      ));

    } catch (e) {
      HapticFeedback.vibrate();
      if (!mounted) return;
      await Navigator.push(context, MaterialPageRoute(
        builder: (_) => _ScanResultScreen(
          isSuccess: false, isExit: true,
          studentName: '', roomNo: '', passType: '', timestamp: '',
          errorMessage: e.toString().replaceFirst('Exception: ', ''),
        ),
      ));
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  String _fmt(DateTime dt) => '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
}

// ── Scan Result Screen ────────────────────────────────────────────────────────
class _ScanResultScreen extends StatelessWidget {
  final bool isSuccess, isExit;
  final String studentName, roomNo, passType, timestamp;
  final String? errorMessage;

  const _ScanResultScreen({
    required this.isSuccess,
    required this.isExit,
    required this.studentName,
    required this.roomNo,
    required this.passType,
    required this.timestamp,
    this.errorMessage,
  });

  @override
  Widget build(BuildContext context) {
    final color  = isSuccess ? kSuccess : kDanger;
    final icon   = isSuccess
        ? (isExit ? Icons.directions_walk_rounded : Icons.home_rounded)
        : Icons.cancel_rounded;
    final title  = isSuccess
        ? (isExit ? 'Exit Verified ✓' : 'Return Verified ✓')
        : 'Scan Failed';
    final sub    = isSuccess
        ? (isExit ? 'Student has exited the hostel' : 'Student has returned to hostel')
        : errorMessage ?? 'Unknown error';

    final dt = isSuccess && timestamp.isNotEmpty ? DateTime.tryParse(timestamp)?.toLocal() : null;
    final timeStr = dt != null
        ? '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')} · ${dt.day}/${dt.month}/${dt.year}'
        : '';

    return Scaffold(
      backgroundColor: kBg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            // Status icon
            Container(
              width: 100, height: 100,
              decoration: BoxDecoration(
                color: color.withAlpha(30),
                shape: BoxShape.circle,
                border: Border.all(color: color.withAlpha(80), width: 2),
              ),
              child: Icon(icon, size: 52, color: color),
            ),
            const SizedBox(height: 20),
            Text(title, style: TextStyle(color: color, fontSize: 26, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(sub, textAlign: TextAlign.center, style: const TextStyle(color: kSubtext, fontSize: 14, height: 1.5)),
            const SizedBox(height: 32),

            if (isSuccess) ...[
              GlassCard(child: Column(children: [
                _InfoRow(icon: Icons.person_rounded,      label: 'Student',   value: studentName),
                const Divider(color: kBorder, height: 20),
                _InfoRow(icon: Icons.meeting_room_rounded, label: 'Room',     value: roomNo),
                const Divider(color: kBorder, height: 20),
                _InfoRow(icon: Icons.badge_rounded,        label: 'Pass Type', value: passType.toUpperCase()),
                const Divider(color: kBorder, height: 20),
                _InfoRow(
                  icon: isExit ? Icons.logout_rounded : Icons.login_rounded,
                  label: isExit ? 'Exit Time' : 'Return Time',
                  value: timeStr,
                ),
              ])),
              const SizedBox(height: 20),
              // Status banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                decoration: BoxDecoration(
                  color: color.withAlpha(24),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: color.withAlpha(80)),
                ),
                child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.shield_rounded, color: color, size: 20),
                  const SizedBox(width: 10),
                  Text(
                    isExit ? 'Marked as OUT — safe travels!' : 'Marked as IN — welcome back!',
                    style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                ]),
              ),
            ] else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: kDanger.withAlpha(20),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: kDanger.withAlpha(60)),
                ),
                child: Column(children: [
                  const Icon(Icons.info_outline_rounded, color: kDanger, size: 28),
                  const SizedBox(height: 8),
                  Text(errorMessage ?? 'Verification failed', textAlign: TextAlign.center,
                      style: const TextStyle(color: kDanger, fontSize: 13, height: 1.5)),
                ]),
              ),
            ],

            const SizedBox(height: 28),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.popUntil(context, (r) => r.isFirst || r.settings.name == '/guard'),
                  icon: const Icon(Icons.home_rounded, size: 18),
                  label: const Text('Home'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: kText, side: const BorderSide(color: kBorder),
                    minimumSize: const Size(0, 50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GradientButton(
                  label: 'Scan Next',
                  onTap: () => Navigator.pop(context),
                ),
              ),
            ]),
          ]),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon; final String label, value;
  const _InfoRow({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, size: 18, color: kSubtext),
      const SizedBox(width: 10),
      Text(label, style: const TextStyle(color: kSubtext, fontSize: 13)),
      const Spacer(),
      Text(value, style: const TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 13)),
    ]);
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
