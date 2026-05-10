import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../main.dart' show firestore;
import '../theme.dart';

// ── Parent Home (with tabs) ───────────────────────────────────────────────────
class ParentHomePage extends StatefulWidget {
  final Map<String, dynamic> profileData;
  const ParentHomePage({super.key, required this.profileData});

  @override
  State<ParentHomePage> createState() => _ParentHomePageState();
}

class _ParentHomePageState extends State<ParentHomePage> {
  int _idx = 0; // 0 = Approvals, 1 = History

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: firestore
          .collection('students')
          .where('parentId', isEqualTo: widget.profileData['uid'])
          .snapshots(),
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: kPrimary)),
          );
        }
        if (snap.data!.docs.isEmpty) {
          return const Scaffold(
            body: Center(
              child: Text('No linked student found.',
                  style: TextStyle(color: kSubtext)),
            ),
          );
        }

        final sd = snap.data!.docs.first.data();
        final studentUid = sd['uid'] as String? ?? '';

        return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
          stream: firestore.collection('users').doc(studentUid).snapshots(),
          builder: (context, userSnap) {
            final sName = userSnap.hasData && userSnap.data!.exists
                ? (userSnap.data!.data()!['name'] as String? ?? 'Student')
                : 'Loading…';
            final room = sd['roomNo'] as String? ?? 'N/A';
            final status = sd['currentStatus'] as String? ?? 'IN';
            final isIn = status == 'IN';

            // Count pending passes for badge
            return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
              stream: firestore
                  .collection('passes')
                  .where('studentId', isEqualTo: studentUid)
                  .where('parentApproval', isEqualTo: 'pending')
                  .snapshots(),
              builder: (context, pendingSnap) {
                final pendingCount = pendingSnap.data?.docs.length ?? 0;

                return Scaffold(
                  backgroundColor: kBg,
                  body: IndexedStack(
                    index: _idx,
                    children: [
                      _ApprovalsTab(
                        studentUid: studentUid,
                        sName: sName,
                        room: room,
                        status: status,
                        isIn: isIn,
                      ),
                      _HistoryTab(
                        studentUid: studentUid,
                        sName: sName,
                        room: room,
                        status: status,
                        isIn: isIn,
                      ),
                    ],
                  ),
                  bottomNavigationBar: _ParentBottomNav(
                    index: _idx,
                    pendingCount: pendingCount,
                    onTap: (i) => setState(() => _idx = i),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
class _ParentBottomNav extends StatelessWidget {
  final int index;
  final int pendingCount;
  final ValueChanged<int> onTap;
  const _ParentBottomNav(
      {required this.index,
      required this.pendingCount,
      required this.onTap});

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
              _NavItem(
                icon: Icons.notifications_rounded,
                label: 'Approvals',
                selected: index == 0,
                badge: pendingCount,
                onTap: () => onTap(0),
              ),
              _NavItem(
                icon: Icons.history_rounded,
                label: 'History',
                selected: index == 1,
                onTap: () => onTap(1),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final int badge;
  final VoidCallback onTap;
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.badge = 0,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? kPrimary.withAlpha(18) : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon,
                    color: selected ? kPrimary : kSubtext, size: 24),
                const SizedBox(height: 4),
                Text(label,
                    style: TextStyle(
                        color: selected ? kPrimary : kSubtext,
                        fontSize: 12,
                        fontWeight: FontWeight.w600)),
              ],
            ),
            if (badge > 0)
              Positioned(
                top: -6,
                right: -10,
                child: Container(
                  width: 18,
                  height: 18,
                  decoration: const BoxDecoration(
                      color: Colors.orange,
                      shape: BoxShape.circle),
                  child: Center(
                    child: Text('$badge',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w800)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Shared Header sliver ──────────────────────────────────────────────────────
SliverAppBar _buildHeader({
  required String sName,
  required String room,
  required String status,
  required bool isIn,
  required String title,
}) {
  return SliverAppBar(
    expandedHeight: 180,
    pinned: true,
    backgroundColor: kBg,
    actions: [
      IconButton(
        icon: const Icon(Icons.logout_rounded, color: kText),
        onPressed: () => FirebaseAuth.instance.signOut(),
      ),
    ],
    flexibleSpace: FlexibleSpaceBar(
      background: Container(
        decoration: const BoxDecoration(gradient: kGradientTeal),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Row(children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withAlpha(90)),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 3))],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: Image.asset('assets/tssm-logo.png', fit: BoxFit.cover),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(sName,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w700)),
                        Text('Room $room · $status',
                            style: TextStyle(
                                color: Colors.white.withAlpha(180),
                                fontSize: 13)),
                      ]),
                ]),
                const SizedBox(height: 12),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: (isIn ? kSuccess : kWarning).withAlpha(40),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                        color: (isIn ? kSuccess : kWarning).withAlpha(120)),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(
                        isIn
                            ? Icons.home_rounded
                            : Icons.directions_walk_rounded,
                        size: 13,
                        color: isIn ? kSuccess : kWarning),
                    const SizedBox(width: 6),
                    Text('Currently $status',
                        style: TextStyle(
                            color: isIn ? kSuccess : kWarning,
                            fontSize: 11,
                            fontWeight: FontWeight.w700)),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

// ── Approvals Tab ─────────────────────────────────────────────────────────────
class _ApprovalsTab extends StatelessWidget {
  final String studentUid, sName, room, status;
  final bool isIn;
  const _ApprovalsTab({
    required this.studentUid,
    required this.sName,
    required this.room,
    required this.status,
    required this.isIn,
  });

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(slivers: [
      _buildHeader(
          sName: sName, room: room, status: status, isIn: isIn, title: ''),
      SliverPadding(
        padding: const EdgeInsets.all(20),
        sliver: SliverList(
          delegate: SliverChildListDelegate([
            const Text('Pending Approvals',
                style: TextStyle(
                    color: kText, fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            _ParentApprovalList(studentId: studentUid),
          ]),
        ),
      ),
    ]);
  }
}

// ── History Tab ───────────────────────────────────────────────────────────────
class _HistoryTab extends StatelessWidget {
  final String studentUid, sName, room, status;
  final bool isIn;
  const _HistoryTab({
    required this.studentUid,
    required this.sName,
    required this.room,
    required this.status,
    required this.isIn,
  });

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(slivers: [
      _buildHeader(
          sName: sName, room: room, status: status, isIn: isIn, title: ''),
      SliverPadding(
        padding: const EdgeInsets.all(20),
        sliver: SliverList(
          delegate: SliverChildListDelegate([
            const Text('Pass History',
                style: TextStyle(
                    color: kText, fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text('All passes — completed, approved & rejected',
                style: TextStyle(color: kSubtext, fontSize: 12)),
            const SizedBox(height: 16),
            _PassHistoryList(studentId: studentUid),
          ]),
        ),
      ),
    ]);
  }
}

// ── Pass History List (for parent — shows all non-pending) ────────────────────
class _PassHistoryList extends StatelessWidget {
  final String studentId;
  const _PassHistoryList({required this.studentId});

  IconData _icon(String? type) => switch (type) {
        'lunch' => Icons.restaurant_rounded,
        'late' => Icons.nightlight_rounded,
        'nightout' => Icons.hotel_rounded,
        _ => Icons.badge_rounded,
      };

  Color _passColor(String? type) => switch (type) {
        'lunch' => kPrimary,
        'late' => kAccent,
        'nightout' => kSecondary,
        _ => kSubtext,
      };

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: firestore
          .collection('passes')
          .where('studentId', isEqualTo: studentId)
          .orderBy('createdAt', descending: true)
          .snapshots(),
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Center(
              child: CircularProgressIndicator(color: kPrimary));
        }
        // Show all passes that are not in pure pending state
        final docs = snap.data!.docs
            .where((d) => d.data()['status'] != 'pending')
            .toList();

        if (docs.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 48),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.history_rounded,
                    size: 64, color: kSubtext.withAlpha(100)),
                const SizedBox(height: 16),
                const Text('No history yet',
                    style: TextStyle(
                        color: kText, fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                const Text('Completed passes will appear here',
                    style: TextStyle(color: kSubtext, fontSize: 13)),
              ],
            ),
          );
        }

        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: docs.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, i) {
            final p = docs[i].data();
            final type = p['type'] as String? ?? '';
            final date =
                (p['createdAt'] as String? ?? '').split('T').first;
            final retRaw = p['expectedReturnTime'] as String? ?? '';
            final retDate = retRaw.isNotEmpty
                ? DateTime.tryParse(retRaw)?.toLocal()
                : null;
            final retStr = retDate != null
                ? '${retDate.day}/${retDate.month}  ${retDate.hour.toString().padLeft(2, '0')}:${retDate.minute.toString().padLeft(2, '0')}'
                : '—';
            final adminApp = p['adminApproval'] as String? ?? 'pending';
            final parentApp = p['parentApproval'] as String? ?? 'pending';
            final passColor = _passColor(type);

            return GlassCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top row: icon + type + status badge
                  Row(children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: passColor.withAlpha(28),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(_icon(type), color: passColor, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${type.toUpperCase()} Pass',
                                style: const TextStyle(
                                    color: kText,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14)),
                            if ((p['reason'] as String? ?? '').isNotEmpty)
                              Text(p['reason'],
                                  style:
                                      const TextStyle(color: kSubtext, fontSize: 12),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                          ]),
                    ),
                    StatusBadge(status: p['status'] ?? 'pending'),
                  ]),

                  const SizedBox(height: 12),
                  const Divider(color: kBorder, height: 1),
                  const SizedBox(height: 12),

                  // Details grid
                  Row(children: [
                    const Icon(Icons.calendar_today_rounded,
                        size: 13, color: kSubtext),
                    const SizedBox(width: 6),
                    Text('Requested: $date',
                        style:
                            const TextStyle(color: kSubtext, fontSize: 12)),
                    const Spacer(),
                    const Icon(Icons.schedule_rounded,
                        size: 13, color: kSubtext),
                    const SizedBox(width: 4),
                    Text('Return: $retStr',
                        style:
                            const TextStyle(color: kSubtext, fontSize: 12)),
                  ]),

                  const SizedBox(height: 10),

                  // Approval pills
                  Row(children: [
                    _ApprovalPill(label: 'Admin', status: adminApp),
                    const SizedBox(width: 8),
                    _ApprovalPill(label: 'Parent', status: parentApp),
                  ]),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

