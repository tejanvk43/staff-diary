import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Upload, Key, Edit2, Trash2, Search, X, Loader2,
  CheckCircle, User, Download
} from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';

const ROLES = ['Faculty', 'HOD', 'Admin'];

// ─── Add User Modal ────────────────────────────────────────────────────────────────────────────────────
function AddUserModal({ onClose, onSave, departments, programs }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [saving, setSaving] = useState(false);

  const submit = async (data) => {
    setSaving(true);
    try { await onSave(data); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>Add New User</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(submit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-emp-id">Employee ID *</label>
              <input id="new-emp-id" className={`input ${errors.employee_id ? 'input-error' : ''}`} placeholder="EMP001"
                {...register('employee_id', { required: 'Required' })} />
              {errors.employee_id && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{errors.employee_id.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-role">Role *</label>
              <select id="new-role" className="input" {...register('role', { required: 'Required' })}>
                <option value="">Select role</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="new-name">Full Name *</label>
              <input id="new-name" className="input" placeholder="Dr. John Smith"
                {...register('full_name', { required: 'Required' })} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-short">Short Name</label>
              <input id="new-short" className="input" placeholder="J.Smith" {...register('short_name')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-edu">Education Type *</label>
              <select id="new-edu" className="input" {...register('education_type', { required: 'Required' })}>
                <option value="">Select</option>
                {programs.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="new-dept">Department *</label>
              <select id="new-dept" className="input" {...register('department', { required: 'Required' })}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.department_name}>{d.department_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-designation">Designation</label>
              <input id="new-designation" className="input" placeholder="Assistant Professor" {...register('designation')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-phone">Phone</label>
              <input id="new-phone" className="input" placeholder="+91 9876543210" {...register('phone_number')} />
            </div>

          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button id="create-user-btn" type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 size={14} className="spinner" />} Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Modal ────────────────────────────────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave, departments, programs }) {
  const [form, setForm] = useState({
    full_name:      user.full_name      || '',
    short_name:     user.short_name     || '',
    education_type: user.education_type || 'B-Tech',
    department:     user.department     || '',
    designation:    user.designation    || '',
    phone_number:   user.phone_number   || '',
    email:          user.email          || '',
    role:           user.role           || 'Faculty',
    is_first_login: user.is_first_login ? true : false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required.'); return; }
    if (!form.department)       { toast.error('Department is required.'); return; }
    setSaving(true);
    try {
      await onSave(user.employee_id, form);
      toast.success('User updated.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const roleColors = { Admin: '#6366f1', HOD: '#06b6d4', Faculty: '#10b981' };
  const roleColor  = roleColors[form.role] || '#6366f1';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: `${roleColor}22`, border: `2px solid ${roleColor}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1.3rem', color: roleColor,
            }}>
              {form.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 2 }}>Edit User</h3>
              <span style={{
                fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700,
                padding: '2px 8px', borderRadius: 6,
                background: 'var(--color-surface-2)', color: 'var(--color-text-muted)',
              }}>
                {user.employee_id}
              </span>
            </div>
          </div>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* ── Section: Identity ── */}
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Identity
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>

          {/* Employee ID — read-only */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-emp-id">Employee ID</label>
            <input
              id="edit-emp-id"
              className="input"
              value={user.employee_id}
              readOnly
              style={{
                background: 'var(--color-surface-2)', cursor: 'not-allowed',
                fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-text-muted)',
                letterSpacing: '0.05em',
              }}
            />
            <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 3 }}>Primary key — cannot be changed</p>
          </div>

          {/* Role */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-role">Role *</label>
            <select id="edit-role" className="input" value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Full Name */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="edit-name">Full Name *</label>
            <input id="edit-name" className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Dr. John Smith" />
          </div>

          {/* Short Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-short">Short Name</label>
            <input id="edit-short" className="input" value={form.short_name} onChange={e => set('short_name', e.target.value)} placeholder="J.Smith" />
          </div>

          {/* Designation */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-designation">Designation</label>
            <input id="edit-designation" className="input" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="Assistant Professor" />
          </div>
        </div>

        {/* ── Section: Academic ── */}
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Academic
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>

          {/* Education Type */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-edu">Education Type *</label>
            <select id="edit-edu" className="input" value={form.education_type} onChange={e => set('education_type', e.target.value)}>
              {programs.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>

          {/* Department */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-dept">Department *</label>
            <select id="edit-dept" className="input" value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.department_name}>{d.department_name}</option>)}
            </select>
          </div>
        </div>

        {/* ── Section: Contact ── */}
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Contact
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>



          {/* Phone */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="edit-phone">Phone Number</label>
            <input id="edit-phone" className="input" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="+91 9876543210" />
          </div>
        </div>

        {/* ── Section: Account ── */}
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Account
        </div>
        <div style={{
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Force Password Reset on Next Login</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              When enabled, user must change their password at next sign-in
            </div>
          </div>
          <button
            id="edit-first-login-toggle"
            type="button"
            onClick={() => set('is_first_login', !form.is_first_login)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: form.is_first_login ? 'var(--color-primary)' : 'var(--color-border)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: form.is_first_login ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="update-user-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />} Update User
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Temp Password Modal ───────────────────────────────────────────────────────────────────────────────────
function TempPasswordModal({ user: userName, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420, textAlign: 'center' }}>
        <CheckCircle size={48} style={{ color: 'var(--color-success)', margin: '0 auto 16px' }} />
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>User Created!</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
          Share this temporary password with <strong>{userName}</strong>. They will be prompted to change it on first login.
        </p>
        <div style={{
          background: 'var(--color-surface-2)', border: '1px dashed var(--color-primary)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 20,
          fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, letterSpacing: 3,
          color: 'var(--color-primary-light)',
        }}>
          {password}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button id="copy-password-btn" className="btn btn-secondary" onClick={copy}>
            {copied ? <CheckCircle size={14} /> : null} {copied ? 'Copied!' : 'Copy Password'}
          </button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const [users, setUsers]         = useState([]);
  const [departments, setDepts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [tempPwd, setTempPwd]     = useState(null);
  const [tempUser, setTempUser]   = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [showBulkSummary, setShowBulkSummary] = useState(false);
  const fileRef = useRef();

  const [programs, setPrograms]   = useState([]);

  const downloadUserTemplate = () => {
    const data = [
      {
        employee_id: 'FAC001',
        full_name: 'Dr. Jane Doe',
        short_name: 'JD',
        education_type: 'B-Tech',
        department: 'Computer Science & Engineering',
        designation: 'Professor',
        phone_number: '9876543210',
        role: 'Faculty',
        password: 'ChangeMe123'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'users_bulk_template.xlsx');
  };

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, progRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/departments'),
        api.get('/api/admin/programs'),
      ]);
      setUsers(usersRes.data.data || []);
      setDepts(deptsRes.data.data || []);
      setPrograms(progRes.data.data || []);
    } catch (_) { toast.error('Failed to load users.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    const matchSearch = !s || u.full_name.toLowerCase().includes(s) || u.employee_id.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
    const matchDept = !deptFilter || u.department === deptFilter;
    return matchSearch && matchDept;
  });

  const handleCreate = async (data) => {
    try {
      const res = await api.post('/api/admin/users', data);
      setTempPwd(res.data.data.temp_password);
      setTempUser(res.data.data.full_name);
      setShowAdd(false);
      toast.success('User created.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleUpdate = async (employee_id, form) => {
    await api.put(`/api/admin/users/${employee_id}`, form);
    load();
  };

  const handleDelete = async (employee_id, full_name) => {
    if (!confirm(`Delete user "${full_name}"? This action cannot be undone and will remove all their diary entries.`)) return;
    try {
      await api.delete(`/api/admin/users/${employee_id}`);
      toast.success('User deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleReset = async (employee_id, full_name) => {
    if (!confirm(`Reset password for ${full_name}?`)) return;
    try {
      const res = await api.put(`/api/admin/users/${employee_id}/reset-password`);
      setTempPwd(res.data.data.temp_password);
      setTempUser(full_name);
    } catch (err) {
      toast.error('Failed to reset password.');
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const toastId = toast.loading('Uploading and importing user list...');
    try {
      const res = await api.post('/api/admin/users/bulk', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { created, failed } = res.data.data;
      toast.success(`Bulk upload complete! Created: ${created}, Failed: ${failed}`, { id: toastId });
      setBulkResult({
        ...res.data.data,
        _excelBuffer: res.data._excelBuffer
      });
      setShowBulkSummary(true);
      load();
    } catch (err) {
      toast.error('Bulk upload failed.', { id: toastId });
    }
    e.target.value = '';
  };

  const downloadBulkPasswords = () => {
    if (!bulkResult?._excelBuffer) return;
    const bytes = atob(bulkResult._excelBuffer);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'new_users_passwords.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const roleColors = { Admin: '#6366f1', HOD: '#06b6d4', Faculty: '#10b981' };

  return (
    <AppLayout title="User Management">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Staff Directory</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{users.length} users registered</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button id="download-template-btn" className="btn btn-secondary" onClick={downloadUserTemplate}>
            <Download size={14} /> Download Template
          </button>
          <button id="bulk-upload-btn" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Bulk Upload
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleBulkUpload} />
          <button id="add-user-btn" className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input id="user-search" className="input" style={{ paddingLeft: 36 }}
            placeholder="Search by name, ID, or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select id="dept-filter" className="input" style={{ maxWidth: 220 }}
          value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.department_name}>{d.department_code}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Education</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.employee_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: `${roleColors[u.role] || '#64748b'}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.8rem', color: roleColors[u.role],
                      }}>{u.full_name?.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.employee_id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{u.email}</td>
                  <td style={{ fontSize: '0.85rem' }}>{u.department}</td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px',
                      borderRadius: 20, background: `${roleColors[u.role]}22`, color: roleColors[u.role],
                    }}>{u.role}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{u.education_type}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        id={`edit-user-${u.employee_id}`}
                        className="btn btn-sm btn-secondary btn-icon"
                        onClick={() => setEditUser(u)}
                        title="Edit User"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        id={`reset-pwd-${u.employee_id}`}
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleReset(u.employee_id, u.full_name)}
                        title="Reset Password"
                      >
                        <Key size={12} /> Reset
                      </button>
                      <button
                        id={`delete-user-${u.employee_id}`}
                        className="btn btn-sm btn-icon"
                        style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
                        onClick={() => handleDelete(u.employee_id, u.full_name)}
                        title="Delete User"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAdd  && <AddUserModal  departments={departments} programs={programs} onClose={() => setShowAdd(false)} onSave={handleCreate} />}
      {editUser && <EditUserModal user={editUser} departments={departments} programs={programs} onClose={() => setEditUser(null)} onSave={handleUpdate} />}
      {tempPwd  && <TempPasswordModal user={tempUser} password={tempPwd} onClose={() => setTempPwd(null)} />}
      {showBulkSummary && (
        <BulkSummaryModal
          result={bulkResult}
          onClose={() => { setShowBulkSummary(false); setBulkResult(null); }}
          onDownloadPasswords={downloadBulkPasswords}
        />
      )}
    </AppLayout>
  );
}

function BulkSummaryModal({ result, onClose, onDownloadPasswords }) {
  const { created, failed, errorRows, _excelBuffer } = result || {};
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>User Import Summary</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '14px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>{created || 0}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Created Successfully</div>
          </div>
          <div style={{ background: failed ? 'rgba(239,68,68,0.1)' : 'var(--color-surface-2)', border: failed ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--color-border)', padding: '14px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: failed ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{failed || 0}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Failed Rows</div>
          </div>
        </div>

        {failed > 0 && errorRows && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Detailed Error Log
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {errorRows.map((err, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', padding: '6px 0', borderBottom: idx < errorRows.length - 1 ? '1px solid var(--color-surface-2)' : 'none', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', flexShrink: 0 }}>Row {err.row}</span>
                  <span style={{ color: 'var(--color-text)', lineHeight: 1.4 }}>{err.reasons.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
          {_excelBuffer && (
            <button className="btn btn-primary" onClick={onDownloadPasswords}>
              <Download size={14} /> Download Passwords
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
