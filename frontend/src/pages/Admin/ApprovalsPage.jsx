import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, X, Calendar, Briefcase, Clock, FileText, LayoutGrid, UserCheck } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../hooks/useAuth';

// ─── Approval Action Modal ───────────────────────────────────────────────────
function ApprovalModal({ item, type, onClose, onApprove }) {
  const [action, setAction] = useState('Approved');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onApprove(item.id, action, remarks, type);
      onClose();
      toast.success(`Request ${action.toLowerCase()}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const getDetails = () => {
    if (type === 'changes') {
      return (
        <>
          <div style={{ marginBottom: 6 }}><strong>Type:</strong> {item.target_table === 'diary_logs_date' ? 'Entire Past Date' : item.target_table?.replace('_', ' ')}</div>
          {(() => {
            if (item.target_table === 'diary_logs_date' && item.change_payload) {
              try {
                const payload = typeof item.change_payload === 'string' ? JSON.parse(item.change_payload) : item.change_payload;
                return <div style={{ marginBottom: 6 }}><strong>Target Date:</strong> {payload.date}</div>;
              } catch (_) {}
            }
            return null;
          })()}
          {item.reason && <div style={{ marginBottom: 6 }}><strong>Reason:</strong> {item.reason}</div>}
        </>
      );
    }
    if (type === 'adjustments') {
      return (
        <>
          <div style={{ marginBottom: 6 }}><strong>Type:</strong> {item.is_mutual ? '🔄 Mutual Swap' : '➡️ One-way Assign'}</div>
          <div style={{ marginBottom: 6 }}><strong>Date:</strong> {item.adjustment_date ? format(new Date(item.adjustment_date), 'yyyy-MM-dd') : '—'} ({item.day})</div>
          <div style={{ marginBottom: 6 }}><strong>Time Slot:</strong> {item.from_time} - {item.to_time}</div>
          <div style={{ marginBottom: 6 }}><strong>Subject &amp; Section:</strong> {item.subject_name} ({item.section || 'N/A'})</div>
          <div style={{ marginBottom: 6 }}><strong>Assigned To:</strong> {item.assigned_to_name}</div>
          {item.is_mutual && (
            <div style={{ marginTop: 10, padding: 10, border: '1px dashed #f59e0b', borderRadius: 8, background: 'rgba(245,158,11,0.05)' }}>
              <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>🔄 Mutual Swap Return Slot:</div>
              <div style={{ marginBottom: 4 }}><strong>Date:</strong> {item.mutual_date ? format(new Date(item.mutual_date), 'yyyy-MM-dd') : '—'} ({item.mutual_day})</div>
              <div style={{ marginBottom: 4 }}><strong>Time Slot:</strong> {item.mutual_from_time} - {item.mutual_to_time}</div>
              <div><strong>Subject &amp; Section:</strong> {item.mutual_subject_name} ({item.mutual_section || 'N/A'})</div>
            </div>
          )}
        </>
      );
    }
    if (type === 'leaves') {
      return (
        <>
          <div style={{ marginBottom: 6 }}><strong>Date:</strong> {item.leave_date ? format(new Date(item.leave_date), 'yyyy-MM-dd') : '—'}</div>
          <div style={{ marginBottom: 6 }}><strong>Type:</strong> {item.leave_type} (Session: {item.session_type})</div>
          {item.reason && <div style={{ marginBottom: 6 }}><strong>Reason:</strong> {item.reason}</div>}
        </>
      );
    }
    if (type === 'ods') {
      return (
        <>
          <div style={{ marginBottom: 6 }}><strong>Date:</strong> {item.od_date ? format(new Date(item.od_date), 'yyyy-MM-dd') : '—'} (Session: {item.session_type})</div>
          <div style={{ marginBottom: 6 }}><strong>Place:</strong> {item.place}</div>
          {item.purpose && <div style={{ marginBottom: 6 }}><strong>Purpose:</strong> {item.purpose}</div>}
        </>
      );
    }
    if (type === 'extras') {
      return (
        <>
          <div style={{ marginBottom: 6 }}><strong>From:</strong> {item.from_time ? format(new Date(item.from_time), 'yyyy-MM-dd HH:mm') : '—'}</div>
          <div style={{ marginBottom: 6 }}><strong>To:</strong> {item.to_time ? format(new Date(item.to_time), 'yyyy-MM-dd HH:mm') : '—'}</div>
          {item.purpose && <div style={{ marginBottom: 6 }}><strong>Purpose:</strong> {item.purpose}</div>}
        </>
      );
    }
    if (type === 'diary') {
      return (
        <>
          <div style={{ marginBottom: 6 }}><strong>Date:</strong> {item.log_date ? format(new Date(item.log_date), 'yyyy-MM-dd') : '—'}</div>
          <div style={{ marginBottom: 6 }}><strong>Time:</strong> {item.from_time ? format(new Date(item.from_time), 'HH:mm') : '—'} - {item.to_time ? format(new Date(item.to_time), 'HH:mm') : '—'}</div>
          <div style={{ marginBottom: 6 }}><strong>Activity:</strong> {item.activity_type}</div>
          {item.description && <div style={{ marginBottom: 6 }}><strong>Description:</strong> {item.description}</div>}
        </>
      );
    }
    return null;
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700 }}>Review {type === 'changes' ? 'Edit Request' : type === 'adjustments' ? 'Class Adjustment' : 'Request'}</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ background: 'var(--color-surface-2)', borderRadius: 10, padding: '14px', marginBottom: 16, fontSize: '0.875rem' }}>
          <div style={{ marginBottom: 6 }}><strong>Employee:</strong> {item.full_name} ({item.employee_id})</div>
          <div style={{ marginBottom: 6 }}><strong>Department:</strong> {item.department}</div>
          {getDetails()}
          {item.created_at && <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}><strong>Requested:</strong> {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</div>}
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

// ─── Main Approvals Page ─────────────────────────────────────────────────────
export default function ApprovalsPage() {
  const { user } = useAuth();
  const isHod = user?.role === 'HOD';
  const [tab, setTab] = useState('changes');

  const [changes, setChanges] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [ods, setODs] = useState([]);
  const [extras, setExtras] = useState([]);
  const [diary, setDiary] = useState([]);

  const [loading, setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/approvals/pending');
      const data = res.data.data || {};
      
      const filterByDept = (list) => {
        if (isHod && user?.department) {
          return (list || []).filter(c => c.department === user.department);
        }
        return list || [];
      };

      setChanges(filterByDept(data.changes));
      setAdjustments(filterByDept(data.adjustments));
      setLeaves(filterByDept(data.leaves));
      setODs(filterByDept(data.ods));
      setExtras(filterByDept(data.extras));
      setDiary(filterByDept(data.diary));

    } catch (_) { toast.error('Failed to load approvals.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
  }, [user]);

  const approve = async (id, status, remarks, itemType) => {
    let endpoint = '';
    if (itemType === 'changes')      endpoint = `/api/admin/approvals/change-request/${id}`;
    else if (itemType === 'adjustments') endpoint = `/api/admin/approvals/adjustment/${id}`;
    else if (itemType === 'leaves')      endpoint = `/api/admin/approvals/leave/${id}`;
    else if (itemType === 'ods')         endpoint = `/api/admin/approvals/od/${id}`;
    else if (itemType === 'extras')      endpoint = `/api/admin/approvals/extra/${id}`;
    else if (itemType === 'diary')       endpoint = `/api/admin/approvals/diary/${id}`;

    await api.put(endpoint, { status, remarks });
    load();
  };

  const TABS = [
    { key: 'changes',     label: 'Edit Requests',     icon: FileText,   data: changes },
    { key: 'leaves',      label: 'Leaves',            icon: Calendar,   data: leaves },
    { key: 'ods',         label: 'OD Requests',       icon: Briefcase,  data: ods },
    { key: 'extras',      label: 'Extra Hours',       icon: Clock,      data: extras },
    { key: 'diary',       label: 'Submitted Diaries', icon: UserCheck,  data: diary },
  ];

  const tabConfig = {
    changes: {
      cols: [
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
        { key: 'reason',       label: 'Reason', render: r => <span title={r.reason}>{r.reason?.slice(0, 40)}{r.reason?.length > 40 ? '...' : ''}</span> },
        { key: 'created_at',   label: 'Requested', render: r => r.created_at ? format(new Date(r.created_at), 'MMM d, HH:mm') : '—' },
      ],
      canHODApprove: false,
    },
    adjustments: {
      cols: [
        { key: 'full_name',    label: 'Employee' },
        { key: 'department',   label: 'Dept' },
        { key: 'adjustment_date', label: 'Date', render: r => r.adjustment_date ? format(new Date(r.adjustment_date), 'yyyy-MM-dd') : '—' },
        { key: 'subject_name', label: 'Class / Subject', render: r => `${r.subject_name} (${r.section || 'N/A'})` },
        { key: 'assigned_to_name', label: 'Assigned To' },
        { key: 'created_at',   label: 'Requested', render: r => r.created_at ? format(new Date(r.created_at), 'MMM d, HH:mm') : '—' },
      ],
      canHODApprove: true,
    },
    leaves: {
      cols: [
        { key: 'full_name',    label: 'Employee' },
        { key: 'department',   label: 'Dept' },
        { key: 'leave_date',   label: 'Leave Date', render: r => r.leave_date ? format(new Date(r.leave_date), 'yyyy-MM-dd') : '—' },
        { key: 'leave_type',   label: 'Type' },
        { key: 'session_type', label: 'Session' },
        { key: 'reason',       label: 'Reason', render: r => <span title={r.reason}>{r.reason?.slice(0, 40)}{r.reason?.length > 40 ? '...' : ''}</span> },
      ],
      canHODApprove: false,
    },
    ods: {
      cols: [
        { key: 'full_name',    label: 'Employee' },
        { key: 'department',   label: 'Dept' },
        { key: 'od_date',      label: 'OD Date', render: r => r.od_date ? format(new Date(r.od_date), 'yyyy-MM-dd') : '—' },
        { key: 'place',        label: 'Place' },
        { key: 'purpose',      label: 'Purpose', render: r => <span title={r.purpose}>{r.purpose?.slice(0, 40)}{r.purpose?.length > 40 ? '...' : ''}</span> },
      ],
      canHODApprove: false,
    },
    extras: {
      cols: [
        { key: 'full_name',    label: 'Employee' },
        { key: 'department',   label: 'Dept' },
        { key: 'from_time',    label: 'From Time', render: r => r.from_time ? format(new Date(r.from_time), 'MMM d, HH:mm') : '—' },
        { key: 'to_time',      label: 'To Time', render: r => r.to_time ? format(new Date(r.to_time), 'MMM d, HH:mm') : '—' },
        { key: 'purpose',      label: 'Purpose' },
      ],
      canHODApprove: false,
    },
    diary: {
      cols: [
        { key: 'full_name',    label: 'Employee' },
        { key: 'department',   label: 'Dept' },
        { key: 'log_date',     label: 'Diary Date', render: r => r.log_date ? format(new Date(r.log_date), 'yyyy-MM-dd') : '—' },
        { key: 'activity_type',label: 'Activity' },
        { key: 'description',  label: 'Description', render: r => <span title={r.description}>{r.description?.slice(0, 40)}{r.description?.length > 40 ? '...' : ''}</span> },
      ],
      canHODApprove: false,
    },
  };

  const activeTab = TABS.find(t => t.key === tab);
  const currentConfig = tabConfig[tab];
  const currentData = activeTab?.data || [];
  const showAction = !isHod || currentConfig.canHODApprove;

  return (
    <AppLayout title="Approvals">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Pending Approvals</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Review staff diary edits, leave requests, on-duty alerts, and class adjustments.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const count = t.data.length;
          return (
            <button
              key={t.key}
              id={`tab-approvals-${t.key}`}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={14} />
              {t.label}
              {count > 0 && (
                <span style={{
                  background: 'var(--color-danger)', color: '#fff',
                  fontSize: '0.65rem', borderRadius: '50%', padding: '2px 6px',
                  fontWeight: 700, marginLeft: 2
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : currentData.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={40} style={{ color: 'var(--color-success)', opacity: 0.5 }} />
          <p>No pending {activeTab.label.toLowerCase()}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {currentConfig.cols.map(c => <th key={c.key}>{c.label}</th>)}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map(row => (
                <tr key={row.id}>
                  {currentConfig.cols.map(c => <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}
                  <td>
                    {showAction ? (
                      <button
                        id={`review-${row.id}-btn`}
                        className="btn btn-sm btn-primary"
                        onClick={() => setSelected(row)}
                      >
                        Review
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Admin Action Required</span>
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
          type={tab}
          onClose={() => setSelected(null)}
          onApprove={approve}
        />
      )}
    </AppLayout>
  );
}
