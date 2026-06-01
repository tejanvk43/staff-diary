import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2, Send } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import { format, addDays } from 'date-fns';

const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

export default function ODRequestPage() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/api/requests/od', data);
      toast.success('On Duty request submitted!');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit OD request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="On Duty Request">
      <div style={{ maxWidth: 540 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Apply for On Duty</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Submit an OD request for future dates (workshops, seminars, inspections, etc.)
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label" htmlFor="od-date">OD Date *</label>
              <input
                id="od-date"
                type="date"
                className={`input ${errors.od_date ? 'input-error' : ''}`}
                min={tomorrow}
                {...register('od_date', { required: 'Date is required' })}
              />
              {errors.od_date && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.od_date.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="od-session">Session *</label>
              <select id="od-session" className="input" {...register('session_type', { required: 'Required' })}>
                <option value="">Select session</option>
                <option value="FN">Forenoon (FN)</option>
                <option value="AN">Afternoon (AN)</option>
                <option value="Full Day">Full Day</option>
              </select>
              {errors.session_type && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.session_type.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="od-place">Place / Institution *</label>
              <input
                id="od-place"
                className={`input ${errors.place ? 'input-error' : ''}`}
                placeholder="e.g. Anna University, Chennai"
                {...register('place', { required: 'Place is required' })}
              />
              {errors.place && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.place.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="od-purpose">Purpose *</label>
              <textarea
                id="od-purpose"
                className={`input ${errors.purpose ? 'input-error' : ''}`}
                rows={4}
                placeholder="Describe the purpose of the on-duty..."
                {...register('purpose', { required: 'Purpose is required', minLength: { value: 10, message: 'Min 10 characters' } })}
              />
              {errors.purpose && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.purpose.message}</p>}
            </div>

            <button
              id="od-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: 12 }}
            >
              {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
              Submit OD Request
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
