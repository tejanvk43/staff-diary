import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2, User, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({});
  const [pwdForm, setPwdForm]   = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  useEffect(() => {
    api.get('/api/auth/me').then(r => {
      setProfile(r.data.data);
      setForm({
        phone_number: r.data.data.phone_number || '',
        designation:  r.data.data.designation  || '',
      });
    }).catch(() => toast.error('Failed to load profile.'))
    .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Faculty can only update phone + designation via self-service
      // (admin can update full profile via User Management)
      await api.put(`/api/admin/users/${user?.employee_id}`, {
        ...profile,
        phone_number: form.phone_number,
        designation:  form.designation,
      });
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePwdChange = async () => {
    if (pwdForm.new_password !== pwdForm.confirm) { toast.error('Passwords do not match.'); return; }
    if (pwdForm.new_password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setPwdSaving(true);
    try {
      await api.post('/api/auth/change-password', {
        old_password: pwdForm.old_password,
        new_password: pwdForm.new_password,
      });
      toast.success('Password changed successfully.');
      setPwdForm({ old_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) return <AppLayout title="My Profile"><div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div></AppLayout>;

  const roleColors = { Admin: '#6366f1', HOD: '#06b6d4', Faculty: '#10b981' };
  const roleColor = roleColors[profile?.role] || '#6366f1';

  return (
    <AppLayout title="My Profile">
      <div style={{ maxWidth: 680 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>My Profile</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>View and update your personal information.</p>
        </div>

        {/* Profile Card */}
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: `${roleColor}22`,
              border: `3px solid ${roleColor}44`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 800, fontSize: '1.8rem', color: roleColor, flexShrink: 0,
            }}>
              {profile?.full_name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{profile?.employee_id} · {profile?.department}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: `${roleColor}22`, color: roleColor }}>
                  <Shield size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  {profile?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Read-only fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Full Name', value: profile?.full_name },
              { label: 'Email', value: profile?.email },
              { label: 'Employee ID', value: profile?.employee_id },
              { label: 'Department', value: profile?.department },
              { label: 'Education Type', value: profile?.education_type },
              { label: 'Short Name', value: profile?.short_name || '—' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: 500 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {/* Editable fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prof-designation">Designation</label>
              <input id="prof-designation" className="input" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Assistant Professor" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="prof-phone">Phone Number</label>
              <input id="prof-phone" className="input" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="+91 9876543210" />
            </div>
          </div>

          <button id="save-profile-btn" className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 16 }}>
            {saving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />} Save Changes
          </button>
        </div>

        {/* Change Password */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Lock size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Change Password</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="pwd-old">Current Password</label>
              <div style={{ position: 'relative' }}>
                <input id="pwd-old" type={showPwd ? 'text' : 'password'} className="input" style={{ paddingRight: 40 }}
                  value={pwdForm.old_password} onChange={e => setPwdForm(f => ({ ...f, old_password: e.target.value }))} />
                <button type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  onClick={() => setShowPwd(s => !s)}>{showPwd ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="pwd-new">New Password</label>
                <input id="pwd-new" type="password" className="input" placeholder="Min 8 characters"
                  value={pwdForm.new_password} onChange={e => setPwdForm(f => ({ ...f, new_password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pwd-confirm">Confirm New Password</label>
                <input id="pwd-confirm" type="password" className="input"
                  value={pwdForm.confirm} onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} />
              </div>
            </div>
          </div>

          <button id="change-pwd-btn" className="btn btn-primary" onClick={handlePwdChange} disabled={pwdSaving} style={{ marginTop: 16 }}>
            {pwdSaving ? <Loader2 size={14} className="spinner" /> : <Lock size={14} />} Change Password
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
