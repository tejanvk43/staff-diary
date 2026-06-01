import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

// ─── Approval Action Modal ───────────────────────────────────────────────────
function ApprovalModal({ item, onClose, onApprove }) {
  const [action, setAction] = useState('Approved');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onApprove(item.id, action, remarks);
      onClose();
      toast.success(`Request ${action.toLowerCase()}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700 }}>Review Edit Request</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ background: 'var(--color-surface-2)', borderRadius: 10, padding: '14px', marginBottom: 16, fontSize: '0.875rem' }}>
          <div style={{ marginBottom: 6 }}><strong>Employee:</strong> {item.full_name} ({item.employee_id})</div>
          <div style={{ marginBottom: 6 }}><strong>Department:</strong> {item.department}</div>
          <div style={{ marginBottom: 6 }}>
            <strong>Type:</strong> {item.target_table === 'diary_logs_date' ? 'Entire Past Date' : item.target_table?.replace('_', ' ')}
          </div>
          {(() => {
            if (item.target_table === 'diary_logs_date' && item.change_payload) {
              try {
                const payload = typeof item.change_payload === 'string' ? JSON.parse(item.change_payload) : item.change_payload;
                return (
                  <div style={{ marginBottom: 6 }}>
                    <strong>Target Date:</strong> {payload.date}
                  </div>
                );
              } catch (_) {}
            }
            return null;
          })()}
          {item.reason && <div style={{ marginBottom: 6 }}><strong>Reason:</strong> {item.reason}</div>}
          {item.created_at && <div><strong>Requested:</strong> {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Action</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Approved', 'Rejected'].map(a => (
              <button
                key={a}
                id={`action-${a.toLowerCase()}-btn`}
                className={`btn ${a === 'Approved' ? 'btn-success' : 'btn-danger'}`}
                style={{ flex: 1, justifyContent: 'center', opacity: action === a ? 1 : 0.5, transform: action === a ? 'scale(1.02)' : 'scale(1)' }}
                onClick={() => setAction(a)}
              >
                {a === 'Approved' ? <CheckCircle size={14} /> : <XCircle size={14} />} {a}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="approval-remarks">Remarks (optional)</label>
          <textarea id="approval-remarks" className="input" rows={3} placeholder="Add a note for the employee..."
            value={remarks} onChange={e => setRemarks(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="confirm-approval-btn" className={`btn ${action === 'Approved' ? 'btn-success' : 'btn-danger'}`}
            onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 size={14} className="spinner" />}
            Confirm {action}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Approvals Page — Edit Requests only ────────────────────────────────
export default function ApprovalsPage() {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/approvals/pending');
      setChanges(res.data.data?.changes || []);
    } catch (_) { toast.error('Failed to load approvals.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id, status, remarks) => {
    await api.put(`/api/admin/approvals/change-request/${id}`, { status, remarks });
    load();
  };

  const cols = [
    { key: 'full_name',    label: 'Employee' },
    { key: 'department',   label: 'Dept' },
    { key: 'target_table', label: 'Type', render: r => {
      if (r.target_table === 'diary_logs_date') {
        let dateStr = '';
        if (r.change_payload) {
          try {
            const payload = typeof r.change_payload === 'string' ? JSON.parse(r.change_payload) : r.change_payload;
            dateStr = ` (${payload.date})`;
          } catch (_) {}
        }
        return `Entire Past Date${dateStr}`;
      }
      return r.target_table?.replace('_', ' ');
    }},
    { key: 'reason',       label: 'Reason', render: r => <span title={r.reason}>{r.reason?.slice(0, 50)}{r.reason?.length > 50 ? '...' : ''}</span> },
    { key: 'created_at',   label: 'Requested', render: r => r.created_at ? format(new Date(r.created_at), 'MMM d, HH:mm') : '—' },
    { key: 'status',       label: 'Status', render: r => <span className={`badge badge-${r.status?.toLowerCase()}`}>{r.status}</span> },
  ];

  return (
    <AppLayout title="Approvals">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Edit Requests</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Review diary edit requests from staff.
          {changes.length > 0 && (
            <span style={{ marginLeft: 10, background: 'var(--color-danger)', color: '#fff', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
              {changes.length} pending
            </span>
          )}
        </p>
      </div>

      {loading ? (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : changes.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={40} style={{ color: 'var(--color-success)', opacity: 0.5 }} />
          <p>No pending edit requests</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {cols.map(c => <th key={c.key}>{c.label}</th>)}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {changes.map(row => (
                <tr key={row.id}>
                  {cols.map(c => <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}
                  <td>
                    {row.status === 'Pending' && (
                      <button
                        id={`review-${row.id}-btn`}
                        className="btn btn-sm btn-primary"
                        onClick={() => setSelected(row)}
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ApprovalModal
          item={selected}
          onClose={() => setSelected(null)}
          onApprove={approve}
        />
      )}
    </AppLayout>
  );
}
