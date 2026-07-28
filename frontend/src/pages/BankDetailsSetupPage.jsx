import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Landmark, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

export default function BankDetailsSetupPage() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/api/admin/users/bank-details', {
        bank_name: data.bank_name,
        bank_account_no: data.bank_account_no,
        bank_ifsc: data.bank_ifsc,
        bank_holder_name: data.bank_holder_name,
      });
      toast.success('Bank details saved successfully!');
      updateUser({ bank_details_submitted: true });
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save bank details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
          }}>
            <Landmark size={32} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
            Bank Account Details
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Please submit your bank details to access your dashboard.
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600 }}>
            ⚠️ This is a one-time entry. Future modifications require admin request.
          </span>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Bank Holder Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="bank-holder-name">Staff Name as in Bank *</label>
              <input
                id="bank-holder-name"
                type="text"
                className="input"
                placeholder="e.g. JOHN DOE"
                {...register('bank_holder_name', { required: 'Staff name as in bank is required' })}
              />
              {errors.bank_holder_name && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.bank_holder_name.message}</p>}
            </div>

            {/* Bank Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="bank-name">Bank Name *</label>
              <input
                id="bank-name"
                type="text"
                className="input"
                placeholder="e.g. State Bank of India"
                {...register('bank_name', { required: 'Bank name is required' })}
              />
              {errors.bank_name && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.bank_name.message}</p>}
            </div>

            {/* Bank Account Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="bank-account-no">Bank Account Number *</label>
              <input
                id="bank-account-no"
                type="text"
                className="input"
                placeholder="e.g. 100023456789"
                {...register('bank_account_no', { 
                  required: 'Account number is required',
                  pattern: { value: /^\d+$/, message: 'Must be numbers only' }
                })}
              />
              {errors.bank_account_no && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.bank_account_no.message}</p>}
            </div>

            {/* IFSC Code */}
            <div className="form-group">
              <label className="form-label" htmlFor="bank-ifsc">IFSC Code *</label>
              <input
                id="bank-ifsc"
                type="text"
                className="input"
                placeholder="e.g. SBIN0001234"
                style={{ textTransform: 'uppercase' }}
                {...register('bank_ifsc', { 
                  required: 'IFSC Code is required',
                  pattern: { value: /^[A-Z]{4}0[A-Z0-9]{6}$/i, message: 'Invalid IFSC format (e.g. SBIN0001234)' }
                })}
              />
              {errors.bank_ifsc && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.bank_ifsc.message}</p>}
            </div>

            <button
              id="submit-bank-details-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 16 }}
            >
              {loading ? (
                <div className="spinner" style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} />
              ) : (
                <><span>Save Details</span><ArrowRight size={16} /></>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                localStorage.setItem('bank_details_postponed', 'true');
                navigate('/dashboard');
              }}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 12 }}
            >
              Will Enter Later
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
