import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Users,
  Clock,
  AlertTriangle,
  History,
  Home,
  Bell,
  QrCode,
  LogOut,
  Moon,
  Sun,
  UserCheck,
  UserX,
  TrendingUp,
  Activity,
  FileText,
  Shield
} from 'lucide-react';

interface SidebarNavProps {
  role: 'admin' | 'student' | 'parent';
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  onLogout?: () => void;
  onThemeToggle?: () => void;
  theme?: 'light' | 'dark';
  stats?: {
    pendingPasses?: number;
    openComplaints?: number;
    pendingApprovals?: number;
    activePasses?: number;
  };
  profile?: {
    name: string;
    role: string;
  };
  studentInfo?: {
    name: string;
    roomNo: string;
    currentStatus: string;
  };
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  role,
  currentTab,
  onTabChange,
  onLogout,
  onThemeToggle,
  theme = 'light',
  stats = { pendingPasses: 0, openComplaints: 0, pendingApprovals: 0, activePasses: 0 },
  profile,
  studentInfo
}) => {
  const navItems = {
    admin: [
      { id: 'status', label: 'Live Status', icon: <Activity className="w-4 h-4" />, badge: null },
      { id: 'passes', label: 'Pass Requests', icon: <Clock className="w-4 h-4" />, badge: stats.pendingPasses },
      { id: 'complaints', label: 'Complaints', icon: <AlertTriangle className="w-4 h-4" />, badge: stats.openComplaints },
      { id: 'history', label: 'History', icon: <History className="w-4 h-4" />, badge: null }
    ],
    student: [
      { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" />, badge: null },
      { id: 'history', label: 'History', icon: <History className="w-4 h-4" />, badge: null },
      { id: 'scan', label: 'QR Scan', icon: <QrCode className="w-4 h-4" />, badge: null }
    ],
    parent: [
      { id: 'approvals', label: 'Approvals', icon: <Bell className="w-4 h-4" />, badge: stats.pendingApprovals },
      { id: 'history', label: 'History', icon: <History className="w-4 h-4" />, badge: null }
    ]
  };

  const currentNavItems = navItems[role];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-border bg-surface flex items-center justify-center">
            <img src="/123.png" alt="SafeNest logo" className="w-full h-full object-cover" />
          </div>
        </div>

        {profile && (
          <div className="text-sm mb-3">
            <p className="font-medium text-foreground">{profile.name}</p>
            <p className="text-muted-foreground capitalize">{profile.role}</p>
          </div>
        )}

        {studentInfo && role === 'parent' && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monitoring</p>
            <p className="font-medium text-foreground text-sm">{studentInfo.name}</p>
            <p className="text-xs text-muted-foreground">Room {studentInfo.roomNo}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {currentNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange?.(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                currentTab === item.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.icon}
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {onThemeToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onThemeToggle}
            className="w-full justify-start gap-3"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="text-sm">Toggle Theme</span>
          </Button>
        )}

        {onLogout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign Out</span>
          </Button>
        )}
      </div>
    </aside>
  );
};