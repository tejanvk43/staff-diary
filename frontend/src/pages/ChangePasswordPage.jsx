import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

export default function ChangePasswordPage() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [showOld, setShowOld]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const newPwd = watch('new_password');

  const onSubmit = async (data) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        old_password: data.old_password,
        new_password: data.new_password,
      });
      toast.success('Password changed successfully!');
      updateUser({ is_first_login: false });
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
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
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(245,158,11,0.3)',
          }}>
            <ShieldCheck size={32} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
            Set Your Password
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            You must change your temporary password before continuing.
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Old Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="old-password">Current (Temporary) Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="old-password"
                  type={showOld ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: 38, paddingRight: 38 }}
                  placeholder="Temporary password"
                  {...register('old_password', { required: 'Current password required' })}
                />
                <button type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  onClick={() => setShowOld(p => !p)}>
                  {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.old_password && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.old_password.message}</p>}
            </div>

            {/* New Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: 38, paddingRight: 38 }}
                  placeholder="Min 8 characters"
                  {...register('new_password', {
                    required: 'New password required',
                    minLength: { value: 8, message: 'Min 8 characters' },
                  })}
                />
                <button type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  onClick={() => setShowNew(p => !p)}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.new_password && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.new_password.message}</p>}
            </div>

            {/* Confirm */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                className="input"
                placeholder="Repeat new password"
                {...register('confirm_password', {
                  required: 'Please confirm your password',
                  validate: v => v === newPwd || 'Passwords do not match',
                })}
              />
              {errors.confirm_password && <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: 4 }}>{errors.confirm_password.message}</p>}
            </div>

            <button
              id="change-password-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}
            >
              {loading ? <div className="spinner" style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }} /> : <><span>Set Password</span><ArrowRight size={16} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
