import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { useAuth } from '../hooks/useAuth';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function AppLayout({ children, title }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: mobileOpen ? 'fixed' : 'relative',
        zIndex: mobileOpen ? 300 : 'auto',
        height: '100vh',
        display: mobileOpen ? 'block' : undefined,
      }}>
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>{title}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NotificationBell />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px 5px 6px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 8, fontSize: '0.82rem',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.72rem', color: '#fff', flexShrink: 0,
              }}>
                {user?.full_name?.charAt(0)}
              </div>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{user?.short_name || user?.full_name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}
