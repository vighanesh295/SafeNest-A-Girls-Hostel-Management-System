import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../main.dart' show firestore;
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  final _parentEmail = TextEditingController();
  String _role = 'student';
  bool _isLogin = true;
  bool _loading = false;
  bool _obscure = true;
  late AnimationController _anim;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _fade = CurvedAnimation(parent: _anim, curve: Curves.easeOut);
    _anim.forward();
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    _parentEmail.dispose();
    _anim.dispose();
    super.dispose();
  }

  void _toggle() {
    _anim.reset();
    setState(() => _isLogin = !_isLogin);
    _anim.forward();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBg,
      body: Stack(
        children: [
          Positioned(
            top: -120,
            left: -80,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                color: kPrimary.withValues(alpha: 0.08),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: kPrimary.withValues(alpha: 0.12), blurRadius: 60, spreadRadius: 20)],
              ),
            ),
          ),
          Positioned(
            top: 40,
            right: -40,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                color: kAccent.withValues(alpha: 0.08),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: kAccent.withValues(alpha: 0.12), blurRadius: 40, spreadRadius: 10)],
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 12),
                  Center(
                    child: Column(
                      children: [
                        Container(
                          width: 92,
                          height: 92,
                          decoration: BoxDecoration(
                            color: kCard,
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(color: kBorder),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Image.asset('assets/images/tssm_logo.png', fit: BoxFit.contain),
                          ),
                        ),
                        const SizedBox(height: 18),
                        const Text('SafeNest',
                            style: TextStyle(color: kText, fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
                        const SizedBox(height: 8),
                        Text(
                          _isLogin ? 'Secure hostel access for students and parents' : 'Create your SafeNest account',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: kSubtext, fontSize: 14, height: 1.6),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 36),
                  FadeTransition(
                    opacity: _fade,
                    child: GlassCard(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            _isLogin ? 'Welcome back' : 'Join SafeNest',
                            style: const TextStyle(color: kText, fontSize: 24, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isLogin ? 'Sign in to continue' : 'Start managing passes and approvals',
                            style: const TextStyle(color: kSubtext, fontSize: 14),
                          ),
                          const SizedBox(height: 26),
                          if (!_isLogin) ...[
                            _field(_name, 'Full name', Icons.person_rounded),
                            const SizedBox(height: 16),
                          ],
                          _field(_email, 'Email address', Icons.email_rounded, type: TextInputType.emailAddress),
                          const SizedBox(height: 16),
                          _pwField(),
                          if (_isLogin) const SizedBox(height: 16),
                          if (!_isLogin) ...[
                            const SizedBox(height: 16),
                            _roleDropdown(),
                            const SizedBox(height: 16),
                            if (_role == 'student') ...[
                              _field(_parentEmail, 'Parent email', Icons.family_restroom_rounded, type: TextInputType.emailAddress),
                              const SizedBox(height: 16),
                            ],
                          ],
                          GradientButton(label: _isLogin ? 'Sign In' : 'Create Account', onTap: _submit, loading: _loading),
                          const SizedBox(height: 16),
                          Center(
                            child: GestureDetector(
                              onTap: _toggle,
                              child: RichText(
                                text: TextSpan(
                                  style: const TextStyle(color: kSubtext, fontSize: 13, height: 1.5),
                                  children: [
                                    TextSpan(text: _isLogin ? 'No account yet? ' : 'Already registered? '),
                                    TextSpan(
                                      text: _isLogin ? 'Sign up' : 'Sign in',
                                      style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w700),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (_isLogin) ...[
                    const Center(
                      child: Text(
                        'Your details are protected and stored securely.',
                        style: TextStyle(color: kSubtext, fontSize: 12),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(TextEditingController controller, String label, IconData icon, {TextInputType? type}) {
    return TextField(
      controller: controller,
      keyboardType: type,
      style: const TextStyle(color: kText, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: kSubtext, size: 20),
      ),
    );
  }

  Widget _pwField() {
    return TextField(
      controller: _password,
      obscureText: _obscure,
      style: const TextStyle(color: kText, fontSize: 15),
      decoration: InputDecoration(
        labelText: 'Password',
        prefixIcon: const Icon(Icons.lock_rounded, color: kSubtext, size: 20),
        suffixIcon: IconButton(
          icon: Icon(_obscure ? Icons.visibility_rounded : Icons.visibility_off_rounded, color: kSubtext, size: 20),
          onPressed: () => setState(() => _obscure = !_obscure),
        ),
      ),
    );
  }

  Widget _roleDropdown() {
    return DropdownButtonFormField<String>(
      value: _role,
      dropdownColor: kSurface,
      style: const TextStyle(color: kText, fontSize: 15),
      decoration: const InputDecoration(
        labelText: 'Role',
        prefixIcon: Icon(Icons.badge_rounded, color: kSubtext, size: 20),
      ),
      items: const [
        DropdownMenuItem(value: 'student', child: Text('Student')),
        DropdownMenuItem(value: 'parent', child: Text('Parent')),
      ],
      onChanged: (value) => setState(() => _role = value ?? 'student'),
    );
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    final password = _password.text.trim();
    final name = _name.text.trim();
    final pEmail = _parentEmail.text.trim();

    if (email.isEmpty || password.isEmpty) {
      _err('Email and password are required.');
      return;
    }

    setState(() => _loading = true);
    try {
      if (_isLogin) {
        await FirebaseAuth.instance.signInWithEmailAndPassword(email: email, password: password);
      } else {
        if (name.isEmpty) {
          _err('Full name is required.');
          return;
        }
        if (_role == 'student' && pEmail.isEmpty) {
          _err('Parent email is required.');
          return;
        }
        final cred = await FirebaseAuth.instance.createUserWithEmailAndPassword(email: email, password: password);
        final uid = cred.user!.uid;
        String? parentId;
        if (_role == 'student') {
          final q = await firestore.collection('users').where('email', isEqualTo: pEmail).where('role', isEqualTo: 'parent').limit(1).get();
          if (q.docs.isEmpty) {
            _err('Parent account not found. Create the parent account first.');
            await FirebaseAuth.instance.currentUser!.delete();
            return;
          }
          parentId = q.docs.first.id;
        }
        await firestore.collection('users').doc(uid).set({
          'uid': uid,
          'name': name,
          'email': email,
          'role': _role,
          'createdAt': DateTime.now().toIso8601String(),
        });
        if (_role == 'student') {
          await firestore.collection('students').doc(uid).set({
            'uid': uid,
            'parentId': parentId,
            'roomNo': 'TBD',
            'currentStatus': 'IN',
          });
        }
      }
    } on FirebaseAuthException catch (e) {
      _err(e.message ?? 'Auth error');
    } catch (e) {
      _err(e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _err(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: kDanger,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ));
  }
}
