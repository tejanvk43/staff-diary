import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2, Settings, AlertTriangle, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

const CONFIG_META = {
  diary_start_time:       { label: 'Diary Start Time',           type: 'time',   desc: 'Earliest time faculty can log diary entries' },
  diary_end_time:         { label: 'Diary End Time',             type: 'time',   desc: 'Latest time faculty can log diary entries' },
  theory_max_faculty:     { label: 'Max Faculty (Theory)',       type: 'number', desc: 'Max faculty allowed per theory slot in same room' },
  lab_max_faculty:        { label: 'Max Faculty (Lab)',          type: 'number', desc: 'Max faculty allowed per lab slot in same room' },
  past_edit_window_hours: { label: 'Edit Window (Hours)',        type: 'number', desc: 'Hours granted after approval to edit a past diary entry' },
  leave_alert_threshold:  { label: 'Leave Alert Threshold',      type: 'number', desc: 'Notify admin when a staff member applies for this many leave days in a month', group: 'alerts' },
  od_alert_threshold:     { label: 'OD Alert Threshold',         type: 'number', desc: 'Notify admin when a staff member applies for this many OD days in a month', group: 'alerts' },
};

export default function SystemConfigPage() {
  const [config, setConfig]   = useState({});
  const [values, setValues]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/config');
      setConfig(res.data.data);
      const vals = {};
      Object.entries(res.data.data).forEach(([k, v]) => { vals[k] = v.config_value; });
      setValues(vals);
    } catch (_) { toast.error('Failed to load config.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/config', values);
      toast.success('Configuration saved.');
      load();
    } catch (err) {
      toast.error('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetTimetable = async () => {
    setResetLoading(true);
    const toastId = toast.loading('Resetting entire timetable...');
    try {
      const res = await api.delete('/api/timetable/reset-all');
      toast.success(res.data.message || 'Timetable reset successfully!', { id: toastId });
      setShowResetModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset timetable.', { id: toastId });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AppLayout title="System Configuration">
      <div style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>System Settings</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Configure global parameters for the staff diary system.
          </p>
        </div>

        {loading ? (
          <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
        ) : (
          <>
            <div className="card" style={{ padding: 28 }}>

              {/* ── General Settings ── */}
              <h4 style={{ fontWeight: 700, marginBottom: 18, fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                General Settings
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {Object.entries(CONFIG_META).filter(([, m]) => !m.group).map(([key, meta]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="form-label" htmlFor={`config-${key}`} style={{ margin: 0, lineHeight: 1.4 }}>
                        {meta.label}
                      </label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{key}</span>
                    </div>
                    <input
                      id={`config-${key}`}
                      type={meta.type}
                      className="input"
                      value={values[key] || ''}
                      onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                      min={meta.type === 'number' ? 1 : undefined}
                      step={meta.type === 'number' ? 1 : undefined}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{meta.desc}</p>
                  </div>
                ))}
              </div>

              {/* ── Alert Thresholds ── */}
              <div className="divider" style={{ margin: '28px 0 20px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                  Alert Thresholds
                </h4>
                <span style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.15)', color: '#d97706', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                  ⚠️ Admin gets notified when exceeded
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {Object.entries(CONFIG_META).filter(([, m]) => m.group === 'alerts').map(([key, meta]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="form-label" htmlFor={`config-${key}`} style={{ margin: 0, lineHeight: 1.4 }}>
                        {meta.label}
                      </label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{key}</span>
                    </div>
                    <input
                      id={`config-${key}`}
                      type="number"
                      className="input"
                      value={values[key] || ''}
                      onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                      min={1}
                      step={1}
                      style={{ maxWidth: 160 }}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{meta.desc}</p>
                  </div>
                ))}
              </div>

              <div className="divider" style={{ marginTop: 24 }} />

              <button
                id="save-config-btn"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ marginTop: 8 }}
              >
                {saving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />}
                Save Configuration
              </button>
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ padding: 28, marginTop: 24, border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                  Danger Zone
                </h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                Permanently delete all timetables (including both individual faculty timetables and class/block timetables). <strong>This action is irreversible.</strong>
              </p>
              <button
                id="reset-timetable-btn"
                className="btn"
                onClick={() => setShowResetModal(true)}
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', width: 'fit-content' }}
              >
                <Trash2 size={14} /> Reset Entire Timetable
              </button>
            </div>
          </>
        )}
      </div>

      {showResetModal && (
        <ResetConfirmModal
          loading={resetLoading}
          onConfirm={handleResetTimetable}
          onClose={() => setShowResetModal(false)}
        />
      )}
    </AppLayout>
  );
}

function ResetConfirmModal({ loading, onConfirm, onClose }) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText.trim() === 'RESET';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontWeight: 700, color: '#ef4444' }}>Reset Entire Timetable</h3>
          </div>
          <button
            className="btn-icon"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            onClick={onClose}
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        {/* Warning Banner */}
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>
            ⚠️ This action will <strong style={{ color: '#ef4444' }}>permanently delete ALL timetable records</strong> (faculty schedules and block timetables) across all departments. This cannot be undone.
          </p>
        </div>

        {/* Confirmation Input */}
        <div style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="reset-confirm-input" style={{ marginBottom: 6, display: 'block' }}>
            Type <strong style={{ color: '#ef4444', fontFamily: 'monospace' }}>RESET</strong> to confirm:
          </label>
          <input
            id="reset-confirm-input"
            className="input"
            type="text"
            placeholder="Type RESET here..."
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            disabled={loading}
            style={{ borderColor: isConfirmed ? '#ef4444' : undefined }}
            autoFocus
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            id="confirm-reset-timetable-btn"
            className="btn"
            style={{
              background: isConfirmed ? '#ef4444' : 'rgba(239,68,68,0.3)',
              color: '#fff', border: 'none',
              cursor: isConfirmed && !loading ? 'pointer' : 'not-allowed',
              opacity: isConfirmed ? 1 : 0.6
            }}
            onClick={onConfirm}
            disabled={!isConfirmed || loading}
          >
            {loading ? <Loader2 size={14} className="spinner" /> : <Trash2 size={14} />}
            {loading ? 'Resetting...' : 'Reset All Timetable'}
          </button>
        </div>
      </div>
    </div>
  );
}
