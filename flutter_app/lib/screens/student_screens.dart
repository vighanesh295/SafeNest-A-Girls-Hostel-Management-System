import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../main.dart' show firestore;
import '../theme.dart';

// ── Student Home ─────────────────────────────────────────────────────────────
class StudentHomePage extends StatefulWidget {
  final Map<String, dynamic> profileData;
  const StudentHomePage({super.key, required this.profileData});
  @override
  State<StudentHomePage> createState() => _StudentHomePageState();
}

class _StudentHomePageState extends State<StudentHomePage> {
  int _idx = 0;

  @override
  Widget build(BuildContext context) {
    final uid = widget.profileData['uid'] as String;
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: firestore.collection('students').doc(uid).snapshots(),
      builder: (context, snap) {
        if (!snap.hasData || !snap.data!.exists) {
          return const Scaffold(body: Center(child: CircularProgressIndicator(color: kPrimary)));
        }
        final sd = snap.data!.data()!;
        final status = sd['currentStatus'] as String? ?? 'IN';
        return Scaffold(
          backgroundColor: kBg,
          body: IndexedStack(index: _idx, children: [
            _OverviewTab(profileData: widget.profileData, studentData: sd, status: status),
            _HistoryTab(uid: uid),
          ]),
          bottomNavigationBar: _BottomNav(index: _idx, onTap: (i) => setState(() => _idx = i)),
        );
      },
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int index;
  final ValueChanged<int> onTap;
  const _BottomNav({required this.index, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: kBg,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 18),
      child: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
          decoration: BoxDecoration(
            color: kSurface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: kBorder),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(icon: Icons.home_rounded, label: 'Home', selected: index == 0, onTap: () => onTap(0)),
              _NavItem(icon: Icons.history_rounded, label: 'History', selected: index == 1, onTap: () => onTap(1)),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon; final String label; final bool selected; final VoidCallback onTap;
  const _NavItem({required this.icon, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? kPrimary.withAlpha(18) : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: selected ? kPrimary : kSubtext, size: 24),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: selected ? kPrimary : kSubtext, fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
class _OverviewTab extends StatelessWidget {
  final Map<String, dynamic> profileData, studentData;
  final String status;
  const _OverviewTab({required this.profileData, required this.studentData, required this.status});

  @override
  Widget build(BuildContext context) {
    final name = profileData['name'] as String? ?? 'Student';
    final room = studentData['roomNo'] as String? ?? 'N/A';
    final isIn = status == 'IN';
    return CustomScrollView(slivers: [
      SliverAppBar(
        expandedHeight: 200,
        pinned: true,
        backgroundColor: kBg,
        actions: [IconButton(icon: const Icon(Icons.logout_rounded, color: kText), onPressed: () => FirebaseAuth.instance.signOut())],
        flexibleSpace: FlexibleSpaceBar(
          background: Container(
            decoration: const BoxDecoration(gradient: kGradient),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.end, children: [
                  Row(children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: Colors.white.withAlpha(90)),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, 4))],
                      ),
                    child: ClipOval(
                      child: Image.asset(
                        'assets/images/tssm_logo.png',
                        fit: BoxFit.cover,
                        width: 56,
                        height: 56,
                      ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Hi, $name 👋', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text('Room $room', style: TextStyle(color: Colors.white.withAlpha(180), fontSize: 13)),
                    ]),
                  ]),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: isIn ? kSuccess.withAlpha(40) : kWarning.withAlpha(40),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: isIn ? kSuccess.withAlpha(120) : kWarning.withAlpha(120)),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(isIn ? Icons.home_rounded : Icons.directions_walk_rounded, size: 14, color: isIn ? kSuccess : kWarning),
                      const SizedBox(width: 6),
                      Text('Status: $status', style: TextStyle(color: isIn ? kSuccess : kWarning, fontSize: 12, fontWeight: FontWeight.w700)),
                    ]),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.all(20),
        sliver: SliverList(delegate: SliverChildListDelegate([
          // Quick actions
          const Text('Quick Actions', style: TextStyle(color: kText, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          Center(
            child: SizedBox(
              width: 160,
              child: _ActionCard(
                icon: Icons.note_add_rounded, label: 'Request\nPass', gradient: kGradient,
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PassRequestPage(profileData: profileData, studentData: studentData))),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text('Recent Passes', style: TextStyle(color: kText, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          PassHistoryList(studentId: profileData['uid'] as String, limit: 3),
        ])),
      ),
    ]);
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon; final String label; final LinearGradient gradient; final VoidCallback onTap;
  const _ActionCard({required this.icon, required this.label, required this.gradient, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 170,
        decoration: BoxDecoration(
          color: kCard,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: kBorder),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.16), blurRadius: 18, offset: const Offset(0, 8))],
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  gradient: gradient,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  icon,
                  color: Colors.white,
                  size: 24,
                ),
              ),

              const SizedBox(height: 16),

              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: kText,
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── History Tab ──────────────────────────────────────────────────────────────
class _HistoryTab extends StatelessWidget {
  final String uid;
  const _HistoryTab({required this.uid});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        title: const Text('Pass History'),
        actions: [IconButton(icon: const Icon(Icons.logout_rounded), onPressed: () => FirebaseAuth.instance.signOut())],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: PassHistoryList(studentId: uid, scrollable: true),
      ),
    );
  }
}