// ── Approval pill ─────────────────────────────────────────────────────────────
class _ApprovalPill extends StatelessWidget {
  final String label, status;
  const _ApprovalPill({required this.label, required this.status});

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'approved' => kSuccess,
      'rejected' => kDanger,
      _ => kWarning,
    };
    final icon = switch (status) {
      'approved' => Icons.check_circle_rounded,
      'rejected' => Icons.cancel_rounded,
      _ => Icons.hourglass_top_rounded,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(24),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(80)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Text('$label: $status',
            style: TextStyle(
                color: color, fontSize: 11, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

// ── Parent Approval List ──────────────────────────────────────────────────────
class _ParentApprovalList extends StatelessWidget {
  final String studentId;
  const _ParentApprovalList({required this.studentId});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: firestore
          .collection('passes')
          .where('studentId', isEqualTo: studentId)
          .where('parentApproval', isEqualTo: 'pending')
          .orderBy('createdAt', descending: true)
          .snapshots(),
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Center(
              child: CircularProgressIndicator(color: kPrimary));
        }
        final docs = snap.data!.docs;
        if (docs.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(40),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.check_circle_outline_rounded,
                  size: 60, color: kSuccess.withAlpha(150)),
              const SizedBox(height: 12),
              const Text('All caught up!',
                  style: TextStyle(
                      color: kText, fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              const Text('No pending approvals',
                  style: TextStyle(color: kSubtext)),
            ]),
          );
        }
        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: docs.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, i) {
            final pass = docs[i];
            final p = pass.data();
            final type = (p['type'] as String? ?? '').toUpperCase();
            final adminApproval =
                p['adminApproval'] as String? ?? 'pending';

            return GlassCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                            color: kWarning.withAlpha(30),
                            borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.pending_actions_rounded,
                            color: kWarning, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text('$type Pass',
                                style: const TextStyle(
                                    color: kText,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14)),
                            Text('Visit: ${p['reason'] ?? ''}',
                                style: const TextStyle(
                                    color: kSubtext, fontSize: 12)),
                          ])),
                      const StatusBadge(status: 'pending'),
                    ]),

                    // Admin status hint
                    if (adminApproval != 'approved') ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: kWarning.withAlpha(20),
                          borderRadius: BorderRadius.circular(10),
                          border:
                              Border.all(color: kWarning.withAlpha(60)),
                        ),
                        child: const Row(children: [
                          Icon(Icons.info_outline_rounded,
                              size: 14, color: kWarning),
                          SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Admin approval also pending — your consent will be saved and applied once admin approves.',
                              style:
                                  TextStyle(color: kWarning, fontSize: 11),
                            ),
                          ),
                        ]),
                      ),
                    ],
                    if (adminApproval == 'approved') ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: kSuccess.withAlpha(20),
                          borderRadius: BorderRadius.circular(10),
                          border:
                              Border.all(color: kSuccess.withAlpha(60)),
                        ),
                        child: const Row(children: [
                          Icon(Icons.check_circle_rounded,
                              size: 14, color: kSuccess),
                          SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Admin has approved — your approval will activate the pass immediately.',
                              style:
                                  TextStyle(color: kSuccess, fontSize: 11),
                            ),
                          ),
                        ]),
                      ),
                    ],

                    const SizedBox(height: 14),
                    const Divider(color: kBorder, height: 1),
                    const SizedBox(height: 14),

                    Row(children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () async {
                            final passSnap = await firestore
                                .collection('passes')
                                .doc(pass.id)
                                .get();
                            if (!passSnap.exists) return;
                            final adm = passSnap.data()?['adminApproval']
                                    as String? ??
                                'pending';
                            final updates = <String, dynamic>{
                              'parentApproval': 'approved'
                            };
                            if (adm == 'approved') {
                              updates['status'] = 'approved';
                            }
                            await firestore
                                .collection('passes')
                                .doc(pass.id)
                                .update(updates);
                          },
                          child: Container(
                            height: 44,
                            decoration: BoxDecoration(
                              color: kSuccess.withAlpha(30),
                              borderRadius: BorderRadius.circular(12),
                              border:
                                  Border.all(color: kSuccess.withAlpha(80)),
                            ),
                            child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.check_rounded,
                                      color: kSuccess, size: 18),
                                  SizedBox(width: 6),
                                  Text('Approve',
                                      style: TextStyle(
                                          color: kSuccess,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 13)),
                                ]),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => firestore
                              .collection('passes')
                              .doc(pass.id)
                              .update({
                            'parentApproval': 'rejected',
                            'status': 'rejected'
                          }),
                          child: Container(
                            height: 44,
                            decoration: BoxDecoration(
                              color: kDanger.withAlpha(30),
                              borderRadius: BorderRadius.circular(12),
                              border:
                                  Border.all(color: kDanger.withAlpha(80)),
                            ),
                            child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.close_rounded,
                                      color: kDanger, size: 18),
                                  SizedBox(width: 6),
                                  Text('Reject',
                                      style: TextStyle(
                                          color: kDanger,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 13)),
                                ]),
                          ),
                        ),
                      ),
                    ]),
                  ]),
            );
          },
        );
      },
    );
  }
}

// ── Admin Home ────────────────────────────────────────────────────────────────
class AdminHomePage extends StatelessWidget {
  const AdminHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
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
          child:
              Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                  gradient: kGradient,
                  borderRadius: BorderRadius.circular(36),
                  boxShadow: [
                    BoxShadow(
                        color: kPrimary.withAlpha(80),
                        blurRadius: 30,
                        offset: const Offset(0, 10))
                  ]),
              child: const Icon(Icons.admin_panel_settings_rounded,
                  size: 60, color: Colors.white),
            ),
            const SizedBox(height: 28),
            const Text('Admin Panel',
                style: TextStyle(
                    color: kText, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text(
                'Manage hostel operations from the\nweb dashboard at your PC.',
                textAlign: TextAlign.center,
                style:
                    TextStyle(color: kSubtext, fontSize: 14, height: 1.6)),
          ]),
        ),
      ),
    );
  }
}
