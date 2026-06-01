import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Loader2, ClipboardList } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

const STATUS_CLASS = {
  Pending: 'badge-pending', Approved: 'badge-approved', Rejected: 'badge-rejected',
};

function RequestsTable({ rows, columns }) {
  if (!rows.length) return (
    <div className="empty-state" style={{ padding: 40 }}>
      <ClipboardList size={36} style={{ opacity: 0.3 }} />
      <p>No requests found</p>
    </div>
  );
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map(c => (
                <td key={c.key}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>
              ))}
              <td><span className={`badge ${STATUS_CLASS[r.status] || 'badge-draft'}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = ['Leave', 'OD', 'Extra Hours', 'Edit Requests'];

export default function MyRequestsPage() {
  const [tab, setTab]         = useState('Leave');
  const [leaves, setLeaves]   = useState([]);
  const [ods, setODs]         = useState([]);
  const [extras, setExtras]   = useState([]);
  const [edits, setEdits]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [l, o, e, ed] = await Promise.all([
          api.get('/api/requests/leave'),
          api.get('/api/requests/od'),
          api.get('/api/requests/extra'),
          api.get('/api/requests/edit-requests'),
        ]);
        setLeaves(l.data.data || []);
        setODs(o.data.data || []);
        setExtras(e.data.data || []);
        setEdits(ed.data.data || []);
      } catch (_) { toast.error('Failed to load requests.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const tabContent = {
    'Leave': {
      data: leaves,
      columns: [
        { key: 'leave_date', label: 'Date' },
        { key: 'leave_type', label: 'Type' },
        { key: 'session_type', label: 'Session' },
        { key: 'reason', label: 'Reason', render: r => <span title={r.reason}>{r.reason?.slice(0, 50)}{r.reason?.length > 50 ? '...' : ''}</span> },
      ],
    },
    'OD': {
      data: ods,
      columns: [
        { key: 'od_date', label: 'Date' },
        { key: 'session_type', label: 'Session' },
        { key: 'place', label: 'Place' },
        { key: 'purpose', label: 'Purpose', render: r => <span title={r.purpose}>{r.purpose?.slice(0, 50)}{r.purpose?.length > 50 ? '...' : ''}</span> },
      ],
    },
    'Extra Hours': {
      data: extras,
      columns: [
        { key: 'from_time', label: 'From', render: r => r.from_time ? format(new Date(r.from_time), 'MMM d, HH:mm') : '—' },
        { key: 'to_time',   label: 'To',   render: r => r.to_time   ? format(new Date(r.to_time),   'MMM d, HH:mm') : '—' },
        { key: 'purpose', label: 'Purpose' },
      ],
    },
    'Edit Requests': {
      data: edits,
      columns: [
        { key: 'target_table',     label: 'Type',   render: r => r.target_table?.replace('_', ' ') },
        { key: 'target_record_id', label: 'Entry ID' },
        { key: 'reason',           label: 'Reason', render: r => <span title={r.reason}>{r.reason?.slice(0, 60)}{r.reason?.length > 60 ? '...' : ''}</span> },
        { key: 'created_at',       label: 'Requested', render: r => r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : '—' },
      ],
    },
  };

  return (
    <AppLayout title="My Requests">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>My Requests</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Track all your submitted requests and their statuses.</p>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} id={`tab-${t.toLowerCase().replace(/\s+/g, '-')}`}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}>
            {t}
            <span style={{
              marginLeft: 6, fontSize: '0.7rem',
              background: tab === t ? 'rgba(255,255,255,0.2)' : 'var(--color-surface)',
              padding: '1px 6px', borderRadius: 8,
            }}>
              {tabContent[t]?.data.length ?? 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : (
        <RequestsTable
          rows={tabContent[tab]?.data || []}
          columns={tabContent[tab]?.columns || []}
        />
      )}
    </AppLayout>
  );
}
