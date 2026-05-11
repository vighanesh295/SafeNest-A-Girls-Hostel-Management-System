import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, orderBy, where, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PassRequest } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { SidebarNav } from '../components/SidebarNav';
import { toast } from 'sonner';
import {
  LogOut,
  Home,
  History,
  QrCode,
  Plus,
  Shield,
  X,
  Clock,
  MapPin,
  Moon,
  Sunset
} from 'lucide-react';
import { signOut } from 'firebase/auth';

interface StudentData {
  uid: string;
  roomNo: string;
  currentStatus: string;
}

const PASS_TYPES = [
  {
    id: 'lunch' as const,
    label: 'Lunch Pass',
    description: 'Out for 1 hour (admin + parent approval required)',
    icon: <Clock className="w-5 h-5" />,
    color: 'from-[#C49A52] to-[#7A6A55]',
  },
  {
    id: 'late' as const,
    label: 'Late Pass',
    description: 'Return by 9 PM (admin + parent approval required)',
    icon: <Sunset className="w-5 h-5" />,
    color: 'from-[#8CC6C1] to-[#5FA8A3]',
  },
  {
    id: 'nightout' as const,
    label: 'Night Out',
    description: 'Return next day (admin + parent approval required)',
    icon: <Moon className="w-5 h-5" />,
    color: 'from-[#7A6A55] to-[#4A3A25]',
  },
] as const;

