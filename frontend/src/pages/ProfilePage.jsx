import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2, User, Shield, Lock, Eye, EyeOff, Landmark, X } from 'lucide-react';
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

  // Bank Details change request state
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankRequestForm, setBankRequestForm] = useState({
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    reason: '',
  });
  const [bankRequestSaving, setBankRequestSaving] = useState(false);

  const fetchProfile = () => {
    api.get('/api/auth/me').then(r => {
      setProfile(r.data.data);
      setForm({
        phone_number:          r.data.data.phone_number || '',
        designation:           r.data.data.designation  || '',
        email:                 r.data.data.email        || '',
        highest_qualification: r.data.data.highest_qualification || '',
      });
    }).catch(() => toast.error('Failed to load profile.'))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!form.email?.trim()) {
      toast.error('Email is required.');
      return;
    }
    if (!form.highest_qualification?.trim()) {
      toast.error('Highest qualification is required.');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/api/admin/users/${user?.employee_id}`, {
        ...profile,
        phone_number:          form.phone_number,
        designation:           form.designation,
        email:                 form.email,
        highest_qualification: form.highest_qualification,
      });
      toast.success('Profile updated.');
      fetchProfile();
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

  const handleBankRequestSubmit = async (e) => {
    e.preventDefault();
    if (!bankRequestForm.reason.trim()) {
      toast.error('Reason for change is required.');
      return;
    }
    setBankRequestSaving(true);
    try {
      await api.post('/api/admin/users/bank-details/request', {
        bank_name: bankRequestForm.bank_name || null,
        bank_account_no: bankRequestForm.bank_account_no || null,
        bank_ifsc: bankRequestForm.bank_ifsc || null,
        reason: bankRequestForm.reason,
      });
      toast.success('Bank details change request submitted to Admin!');
      setShowBankModal(false);
      setBankRequestForm({ bank_name: '', bank_account_no: '', bank_ifsc: '', reason: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setBankRequestSaving(false);
    }
  };

  const openBankRequestModal = () => {
    setBankRequestForm({
      bank_name:       profile?.bank_name || '',
      bank_account_no: profile?.bank_account_no || '',
      bank_ifsc:       profile?.bank_ifsc || '',
      reason:          '',
    });
    setShowBankModal(true);
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

          {/* Read-only details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Full Name', value: profile?.full_name },
              { label: 'Employee ID', value: profile?.employee_id },
              { label: 'Department', value: profile?.department },
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
            <div className="form-group">
              <label className="form-label" htmlFor="prof-email">Email Address</label>
              <input id="prof-email" type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@college.edu" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="prof-qual">Highest Qualification</label>
              <input id="prof-qual" className="input" value={form.highest_qualification} onChange={e => setForm(f => ({ ...f, highest_qualification: e.target.value }))} placeholder="e.g. Ph.D / M.Tech" />
            </div>
          </div>

          <button id="save-profile-btn" className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 16 }}>
            {saving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />} Save Changes
          </button>
        </div>

        {/* Bank Account Details Card */}
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Landmark size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Bank Account Details</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Bank Name', value: profile?.bank_name || 'Not Filled' },
              { label: 'Account Number', value: profile?.bank_account_no || 'Not Filled' },
              { label: 'IFSC Code', value: profile?.bank_ifsc || 'Not Filled' },
              { label: 'Status', value: profile?.bank_details_submitted ? 'Submitted & Locked' : 'Pending' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: '0.9rem', color: f.value.includes('Not Filled') || f.value === 'Pending' ? 'var(--color-warning)' : 'var(--color-text)', fontWeight: 600 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {profile?.bank_details_submitted && (
            <button
              id="request-bank-change-btn"
              className="btn btn-secondary"
              onClick={openBankRequestModal}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Request Change to Admin
            </button>
          )}
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

      {/* Bank Change Request Modal */}
      {showBankModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBankModal(false)}>
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700 }}>Request Bank Details Modification</h3>
              <button
                className="btn-icon"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
                onClick={() => setShowBankModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleBankRequestSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="req-bank-name">New Bank Name</label>
                  <input
                    id="req-bank-name"
                    className="input"
                    value={bankRequestForm.bank_name}
                    onChange={e => setBankRequestForm(f => ({ ...f, bank_name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="req-bank-acc">New Bank Account Number</label>
                  <input
                    id="req-bank-acc"
                    className="input"
                    value={bankRequestForm.bank_account_no}
                    onChange={e => setBankRequestForm(f => ({ ...f, bank_account_no: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="req-bank-ifsc">New IFSC Code</label>
                  <input
                    id="req-bank-ifsc"
                    className="input"
                    value={bankRequestForm.bank_ifsc}
                    onChange={e => setBankRequestForm(f => ({ ...f, bank_ifsc: e.target.value }))}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="req-reason">Reason for Change *</label>
                  <textarea
                    id="req-reason"
                    className="input"
                    rows={3}
                    placeholder="Provide a reason why you need to update your bank account details..."
                    value={bankRequestForm.reason}
                    onChange={e => setBankRequestForm(f => ({ ...f, reason: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBankModal(false)}>Cancel</button>
                <button id="submit-bank-req-btn" type="submit" className="btn btn-primary" disabled={bankRequestSaving}>
                  {bankRequestSaving && <Loader2 size={14} className="spinner" />} Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
