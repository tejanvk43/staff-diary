import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './NotificationBell';
import {
  LayoutDashboard, BookOpen, CalendarDays,
  ClipboardList, Users, Settings, BarChart2,
  LogOut, GraduationCap, Calendar, Bell,
  CheckSquare, AlertTriangle, BookMarked, Building2, UserCheck, User, SlidersHorizontal,
  LayoutGrid, Edit2, Layers,
} from 'lucide-react';
import { useState } from 'react';

const FACULTY_NAV = [
  { to: '/dashboard',      icon: LayoutDashboard,      label: "Today's Diary" },
  { to: '/diary',          icon: BookOpen,             label: 'Diary History' },
  { to: '/setup',          icon: SlidersHorizontal,    label: 'My Setup' },
  { to: '/timetable',      icon: CalendarDays,         label: 'Timetable' },
  { to: '/leave',          icon: Calendar,             label: 'Leave & OD' },
  { to: '/request-edit',   icon: Edit2,                label: 'Request Edit' },
  { to: '/my-requests',    icon: ClipboardList,        label: 'My Requests' },
  { to: '/profile',        icon: User,                 label: 'My Profile' },
];

const ADMIN_NAV = [
  { to: '/dashboard',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users',             icon: Users,            label: 'User Management' },
  { to: '/admin/approvals',         icon: CheckSquare,      label: 'Approvals' },
  { to: '/admin/attendance',        icon: UserCheck,        label: 'Attendance' },
  { to: '/admin/block-timetables',  icon: CalendarDays,     label: 'Block Timetables' },
  { to: '/admin/section-timetables',icon: LayoutGrid,       label: 'Section Timetables' },
  { to: '/admin/faculty-timetable', icon: Calendar,         label: 'Faculty Timetable' },
  { to: '/admin/conflicts',         icon: AlertTriangle,    label: 'Conflicts' },
  { to: '/admin/reports',           icon: BarChart2,        label: 'Reports' },
  { to: '/admin/subjects',          icon: BookMarked,       label: 'Subjects' },
  { to: '/admin/departments',       icon: Building2,        label: 'Departments' },
  { to: '/admin/sections',          icon: LayoutGrid,       label: 'Sections' },
  { to: '/admin/programs',          icon: Layers,           label: 'Programmes' },
  { to: '/admin/config',            icon: Settings,         label: 'System Config' },
  { to: '/admin/holidays',          icon: Calendar,         label: 'Holidays' },
  { to: '/profile',                 icon: User,             label: 'My Profile' },
];

const HOD_NAV = [
  { to: '/dashboard',               icon: LayoutDashboard,   label: "Today's Diary" },
  { to: '/diary',                   icon: BookOpen,          label: 'Diary History' },
  { to: '/timetable',               icon: CalendarDays,      label: 'My Timetable' },
  { to: '/setup',                   icon: SlidersHorizontal, label: 'My Setup' },
  { to: '/admin/block-timetables',  icon: CalendarDays,      label: 'Block Timetables' },
  { to: '/admin/section-timetables',icon: LayoutGrid,        label: 'Section Timetables' },
  { to: '/admin/faculty-timetable', icon: Calendar,          label: 'Faculty Timetable' },
  { to: '/admin/approvals',         icon: CheckSquare,       label: 'Approvals' },
  { to: '/admin/attendance',        icon: UserCheck,         label: 'Attendance' },
  { to: '/admin/reports',           icon: BarChart2,         label: 'Reports' },
  { to: '/leave',                   icon: Calendar,          label: 'Leave & OD' },
  { to: '/request-edit',            icon: Edit2,             label: 'Request Edit' },
  { to: '/my-requests',             icon: ClipboardList,     label: 'My Requests' },
  { to: '/profile',                 icon: User,              label: 'My Profile' },
];

function getNav(role) {
  if (role === 'Admin')   return ADMIN_NAV;
  if (role === 'HOD')     return HOD_NAV;
  return FACULTY_NAV;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = getNav(user?.role);

  const roleColors = { Admin: '#6366f1', HOD: '#06b6d4', Faculty: '#10b981' };
  const roleColor  = roleColors[user?.role] || '#6366f1';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GraduationCap size={20} color="#fff" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', lineHeight: 1.25, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Usharama College
            </div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.02em' }}>Staff Activity Portal</div>
          </div>
        </div>
      </div>

      {/* User chip */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: roleColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.78rem', color: '#fff',
          }}>
            {user?.full_name?.charAt(0) || '?'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text)' }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{user?.role}</div>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="sidebar-section">Navigation</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)' }}>
        <button
          id="logout-btn"
          className="sidebar-item"
          style={{ width: '100%', background: 'none', border: '1px solid #fecaca', color: '#991b1b', cursor: 'pointer', justifyContent: 'center' }}
          onClick={() => { logout(); navigate('/login'); }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
