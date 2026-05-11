import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Shield, Eye, EyeOff, UserPlus, LogIn, Mail, Lock, User, Users } from 'lucide-react';

type RegisterUser = {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'parent';
  createdAt: string;
  parentEmail?: string;
};

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userId = credential.user.uid;
      const profileSnap = await getDoc(doc(db, 'users', userId));

      if (!profileSnap.exists()) {
        await auth.signOut();
        toast.error('Account not found. Please register first.');
        return;
      }

      const userData = profileSnap.data();
      toast.success(`Welcome back, ${userData?.name || 'User'}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      // Check if parent email exists for students
      if (role === 'student' && parentEmail) {
        const parentQuery = query(collection(db, 'users'), where('email', '==', parentEmail.trim()), where('role', '==', 'parent'));
        const parentSnap = await getDocs(parentQuery);
        if (parentSnap.empty) {
          toast.error('Parent email not found. Parent must register first.');
          setLoading(false);
          return;
        }
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = credential.user.uid;

      const userData: RegisterUser = {
        uid: userId,
        name: name.trim(),
        email: email.trim(),
        role: role,
        createdAt: new Date().toISOString(),
      };

      if (role === 'student') {
        userData.parentEmail = parentEmail.trim();
        // Create student document
        await setDoc(doc(db, 'students', userId), {
          uid: userId,
          roomNo: 'TBA',
          currentStatus: 'IN',
          parentId: null, // Will be set when parent links
        });
      }

      await setDoc(doc(db, 'users', userId), userData);
      toast.success('Account created successfully!');
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists.');
      } else {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setName('');
    setEmail('');
    setPassword('');
    setParentEmail('');
    setRole('student');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-8"
        style={{ background: 'radial-gradient(circle, #C49A52 0%, transparent 70%)' }} />
      <div className="absolute top-10 right-0 w-60 h-60 rounded-full opacity-8"
        style={{ background: 'radial-gradient(circle, #8CC6C1 0%, transparent 70%)' }} />

      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-6xl mx-auto">
          <div className="w-full max-w-xl mx-auto">
            {/* Logo and title */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl overflow-hidden shadow-lg bg-white">
                <img src="/tssm-logo.png" alt="TSSM Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-4xl font-black text-[#1A1610] mb-2 tracking-wide">SafeNest</h1>
              <p className="text-[#8B7F6F] text-base leading-relaxed">
                {mode === 'login' ? 'Secure hostel access for students and parents' : 'Create your SafeNest account'}
              </p>
            </div>

            {/* Glass Card */}
            <div className="bg-white rounded-3xl p-7 shadow-2xl border border-[#E5E0D5]">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-[#1A1610] mb-1">
                  {mode === 'login' ? 'Welcome back' : 'Join SafeNest'}
                </h2>
                <p className="text-[#8B7F6F] text-sm">
                  {mode === 'login' ? 'Sign in to continue' : 'Start managing passes and approvals'}
                </p>
              </div>

              <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <Label htmlFor="name" className="text-sm font-semibold text-[#1A1610] mb-2 block">Full name</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-14 pl-12 bg-[#F4F2ED] border-[#E5E0D5] rounded-2xl text-[#1A1610] placeholder:text-[#8B7F6F]"
                    />
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B7F6F]" />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-sm font-semibold text-[#1A1610] mb-2 block">Email address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 pl-12 bg-[#F4F2ED] border-[#E5E0D5] rounded-2xl text-[#1A1610] placeholder:text-[#8B7F6F]"
                  />
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B7F6F]" />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-[#1A1610] mb-2 block">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 pl-12 pr-12 bg-[#F4F2ED] border-[#E5E0D5] rounded-2xl text-[#1A1610] placeholder:text-[#8B7F6F]"
                  />
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B7F6F]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#8B7F6F]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <Label className="text-sm font-semibold text-[#1A1610] mb-2 block">I am a</Label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`flex-1 h-12 rounded-xl border-2 font-semibold text-sm transition-all ${
                          role === 'student'
                            ? 'border-[#C49A52] bg-[#C49A52] text-white'
                            : 'border-[#E5E0D5] bg-white text-[#8B7F6F]'
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('parent')}
                        className={`flex-1 h-12 rounded-xl border-2 font-semibold text-sm transition-all ${
                          role === 'parent'
                            ? 'border-[#C49A52] bg-[#C49A52] text-white'
                            : 'border-[#E5E0D5] bg-white text-[#8B7F6F]'
                        }`}
                      >
                        Parent
                      </button>
                    </div>
                  </div>

                  {role === 'student' && (
                    <div>
                      <Label htmlFor="parentEmail" className="text-sm font-semibold text-[#1A1610] mb-2 block">Parent email</Label>
                      <div className="relative">
                        <Input
                          id="parentEmail"
                          type="email"
                          placeholder="parent@email.com"
                          value={parentEmail}
                          onChange={(e) => setParentEmail(e.target.value)}
                          required
                          className="h-14 pl-12 bg-[#F4F2ED] border-[#E5E0D5] rounded-2xl text-[#1A1610] placeholder:text-[#8B7F6F]"
                        />
                        <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B7F6F]" />
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full h-14 rounded-2xl font-bold text-base text-white transition-all duration-200 ${
                  loading
                    ? 'bg-[#F4F2ED] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#C49A52] to-[#7A6A55] shadow-lg hover:shadow-xl active:scale-95'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="text-[#8B7F6F] text-sm hover:text-[#C49A52] transition-colors"
                >
                  {mode === 'login' ? 'No account yet? ' : 'Already registered? '}
                  <span className="font-semibold text-[#C49A52]">
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {mode === 'login' && (
            <p className="text-center text-[#8B7F6F] text-xs mt-6 leading-relaxed">
              Your details are protected and stored securely.
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};