// ── Pass History List ────────────────────────────────────────────────────────
class PassHistoryList extends StatelessWidget {
  final String studentId;
  final int? limit;
  final bool scrollable;
  const PassHistoryList({super.key, required this.studentId, this.limit, this.scrollable = false});

  @override
  Widget build(BuildContext context) {
    var q = firestore.collection('passes').where('studentId', isEqualTo: studentId).orderBy('createdAt', descending: true);
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: q.snapshots(),
      builder: (context, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator(color: kPrimary));
        final docs = snap.data!.docs.take(limit ?? 999).toList();
        if (docs.isEmpty) {
          return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.inbox_rounded, size: 60, color: kSubtext.withAlpha(120)),
            const SizedBox(height: 12),
            const Text('No passes yet', style: TextStyle(color: kSubtext)),
          ]));
        }
        return ListView.separated(
          shrinkWrap: !scrollable,
          physics: scrollable ? null : const NeverScrollableScrollPhysics(),
          itemCount: docs.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, i) {
            final p = docs[i].data();
            final date = (p['createdAt'] as String? ?? '').split('T').first;
            final type = (p['type'] as String? ?? '').toUpperCase();
            final isApproved = (p['status'] as String? ?? '') == 'approved' || (p['status'] as String? ?? '') == 'active' || (p['status'] as String? ?? '') == 'completed';
            final adminApproval = p['adminApproval'] as String? ?? 'pending';
            final parentApproval = p['parentApproval'] as String? ?? 'pending';
            
            return GestureDetector(
              onTap: isApproved ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => PassDetailsScreen(passData: {'id': docs[i].id, ...p}))) : null,
              child: GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(color: kPrimary.withAlpha(30), borderRadius: BorderRadius.circular(14)),
                      child: Icon(_passIcon(p['type']), color: kPrimary, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(type, style: const TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 14)),
                      const SizedBox(height: 2),
                      Text(p['reason'] ?? '', style: const TextStyle(color: kSubtext, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ])),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      StatusBadge(status: p['status'] ?? 'pending'),
                      const SizedBox(height: 4),
                      Text(date, style: const TextStyle(color: kSubtext, fontSize: 11)),
                    ]),
                  ]),
                  const SizedBox(height: 12),
                  // Approval status badges — lunch pass shows 'Notified' for parent
                  Row(children: [
                    const SizedBox(width: 58),
                    Expanded(child: Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        _ApprovalBadge(role: 'Admin', status: adminApproval),
                        if ((p['type'] as String? ?? '') == 'lunch')
                          const _LunchParentNotifiedBadge()
                        else
                          _ApprovalBadge(role: 'Parent', status: parentApproval),
                      ],
                    )),
                  ]),
                ]),
              ),
            );
          },
        );
      },
    );
  }

  IconData _passIcon(String? type) {
    return switch (type) {
      'lunch'    => Icons.restaurant_rounded,
      'late'     => Icons.nightlight_rounded,
      'nightout' => Icons.home_rounded,
      _          => Icons.badge_rounded,
    };
  }
}

