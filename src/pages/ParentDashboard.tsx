import React, { useEffect, useRef, useState } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PassRequest } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  LogOut,
  Check,
  X,
  Clock,
  History,
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarDays,
  MapPin,
  Moon,
  Sunset,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { signOut } from 'firebase/auth';

interface StudentData {
  uid: string;
  roomNo: string;
  currentStatus: string;
  parentId?: string;
}

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
}

type Tab = 'approvals' | 'history';

// ─── pass type icon helper ─────────────────────────────────────────────────────
function PassTypeIcon({ type }: { type: string }) {
  if (type === 'nightout') return <Moon className="w-4 h-4" />;
  if (type === 'late') return <Sunset className="w-4 h-4" />;
  return <Clock className="w-4 h-4" />;
}

// ─── status config helper ──────────────────────────────────────────────────────
function statusConfig(status: string) {
  switch (status) {
    case 'approved':
      return { label: 'Approved', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> };
    case 'active':
      return { label: 'Active', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <CheckCircle2 className="w-3 h-3" /> };
    case 'completed':
      return { label: 'Completed', color: 'bg-[#C49A52]/10 text-[#7A6A55] border-[#C49A52]/30', icon: <CheckCircle2 className="w-3 h-3" /> };
    case 'rejected':
      return { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-3 h-3" /> };
    case 'violated':
      return { label: 'Violated', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertCircle className="w-3 h-3" /> };
    default:
      return { label: 'Pending', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <Clock className="w-3 h-3" /> };
  }
}

// ─── pass type gradient helper ─────────────────────────────────────────────────
function passGradient(type: string) {
  if (type === 'nightout') return 'from-[#7A6A55] to-[#4A3A25]';
  if (type === 'late') return 'from-[#8CC6C1] to-[#5FA8A3]';
  return 'from-[#C49A52] to-[#7A6A55]';
}

export const ParentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [studentProfile, setStudentProfile] = useState<UserProfile | null>(null);
  const [passes, setPasses] = useState<PassRequest[]>([]);
  const [currentTab, setCurrentTab] = useState<Tab>('approvals');

  // Refs to hold inner listeners so we can clean them up properly
  const unsubProfileRef = useRef<(() => void) | null>(null);
  const unsubPassesRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    // Find student linked to this parent by parentId
    const unsubStudents = onSnapshot(
      query(collection(db, 'students'), where('parentId', '==', profile.uid)),
      (snapshot) => {
        // Tear down previous inner listeners before re-subscribing
        if (unsubProfileRef.current) { unsubProfileRef.current(); unsubProfileRef.current = null; }
        if (unsubPassesRef.current) { unsubPassesRef.current(); unsubPassesRef.current = null; }

        if (snapshot.empty) {
          setStudentData(null);
          setStudentProfile(null);
          setPasses([]);
          return;
        }

        const student = snapshot.docs[0].data() as StudentData;
        setStudentData(student);

        // Subscribe to student's user profile
        unsubProfileRef.current = onSnapshot(doc(db, 'users', student.uid), (profileSnap) => {
          if (profileSnap.exists()) {
            setStudentProfile(profileSnap.data() as UserProfile);
          }
        });

        // Subscribe to all passes for this student, newest first
        unsubPassesRef.current = onSnapshot(
          query(
            collection(db, 'passes'),
            where('studentId', '==', student.uid),
            orderBy('createdAt', 'desc')
          ),
          (passSnapshot) => {
            const passList = passSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as PassRequest));
            setPasses(passList);
          }
        );
      }
    );

    return () => {
      unsubStudents();
      if (unsubProfileRef.current) { unsubProfileRef.current(); unsubProfileRef.current = null; }
      if (unsubPassesRef.current) { unsubPassesRef.current(); unsubPassesRef.current = null; }
    };
  }, [profile?.uid]);

  const handleApprovePass = async (passId: string, approved: boolean) => {
    if (!approved) {
      try {
        await updateDoc(doc(db, 'passes', passId), {
          parentApproval: 'rejected',
          status: 'rejected',
        });
        toast.success('Pass rejected');
      } catch {
        toast.error('Failed to reject pass');
      }
      return;
    }

    // Approve: only promote status → 'approved' if admin has already approved
    try {
      const passSnap = await getDoc(doc(db, 'passes', passId));
      if (!passSnap.exists()) { toast.error('Pass not found'); return; }
      const adminApproval = passSnap.data()?.adminApproval as string | undefined;
      const updates: Record<string, string> = { parentApproval: 'approved' };
      if (adminApproval === 'approved') {
        updates.status = 'approved';
      }
      await updateDoc(doc(db, 'passes', passId), updates);
      toast.success(
        adminApproval === 'approved'
          ? 'Pass fully approved! ✅'
          : 'Consent recorded — waiting for admin approval'
      );
    } catch {
      toast.error('Failed to approve pass');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!profile || !studentData || !studentProfile) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#C49A52]/30 border-t-[#C49A52] mx-auto mb-4"></div>
          <p className="text-[#8B7F6F]">
            {!profile ? 'Loading...' : !studentData ? 'Looking up linked student...' : 'Loading profile...'}
          </p>
        </div>
      </div>
    );
  }

  const isIn = studentData.currentStatus === 'IN';
  const pendingPasses = passes.filter(p => p.parentApproval === 'pending');
  const historyPasses = passes.filter(p => p.status !== 'pending');

  return (
    <div className="min-h-screen bg-[#FAF8F3]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#8CC6C1] to-[#C49A52] text-white">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
                <img src="/tssm-logo.png" alt="TSSM Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-0.5">Monitoring</p>
                <h1 className="text-xl font-bold leading-tight">{studentProfile.name}</h1>
                <p className="text-white/80 text-sm">Room {studentData.roomNo}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Status pill + pending badge row */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
              <div className={`w-2 h-2 rounded-full ${isIn ? 'bg-green-400' : 'bg-orange-400'}`}></div>
              <span className="text-sm font-medium">Currently {studentData.currentStatus}</span>
            </div>
            {pendingPasses.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/20 rounded-full animate-pulse">
                <Bell className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{pendingPasses.length} pending</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="px-6 py-6 pb-28">

        {/* ── APPROVALS TAB ──────────────────────────────────────────────── */}
        {currentTab === 'approvals' && (
          <>
            <h2 className="text-lg font-bold text-[#1A1610] mb-4">
              Pending Approvals
              {pendingPasses.length > 0 && (
                <span className="ml-2 text-sm font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {pendingPasses.length}
                </span>
              )}
            </h2>

            {pendingPasses.length > 0 ? (
              <div className="space-y-4">
                {pendingPasses.map((pass) => (
                  <div key={pass.id} className="bg-white rounded-3xl p-6 shadow-lg border border-[#E5E0D5]">
                    {/* Pass type icon strip */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 bg-gradient-to-br ${passGradient(pass.type)} rounded-xl flex items-center justify-center text-white`}>
                        <PassTypeIcon type={pass.type} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[#1A1610] capitalize">{pass.type} Pass</h3>
                        <p className="text-[#8B7F6F] text-xs">{new Date(pass.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    {/* Details */}
                    {pass.reason && (
                      <div className="flex items-start gap-2 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-[#8B7F6F] mt-0.5 flex-shrink-0" />
                        <p className="text-[#8B7F6F] text-sm">{pass.reason}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarDays className="w-3.5 h-3.5 text-[#8B7F6F]" />
                      <p className="text-[#8B7F6F] text-xs">
                        Return by: {new Date(pass.expectedReturnTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Admin status note */}
                    {pass.adminApproval !== 'approved' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
                        <p className="text-xs text-amber-700">
                          ⏳ Admin approval also pending — your consent will be recorded and applied once admin approves.
                        </p>
                      </div>
                    )}
                    {pass.adminApproval === 'approved' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-4">
                        <p className="text-xs text-emerald-700">
                          ✅ Admin has approved — your approval will activate the pass immediately.
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprovePass(pass.id, true)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-2xl h-11"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleApprovePass(pass.id, false)}
                        variant="destructive"
                        className="flex-1 rounded-2xl h-11"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-[#F4F2ED] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-[#C49A52]" />
                </div>
                <h3 className="font-semibold text-[#1A1610] mb-2">All Caught Up!</h3>
                <p className="text-[#8B7F6F] text-sm">No pending approvals at the moment</p>
                {passes.length > 0 && (
                  <button
                    onClick={() => setCurrentTab('history')}
                    className="mt-4 inline-flex items-center gap-1 text-[#C49A52] text-sm font-medium"
                  >
                    View pass history <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ────────────────────────────────────────────────── */}
        {currentTab === 'history' && (
          <>
            <h2 className="text-lg font-bold text-[#1A1610] mb-1">Pass History</h2>
            <p className="text-[#8B7F6F] text-sm mb-5">All passes for {studentProfile.name}</p>

            {historyPasses.length > 0 ? (
              <div className="space-y-3">
                {historyPasses.map((pass) => {
                  const sc = statusConfig(pass.status);
                  return (
                    <div key={pass.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E0D5]">
                      {/* Top row */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 bg-gradient-to-br ${passGradient(pass.type)} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                          <PassTypeIcon type={pass.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-[#1A1610] capitalize text-sm">{pass.type} Pass</h3>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.color}`}>
                              {sc.icon}
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-[#8B7F6F] text-xs mt-0.5">
                            {new Date(pass.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Details grid */}
                      <div className="space-y-1.5 pl-12">
                        {pass.reason && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3 h-3 text-[#8B7F6F] mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-[#8B7F6F]">{pass.reason}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3 h-3 text-[#8B7F6F]" />
                          <p className="text-xs text-[#8B7F6F]">
                            Return by {new Date(pass.expectedReturnTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {pass.actualReturnTime && (
                          <div className="flex items-center gap-1.5">
                            <ArrowLeft className="w-3 h-3 text-[#8B7F6F]" />
                            <p className="text-xs text-[#8B7F6F]">
                              Returned: {new Date(pass.actualReturnTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )}

                        {/* Approval pills */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            pass.adminApproval === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            pass.adminApproval === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            Admin: {pass.adminApproval}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            pass.parentApproval === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            pass.parentApproval === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            Parent: {pass.parentApproval}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-[#F4F2ED] rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-10 h-10 text-[#8B7F6F]" />
                </div>
                <h3 className="font-semibold text-[#1A1610] mb-2">No History Yet</h3>
                <p className="text-[#8B7F6F] text-sm">Completed passes will appear here</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom Navigation ───────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#F4F2ED] border-t border-[#E5E0D5] px-6 py-4">
        <div className="flex justify-around">
          <NavBtn
            icon={<Bell className="w-6 h-6" />}
            label="Approvals"
            active={currentTab === 'approvals'}
            badge={pendingPasses.length}
            onClick={() => setCurrentTab('approvals')}
          />
          <NavBtn
            icon={<History className="w-6 h-6" />}
            label="History"
            active={currentTab === 'history'}
            onClick={() => setCurrentTab('history')}
          />
        </div>
      </div>
    </div>
  );
};

// ─── NavBtn helper ─────────────────────────────────────────────────────────────
function NavBtn({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded-xl transition-colors relative ${active ? 'bg-[#C49A52]/10' : ''}`}
    >
      <span className={active ? 'text-[#C49A52]' : 'text-[#8B7F6F]'}>{icon}</span>
      <span className={`text-xs font-medium mt-1 ${active ? 'text-[#C49A52]' : 'text-[#8B7F6F]'}`}>{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}