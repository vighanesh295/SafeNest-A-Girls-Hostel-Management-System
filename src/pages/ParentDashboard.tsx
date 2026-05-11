import React, { useEffect, useRef, useState } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PassRequest } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import {
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
  ArrowLeft,
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
    <div className="min-h-screen bg-[#FAF8F3] flex">
      <SidebarNav role="parent" />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1A1610] mb-2">Parent Dashboard</h1>
            <p className="text-[#8B7F6F]">Monitoring {studentProfile.name} • Room {studentData.roomNo}</p>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white border border-[#E5E0D5]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isIn ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                  <div>
                    <p className="text-sm text-[#8B7F6F]">Current Status</p>
                    <p className="font-semibold text-[#1A1610]">{studentData.currentStatus}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#E5E0D5]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-[#8B7F6F]">Pending Approvals</p>
                    <p className="font-semibold text-[#1A1610]">{pendingPasses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#E5E0D5]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-[#C49A52]" />
                  <div>
                    <p className="text-sm text-[#8B7F6F]">Total Passes</p>
                    <p className="font-semibold text-[#1A1610]">{passes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="approvals" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white border border-[#E5E0D5]">
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Approvals
                {pendingPasses.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-700">
                    {pendingPasses.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approvals" className="mt-6">
              {pendingPasses.length > 0 ? (
                <div className="space-y-4">
                  {pendingPasses.map((pass) => (
                    <Card key={pass.id} className="bg-white border border-[#E5E0D5]">
                      <CardContent className="p-6">
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-white border border-[#E5E0D5]">
                  <CardContent className="p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-[#C49A52] mx-auto mb-4" />
                    <h3 className="font-semibold text-[#1A1610] mb-2">All Caught Up!</h3>
                    <p className="text-[#8B7F6F] text-sm">No pending approvals at the moment</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              {historyPasses.length > 0 ? (
                <div className="space-y-4">
                  {historyPasses.map((pass) => {
                    const sc = statusConfig(pass.status);
                    return (
                      <Card key={pass.id} className="bg-white border border-[#E5E0D5]">
                        <CardContent className="p-4">
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-white border border-[#E5E0D5]">
                  <CardContent className="p-12 text-center">
                    <History className="w-16 h-16 text-[#8B7F6F] mx-auto mb-4" />
                    <h3 className="font-semibold text-[#1A1610] mb-2">No History Yet</h3>
                    <p className="text-[#8B7F6F] text-sm">Completed passes will appear here</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};