const PassCard: React.FC<{ pass: PassRequest }> = ({ pass }) => {
  const getApprovalBadge = (approval: string, role: string) => {
    if (approval === 'approved') {
      return (
        <div className="flex items-center gap-1 rounded-full border border-[#29413D] bg-[#112625] px-3 py-1">
          <span className="text-emerald-400 text-xs font-semibold">{role} ✓ Approved</span>
        </div>
      );
    } else if (approval === 'rejected') {
      return (
        <div className="flex items-center gap-1 rounded-full border border-[#6F2A2A] bg-[#2D121C] px-3 py-1">
          <span className="text-red-300 text-xs font-semibold">{role} ✗ Rejected</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 rounded-full border border-[#6B5B29] bg-[#2E2619] px-3 py-1">
          <span className="text-amber-300 text-xs font-semibold">{role} ⏳ Pending</span>
        </div>
      );
    }
  };

  return (
    <div className="bg-[#111826] rounded-3xl p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)] border border-[#273146] transition hover:shadow-[0_24px_48px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold text-[#F8FAFC] capitalize">{pass.type} Pass</h3>
            <Badge
              variant={
                pass.status === 'approved' || pass.status === 'active' || pass.status === 'completed' ? 'default' :
                pass.status === 'rejected' || pass.status === 'violated' ? 'destructive' : 'secondary'
              }
              className="text-[11px] uppercase tracking-[0.14em]"
            >
              {pass.status}
            </Badge>
          </div>
          {pass.reason ? <p className="mt-3 text-sm text-[#94A3B8] leading-6">{pass.reason}</p> : null}
          <p className="mt-4 text-xs text-[#94A3B8]">Requested {new Date(pass.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="rounded-3xl bg-[#142131] border border-[#24304B] px-4 py-2 text-xs text-[#A3B0CC]">
          Expected return: {new Date(pass.expectedReturnTime).toLocaleString()}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 items-center">
        <span className="text-xs uppercase tracking-[0.22em] text-[#94A3B8]">Approval status</span>
        {getApprovalBadge(pass.adminApproval, 'Admin')}
        {getApprovalBadge(pass.parentApproval, 'Parent')}
      </div>
    </div>
  );
}

type PassTypeId = typeof PASS_TYPES[number]['id'];

export const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [passes, setPasses] = useState<PassRequest[]>([]);
  const [currentTab, setCurrentTab] = useState<'home' | 'history' | 'scan'>('home');

  // Pass request form state
  const [showForm, setShowForm] = useState(false);
  const [passType, setPassType] = useState<PassTypeId>('lunch');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    // Listen to student record
    const unsubStudent = onSnapshot(doc(db, 'students', profile.uid), (snap) => {
      if (snap.exists()) {
        setStudentData(snap.data() as StudentData);
      }
    });

    // Scoped query — only this student's passes, no client-side filtering needed
    const unsubPasses = onSnapshot(
      query(
        collection(db, 'passes'),
        where('studentId', '==', profile.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      ),
      (snapshot) => {
        setPasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PassRequest)));
      }
    );

    return () => {
      unsubStudent();
      unsubPasses();
    };
  }, [profile?.uid]);

  const handleRequestPass = async () => {
    if (!profile?.uid || !studentData) return;
    if (!reason.trim()) {
      toast.error('Please enter a destination / reason');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      let expectedReturnTime: string;
      if (passType === 'late') {
        const nine = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0);
        expectedReturnTime = (now < nine ? nine : new Date(nine.getTime() + 86_400_000)).toISOString();
      } else if (passType === 'nightout') {
        const tomorrow = new Date(now.getTime() + 86_400_000);
        expectedReturnTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0, 0).toISOString();
      } else {
        expectedReturnTime = new Date(now.getTime() + 3_600_000).toISOString();
      }

      await addDoc(collection(db, 'passes'), {
        studentId: profile.uid,
        studentName: profile.name,           // required by admin dashboard display
        type: passType,
        reason: reason.trim(),
        expectedReturnTime,
        parentApproval: 'pending',   // ALL pass types require parent approval
        adminApproval: 'pending',
        status: 'pending',
        createdAt: now.toISOString(),
      });

      toast.success('Pass request submitted!');
      setShowForm(false);
      setReason('');
      setPassType('lunch');
    } catch (error) {
      toast.error('Failed to submit pass request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!profile || !studentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/30 border-t-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const isIn = studentData.currentStatus === 'IN';

  return (
    <div className="min-h-screen flex bg-background">
      <SidebarNav
        role="student"
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogout={handleLogout}
        profile={profile}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-card border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Student Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your passes and requests</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-full">
                <div className={`w-2 h-2 rounded-full ${isIn ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                <span className="text-sm font-medium text-foreground">Status: {studentData.currentStatus}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{profile.name}</p>
                <p className="text-xs text-muted-foreground">Room {studentData.roomNo}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 space-y-6">
          {/* Pass Request Form (inline modal) */}
          {showForm && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
              <div className="bg-card rounded-3xl w-full max-w-md p-6 shadow-xl border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-foreground">Request a Pass</h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Pass type selector */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pass Type</p>
                <div className="space-y-3 mb-6">
                  {PASS_TYPES.map((pt) => (
                    <button
                      key={pt.id}
                      onClick={() => setPassType(pt.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                        passType === pt.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-muted/50 hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-10 h-10 bg-gradient-to-br ${pt.color} rounded-xl flex items-center justify-center text-white`}>
                        {pt.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground text-sm">{pt.label}</p>
                        <p className="text-xs text-muted-foreground">{pt.description}</p>
                      </div>
                      {passType === pt.id && (
                        <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-background rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Destination */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Destination</p>
                <div className="flex items-center gap-3 border border-border rounded-2xl px-4 py-3 mb-6 bg-background">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Home visit, Medical appointment…"
                    className="flex-1 bg-transparent text-foreground text-sm placeholder-muted-foreground outline-none"
                  />
                </div>

                <Button
                  onClick={handleRequestPass}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-[#C49A52] to-[#7A6A55] text-white h-12 rounded-2xl font-semibold hover:opacity-95"
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </div>
          )}

          {currentTab === 'home' && (
            <>
              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card className="shadow-sm border hover:shadow-md transition-all duration-300 bg-card border-border">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-center mb-2">Request Pass</h3>
                    <p className="text-xs text-muted-foreground text-center mb-4">Lunch / Late / Night out</p>
                    <Button
                      onClick={() => setShowForm(true)}
                      className="w-full bg-gradient-to-r from-[#C49A52] to-[#7A6A55] text-white hover:opacity-95"
                    >
                      Request Pass
                    </Button>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border hover:shadow-md transition-all duration-300 bg-card border-border">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                      <QrCode className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-center mb-2">Show Pass QR</h3>
                    <p className="text-xs text-muted-foreground text-center mb-4">Entry / Exit</p>
                    <Button
                      onClick={() => setCurrentTab('scan')}
                      variant="outline"
                      className="w-full"
                    >
                      Show QR Code
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Passes */}
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">Recent Passes</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Every pass now includes explicit approval details for both admin and parent, so you can see who has approved or rejected the request at a glance.
                </p>
                <div className="space-y-4">
                  {passes.slice(0, 3).map((pass) => (
                    <PassCard key={pass.id} pass={pass} />
                  ))}
                  {passes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No passes yet</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {currentTab === 'history' && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">Pass History</h2>
              <p className="text-sm text-muted-foreground mb-6">
                View all your pass requests and their approval status.
              </p>
              <div className="space-y-4">
                {passes.map((pass) => (
                  <PassCard key={pass.id} pass={pass} />
                ))}
                {passes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No pass history yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'scan' && (
            <div className="max-w-md mx-auto">
              <Card className="shadow-sm border bg-card border-border">
                <CardContent className="p-8 text-center">
                  <div className="w-48 h-48 bg-muted rounded-lg mx-auto mb-6 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">Pass QR Code</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Show this QR code at the security gate for entry/exit.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <p>Student: {profile.name}</p>
                    <p>Room: {studentData.roomNo}</p>
                    <p>Status: {studentData.currentStatus}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};