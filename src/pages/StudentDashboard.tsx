import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, orderBy, where, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PassRequest } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#D4A657]/30 border-t-[#D4A657] mx-auto mb-4"></div>
          <p className="text-[#94A3B8]">Loading...</p>
        </div>
      </div>
    );
  }

  const isIn = studentData.currentStatus === 'IN';

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F8FAFC]">
      {/* Header */}
      <div className="bg-[#141A23] text-[#F8FAFC] border-b border-[#243146] shadow-[0_20px_40px_rgba(0,0,0,0.22)]">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#1E2530] rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
                <img src="/tssm-logo.png" alt="TSSM Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#F8FAFC]">Hi, {profile.name} 👋</h1>
                <p className="text-[#94A3B8] text-sm">Room {studentData.roomNo}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#11222F] border border-[#243146] rounded-full">
            <div className={`w-2 h-2 rounded-full ${isIn ? 'bg-emerald-400' : 'bg-orange-400'}`}></div>
            <span className="text-sm font-medium text-[#F8FAFC]">Status: {studentData.currentStatus}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 pb-28">

        {/* Pass Request Form (inline modal) */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
            <div className="bg-[#141A23] rounded-3xl w-full max-w-md p-6 shadow-[0_40px_70px_rgba(0,0,0,0.45)] border border-[#243146]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[#F8FAFC]">Request a Pass</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-[#94A3B8]" />
                </button>
              </div>

              {/* Pass type selector */}
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Pass Type</p>
              <div className="space-y-3 mb-6">
                {PASS_TYPES.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setPassType(pt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      passType === pt.id
                        ? 'border-[#C49A52] bg-[#1F293A]'
                        : 'border-[#273146] bg-[#111826] hover:border-[#C49A52]/50'
                    }`}
                  >
                    <div className={`w-10 h-10 bg-gradient-to-br ${pt.color} rounded-xl flex items-center justify-center text-white`}>
                      {pt.icon}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-[#F8FAFC] text-sm">{pt.label}</p>
                      <p className="text-xs text-[#94A3B8]">{pt.description}</p>
                    </div>
                    {passType === pt.id && (
                      <div className="ml-auto w-5 h-5 bg-[#C49A52] rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#0F1115] rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Destination */}
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Destination</p>
              <div className="flex items-center gap-3 border border-[#273146] rounded-2xl px-4 py-3 mb-6 bg-[#111826]">
                <MapPin className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Home visit, Medical appointment…"
                  className="flex-1 bg-transparent text-[#F8FAFC] text-sm placeholder-[#7C8CA6] outline-none"
                />
              </div>

              <Button
                onClick={handleRequestPass}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#C49A52] to-[#7A6A55] text-white h-12 rounded-2xl font-semibold"
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </div>
        )}

        {currentTab === 'home' && (
          <>
            {/* Quick Actions */}
            <h2 className="text-lg font-bold text-[#F8FAFC] mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#111826] rounded-3xl p-6 shadow-[0_18px_40px_rgba(0,0,0,0.2)] border border-[#273146] hover:border-[#3A506B] transition-shadow"
              >
                <div className="w-12 h-12 bg-[#1E2530] rounded-2xl flex items-center justify-center mb-3 mx-auto">
                  <Plus className="w-6 h-6 text-[#D4A657]" />
                </div>
                <h3 className="font-bold text-[#F8FAFC] text-center">Request Pass</h3>
                <p className="text-xs text-[#94A3B8] text-center mt-1">Lunch / Late / Night out</p>
              </button>

              <button
                onClick={() => setCurrentTab('scan')}
                className="bg-[#111826] rounded-3xl p-6 shadow-[0_18px_40px_rgba(0,0,0,0.2)] border border-[#273146] hover:border-[#3A506B] transition-shadow"
              >
                <div className="w-12 h-12 bg-[#1E2530] rounded-2xl flex items-center justify-center mb-3 mx-auto">
                  <QrCode className="w-6 h-6 text-[#6EA8FE]" />
                </div>
                <h3 className="font-bold text-[#F8FAFC] text-center">Show Pass QR</h3>
                <p className="text-xs text-[#94A3B8] text-center mt-1">Entry / Exit</p>
              </button>
            </div>

            {/* Recent Passes */}
            <div className="flex flex-col gap-2 mb-4">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Recent Passes</h2>
              <p className="text-sm text-[#94A3B8] max-w-2xl">
                Every pass now includes explicit approval details for both admin and parent, so you can see who has approved or rejected the request at a glance.
              </p>
            </div>
            <div className="space-y-3">
              {passes.slice(0, 3).map((pass) => (
                <PassCard key={pass.id} pass={pass} />
              ))}
              {passes.length === 0 && (
                <div className="text-center py-8 text-[#94A3B8]">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No passes yet</p>
                </div>
              )}
            </div>
          </>
        )}

        {currentTab === 'history' && (
          <>
            <div className="flex flex-col gap-2 mb-4">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Pass History</h2>
              <p className="text-sm text-[#94A3B8] max-w-2xl">
                Review past pass requests with admin and parent approval states shown clearly for each entry.
              </p>
            </div>
            <div className="space-y-3">
              {passes.map((pass) => (
                <PassCard key={pass.id} pass={pass} />
              ))}
              {passes.length === 0 && (
                <div className="text-center py-8 text-[#94A3B8]">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pass history</p>
                </div>
              )}
            </div>
          </>
        )}

        {currentTab === 'scan' && (
          <div className="text-center py-12">
            <div className="w-32 h-32 bg-[#111826] rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.22)] border border-[#273146] flex items-center justify-center mx-auto mb-6">
              <QrCode className="w-16 h-16 text-[#6EA8FE]" />
            </div>
            <h2 className="text-lg font-bold text-[#F8FAFC] mb-2">QR Scanner</h2>
            <p className="text-[#94A3B8] mb-6 text-sm">
              Use the mobile app to scan the gate QR code for entry / exit recording.
            </p>
            {/* Active/approved passes to show QR for */}
            {passes.filter(p => p.status === 'approved' || p.status === 'active').length > 0 && (
              <div className="mt-4 space-y-3 text-left">
                <p className="text-sm font-semibold text-[#F8FAFC] mb-2">Active Passes</p>
                {passes.filter(p => p.status === 'approved' || p.status === 'active').map(pass => (
                  <Card key={pass.id} className="border-[#273146] bg-[#111826]">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#F8FAFC] capitalize">{pass.type} Pass</p>
                        <p className="text-xs text-[#94A3B8]">{pass.reason}</p>
                      </div>
                      <Badge className="capitalize bg-[#1F2937] text-[#D4DCE6] border-[#334155]">
                        {pass.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#111826] border-t border-[#273146] px-6 py-4">
        <div className="flex justify-around">
          <NavBtn icon={<Home className="w-6 h-6" />} label="Home"    active={currentTab === 'home'}    onClick={() => setCurrentTab('home')} />
          <NavBtn icon={<History className="w-6 h-6" />} label="History" active={currentTab === 'history'} onClick={() => setCurrentTab('history')} />
          <NavBtn icon={<QrCode className="w-6 h-6" />} label="Scan"    active={currentTab === 'scan'}    onClick={() => setCurrentTab('scan')} />
        </div>
      </div>
    </div>
  );
};

// ─── small helpers ────────────────────────────────────────────────────────────

function NavBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded-xl transition-colors ${active ? 'bg-[#C49A52]/10' : ''}`}
    >
      <span className={active ? 'text-[#C49A52]' : 'text-[#8B7F6F]'}>{icon}</span>
      <span className={`text-xs font-medium mt-1 ${active ? 'text-[#C49A52]' : 'text-[#8B7F6F]'}`}>{label}</span>
    </button>
  );
}