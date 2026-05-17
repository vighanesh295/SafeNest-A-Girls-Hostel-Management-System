import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../theme.dart';

/// Shown to any authenticated user whose [isApproved] field is [false].
/// Uses a Firestore stream in [main.dart] so this screen disappears
/// automatically the moment an admin approves the account.
class ApprovalPendingScreen extends StatefulWidget {
  final Map<String, dynamic> profileData;
  const ApprovalPendingScreen({super.key, required this.profileData});

  @override
  State<ApprovalPendingScreen> createState() => _ApprovalPendingScreenState();
}

class _ApprovalPendingScreenState extends State<ApprovalPendingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulse;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
    _pulse = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  String get _role {
    final r = widget.profileData['role'] as String? ?? 'user';
    switch (r) {
      case 'student':  return 'Student';
      case 'parent':   return 'Parent';
      case 'security': return 'Security Guard';
      default:         return r[0].toUpperCase() + r.substring(1);
    }
  }

  bool get _isRejected =>
      (widget.profileData['approvalStatus'] as String?) == 'rejected';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      body: Stack(
        children: [
          // Decorative background blobs
          Positioned(
            top: -100,
            left: -80,
            child: _blob(kPrimary, 280),
          ),
          Positioned(
            bottom: -80,
            right: -60,
            child: _blob(kAccent, 220),
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Logo
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      color: kCard,
                      borderRadius: BorderRadius.circular(26),
                      border: Border.all(color: kBorder),
                      boxShadow: [
                        BoxShadow(
                          color: kPrimary.withValues(alpha: 0.18),
                          blurRadius: 32,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Image.asset(
                        'assets/images/tssm_logo.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'SafeNest',
                    style: TextStyle(
                      color: kText,
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Animated status icon
                  ScaleTransition(
                    scale: _isRejected ? const AlwaysStoppedAnimation(1.0) : _pulse,
                    child: Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isRejected
                            ? kDanger.withValues(alpha: 0.12)
                            : kPrimary.withValues(alpha: 0.12),
                        border: Border.all(
                          color: _isRejected ? kDanger : kPrimary,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        _isRejected
                            ? Icons.cancel_outlined
                            : Icons.hourglass_empty_rounded,
                        size: 48,
                        color: _isRejected ? kDanger : kPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Status card
                  GlassCard(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Role badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: kPrimary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(
                                color: kPrimary.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            _role,
                            style: const TextStyle(
                              color: kPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        Text(
                          _isRejected
                              ? 'Account Rejected'
                              : 'Awaiting Approval',
                          style: TextStyle(
                            color: _isRejected ? kDanger : kText,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),

                        Text(
                          _isRejected
                              ? 'Your account registration has been reviewed and rejected. Please contact the hostel administrator for assistance.'
                              : 'Your account is under review. The hostel admin will approve your access shortly. This screen will update automatically once approved.',
                          style: const TextStyle(
                            color: kSubtext,
                            fontSize: 14,
                            height: 1.65,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),

                        // Status pill
                        _StatusPill(isRejected: _isRejected),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Info note
                  if (!_isRejected) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: kAccent.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: kAccent.withValues(alpha: 0.25)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline_rounded,
                              color: kAccent, size: 18),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'You will automatically gain access to your dashboard once the admin approves your account — no need to log out and back in.',
                              style:
                                  TextStyle(color: kSubtext, fontSize: 12, height: 1.5),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                  ] else ...[
                    const SizedBox(height: 12),
                  ],

                  // Logout button
                  GradientButton(
                    label: 'Sign Out',
                    onTap: () => FirebaseAuth.instance.signOut(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _blob(Color color, double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.10),
            blurRadius: 60,
            spreadRadius: 20,
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final bool isRejected;
  const _StatusPill({required this.isRejected});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isRejected
            ? kDanger.withValues(alpha: 0.10)
            : kWarning.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(
          color: isRejected
              ? kDanger.withValues(alpha: 0.35)
              : kWarning.withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isRejected ? kDanger : kWarning,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            isRejected ? 'Rejected' : 'Pending Review',
            style: TextStyle(
              color: isRejected ? kDanger : kWarning,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
