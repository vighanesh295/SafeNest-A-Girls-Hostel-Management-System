import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../main.dart' show firestore;
import '../theme.dart';
import 'guard_scanner_screen.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Security Dashboard  (role == "security")
// ─────────────────────────────────────────────────────────────────────────────
class SecurityDashboardScreen extends StatefulWidget {
  final Map<String, dynamic> profileData;
  const SecurityDashboardScreen({super.key, required this.profileData});
  @override
  State<SecurityDashboardScreen> createState() => _SecurityDashboardScreenState();
}

class _SecurityDashboardScreenState extends State<SecurityDashboardScreen> {
  int _idx = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      body: IndexedStack(index: _idx, children: [
        _HomeTab(profileData: widget.profileData),
        const _OutStudentsTab(),
        const _GateHistoryTab(),
      ]),
      bottomNavigationBar: _BottomNav(
        index: _idx,
        onTap: (i) => setState(() => _idx = i),
      ),
    );
  }
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
class _BottomNav extends StatelessWidget {
  final int index;
  final ValueChanged<int> onTap;
  const _BottomNav({required this.index, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: kBg,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 18),
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
              _NavItem(icon: Icons.shield_rounded,          label: 'Home',    selected: index == 0, onTap: () => onTap(0)),
              _NavItem(icon: Icons.directions_walk_rounded, label: 'Outside', selected: index == 1, onTap: () => onTap(1)),
              _NavItem(icon: Icons.history_rounded,         label: 'History', selected: index == 2, onTap: () => onTap(2)),
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
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? kPrimary.withAlpha(18) : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: selected ? kPrimary : kSubtext, size: 24),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: selected ? kPrimary : kSubtext, fontSize: 11, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

// ── Home Tab ──────────────────────────────────────────────────────────────────
class _HomeTab extends StatelessWidget {
  final Map<String, dynamic> profileData;
  const _HomeTab({required this.profileData});

  @override
  Widget build(BuildContext context) {
    final name = profileData['name'] as String? ?? 'Security';
    return CustomScrollView(slivers: [
      // ── Header ─────────────────────────────────────────────────────────────
      SliverAppBar(
        expandedHeight: 190,
        pinned: true,
        backgroundColor: kBg,
        actions: [IconButton(icon: const Icon(Icons.logout_rounded, color: kText), onPressed: () => FirebaseAuth.instance.signOut())],
        flexibleSpace: FlexibleSpaceBar(
          background: Container(
            decoration: const BoxDecoration(gradient: kGradientTeal),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.end, children: [
                  Row(children: [
                    Container(
                      width: 52, height: 52,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withAlpha(120), width: 2),
                        boxShadow: [BoxShadow(color: Colors.black.withAlpha(30), blurRadius: 10, offset: const Offset(0, 4))],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.asset('assets/images/tssm_logo.png', fit: BoxFit.contain, width: 52, height: 52),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Welcome, $name', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text('Gate Security · SafeNest', style: TextStyle(color: Colors.white.withAlpha(180), fontSize: 13)),
                    ]),
                  ]),
                ]),
              ),
            ),
          ),
        ),
      ),

      // ── Stats + Scanner ─────────────────────────────────────────────────────
      SliverPadding(
        padding: const EdgeInsets.all(20),
        sliver: SliverList(delegate: SliverChildListDelegate([

          // Live stats row
          StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
            stream: firestore.collection('students').snapshots(),
            builder: (context, snap) {
              final docs = snap.data?.docs ?? [];
              final outCount = docs.where((d) => (d.data()['currentStatus'] as String? ?? 'IN') == 'OUT').length;
              final inCount  = docs.length - outCount;
              return Row(children: [
                Expanded(child: _StatCard(label: 'In Campus', value: '$inCount', icon: Icons.home_rounded,         color: kSuccess)),
                const SizedBox(width: 12),
                Expanded(child: _StatCard(label: 'Outside',   value: '$outCount', icon: Icons.directions_walk_rounded, color: kWarning)),
              ]);
            },
          ),
          const SizedBox(height: 12),

          // Active passes count
          StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
            stream: firestore.collection('passes').where('status', isEqualTo: 'active').snapshots(),
            builder: (context, snap) {
              final count = snap.data?.docs.length ?? 0;
              return _StatCard(
                label: 'Active Passes', value: '$count',
                icon: Icons.badge_rounded, color: kPrimary, wide: true,
              );
            },
          ),
          const SizedBox(height: 24),

          // Scan QR button
          const Text('Gate Actions', style: TextStyle(color: kText, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const GuardScannerScreen())),
            child: Container(
              height: 80,
              decoration: BoxDecoration(
                gradient: kGradient,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: kPrimary.withAlpha(80), blurRadius: 18, offset: const Offset(0, 6))],
              ),
              child: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 32),
                SizedBox(width: 16),
                Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Scan QR Code', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                  Text('Verify student gate pass', style: TextStyle(color: Colors.white70, fontSize: 12)),
                ]),
              ]),
            ),
          ),
          const SizedBox(height: 24),

          // Recent scans preview (last 3)
          const Text('Recent Scans', style: TextStyle(color: kText, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          _RecentScansPreview(),
        ])),
      ),
    ]);
  }
}

