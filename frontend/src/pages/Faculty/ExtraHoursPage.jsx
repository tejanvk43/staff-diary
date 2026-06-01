import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2, Send } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

export default function ExtraHoursPage() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    if (new Date(data.from_time) >= new Date(data.to_time)) {
      toast.error('End time must be after start time.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/requests/extra', data);
      toast.success('Extra hours request submitted!');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Extra Hours">
      <div style={{ maxWidth: 540 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Log Extra Hours</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Record additional work done outside regular working hours.
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="extra-from">From Date & Time *</label>
                <input id="extra-from" type="datetime-local" className="input" {...register('from_time', { required: 'Required' })} />
                {errors.from_time && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.from_time.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="extra-to">To Date & Time *</label>
                <input id="extra-to" type="datetime-local" className="input" {...register('to_time', { required: 'Required' })} />
                {errors.to_time && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.to_time.message}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="extra-purpose">Purpose *</label>
              <input id="extra-purpose" className="input" placeholder="e.g. Lab supervision, Paper valuation" {...register('purpose', { required: 'Purpose is required' })} />
              {errors.purpose && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.purpose.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="extra-desc">Description</label>
              <textarea id="extra-desc" className="input" rows={3} placeholder="Additional details..." {...register('description')} />
            </div>

            <button id="extra-submit-btn" type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
              {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
              Submit Extra Hours
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
