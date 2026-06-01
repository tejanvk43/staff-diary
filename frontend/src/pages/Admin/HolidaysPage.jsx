import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, X, CalendarDays, Briefcase } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

function AddHolidayModal({ onClose, onSave }) {
  const [date, setDate]   = useState('');
  const [name, setName]   = useState('');
  const [desc, setDesc]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date || !name) { toast.error('Date and name are required.'); return; }
    setSaving(true);
    try {
      await onSave({ holiday_date: date, holiday_name: name, description: desc });
      onClose();
      toast.success('Holiday added.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>Add Holiday</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="holiday-date">Date *</label>
          <input id="holiday-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="holiday-name">Holiday Name *</label>
          <input id="holiday-name" className="input" placeholder="e.g. Pongal" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="holiday-desc">Description</label>
          <textarea id="holiday-desc" className="input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-holiday-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />} Add Holiday
          </button>
        </div>
      </div>
    </div>
  );
}

function AddWorkingSundayModal({ onClose, onSave }) {
  const [date, setDate]   = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) { toast.error('Date is required.'); return; }
    
    // Validate Sunday
    const d = new Date(date + 'T00:00:00');
    if (d.getDay() !== 0) {
      toast.error('Selected date must be a Sunday.');
      return;
    }

    setSaving(true);
    try {
      await onSave({ working_date: date, notes });
      onClose();
      toast.success('Working Sunday configured.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to configure working Sunday.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>Add Working Sunday</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="sunday-date">Date (must be Sunday) *</label>
          <input id="sunday-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="sunday-notes">Notes / Reason</label>
          <input id="sunday-notes" className="input" placeholder="e.g. Special exam day or makeup classes" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-sunday-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />} Add Working Sunday
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HolidaysPage() {
  const [activeTab, setActiveTab] = useState('holidays'); // 'holidays' | 'working-sundays'
  const [holidays, setHolidays] = useState([]);
  const [workingSundays, setWorkingSundays] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [showAddSunday, setShowAddSunday] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [holRes, sunRes] = await Promise.all([
        api.get('/api/admin/holidays'),
        api.get('/api/admin/working-sundays')
      ]);
      setHolidays(holRes.data.data || []);
      setWorkingSundays(sunRes.data.data || []);
    } catch (_) { toast.error('Failed to load initial data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAddHoliday = async (data) => {
    await api.post('/api/admin/holidays', data);
    load();
  };

  const handleDeleteHoliday = async (id, name) => {
    if (!confirm(`Remove holiday "${name}"?`)) return;
    try {
      await api.delete(`/api/admin/holidays/${id}`);
      toast.success('Holiday removed.');
      load();
    } catch (_) { toast.error('Failed to remove.'); }
  };

  const handleAddSunday = async (data) => {
    await api.post('/api/admin/working-sundays', data);
    load();
  };

  const handleDeleteSunday = async (id, date) => {
    if (!confirm(`Remove working Sunday override for "${date}"?`)) return;
    try {
      await api.delete(`/api/admin/working-sundays/${id}`);
      toast.success('Working Sunday override removed.');
      load();
    } catch (_) { toast.error('Failed to remove.'); }
  };

  // Grouping helpers
  const holidayMonthGroups = holidays.reduce((acc, h) => {
    const month = format(new Date(h.holiday_date), 'MMMM yyyy');
    if (!acc[month]) acc[month] = [];
    acc[month].push(h);
    return acc;
  }, {});

  const sundayMonthGroups = workingSundays.reduce((acc, s) => {
    const month = format(new Date(s.working_date), 'MMMM yyyy');
    if (!acc[month]) acc[month] = [];
    acc[month].push(s);
    return acc;
  }, {});

  return (
    <AppLayout title="Holiday & Schedule Manager">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            {activeTab === 'holidays' ? 'Academic Holidays' : 'Working Sundays'}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {activeTab === 'holidays'
              ? `${holidays.length} academic holidays configured`
              : `${workingSundays.length} working Sunday overrides configured`
            }
          </p>
        </div>
        {activeTab === 'holidays' ? (
          <button id="add-holiday-btn" className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Holiday
          </button>
        ) : (
          <button id="add-sunday-btn" className="btn btn-primary" onClick={() => setShowAddSunday(true)}>
            <Plus size={14} /> Make Sunday Working
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('holidays')}
          style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === 'holidays' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            color: activeTab === 'holidays' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700, fontSize: '0.875rem', padding: '8px 16px 12px', cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          📅 Academic Holidays
        </button>
        <button
          onClick={() => setActiveTab('working-sundays')}
          style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === 'working-sundays' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            color: activeTab === 'working-sundays' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700, fontSize: '0.875rem', padding: '8px 16px 12px', cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          💼 Working Sundays
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : activeTab === 'holidays' ? (
        // ─── ACADEMIC HOLIDAYS VIEW ───
        holidays.length === 0 ? (
          <div className="empty-state" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
            <CalendarDays size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontWeight: 600 }}>No holidays added yet</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Add First Holiday
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(holidayMonthGroups).map(([month, items]) => (
              <div key={month}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  {month}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(h => (
                    <div key={h.id} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 12, padding: '14px 18px',
                    }}>
                      <div style={{
                        background: 'rgba(99,102,241,0.12)', color: 'var(--color-primary)',
                        borderRadius: 8, padding: '6px 12px', textAlign: 'center', minWidth: 52,
                      }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1 }}>
                          {format(new Date(h.holiday_date), 'd')}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, marginTop: 2 }}>
                          {format(new Date(h.holiday_date), 'EEE')}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{h.holiday_name}</div>
                        {h.description && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 3 }}>{h.description}</div>}
                      </div>
                      <button
                        id={`delete-holiday-${h.id}`}
                        className="btn btn-sm btn-icon"
                        style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
                        onClick={() => handleDeleteHoliday(h.id, h.holiday_name)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // ─── WORKING SUNDAYS VIEW ───
        workingSundays.length === 0 ? (
          <div className="empty-state" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
            <Briefcase size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No working Sunday overrides configured</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: 400, margin: '0 auto 12px', lineHeight: 1.5 }}>
              Sundays are designated as holidays by default. Make a particular Sunday working if you need to hold classes.
            </p>
            <button className="btn btn-primary" onClick={() => setShowAddSunday(true)}>
              <Plus size={14} /> Make Sunday Working
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(sundayMonthGroups).map(([month, items]) => (
              <div key={month}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  {month}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(s => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 12, padding: '14px 18px',
                    }}>
                      <div style={{
                        background: 'rgba(16,185,129,0.12)', color: 'var(--color-success)',
                        borderRadius: 8, padding: '6px 12px', textAlign: 'center', minWidth: 52,
                      }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1 }}>
                          {format(new Date(s.working_date), 'd')}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, marginTop: 2 }}>
                          Sun
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-success)' }}>Working Sunday</div>
                        {s.notes && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 3 }}>📝 {s.notes}</div>}
                      </div>
                      <button
                        id={`delete-sunday-${s.id}`}
                        className="btn btn-sm btn-icon"
                        style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
                        onClick={() => handleDeleteSunday(s.id, format(new Date(s.working_date), 'MMM d, yyyy'))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modals */}
      {showAdd && <AddHolidayModal onClose={() => setShowAdd(false)} onSave={handleAddHoliday} />}
      {showAddSunday && <AddWorkingSundayModal onClose={() => setShowAddSunday(false)} onSave={handleAddSunday} />}
    </AppLayout>
  );
}