class _StatCard extends StatelessWidget {
  final String label, value; final IconData icon; final Color color; final bool wide;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color, this.wide = false});
  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Container(width: 40, height: 40, decoration: BoxDecoration(color: color.withAlpha(28), borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: color, size: 20)),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(color: kSubtext, fontSize: 12)),
        ]),
      ]),
    );
  }
}

class _RecentScansPreview extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: firestore.collection('passes')
          .where('status', whereIn: ['active', 'completed'])
          .orderBy('exitTime', descending: true)
          .limit(3)
          .snapshots(),
      builder: (context, snap) {
        if (!snap.hasData || snap.data!.docs.isEmpty) {
          return const _EmptyState(icon: Icons.qr_code_rounded, message: 'No scans yet today');
        }
        return Column(
          children: snap.data!.docs.map((doc) => _ScanTile(data: doc.data(), compact: true)).toList(),
        );
      },
    );
  }
}

// ── Outside Students Tab ──────────────────────────────────────────────────────
class _OutStudentsTab extends StatelessWidget {
  const _OutStudentsTab();
  @override
  Widget build(BuildContext context) {
    return CustomScrollView(slivers: [
      SliverAppBar(
        pinned: true, backgroundColor: kBg,
        title: const Text('Outside Campus', style: TextStyle(color: kText)),
        actions: [IconButton(icon: const Icon(Icons.logout_rounded, color: kText), onPressed: () => FirebaseAuth.instance.signOut())],
      ),
      SliverPadding(
        padding: const EdgeInsets.all(20),
        sliver: SliverToBoxAdapter(
          child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
            stream: firestore.collection('students').where('currentStatus', isEqualTo: 'OUT').snapshots(),
            builder: (context, snap) {
              if (!snap.hasData) return const Center(child: CircularProgressIndicator(color: kPrimary));
              final docs = snap.data!.docs;
              if (docs.isEmpty) {
                return const _EmptyState(icon: Icons.check_circle_rounded, message: 'All students are in campus');
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${docs.length} student${docs.length == 1 ? '' : 's'} outside', style: const TextStyle(color: kSubtext, fontSize: 13)),
                  const SizedBox(height: 14),
                  ...docs.map((doc) => _OutStudentCard(data: doc.data())),
                ],
              );
            },
          ),
        ),
      ),
    ]);
  }
}

class _OutStudentCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _OutStudentCard({required this.data});
  @override
  Widget build(BuildContext context) {
    final uid     = data['uid'] as String? ?? '';
    final roomNo  = data['roomNo'] as String? ?? 'N/A';
    final exitRaw = data['lastExitTime'] as String? ?? '';
    final exitDt  = exitRaw.isNotEmpty ? DateTime.tryParse(exitRaw)?.toLocal() : null;
    final exitStr = exitDt != null
        ? '${exitDt.hour.toString().padLeft(2,'0')}:${exitDt.minute.toString().padLeft(2,'0')}'
        : '—';

    return FutureBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      future: firestore.collection('users').doc(uid).get(),
      builder: (context, snap) {
        final name = snap.data?.data()?['name'] as String? ?? 'Student';
        return GlassCard(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: kWarning.withAlpha(28), borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.directions_walk_rounded, color: kWarning, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 14)),
              Text('Room $roomNo', style: const TextStyle(color: kSubtext, fontSize: 12)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: kWarning.withAlpha(28), borderRadius: BorderRadius.circular(8)),
                child: const Text('OUT', style: TextStyle(color: kWarning, fontWeight: FontWeight.w800, fontSize: 11)),
              ),
              const SizedBox(height: 4),
              Text('Since $exitStr', style: const TextStyle(color: kSubtext, fontSize: 11)),
            ]),
          ]),
        );
      },
    );
  }
}

