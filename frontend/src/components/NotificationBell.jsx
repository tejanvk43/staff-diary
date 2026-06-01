import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { format } from 'date-fns';

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const typeColors = {
    Leave: '#f59e0b', OD: '#06b6d4', Timetable: '#8b5cf6',
    General: '#64748b', Approval: '#10b981',
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        id="notification-bell-btn"
        className="btn-icon"
        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)', position: 'relative' }}
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '44px',
          width: '380px', zIndex: 500,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Notifications</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  id="mark-all-read-btn"
                  className="btn btn-sm btn-secondary"
                  onClick={markAllRead}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button
                className="btn-icon"
                onClick={() => setOpen(false)}
                style={{ background: 'transparent', color: 'var(--color-text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px' }}>
                <Bell size={32} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    background: n.is_read ? 'transparent' : 'rgba(99,102,241,0.05)',
                    display: 'flex',
                    gap: 12,
                    cursor: n.is_read ? 'default' : 'pointer',
                  }}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    background: n.is_read ? 'transparent' : (typeColors[n.notification_type] || '#6366f1'),
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{n.title}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>{n.message}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {n.created_at ? format(new Date(n.created_at), 'MMM d, h:mm a') : ''}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      className="btn-icon"
                      style={{ background: 'transparent', color: 'var(--color-text-muted)', alignSelf: 'flex-start' }}
                      onClick={e => { e.stopPropagation(); markRead(n.id); }}
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
