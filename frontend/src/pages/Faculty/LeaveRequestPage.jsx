import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Calendar, Send, Loader2, Briefcase, CheckCircle, LayoutGrid } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import { format, addDays } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

const today = format(new Date(), 'yyyy-MM-dd');
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

      {/* Reason — required */}
      <div className="form-group">
        <label className="form-label" htmlFor="leave-reason">
          Reason *
        </label>
        <textarea
          id="leave-reason"
          className={`input ${errors.reason ? 'input-error' : ''}`}
          rows={3}
          placeholder="Briefly describe the reason for your leave…"
          {...register('reason', { required: 'Reason is required', minLength: { value: 5, message: 'Please provide at least 5 characters' } })}
          style={{ resize: 'vertical' }}
        />
        {errors.reason && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.reason.message}</p>}
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

function AdjustmentForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [allMySlots, setAllMySlots] = useState([]);
  const [dayFilteredSlots, setDayFilteredSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const { user } = useAuth();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      adjustment_date: '',
      day: '',
      from_time: '',
      to_time: '',
      subject_name: '',
      section: '',
      assigned_to_employee_id: '',
      is_mutual: false,
      mutual_date: '',
      mutual_day: '',
      mutual_from_time: '',
      mutual_to_time: '',
      mutual_subject_name: '',
      mutual_section: ''
    }
  });

  const selectedDate = watch('adjustment_date');
  const isMutual = watch('is_mutual');
  const mutualDate = watch('mutual_date');

  useEffect(() => {
    if (mutualDate) {
      const dateObj = new Date(mutualDate);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setValue('mutual_day', daysOfWeek[dateObj.getDay()]);
    } else {
      setValue('mutual_day', '');
    }
  }, [mutualDate, setValue]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [facRes, ttRes] = await Promise.all([
          api.get('/api/admin/faculty'),
          api.get('/api/timetable/mine')
        ]);
        const otherFaculties = (facRes.data.data || []).filter(f => f.employee_id !== user?.employee_id);
        setFaculties(otherFaculties);
        setAllMySlots(ttRes.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedDate) {
      const dateObj = new Date(selectedDate);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = daysOfWeek[dateObj.getDay()];
      setValue('day', dayName);

      const filtered = allMySlots.filter(s => s.day.toLowerCase() === dayName.toLowerCase());
      setDayFilteredSlots(filtered);
      setSelectedSlotId('');
      
      setValue('from_time', '');
      setValue('to_time', '');
      setValue('subject_name', '');
      setValue('section', '');
    } else {
      setValue('day', '');
      setDayFilteredSlots([]);
      setSelectedSlotId('');
    }
  }, [selectedDate, allMySlots, setValue]);

  const handleSlotSelect = (e) => {
    const slotId = e.target.value;
    setSelectedSlotId(slotId);

    if (slotId === 'custom' || !slotId) {
      setValue('from_time', '');
      setValue('to_time', '');
      setValue('subject_name', '');
      setValue('section', '');
    } else {
      const slot = dayFilteredSlots.find(s => String(s.id) === String(slotId));
      if (slot) {
        setValue('from_time', slot.from_time ? slot.from_time.slice(0, 5) : '');
        setValue('to_time', slot.to_time ? slot.to_time.slice(0, 5) : '');
        setValue('subject_name', slot.short_name || '');
        setValue('section', slot.section || '');
      }
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/api/requests/adjustment', data);
      toast.success('Class adjustment request submitted!');
      reset();
      setSelectedSlotId('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit class adjustment.');
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
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={28} style={{ color: '#f59e0b' }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Class Adjustment Submitted!</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Your request is pending HOD/Admin review. You can track it in My Requests.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="adj-date">Date *</label>
          <input
            id="adj-date"
            type="date"
            className={`input ${errors.adjustment_date ? 'input-error' : ''}`}
            min={today}
            {...register('adjustment_date', { required: 'Date is required' })}
          />
          {errors.adjustment_date && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.adjustment_date.message}</p>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="adj-day">Day of Week</label>
          <input
            id="adj-day"
            type="text"
            className="input"
            readOnly
            placeholder="Auto-calculated"
            {...register('day')}
            style={{ background: 'var(--color-surface-2)', cursor: 'not-allowed' }}
          />
        </div>
      </div>

      {selectedDate && (
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label" htmlFor="adj-slot">Select Class Slot *</label>
          <select id="adj-slot" className="input" value={selectedSlotId} onChange={handleSlotSelect}>
            <option value="">-- Choose one of your classes on this day --</option>
            {dayFilteredSlots.map(s => (
              <option key={s.id} value={s.id}>
                {s.from_time?.slice(0, 5)} - {s.to_time?.slice(0, 5)} | {s.short_name} ({s.section || 'No Sec'})
              </option>
            ))}
            <option value="custom">✍️ Enter Custom Class details manually</option>
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="adj-from">From Time *</label>
          <input
            id="adj-from"
            type="time"
            className={`input ${errors.from_time ? 'input-error' : ''}`}
            {...register('from_time', { required: 'Start time is required' })}
          />
          {errors.from_time && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.from_time.message}</p>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="adj-to">To Time *</label>
          <input
            id="adj-to"
            type="time"
            className={`input ${errors.to_time ? 'input-error' : ''}`}
            {...register('to_time', { required: 'End time is required' })}
          />
          {errors.to_time && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.to_time.message}</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="adj-subject">Subject/Class Name *</label>
          <input
            id="adj-subject"
            type="text"
            placeholder="e.g. Compiler Design"
            className={`input ${errors.subject_name ? 'input-error' : ''}`}
            {...register('subject_name', { required: 'Subject name is required' })}
          />
          {errors.subject_name && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.subject_name.message}</p>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="adj-section">Section (Optional)</label>
          <input
            id="adj-section"
            type="text"
            placeholder="e.g. A, B, Sec-1"
            className="input"
            {...register('section')}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label" htmlFor="adj-assign">Assign To Faculty *</label>
        <select
          id="adj-assign"
          className={`input ${errors.assigned_to_employee_id ? 'input-error' : ''}`}
          {...register('assigned_to_employee_id', { required: 'Please select a faculty member' })}
        >
          <option value="">-- Select Faculty member --</option>
          <optgroup label={`${user?.department} Dept Faculties`}>
            {faculties.filter(f => f.department === user?.department).map(f => (
              <option key={f.employee_id} value={f.employee_id}>
                {f.full_name} ({f.short_name || f.employee_id})
              </option>
            ))}
          </optgroup>
          <optgroup label="Other Department Faculties">
            {faculties.filter(f => f.department !== user?.department).map(f => (
              <option key={f.employee_id} value={f.employee_id}>
                {f.full_name} ({f.department} - {f.short_name || f.employee_id})
              </option>
            ))}
          </optgroup>
        </select>
        {errors.assigned_to_employee_id && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.assigned_to_employee_id.message}</p>}
      </div>

      {/* Mutual Swap Checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <input
          id="is-mutual"
          type="checkbox"
          {...register('is_mutual')}
          style={{ width: 18, height: 18, cursor: 'pointer' }}
        />
        <label htmlFor="is-mutual" style={{ fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', margin: 0 }}>
          Mutual Class Adjustment (Swap slots - I will take a class of theirs in return)
        </label>
      </div>

      {isMutual && (
        <div style={{
          background: 'var(--color-surface-2)', padding: 18, borderRadius: 10,
          border: '1px solid var(--color-border)', marginBottom: 20
        }}>
          <h4 style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b' }}>
            🔄 Mutual Swap Slot (Class I will take in return)
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="mut-date">Date *</label>
              <input
                id="mut-date"
                type="date"
                className={`input ${errors.mutual_date ? 'input-error' : ''}`}
                min={today}
                {...register('mutual_date', { required: isMutual ? 'Mutual date is required' : false })}
              />
              {errors.mutual_date && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.mutual_date.message}</p>}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="mut-day">Day of Week</label>
              <input
                id="mut-day"
                type="text"
                className="input"
                readOnly
                placeholder="Auto-calculated"
                {...register('mutual_day')}
                style={{ background: 'var(--color-surface-3)', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="mut-from">From Time *</label>
              <input
                id="mut-from"
                type="time"
                className={`input ${errors.mutual_from_time ? 'input-error' : ''}`}
                {...register('mutual_from_time', { required: isMutual ? 'Mutual start time is required' : false })}
              />
              {errors.mutual_from_time && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.mutual_from_time.message}</p>}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="mut-to">To Time *</label>
              <input
                id="mut-to"
                type="time"
                className={`input ${errors.mutual_to_time ? 'input-error' : ''}`}
                {...register('mutual_to_time', { required: isMutual ? 'Mutual end time is required' : false })}
              />
              {errors.mutual_to_time && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.mutual_to_time.message}</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="mut-subject">Subject/Class Name *</label>
              <input
                id="mut-subject"
                type="text"
                placeholder="e.g. Data Structures"
                className={`input ${errors.mutual_subject_name ? 'input-error' : ''}`}
                {...register('mutual_subject_name', { required: isMutual ? 'Mutual subject name is required' : false })}
              />
              {errors.mutual_subject_name && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{errors.mutual_subject_name.message}</p>}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="mut-section">Section</label>
              <input
                id="mut-section"
                type="text"
                placeholder="e.g. A"
                className="input"
                {...register('mutual_section')}
              />
            </div>
          </div>
        </div>
      )}

      <button
        id="adj-submit-btn"
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4 }}
      >
        {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
        Submit Class Adjustment Request
      </button>
    </form>
  );
}

// ─── Main merged page ─────────────────────────────────────────────────────────
export default function LeaveRequestPage() {
  const [tab, setTab] = useState('leave');

  const TABS = [
    { key: 'leave',      label: 'Leave Request',     icon: Calendar,   color: '#10b981', desc: 'Apply for leave on a future date' },
    { key: 'od',         label: 'On Duty (OD)',      icon: Briefcase,  color: '#6366f1', desc: 'Apply for on-duty for events, seminars, etc.' },
    { key: 'adjustment', label: 'Class Adjustment',  icon: LayoutGrid, color: '#f59e0b', desc: 'Assign your class slot to another faculty' },
  ];

  const active = TABS.find(t => t.key === tab);

  return (
    <AppLayout title="Leave &amp; OD Request">
      <div style={{ maxWidth: 560 }}>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            Leave, OD &amp; Class Adjustments
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Requests must be submitted at least one day in advance.
          </p>
        </div>

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

        <div className="card" style={{ padding: 28 }}>
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

          {tab === 'leave' ? <LeaveForm /> : tab === 'od' ? <ODForm /> : <AdjustmentForm />}
        </div>
      </div>
    </AppLayout>
  );
}