// ── Gate History Tab ──────────────────────────────────────────────────────────
class _GateHistoryTab extends StatelessWidget {
  const _GateHistoryTab();
  @override
  Widget build(BuildContext context) {
    return CustomScrollView(slivers: [
      SliverAppBar(
        pinned: true, backgroundColor: kBg,
        title: const Text('Gate Log', style: TextStyle(color: kText)),
        actions: [IconButton(icon: const Icon(Icons.logout_rounded, color: kText), onPressed: () => FirebaseAuth.instance.signOut())],
      ),
      SliverPadding(
        padding: const EdgeInsets.all(20),
        sliver: SliverToBoxAdapter(
          child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
            stream: firestore.collection('passes')
                .where('status', whereIn: ['active', 'completed'])
                .orderBy('exitTime', descending: true)
                .limit(50)
                .snapshots(),
            builder: (context, snap) {
              if (!snap.hasData) return const Center(child: CircularProgressIndicator(color: kPrimary));
              final docs = snap.data!.docs;
              if (docs.isEmpty) {
                return const _EmptyState(icon: Icons.history_rounded, message: 'No gate activity yet');
              }
              return Column(
                children: docs.map((doc) => _ScanTile(data: doc.data())).toList(),
              );
            },
          ),
        ),
      ),
    ]);
  }
}

// ── Shared scan tile ──────────────────────────────────────────────────────────
class _ScanTile extends StatelessWidget {
  final Map<String, dynamic> data;
  final bool compact;
  const _ScanTile({required this.data, this.compact = false});

  @override
  Widget build(BuildContext context) {
    final studentName = data['studentName'] as String? ?? 'Student';
    final passType    = (data['type'] as String? ?? 'pass').toUpperCase();
    final status      = data['status'] as String? ?? '';
    final isActive    = status == 'active';
    final exitRaw     = data['exitTime'] as String? ?? data['actualExitTime'] as String? ?? '';
    final retRaw      = data['returnTime'] as String? ?? data['actualReturnTime'] as String? ?? '';

    String timeStr = '—';
    if (isActive && exitRaw.isNotEmpty) {
      final dt = DateTime.tryParse(exitRaw)?.toLocal();
      if (dt != null) timeStr = 'Out ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
    } else if (!isActive && retRaw.isNotEmpty) {
      final dt = DateTime.tryParse(retRaw)?.toLocal();
      if (dt != null) timeStr = 'In ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
    }

    final color = isActive ? kWarning : kSuccess;
    final icon  = isActive ? Icons.directions_walk_rounded : Icons.home_rounded;

    return GlassCard(
      padding: EdgeInsets.all(compact ? 12 : 14),
      child: Row(children: [
        Container(width: 38, height: 38, decoration: BoxDecoration(color: color.withAlpha(28), borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: color, size: 20)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(studentName, style: const TextStyle(color: kText, fontWeight: FontWeight.w700, fontSize: 13)),
          Text('$passType Pass · $timeStr', style: const TextStyle(color: kSubtext, fontSize: 11)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: color.withAlpha(28), borderRadius: BorderRadius.circular(8)),
          child: Text(isActive ? 'OUT' : 'IN', style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 11)),
        ),
      ]),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────
class _EmptyState extends StatelessWidget {
  final IconData icon; final String message;
  const _EmptyState({required this.icon, required this.message});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, size: 56, color: kSubtext.withAlpha(100)),
        const SizedBox(height: 12),
        Text(message, style: const TextStyle(color: kSubtext, fontSize: 14)),
      ]),
    );
  }
}