// ── Pass Request Page ────────────────────────────────────────────────────────
class PassRequestPage extends StatefulWidget {
  final Map<String, dynamic> profileData, studentData;
  const PassRequestPage({super.key, required this.profileData, required this.studentData});
  @override
  State<PassRequestPage> createState() => _PassRequestPageState();
}

class _PassRequestPageState extends State<PassRequestPage> {
  String passType = 'lunch';
  final _reason = TextEditingController();
  bool _loading = false;

  @override
  void dispose() { _reason.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(title: const Text('Request a Pass')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Pass Type', style: TextStyle(color: kSubtext, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.8)),
            const SizedBox(height: 14),
            ...[
              ('lunch', 'Lunch Pass', 'Out for 1 hour', Icons.restaurant_rounded),
              ('late', 'Late Pass', 'Return by 10 PM', Icons.nightlight_rounded),
              ('nightout', 'Night Out', 'Return next day', Icons.home_rounded),
              ('class', 'Class Pass', 'Valid till 9 PM', Icons.school_rounded),
              ('gate', 'Gate Pass', 'Valid till 9 PM', Icons.login_rounded),
            ].map((t) => _PassTypeCard(
              value: t.$1, label: t.$2, sub: t.$3, icon: t.$4,
              selected: passType == t.$1,
              onTap: () => setState(() => passType = t.$1),
            )),

          ])),
          const SizedBox(height: 16),
          GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Destination', style: TextStyle(color: kSubtext, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.8)),
            const SizedBox(height: 14),
            TextField(
              controller: _reason,
              style: const TextStyle(color: kText),
              decoration: const InputDecoration(labelText: 'Place to visit', prefixIcon: Icon(Icons.place_rounded, color: kSubtext, size: 20)),
            ),
          ])),
          const SizedBox(height: 24),
          GradientButton(label: 'Submit Request', onTap: _loading ? null : _submit, loading: _loading),
        ]),
      ),
    );
  }

  Future<void> _submit() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final reason = _reason.text.trim();
    if (reason.isEmpty) { messenger.showSnackBar(const SnackBar(content: Text('Please enter destination'), backgroundColor: kDanger)); return; }
    setState(() => _loading = true);
    try {
      final now = DateTime.now();
      final DateTime ret;
      if (passType == 'late' || passType == 'class' || passType == 'gate') {
        final nine = DateTime(now.year, now.month, now.day, 21);
        ret = now.isBefore(nine) ? nine : nine.add(const Duration(days: 1));
      } else if (passType == 'nightout') {
        final tom = now.add(const Duration(days: 1));
        ret = DateTime(tom.year, tom.month, tom.day, 12);
      } else {
        ret = now.add(const Duration(hours: 1));
      }

      // Lunch Pass: parent approval is not required — pre-approved; parent gets notification
      final isLunch = passType == 'lunch';
      final parentId = widget.studentData['parentId'] as String?;

      final docRef = await firestore.collection('passes').add({
        'studentId': widget.profileData['uid'],
        'studentName': widget.profileData['name'],
        'type': passType, 'reason': reason,
        'expectedReturnTime': ret.toIso8601String(),
        'parentApproval': isLunch ? 'approved' : 'pending',
        'adminApproval': 'pending', 'status': 'pending',
        'createdAt': now.toIso8601String(),
      });

      // Send informational notification to parent for Lunch Pass
      if (isLunch && parentId != null && parentId.isNotEmpty) {
        try {
          await firestore.collection('notifications').add({
            'parentId': parentId,
            'studentId': widget.profileData['uid'],
            'studentName': widget.profileData['name'],
            'passId': docRef.id,
            'type': 'lunch_pass_notification',
            'message': '${widget.profileData['name']} has requested a Lunch Pass (1-hour outing). No action required.',
            'read': false,
            'createdAt': now.toIso8601String(),
          });
        } catch (_) {
          // Notification failure is non-critical
        }
      }

      if (!mounted) return;
      navigator.pushReplacement(MaterialPageRoute(builder: (_) => PassReceiptScreen(
        passData: {'id': docRef.id, 'studentId': widget.profileData['uid'], 'studentName': widget.profileData['name'],
          'type': passType, 'reason': reason, 'expectedReturnTime': ret.toIso8601String(), 'createdAt': now.toIso8601String()},
        roomNo: widget.studentData['roomNo'] ?? 'N/A',
      )));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: kDanger));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

