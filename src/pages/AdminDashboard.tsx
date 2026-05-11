import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PassRequest, StudentData, Complaint, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { SidebarNav } from '../components/SidebarNav';
import { toast } from 'sonner';
import {
  LogOut,
  Pencil,
  Check,
  X,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Home,
  UserCheck,
  UserX,
  Moon,
  Sun,
  Activity,
  FileText,
  History
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { theme, setTheme, actualTheme } = useTheme();
  const [students, setStudents] = useState<(StudentData & { name: string })[]>([]);
  const [passes, setPasses] = useState<PassRequest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [currentTab, setCurrentTab] = useState('status');
  // Use a ref for the users map so it's always current inside callbacks (avoids stale closure)
  const usersMapRef = useRef<Map<string, UserProfile>>(new Map());
  const [renderTick, forceRender] = useState(0);
  // Room editing state: uid → draft value (null means not editing)
  const [editingRoom, setEditingRoom] = useState<{ uid: string; draft: string } | null>(null);

  useEffect(() => {
    // 1. Users listener — update the ref AND re-derive students immediately
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const newMap = new Map<string, UserProfile>();
      snapshot.docs.forEach(d => {
        const u = d.data() as UserProfile;
        newMap.set(u.uid, u);
      });
      usersMapRef.current = newMap;
      // Trigger a re-render so student names refresh
      forceRender(n => n + 1);
    });

    // 2. Students listener — reads from the always-current ref
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studentList = snapshot.docs.map(d => {
        const s = d.data() as StudentData;
        return { ...s, name: usersMapRef.current.get(s.uid)?.name ?? 'Unknown' };
      });
      setStudents(studentList);
    });

    // 3. Passes listener
    const unsubPasses = onSnapshot(
      query(collection(db, 'passes'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setPasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PassRequest)));
      }
    );

    // 4. Complaints listener
    const unsubComplaints = onSnapshot(
      query(collection(db, 'complaints'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setComplaints(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint)));
      }
    );

    return () => {
      unsubUsers();
      unsubStudents();
      unsubPasses();
      unsubComplaints();
    };
  }, []); // Empty deps — all listeners are stable; no stale closure since we use a ref

  const handleApprovePass = async (pass: PassRequest) => {
    try {
      // Status only moves to 'approved' when BOTH admin AND parent have approved
      const newStatus = pass.parentApproval !== 'approved'
        ? 'pending'
        : 'approved';
      await updateDoc(doc(db, 'passes', pass.id), {
        adminApproval: 'approved',
        status: newStatus
      });
      toast.success(newStatus === 'pending'
        ? 'Admin approved — waiting for parent consent'
        : 'Pass fully approved!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRejectPass = async (passId: string) => {
    try {
      await updateDoc(doc(db, 'passes', passId), {
        adminApproval: 'rejected',
        status: 'rejected'
      });
      toast.success('Pass rejected');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSaveRoomNo = async (uid: string, roomNo: string) => {
    const trimmed = roomNo.trim();
    if (!trimmed) { toast.error('Room number cannot be empty.'); return; }
    try {
      await updateDoc(doc(db, 'students', uid), { roomNo: trimmed });
      toast.success('Room number updated');
      setEditingRoom(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleResolveComplaint = async (complaintId: string) => {
    try {
      await updateDoc(doc(db, 'complaints', complaintId), { status: 'resolved' });
      toast.success('Complaint resolved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  // Re-derive student names only when students list or users map changes (renderTick signals map update)
  const studentsWithNames = useMemo(() => students.map(s => ({
    ...s,
    name: usersMapRef.current.get(s.uid)?.name ?? 'Unknown'
  })), [students, renderTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = [
    { name: 'IN',   value: studentsWithNames.filter(s => s.currentStatus === 'IN').length },
    { name: 'OUT',  value: studentsWithNames.filter(s => s.currentStatus === 'OUT').length },
    { name: 'LATE', value: studentsWithNames.filter(s => s.currentStatus === 'LATE').length },
  ];

  const handleLogout = () => signOut(auth);
  const handleThemeToggle = () => setTheme(actualTheme === 'light' ? 'dark' : 'light');

  return (
    <div className="min-h-screen flex bg-background">
      <SidebarNav
        role="admin"
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogout={handleLogout}
        onThemeToggle={handleThemeToggle}
        theme={actualTheme}
        stats={{
          pendingPasses: passes.filter(p => p.status === 'pending').length,
          openComplaints: complaints.filter(c => c.status === 'pending').length
        }}
        profile={profile}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-card border-border px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white/10 border border-border flex items-center justify-center">
              <img src="/tssm-logo.png" alt="Admin Logo" className="w-8 h-8 object-contain" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">Admin Dashboard</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-sm border hover:shadow-md transition-all duration-300 bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">Total Students</CardTitle>
                  <Users className="h-5 w-5" style={{ color: '#C49A52' }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{studentsWithNames.length}</p>
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#C49A52' }}>
                  <TrendingUp className="h-3 w-3" />
                  Active residents
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border hover:shadow-md transition-all duration-300 bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">Present</CardTitle>
                  <UserCheck className="h-5 w-5" style={{ color: '#8CC6C1' }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {studentsWithNames.filter(s => s.currentStatus === 'IN').length}
                </p>
                <p className="text-xs mt-2" style={{ color: '#8CC6C1' }}>In hostel</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border hover:shadow-md transition-all duration-300 bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">Out</CardTitle>
                  <UserX className="h-5 w-5" style={{ color: '#F2C66B' }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {studentsWithNames.filter(s => s.currentStatus === 'OUT').length}
                </p>
                <p className="text-xs mt-2" style={{ color: '#F2C66B' }}>Outside campus</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border hover:shadow-md transition-all duration-300 bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">Late</CardTitle>
                  <Clock className="h-5 w-5" style={{ color: '#EE6B5B' }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {studentsWithNames.filter(s => s.currentStatus === 'LATE').length}
                </p>
                <p className="text-xs mt-2" style={{ color: '#EE6B5B' }}>Overdue returns</p>
              </CardContent>
            </Card>
          </div>

          {/* Occupancy Chart */}
          <Card className="shadow-sm border bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" style={{ color: '#C49A52' }} />
                <CardTitle className="text-lg text-foreground">Hostel Occupancy Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E0D5',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      labelStyle={{ color: '#0F172A' }}
                      itemStyle={{ color: '#0F172A' }}
                      formatter={(value) => [`${value}`, 'Student']}
                    />
                    <Bar dataKey="value" fill="#C49A52" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tab Content */}
          {currentTab === 'status' && (
            <Card className="shadow-sm border bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5" style={{ color: '#C49A52' }} />
                  <CardTitle className="text-lg text-foreground">Student Status Overview</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow style={{ borderColor: '#E5E0D5', backgroundColor: '#F4F2ED' }}>
                        <TableHead className="font-semibold" style={{ color: '#1A1610' }}>Name</TableHead>
                        <TableHead className="font-semibold" style={{ color: '#1A1610' }}>Room</TableHead>
                        <TableHead className="font-semibold" style={{ color: '#1A1610' }}>Status</TableHead>
                        <TableHead className="font-semibold" style={{ color: '#1A1610' }}>Last Exit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsWithNames.map(student => (
                        <TableRow key={student.uid} style={{ borderColor: '#E5E0D5' }} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium" style={{ color: '#1A1610' }}>{student.name}</TableCell>
                          <TableCell>
                            {editingRoom?.uid === student.uid ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  className="h-8 w-24 text-sm"
                                  value={editingRoom.draft}
                                  onChange={e => setEditingRoom({ uid: student.uid, draft: e.target.value })}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveRoomNo(student.uid, editingRoom.draft);
                                    if (e.key === 'Escape') setEditingRoom(null);
                                  }}
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => handleSaveRoomNo(student.uid, editingRoom.draft)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingRoom(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <span>{student.roomNo}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => setEditingRoom({ uid: student.uid, draft: student.roomNo })}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              student.currentStatus === 'IN' ? 'default' :
                              student.currentStatus === 'OUT' ? 'secondary' :
                              'destructive'
                            } className="font-medium">
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                student.currentStatus === 'IN' ? 'bg-green-500' :
                                student.currentStatus === 'OUT' ? 'bg-blue-500' :
                                'bg-red-500'
                              }`}></div>
                              {student.currentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell style={{ color: '#8B7F6F' }}>
                            {student.lastExitTime ? new Date(student.lastExitTime).toLocaleString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {currentTab === 'passes' && (
            <div className="space-y-6">
              {/* Pending Admin Action */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: '#C49A52' }} />
                  <h3 className="font-semibold text-lg" style={{ color: '#1A1610' }}>Pending Admin Action</h3>
                  <Badge variant="outline" className="ml-auto">
                    {passes.filter(p => p.status === 'pending' && p.adminApproval === 'pending').length} requests
                  </Badge>
                </div>
                {passes.filter(p => p.status === 'pending' && p.adminApproval === 'pending').map(pass => (
                  <Card key={pass.id} className="shadow-sm border hover:shadow-md transition-all duration-300 bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg" style={{ color: '#1A1610' }}>{pass.studentName}</p>
                            <Badge variant="outline" className="capitalize" style={{ borderColor: '#C49A52', color: '#7A6A55', backgroundColor: '#FAF8F3' }}>
                              {pass.type}
                            </Badge>
                          </div>
                          <p style={{ color: '#8B7F6F' }}>{pass.reason}</p>
                          <div className="flex items-center gap-4 text-sm" style={{ color: '#8B7F6F' }}>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Expected: {new Date(pass.expectedReturnTime).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            onClick={() => handleApprovePass(pass)}
                            className="text-white"
                            style={{ backgroundColor: '#5FD4B7' }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRejectPass(pass.id)}
                            className="text-white"
                            style={{ backgroundColor: '#EE6B5B' }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {passes.filter(p => p.status === 'pending' && p.adminApproval === 'pending').length === 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#5FD4B7' }} />
                      <p className="font-medium" style={{ color: '#1A1610' }}>All caught up!</p>
                      <p className="text-sm" style={{ color: '#8B7F6F' }}>No pass requests awaiting your action.</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Waiting for Parent Approval */}
              {passes.filter(p => p.status === 'pending' && p.adminApproval === 'approved').length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" style={{ color: '#F2C66B' }} />
                    <h3 className="font-semibold text-lg" style={{ color: '#1A1610' }}>Waiting for Parent Approval</h3>
                    <Badge variant="outline" className="ml-auto">
                      {passes.filter(p => p.status === 'pending' && p.adminApproval === 'approved').length} requests
                    </Badge>
                  </div>
                  {passes.filter(p => p.status === 'pending' && p.adminApproval === 'approved').map(pass => (
                    <Card key={pass.id} className="shadow-sm border bg-card border-border">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-lg" style={{ color: '#1A1610' }}>{pass.studentName}</p>
                              <Badge variant="outline" className="capitalize" style={{ borderColor: '#F2C66B', color: '#B8860B', backgroundColor: '#FFFBF0' }}>
                                {pass.type}
                              </Badge>
                            </div>
                            <p style={{ color: '#8B7F6F' }}>{pass.reason}</p>
                            <div className="flex items-center gap-4 text-sm" style={{ color: '#8B7F6F' }}>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Admin approved
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Expected: {new Date(pass.expectedReturnTime).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentTab === 'complaints' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" style={{ color: '#EE6B5B' }} />
                <h3 className="font-semibold text-lg" style={{ color: '#1A1610' }}>Open Complaints</h3>
                <Badge variant="outline" className="ml-auto">
                  {complaints.filter(c => c.status === 'pending').length} pending
                </Badge>
              </div>
              {complaints.filter(c => c.status === 'pending').map(complaint => (
                <Card key={complaint.id} className="shadow-sm border bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg" style={{ color: '#1A1610' }}>{complaint.studentName}</p>
                          <Badge variant="outline" className="capitalize" style={{ borderColor: '#EE6B5B', color: '#B91C1C', backgroundColor: '#FEF2F2' }}>
                            {complaint.category}
                          </Badge>
                        </div>
                        <p style={{ color: '#8B7F6F' }}>{complaint.description}</p>
                        <div className="flex items-center gap-4 text-sm" style={{ color: '#8B7F6F' }}>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(complaint.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleResolveComplaint(complaint.id)}
                        className="text-white"
                        style={{ backgroundColor: '#5FD4B7' }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {complaints.filter(c => c.status === 'pending').length === 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#5FD4B7' }} />
                    <p className="font-medium" style={{ color: '#1A1610' }}>No open complaints!</p>
                    <p className="text-sm" style={{ color: '#8B7F6F' }}>All issues have been resolved.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentTab === 'history' && (
            <Card className="shadow-sm border bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" style={{ color: '#C49A52' }} />
                  <CardTitle className="text-lg text-foreground">Activity History</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {passes.length || complaints.length ? (
                  <div className="space-y-6">
                    {passes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Pass Activity</h3>
                        <div className="space-y-3">
                          {passes.slice(0, 5).map(pass => (
                            <div key={pass.id} className="rounded-2xl border border-border p-4 bg-surface">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <p className="font-semibold text-foreground">{pass.studentName}</p>
                                <Badge variant="outline" className="text-xs uppercase">
                                  {pass.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{pass.type} pass • {pass.reason || 'No reason provided'}</p>
                              <p className="text-xs text-muted-foreground mt-2">{new Date(pass.createdAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {complaints.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Complaints</h3>
                        <div className="space-y-3">
                          {complaints.slice(0, 5).map(complaint => (
                            <div key={complaint.id} className="rounded-2xl border border-border p-4 bg-surface">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <p className="font-semibold text-foreground">{complaint.studentName}</p>
                                <Badge variant="outline" className="text-xs uppercase">
                                  {complaint.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{complaint.issue}</p>
                              <p className="text-xs text-muted-foreground mt-2">{new Date(complaint.createdAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No activity history available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};
