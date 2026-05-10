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
import { toast } from 'sonner';
import {
  LogOut,
  LayoutDashboard,
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Optimized Header */}
      <header className="sticky top-0 z-10 border-b bg-card border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl shadow-md flex-shrink-0 bg-white">
              <img src="/tssm-logo.png" alt="TSSM Logo" className="h-8 w-8 sm:h-9 sm:w-9 object-cover rounded-lg" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold whitespace-nowrap text-foreground">SafeNest Admin</h1>
              <p className="text-xs sm:text-sm hidden sm:block text-muted-foreground">Hostel Management</p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(actualTheme === 'light' ? 'dark' : 'light')}
              className="hover:bg-gray-100 rounded-lg"
            >
              {actualTheme === 'light' ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => signOut(auth)} 
              className="hover:bg-red-50 hover:text-destructive rounded-lg"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="shadow-md border hover:shadow-lg transition-all duration-300 bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Total Students</CardTitle>
                <Users className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#C49A52' }} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{studentsWithNames.length}</p>
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#C49A52' }}>
                <TrendingUp className="h-3 w-3" />
                Active residents
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md border hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D5' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Present</CardTitle>
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#8CC6C1' }} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {studentsWithNames.filter(s => s.currentStatus === 'IN').length}
              </p>
              <p className="text-xs mt-2" style={{ color: '#8CC6C1' }}>In hostel</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D5' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Out</CardTitle>
                <UserX className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#F2C66B' }} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {studentsWithNames.filter(s => s.currentStatus === 'OUT').length}
              </p>
              <p className="text-xs mt-2" style={{ color: '#F2C66B' }}>Outside campus</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D5' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Late</CardTitle>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#EE6B5B' }} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {studentsWithNames.filter(s => s.currentStatus === 'LATE').length}
              </p>
              <p className="text-xs mt-2" style={{ color: '#EE6B5B' }}>Overdue returns</p>
            </CardContent>
          </Card>
        </div>

        {/* Occupancy Chart */}
        <Card className="shadow-md border bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#C49A52' }} />
              <CardTitle className="text-base sm:text-lg text-foreground">Hostel Occupancy Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-28 sm:h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E0D5',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar dataKey="value" fill="#C49A52" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid !w-full grid-cols-2 sm:grid-cols-4 border p-1 h-auto sm:h-14 rounded-2xl shadow-sm gap-1 sm:gap-0 bg-muted border-border">
            <TabsTrigger value="status" className="flex items-center justify-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:text-white text-muted-foreground py-2 sm:py-3">
              <Home className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Live Status</span>
              <span className="sm:hidden">Status</span>
            </TabsTrigger>
            <TabsTrigger value="passes" className="flex items-center justify-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:text-white text-muted-foreground py-2 sm:py-3">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pass Requests</span>
              <span className="sm:hidden">Passes</span>
            </TabsTrigger>
            <TabsTrigger value="complaints" className="flex items-center justify-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:text-white text-muted-foreground py-2 sm:py-3">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Complaints</span>
              <span className="sm:hidden">Issues</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center justify-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:text-white text-muted-foreground py-2 sm:py-3">
              <History className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="pt-4 sm:pt-6">
            <Card className="w-full shadow-md border bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#C49A52' }} />
                  <CardTitle className="text-base sm:text-lg text-foreground">Student Status Overview</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                <Table className="text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow style={{ borderColor: '#E5E0D5', backgroundColor: '#F4F2ED' }}>
                      <TableHead className="font-semibold text-xs sm:text-sm" style={{ color: '#1A1610' }}>Name</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm" style={{ color: '#1A1610' }}>Room</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm" style={{ color: '#1A1610' }}>Status</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm" style={{ color: '#1A1610' }}>Last Exit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsWithNames.map(student => (
                      <TableRow key={student.uid} style={{ borderColor: '#E5E0D5' }} className="hover:bg-gray-50 transition-colors text-xs sm:text-sm">
                        <TableCell className="font-medium text-xs sm:text-sm" style={{ color: '#1A1610' }}>{student.name}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                        {editingRoom?.uid === student.uid ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-6 sm:h-7 w-20 sm:w-24 text-xs px-2"
                              value={editingRoom.draft}
                              onChange={e => setEditingRoom({ uid: student.uid, draft: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveRoomNo(student.uid, editingRoom.draft);
                                if (e.key === 'Escape') setEditingRoom(null);
                              }}
                              autoFocus
                            />
                            <Button size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => handleSaveRoomNo(student.uid, editingRoom.draft)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => setEditingRoom(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            <span>{student.roomNo}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 sm:h-6 sm:w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEditingRoom({ uid: student.uid, draft: student.roomNo })}
                              title="Edit room number"
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
                      <TableCell className="text-xs sm:text-sm" style={{ color: '#8B7F6F' }}>
                        {student.lastExitTime ? new Date(student.lastExitTime).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="passes" className="pt-6">
            <div className="space-y-6">
              {/* Passes awaiting admin action */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: '#C49A52' }} />
                  <h3 className="font-semibold text-lg" style={{ color: '#1A1610' }}>Pending Admin Action</h3>
                  <Badge variant="outline" className="ml-auto">
                    {passes.filter(p => p.status === 'pending' && p.adminApproval === 'pending').length} requests
                  </Badge>
                </div>
                {passes.filter(p => p.status === 'pending' && p.adminApproval === 'pending').map(pass => (
                  <Card key={pass.id} className="shadow-xl hover:shadow-2xl transition-all duration-300" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D5' }}>
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
                  <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D5' }}>
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#5FD4B7' }} />
                      <p className="font-medium" style={{ color: '#1A1610' }}>All caught up!</p>
                      <p className="text-sm" style={{ color: '#8B7F6F' }}>No pass requests awaiting your action.</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* All passes: admin approved — waiting for parent */}
              {passes.filter(p => p.status === 'pending' && p.adminApproval === 'approved').length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-lg text-blue-800">Awaiting Parent Consent</h3>
                    <Badge variant="outline" className="ml-auto">
                      {passes.filter(p => p.status === 'pending' && p.adminApproval === 'approved').length} pending
                    </Badge>
                  </div>
                  {passes.filter(p => p.status === 'pending' && p.adminApproval === 'approved').map(pass => (
                    <Card key={pass.id} className="bg-white border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-lg text-slate-900">{pass.studentName}</p>
                              <Badge variant="outline" className="capitalize border-blue-300 text-blue-700 bg-blue-50">
                                {pass.type}
                              </Badge>
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                Admin ✓ — Awaiting parent
                              </Badge>
                            </div>
                            <p className="text-slate-600">{pass.reason}</p>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Expected: {new Date(pass.expectedReturnTime).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectPass(pass.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="complaints" className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-lg text-red-800">Pending Complaints</h3>
                <Badge variant="outline" className="ml-auto">
                  {complaints.filter(c => c.status === 'pending').length} active
                </Badge>
              </div>
              {complaints.filter(c => c.status === 'pending').map(complaint => (
                <Card key={complaint.id} className="bg-white border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg text-slate-900">{complaint.studentName}</p>
                          <Badge variant="outline" className="capitalize border-rose-300 text-rose-700 bg-rose-50">
                            {complaint.category}
                          </Badge>
                        </div>
                        <p className="text-slate-600">{complaint.issue}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(complaint.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveComplaint(complaint.id)}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Resolved
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {complaints.filter(c => c.status === 'pending').length === 0 && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-green-800 font-medium">All complaints resolved!</p>
                    <p className="text-green-600 text-sm">No pending complaints to address.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="pt-6">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-lg text-blue-800">Pass History</h3>
                  <Badge variant="outline" className="ml-auto">
                    {passes.filter(p => p.status !== 'pending').length} total
                  </Badge>
                </div>
                <div className="grid gap-4">
                  {passes.filter(p => p.status !== 'pending').map(pass => (
                    <Card key={pass.id} className="hover:shadow-md transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold">{pass.studentName}</p>
                              <Badge variant="outline" className="capitalize">{pass.type}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{new Date(pass.createdAt).toLocaleString()}</p>
                          </div>
                          <Badge variant={
                            pass.status === 'completed' ? 'default' :
                            pass.status === 'violated' ? 'destructive' :
                            pass.status === 'rejected' ? 'destructive' :
                            'secondary'
                          } className="capitalize">
                            {pass.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {passes.filter(p => p.status !== 'pending').length === 0 && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-8 text-center">
                        <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-500">No pass history yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-lg text-green-800">Resolved Complaints</h3>
                  <Badge variant="outline" className="ml-auto">
                    {complaints.filter(c => c.status === 'resolved').length} resolved
                  </Badge>
                </div>
                <div className="grid gap-4">
                  {complaints.filter(c => c.status === 'resolved').map(complaint => (
                    <Card key={complaint.id} className="bg-white border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{complaint.studentName}</p>
                              <Badge variant="outline" className="capitalize border-emerald-300 text-emerald-700 bg-emerald-50">
                                {complaint.category}
                              </Badge>
                            </div>
                            <p className="text-slate-600">{complaint.issue}</p>
                            <p className="text-sm text-slate-500">{new Date(complaint.createdAt).toLocaleString()}</p>
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {complaints.filter(c => c.status === 'resolved').length === 0 && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-500">No resolved complaints yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