class _PassTypeCard extends StatelessWidget {
  final String value, label, sub; final IconData icon; final bool selected; final VoidCallback onTap;
  const _PassTypeCard({required this.value, required this.label, required this.sub, required this.icon, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? kPrimary.withAlpha(30) : kBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? kPrimary : kBorder, width: selected ? 2 : 1),
        ),
        child: Row(children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: selected ? kPrimary.withAlpha(60) : kCard, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: selected ? kPrimary : kSubtext, size: 20),
          ),
          const SizedBox(width: 14),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: TextStyle(color: selected ? kText : kSubtext, fontWeight: FontWeight.w700, fontSize: 14)),
            Text(sub, style: const TextStyle(color: kSubtext, fontSize: 12)),
          ]),
          if (selected) ...[const Spacer(), const Icon(Icons.check_circle_rounded, color: kPrimary, size: 22)],
        ]),
      ),
    );
  }
}

// ── Pass Receipt ─────────────────────────────────────────────────────────────
class PassReceiptScreen extends StatelessWidget {
  final Map<String, dynamic> passData;
  final String roomNo;
  const PassReceiptScreen({super.key, required this.passData, required this.roomNo});

  @override
  Widget build(BuildContext context) {
    final qr = jsonEncode({'passId': passData['id'], 'studentId': passData['studentId']});
    final type = (passData['type'] as String? ?? '').toUpperCase();
    final status = passData['status'] as String? ?? 'pending';
    final isApproved = status == 'approved' || status == 'active' || status == 'completed';
    final ret = DateTime.parse(passData['expectedReturnTime']).toLocal();
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(title: const Text('Pass Request')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(gradient: kGradient, borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: kPrimary.withAlpha(80), blurRadius: 20, offset: const Offset(0, 8))]),
            child: Column(children: [
              const Icon(Icons.hourglass_top_rounded, color: Colors.white, size: 48),
              const SizedBox(height: 10),
              const Text('Pass Request Sent', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Builder(builder: (context) {
                final t = passData['type'] as String? ?? '';
                return Text(
                  t == 'lunch'
                    ? 'Awaiting admin approval (parent notified)'
                    : 'Awaiting admin and parent approval',
                  style: TextStyle(color: Colors.white.withAlpha(180), fontSize: 13),
                );
              }),
            ]),
          ),
          const SizedBox(height: 20),
          GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _row('Type', type), const Divider(color: kBorder, height: 24),
            _row('Destination', passData['reason'] ?? ''), const Divider(color: kBorder, height: 24),
            _row('Return by', '${ret.day}/${ret.month}/${ret.year}  ${ret.hour.toString().padLeft(2,'0')}:${ret.minute.toString().padLeft(2,'0')}'),
            const Divider(color: kBorder, height: 24),
            _row('Room', roomNo),
          ])),
      
          const SizedBox(height: 20),
          _buildApprovalStatus(passData),
          const SizedBox(height: 20),
          if (isApproved) ...[
            GlassCard(
              padding: const EdgeInsets.all(24),
              child: Column(children: [
                const Text('Show this QR at the gate', style: TextStyle(color: kSubtext, fontSize: 13)),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                  child: QrImageView(data: qr, size: 180, backgroundColor: Colors.white),
                ),
                const SizedBox(height: 12),
                const Text('Scan to mark exit · scan again to mark return', textAlign: TextAlign.center, style: TextStyle(color: kSubtext, fontSize: 12)),
              ]),
            ),
          ] else ...[
          const GlassCard(
              padding: EdgeInsets.all(24),
              child: Column(children: [
                Icon(Icons.hourglass_top_rounded, size: 44, color: kSubtext),
                SizedBox(height: 16),
                Text('Pass QR will appear once approval is complete.', textAlign: TextAlign.center, style: TextStyle(color: kText, fontSize: 14, fontWeight: FontWeight.w700)),
                SizedBox(height: 8),
                Text('Your request is pending admin approval.', textAlign: TextAlign.center, style: TextStyle(color: kSubtext, fontSize: 12)),
              ]),
            ),
          ],
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
            style: OutlinedButton.styleFrom(foregroundColor: kText, side: const BorderSide(color: kBorder),
              minimumSize: const Size(double.infinity, 52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Back to Dashboard'),
          ),
        ]),
      ),
    );
  }

  Widget _row(String label, String value) => Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
    Text(label, style: const TextStyle(color: kSubtext, fontSize: 13)),
    Text(value, style: const TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 13)),
  ]);

  Widget _buildApprovalStatus(Map<String, dynamic> data) {
    final adminApproval = data['adminApproval'] as String? ?? 'pending';
    final parentApproval = data['parentApproval'] as String? ?? 'pending';
    final isLunch = (data['type'] as String? ?? '') == 'lunch';
    return GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Approval Status', style: TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 16),
      _approvalStatusRow('Admin', adminApproval),
      const SizedBox(height: 12),
      if (isLunch)
        _notifiedRow()
      else
        _approvalStatusRow('Parent', parentApproval),
    ]));
  }

  Widget _notifiedRow() {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      const Text('Parent', style: TextStyle(color: kSubtext, fontSize: 13)),
      Row(children: [
        const Icon(Icons.campaign_rounded, color: Colors.blue, size: 18),
        const SizedBox(width: 8),
        const Text('Notified', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.w600, fontSize: 13)),
      ]),
    ]);
  }

  Widget _approvalStatusRow(String role, String status) {
    final isApproved = status == 'approved';
    final isRejected = status == 'rejected';
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(role, style: const TextStyle(color: kSubtext, fontSize: 13)),
      Row(children: [
        Icon(
          isApproved ? Icons.check_circle : (isRejected ? Icons.cancel : Icons.schedule),
          color: isApproved ? Colors.green : (isRejected ? Colors.red : Colors.orange),
          size: 18,
        ),
        const SizedBox(width: 8),
        Text(
          status.replaceFirst(status[0], status[0].toUpperCase()),
          style: TextStyle(
            color: isApproved ? Colors.green : (isRejected ? Colors.red : Colors.orange),
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ]),
    ]);
  }
}

