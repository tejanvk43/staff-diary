import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Loader2, Building2 } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

function DeptModal({ dept, programs, onClose, onSave }) {
  const [form, setForm] = useState({
    department_name: dept?.department_name || '',
    department_code: dept?.department_code || '',
    programme:       dept?.programme || (programs[0]?.name || ''),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.department_name || !form.department_code || !form.programme) {
      toast.error('Name, code, and programme are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>{dept ? 'Edit Department' : 'Add Department'}</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="dept-code">Department Code *</label>
          <input id="dept-code" className="input" value={form.department_code} onChange={e => setForm(f => ({ ...f, department_code: e.target.value.toUpperCase() }))} placeholder="CSE" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="dept-name">Department Name *</label>
          <input id="dept-name" className="input" value={form.department_name} onChange={e => setForm(f => ({ ...f, department_name: e.target.value }))} placeholder="Computer Science & Engineering" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="dept-programme">Programme *</label>
          <select
            id="dept-programme"
            className="input"
            value={form.programme}
            onChange={e => setForm(f => ({ ...f, programme: e.target.value }))}
          >
            <option value="">— Select Programme —</option>
            {programs.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-dept-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />} {dept ? 'Update' : 'Add Department'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const [departments, setDepts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [deptRes, progRes] = await Promise.all([
        api.get('/api/admin/departments'),
        api.get('/api/admin/programs'),
      ]);
      setDepts(deptRes.data.data || []);
      setPrograms(progRes.data.data || []);
    } catch (_) { toast.error('Failed to load departments.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (editDept) {
      await api.put(`/api/admin/departments/${editDept.id}`, form);
      toast.success('Department updated.');
    } else {
      await api.post('/api/admin/departments', form);
      toast.success('Department created.');
    }
    load();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete department "${name}"? This may affect existing users.`)) return;
    try {
      await api.delete(`/api/admin/departments/${id}`);
      toast.success('Department deleted.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete.'); }
  };

  return (
    <AppLayout title="Department Management">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Departments</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{departments.length} departments configured</p>
        </div>
        <button id="add-dept-btn" className="btn btn-primary" onClick={() => { setEditDept(null); setShowModal(true); }}>
          <Plus size={14} /> Add Department
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : departments.length === 0 ? (
        <div className="empty-state">
          <Building2 size={48} style={{ opacity: 0.3 }} />
          <h3 style={{ fontWeight: 600 }}>No departments</h3>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setEditDept(null); setShowModal(true); }}><Plus size={14} /> Add Department</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {departments.map(d => (
            <div key={d.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={22} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.department_name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{d.department_code}</span>
                  {d.programme && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      color: 'var(--color-primary)',
                    }}>{d.programme}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button id={`edit-dept-${d.id}`} className="btn btn-sm btn-secondary btn-icon" onClick={() => { setEditDept(d); setShowModal(true); }} title="Edit"><Edit2 size={12} /></button>
                <button id={`delete-dept-${d.id}`} className="btn btn-sm btn-icon" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }} onClick={() => handleDelete(d.id, d.department_name)} title="Delete"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <DeptModal dept={editDept} programs={programs} onClose={() => { setShowModal(false); setEditDept(null); }} onSave={handleSave} />}
    </AppLayout>
  );
}
