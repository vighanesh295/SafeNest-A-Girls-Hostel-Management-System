/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { ParentDashboard } from './pages/ParentDashboard';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { Shield } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/30 border-t-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading SafeNest...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-6">
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-border/50 max-w-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Welcome to SafeNest</h2>
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/30 border-t-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading your profile…</p>
          </div>
          <Button
            variant="outline"
            onClick={() => signOut(auth)}
            className="w-full"
          >
            Sign out & try again
          </Button>
        </div>
      </div>
    );
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  } else if (profile.role === 'student') {
    return <StudentDashboard />;
  } else if (profile.role === 'parent') {
    return <ParentDashboard />;
  } else {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F3] p-6 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-lg border border-[#E5E0D5] max-w-sm">
          <Shield className="w-12 h-12 text-[#C49A52] mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-3 text-[#1A1610]">Access Denied</h1>
          <p className="text-sm text-[#8B7F6F]">
            Invalid user role. Please contact support.
          </p>
          <Button className="mt-6 w-full bg-gradient-to-r from-[#C49A52] to-[#7A6A55]" onClick={() => signOut(auth)}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
