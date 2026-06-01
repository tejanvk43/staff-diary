import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { GraduationCap, IdCard, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await login(data.employee_id.trim().toUpperCase(), data.password);
      toast.success(`Welcome, ${user.full_name.split(' ')[0]}!`);
      navigate(user.is_first_login ? '/change-password' : '/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top college header bar */}
      <div style={{
        background: '#111827',
        padding: '14px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderBottom: '3px solid #374151',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8, flexShrink: 0,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GraduationCap size={24} color="#fff" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: '#fff', lineHeight: 1.2 }}>
            Usharama College of Engineering and Technology
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
            Autonomous · Staff Activity Portal
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Card */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{
              background: '#111827',
              padding: '24px 28px 20px',
              textAlign: 'center',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 52, height: 52, borderRadius: 12,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                marginBottom: 12,
              }}>
                <Lock size={24} color="#fff" />
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                Staff Sign In
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>
                Use your Employee ID to access the portal
              </p>
            </div>

            {/* Form */}
            <div style={{ padding: '28px' }}>
              <form onSubmit={handleSubmit(onSubmit)}>
                {errorMsg && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#991b1b',
                    fontSize: '0.82rem',
                    marginBottom: 16,
                    lineHeight: 1.4
                  }}>
                    ⚠️ {errorMsg}
                  </div>
                )}
                {/* Employee ID */}
                <div className="form-group">
                  <label className="form-label" htmlFor="login-employee-id">Employee ID</label>
                  <div style={{ position: 'relative' }}>
                    <IdCard size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      id="login-employee-id"
                      type="text"
                      className={`input ${errors.employee_id ? 'input-error' : ''}`}
                      style={{ paddingLeft: 38, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', fontSize: '0.95rem' }}
                      placeholder="e.g. EMP12345"
                      autoComplete="username"
                      autoCapitalize="characters"
                      {...register('employee_id', {
                        required: 'Employee ID is required',
                        minLength: { value: 3, message: 'Employee ID must be at least 3 characters' },
                      })}
                    />
                  </div>
                  {errors.employee_id && <p style={{ color: '#991b1b', fontSize: '0.75rem', marginTop: 4 }}>{errors.employee_id.message}</p>}
                </div>

                {/* Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      id="login-password"
                      type={showPwd ? 'text' : 'password'}
                      className={`input ${errors.password ? 'input-error' : ''}`}
                      style={{ paddingLeft: 38, paddingRight: 40 }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...register('password', { required: 'Password is required' })}
                    />
                    <button
                      type="button"
                      id="toggle-password-btn"
                      style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}
                      onClick={() => setShowPwd(p => !p)}
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p style={{ color: '#991b1b', fontSize: '0.75rem', marginTop: 4 }}>{errors.password.message}</p>}
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.9rem', marginTop: 8, borderRadius: 10 }}
                >
                  {loading ? (
                    <div className="spinner" style={{ width: 17, height: 17, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                  ) : (
                    <><span>Sign In</span><ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              {/* Footer note */}
              <p style={{ textAlign: 'center', marginTop: 20, color: '#9ca3af', fontSize: '0.78rem', lineHeight: 1.5 }}>
                Contact the administrator if you have trouble accessing your account.
              </p>
            </div>
          </div>

          {/* Bottom copyright */}
          <p style={{ textAlign: 'center', marginTop: 20, color: '#9ca3af', fontSize: '0.72rem', letterSpacing: '0.02em' }}>
            © {new Date().getFullYear()} Usharama College of Engineering and Technology
          </p>
        </div>
      </div>
    </div>
  );
}