class _ApprovalBadge extends StatelessWidget {
  final String role;
  final String status;

  const _ApprovalBadge({required this.role, required this.status});

  @override
  Widget build(BuildContext context) {
    late Color bgColor;
    late Color textColor;
    late String icon;

    if (status == 'approved') {
      bgColor = const Color(0xFFF0FDF4);
      textColor = const Color(0xFF059669);
      icon = '✓';
    } else if (status == 'rejected') {
      bgColor = const Color(0xFFFEF2F2);
      textColor = const Color(0xFFDC2626);
      icon = '✗';
    } else {
      bgColor = const Color(0xFFFEF3C7);
      textColor = const Color(0xFFB45309);
      icon = '⏳';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: textColor.withAlpha(100)),
      ),
      child: Text(
        '$role $icon',
        style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

/// Badge shown in place of the parent approval badge for Lunch Pass (parent only notified, not required to approve)
class _LunchParentNotifiedBadge extends StatelessWidget {
  const _LunchParentNotifiedBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF3B82F6).withAlpha(100)),
      ),
      child: const Text(
        'Parent 📢 Notified',
        style: TextStyle(color: Color(0xFF2563EB), fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class PassDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> passData;
  const PassDetailsScreen({super.key, required this.passData});

  @override
  Widget build(BuildContext context) {
    final qr = jsonEncode({'passId': passData['id'], 'studentId': passData['studentId']});
    final type = (passData['type'] as String? ?? '').toUpperCase();
    final status = passData['status'] as String? ?? 'pending';
    final ret = DateTime.parse(passData['expectedReturnTime'] as String? ?? '').toLocal();
    
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(title: const Text('Pass Details')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(gradient: kGradient, borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: kPrimary.withAlpha(80), blurRadius: 20, offset: const Offset(0, 8))]),
            child: Column(children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 48),
              const SizedBox(height: 10),
              const Text('Pass Approved', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Status: ${status.toUpperCase()}', style: TextStyle(color: Colors.white.withAlpha(180), fontSize: 13)),
            ]),
          ),
          const SizedBox(height: 20),
          GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _row('Type', type), const Divider(color: kBorder, height: 24),
            _row('Destination', passData['reason'] ?? ''), const Divider(color: kBorder, height: 24),
            _row('Return by', '${ret.day}/${ret.month}/${ret.year}  ${ret.hour.toString().padLeft(2,'0')}:${ret.minute.toString().padLeft(2,'0')}'),
          ])),
          const SizedBox(height: 20),
          _buildApprovalStatus(passData),
          const SizedBox(height: 20),
          GlassCard(
            padding: const EdgeInsets.all(24),
            child: Column(children: [
              const Text('Show this QR at the gate', style: TextStyle(color: kSubtext, fontSize: 13)),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                child: QrImageView(data: qr, size: 180, backgroundColor: Colors.white),
              ),
              const SizedBox(height: 12),
              const Text('Scan to mark exit · scan again to mark return', textAlign: TextAlign.center, style: TextStyle(color: kSubtext, fontSize: 12)),
            ]),
          ),
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () => Navigator.pop(context),
            style: OutlinedButton.styleFrom(foregroundColor: kText, side: const BorderSide(color: kBorder),
              minimumSize: const Size(double.infinity, 52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Back'),
          ),
        ]),
      ),
    );
  }

  Widget _buildApprovalStatus(Map<String, dynamic> passData) {
    final adminApproval = passData['adminApproval'] as String? ?? 'pending';
    final parentApproval = passData['parentApproval'] as String? ?? 'pending';
    final isLunch = (passData['type'] as String? ?? '') == 'lunch';
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Approvals', style: TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 14)),
        const SizedBox(height: 12),
        _approvalStatusRow('Admin', adminApproval),
        const SizedBox(height: 12),
        if (isLunch)
          _notifiedRow()
        else
          _approvalStatusRow('Parent', parentApproval),
      ]),
    );
  }

  Widget _notifiedRow() {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      const Text('Parent', style: TextStyle(color: kSubtext, fontSize: 13)),
      Row(children: [
        const Icon(Icons.campaign_rounded, color: Colors.blue, size: 18),
        const SizedBox(width: 8),
        const Text('Notified', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.w600, fontSize: 13)),
      ]),
    ]);
  }

  Widget _approvalStatusRow(String role, String status) {
    final isApproved = status == 'approved';
    final isRejected = status == 'rejected';
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(role, style: const TextStyle(color: kSubtext, fontSize: 13)),
      Row(children: [
        Icon(
          isApproved ? Icons.check_circle : (isRejected ? Icons.cancel : Icons.schedule),
          color: isApproved ? Colors.green : (isRejected ? Colors.red : Colors.orange),
          size: 18,
        ),
        const SizedBox(width: 8),
        Text(
          status.replaceFirst(status[0], status[0].toUpperCase()),
          style: TextStyle(
            color: isApproved ? Colors.green : (isRejected ? Colors.red : Colors.orange),
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ]),
    ]);
  }

  Widget _row(String label, String value) => Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
    Text(label, style: const TextStyle(color: kSubtext, fontSize: 13)),
    Text(value, style: const TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 13)),
  ]);
}

