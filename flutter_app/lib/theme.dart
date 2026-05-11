import 'package:flutter/material.dart';

// ── Palette ──────────────────────────────────────────────────────────────────
const kBg        = Color(0xFFFAF8F3);
const kSurface   = Color(0xFFF4F2ED);
const kCard      = Color(0xFFFFFFFF);
const kPrimary   = Color(0xFFC49A52);
const kSecondary = Color(0xFF7A6A55);
const kAccent    = Color(0xFF8CC6C1);
const kDanger    = Color(0xFFEE6B5B);
const kWarning   = Color(0xFFF2C66B);
const kSuccess   = Color(0xFF5FD4B7);
const kText      = Color(0xFF1A1610);
const kSubtext   = Color(0xFF8B7F6F);
const kBorder    = Color(0xFFE5E0D5);

const kGradient = LinearGradient(
  colors: [Color(0xFFC49A52), Color(0xFF8C7656)],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

const kGradientTeal = LinearGradient(
  colors: [kAccent, kPrimary],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

const kGradientSoft = LinearGradient(
  colors: [Color(0xFF3E4A5A), Color(0xFF1E232C)],
  begin: Alignment.topCenter,
  end: Alignment.bottomCenter,
);

// ── Theme ────────────────────────────────────────────────────────────────────
ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: kBg,
    colorScheme: const ColorScheme.light(
      primary: kPrimary,
      secondary: kAccent,
      surface: kSurface,
      error: kDanger,
      onPrimary: Colors.white,
      onSurface: kText,
      onSecondary: Colors.white,
      onError: Colors.white,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: kBg,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: kText,
        fontSize: 20,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.6,
      ),
      iconTheme: IconThemeData(color: kText),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: kSurface,
      selectedItemColor: kPrimary,
      unselectedItemColor: kSubtext,
      showUnselectedLabels: true,
      elevation: 0,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kSurface,
      labelStyle: const TextStyle(color: kSubtext, fontWeight: FontWeight.w500),
      hintStyle: const TextStyle(color: kSubtext),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: kBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: kPrimary, width: 2),
      ),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 56),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.6),
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kText,
        side: const BorderSide(color: kBorder),
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: kText, fontSize: 16, height: 1.5),
      bodyMedium: TextStyle(color: kText, fontSize: 14, height: 1.45),
      bodySmall: TextStyle(color: kSubtext, fontSize: 13, height: 1.4),
      titleLarge: TextStyle(color: kText, fontSize: 22, fontWeight: FontWeight.w700),
      titleMedium: TextStyle(color: kText, fontSize: 18, fontWeight: FontWeight.w600),
      labelLarge: TextStyle(color: kText, fontWeight: FontWeight.w700),
    ),
    cardTheme: CardThemeData(
      color: kCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: kBorder),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: kCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
    dividerTheme: const DividerThemeData(color: kBorder, thickness: 1),
    dropdownMenuTheme: const DropdownMenuThemeData(
      textStyle: TextStyle(color: kText),
      menuStyle: MenuStyle(backgroundColor: WidgetStatePropertyAll(kCard)),
    ),
  );
}

// ── Reusable widgets ─────────────────────────────────────────────────────────
class GradientButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool loading;
  final Gradient gradient;

  const GradientButton({
    super.key,
    required this.label,
    this.onTap,
    this.loading = false,
    this.gradient = kGradient,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: loading ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        height: 56,
        decoration: BoxDecoration(
          gradient: loading ? null : gradient,
          color: loading ? kSurface : null,
          borderRadius: BorderRadius.circular(18),
          boxShadow: loading
              ? []
              : [BoxShadow(color: kPrimary.withAlpha(70), blurRadius: 18, offset: const Offset(0, 8))],
        ),
        child: Center(
          child: loading
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: kText))
              : Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16, letterSpacing: 0.5)),
        ),
      ),
    );
  }
}

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  const GlassCard({super.key, required this.child, this.padding});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: kBorder),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 22, offset: const Offset(0, 10))],
      ),
      child: child,
    );
  }
}

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (status.toLowerCase()) {
      'approved' => (kSuccess, Icons.check_circle_rounded),
      'active'   => (kAccent,  Icons.directions_run_rounded),
      'pending'  => (kWarning, Icons.hourglass_top_rounded),
      'rejected' => (kDanger,  Icons.cancel_rounded),
      'completed'=> (kSubtext, Icons.flag_rounded),
      _          => (kSubtext, Icons.circle),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: color.withAlpha(28),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: color.withAlpha(90)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(status.toUpperCase(), style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
        ],
      ),
    );
  }
}
