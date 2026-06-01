import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Search, Loader2, Plus, X, UserCheck } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

const STATUS_COLORS = {
  Present: '#10b981', Absent: '#ef4444', Leave: '#f59e0b',
  OD: '#06b6d4', Holiday: '#8b5cf6',
};

function MarkModal({ users, onClose, onSave }) {
  const [form, setForm] = useState({
    employee_id: '', attendance_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'Present', check_in: '', check_out: '', remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.employee_id || !form.attendance_date || !form.status) {
      toast.error('Employee, date, and status are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      toast.success('Attendance recorded.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>Mark Attendance</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="att-emp">Employee *</label>
            <select id="att-emp" className="input" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
              <option value="">Select employee</option>
              {users.map(u => <option key={u.employee_id} value={u.employee_id}>{u.full_name} ({u.employee_id})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="att-date">Date *</label>
            <input id="att-date" type="date" className="input" value={form.attendance_date} onChange={e => set('attendance_date', e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="att-status">Status *</label>
            <select id="att-status" className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {form.status === 'Present' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="att-in">Check In</label>
                <input id="att-in" type="time" className="input" value={form.check_in} onChange={e => set('check_in', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="att-out">Check Out</label>
                <input id="att-out" type="time" className="input" value={form.check_out} onChange={e => set('check_out', e.target.value)} />
              </div>
            </>
          )}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="att-remarks">Remarks</label>
            <input id="att-remarks" className="input" value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-att-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />} Save Attendance
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate]           = useState(today);
  const [records, setRecords]     = useState([]);
  const [users, setUsers]         = useState([]);
  const [departments, setDepts]   = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading]     = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/api/admin/users'), api.get('/api/admin/departments')])
      .then(([ur, dr]) => { setUsers(ur.data.data || []); setDepts(dr.data.data || []); })
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (deptFilter) params.append('department', deptFilter);
      const res = await api.get(`/api/attendance?${params}`);
      setRecords(res.data.data || []);
    } catch (_) { toast.error('Failed to load attendance.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [date, deptFilter]);

  const handleMark = async (form) => {
    await api.post('/api/attendance', form);
    load();
  };

  const statusCounts = Object.keys(STATUS_COLORS).reduce((acc, s) => {
    acc[s] = records.filter(r => r.status === s).length;
    return acc;
  }, {});

  return (
    <AppLayout title="Attendance">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Attendance</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>View and manage daily attendance records.</p>
        </div>
        <button id="mark-att-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Mark Attendance
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label className="form-label" htmlFor="att-date-filter">Date</label>
          <input id="att-date-filter" type="date" className="input" value={date} max={today} onChange={e => setDate(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="form-label" htmlFor="att-dept-filter">Department</label>
          <select id="att-dept-filter" className="input" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.department_name}>{d.department_code}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
          {Object.entries(statusCounts).filter(([, v]) => v > 0).map(([s, v]) => (
            <div key={s} className="stat-card">
              <div className="stat-value" style={{ color: STATUS_COLORS[s] }}>{v}</div>
              <div className="stat-label">{s}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <UserCheck size={48} style={{ opacity: 0.3 }} />
          <h3 style={{ fontWeight: 600 }}>No attendance records</h3>
          <p style={{ fontSize: '0.875rem' }}>No records for {date}. Use "Mark Attendance" to add entries.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Remarks</th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.employee_id}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{r.department}</td>
                  <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{r.check_in ? format(new Date(r.check_in), 'HH:mm') : '—'}</td>
                  <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{r.check_out ? format(new Date(r.check_out), 'HH:mm') : '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: `${STATUS_COLORS[r.status]}22`, color: STATUS_COLORS[r.status] }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{r.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <MarkModal users={users} onClose={() => setShowModal(false)} onSave={handleMark} />}
    </AppLayout>
  );
}
