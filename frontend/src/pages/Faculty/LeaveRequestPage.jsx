import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Calendar, Send, Loader2, Briefcase, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import { format, addDays } from 'date-fns';

const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

// ─── Leave Form ───────────────────────────────────────────────────────────────
function LeaveForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/api/requests/leave', data);
      toast.success('Leave request submitted!');
      reset();
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px', gap: 14, textAlign: 'center',
      }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={28} style={{ color: '#10b981' }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Leave Request Submitted!</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Your request is pending approval. You can track it in My Requests.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Date + Session row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="leave-date">Date *</label>
          <input
            id="leave-date"
            type="date"
            className={`input ${errors.leave_date ? 'input-error' : ''}`}
            min={tomorrow}
            {...register('leave_date', { required: 'Date is required' })}
          />
          {errors.leave_date && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.leave_date.message}</p>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="leave-session">Session *</label>
          <select id="leave-session" className={`input ${errors.session_type ? 'input-error' : ''}`} {...register('session_type', { required: 'Required' })}>
            <option value="">Select session</option>
            <option value="FN">Forenoon (FN)</option>
            <option value="AN">Afternoon (AN)</option>
            <option value="Full Day">Full Day</option>
          </select>
          {errors.session_type && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.session_type.message}</p>}
        </div>
      </div>

      {/* Reason — optional */}
      <div className="form-group">
        <label className="form-label" htmlFor="leave-reason">
          Reason <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: '0.75rem' }}>(optional)</span>
        </label>
        <textarea
          id="leave-reason"
          className="input"
          rows={3}
          placeholder="Briefly describe the reason for your leave…"
          {...register('reason')}
          style={{ resize: 'vertical' }}
        />
      </div>

      <button
        id="leave-submit-btn"
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4 }}
      >
        {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
        Submit Leave Request
      </button>
    </form>
  );
}

// ─── OD Form ──────────────────────────────────────────────────────────────────
function ODForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/api/requests/od', data);
      toast.success('On Duty request submitted!');
      reset();
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit OD request.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px', gap: 14, textAlign: 'center',
      }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={28} style={{ color: '#6366f1' }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>OD Request Submitted!</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Your request is pending approval. You can track it in My Requests.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Date + Session row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="od-date">Date *</label>
          <input
            id="od-date"
            type="date"
            className={`input ${errors.od_date ? 'input-error' : ''}`}
            min={tomorrow}
            {...register('od_date', { required: 'Date is required' })}
          />
          {errors.od_date && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.od_date.message}</p>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="od-session">Session *</label>
          <select id="od-session" className={`input ${errors.session_type ? 'input-error' : ''}`} {...register('session_type', { required: 'Required' })}>
            <option value="">Select session</option>
            <option value="FN">Forenoon (FN)</option>
            <option value="AN">Afternoon (AN)</option>
            <option value="Full Day">Full Day</option>
          </select>
          {errors.session_type && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.session_type.message}</p>}
        </div>
      </div>

      {/* Place */}
      <div className="form-group">
        <label className="form-label" htmlFor="od-place">Place / Institution *</label>
        <input
          id="od-place"
          className={`input ${errors.place ? 'input-error' : ''}`}
          placeholder="e.g. Anna University, Chennai"
          {...register('place', { required: 'Place is required' })}
        />
        {errors.place && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.place.message}</p>}
      </div>

      {/* Purpose */}
      <div className="form-group">
        <label className="form-label" htmlFor="od-purpose">Purpose *</label>
        <textarea
          id="od-purpose"
          className={`input ${errors.purpose ? 'input-error' : ''}`}
          rows={3}
          placeholder="Describe the purpose of the on-duty (workshop, seminar, inspection…)"
          {...register('purpose', { required: 'Purpose is required', minLength: { value: 10, message: 'Min 10 characters' } })}
          style={{ resize: 'vertical' }}
        />
        {errors.purpose && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.purpose.message}</p>}
      </div>

      <button
        id="od-submit-btn"
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4 }}
      >
        {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
        Submit OD Request
      </button>
    </form>
  );
}

// ─── Main merged page ─────────────────────────────────────────────────────────
export default function LeaveRequestPage() {
  const [tab, setTab] = useState('leave');

  const TABS = [
    { key: 'leave', label: 'Leave Request', icon: Calendar,  color: '#10b981', desc: 'Apply for leave on a future date' },
    { key: 'od',    label: 'On Duty (OD)',  icon: Briefcase, color: '#6366f1', desc: 'Apply for on-duty for events, seminars, etc.' },
  ];

  const active = TABS.find(t => t.key === tab);

  return (
    <AppLayout title="Leave & OD Request">
      <div style={{ maxWidth: 560 }}>

        {/* Page heading */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            Leave &amp; On Duty Requests
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Requests must be submitted at least one day in advance.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 24,
          background: 'var(--color-surface-2)', borderRadius: 12,
          padding: 4, border: '1px solid var(--color-border)',
        }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                id={`tab-${t.key}`}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.87rem',
                  background: isActive ? 'var(--color-surface)' : 'transparent',
                  color: isActive ? t.color : 'var(--color-text-muted)',
                  boxShadow: isActive ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.18s',
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Card with active form */}
        <div className="card" style={{ padding: 28 }}>
          {/* Sub-heading inside card */}
          <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: `${active.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <active.icon size={17} style={{ color: active.color }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.97rem' }}>{active.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{active.desc}</div>
              </div>
            </div>
          </div>

          {tab === 'leave' ? <LeaveForm /> : <ODForm />}
        </div>
      </div>
    </AppLayout>
  );
}
