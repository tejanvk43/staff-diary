import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { Search, BookOpen, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

const ACTIVITY_COLORS = {
  Teaching: '#6366f1', Meeting: '#06b6d4', Research: '#8b5cf6',
  Administration: '#f59e0b', 'Exam Duty': '#ef4444', 'Lab Work': '#10b981', Other: '#64748b',
};
const STATUS_CLASS = {
  Draft: 'badge-draft', Submitted: 'badge-submitted',
  Approved: 'badge-approved', Rejected: 'badge-rejected',
};

export default function DiaryHistoryPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate]     = useState(today);
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    if (!fromDate || !toDate) { toast.error('Select date range.'); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/api/reports/diary?from_date=${fromDate}&to_date=${toDate}`);
      setEntries(res.data.data || []);
    } catch (_) { toast.error('Failed to load history.'); }
    finally { setLoading(false); }
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, []);

  // Group entries by date
  const grouped = entries.reduce((acc, e) => {
    const d = e.log_date?.split('T')[0] || e.log_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  const toggleDay = (d) => setExpanded(prev => ({ ...prev, [d]: !prev[d] }));

  // Stats
  const stats = {
    total: entries.length,
    approved: entries.filter(e => e.status === 'Approved').length,
    submitted: entries.filter(e => e.status === 'Submitted').length,
    draft: entries.filter(e => e.status === 'Draft').length,
  };

  return (
    <AppLayout title="Diary History">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Diary History</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Browse your past diary entries by date range.</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label" htmlFor="hist-from">From Date</label>
            <input id="hist-from" type="date" className="input" max={toDate} value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label" htmlFor="hist-to">To Date</label>
            <input id="hist-to" type="date" className="input" max={today} value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button id="hist-search-btn" className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? <Loader2 size={14} className="spinner" /> : <Search size={14} />} Search
          </button>
        </div>
      </div>

      {/* Stats */}
      {searched && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Entries', value: stats.total, color: '#6366f1' },
            { label: 'Approved', value: stats.approved, color: '#34d399' },
            { label: 'Submitted', value: stats.submitted, color: '#818cf8' },
            { label: 'Draft', value: stats.draft, color: '#94a3b8' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="empty-state"><Loader2 size={32} className="spinner" style={{ color: 'var(--color-primary)' }} /><p>Loading entries...</p></div>
      ) : searched && entries.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} style={{ opacity: 0.3 }} />
          <h3 style={{ fontWeight: 600 }}>No entries found</h3>
          <p style={{ fontSize: '0.875rem' }}>No diary entries for the selected date range.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([date, dayEntries]) => (
            <div key={date} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px', background: 'var(--color-surface-2)',
                  borderBottom: expanded[date] ? '1px solid var(--color-border)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => toggleDay(date)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 6 }}>
                    {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {dayEntries.map(e => (
                    <span key={e.id} className={`badge ${STATUS_CLASS[e.status] || 'badge-draft'}`} style={{ fontSize: '0.68rem' }}>{e.status}</span>
                  ))}
                  {expanded[date] ? <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />}
                </div>
              </div>
              {expanded[date] && (
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayEntries.sort((a, b) => (a.from_time || '').localeCompare(b.from_time || '')).map(entry => {
                    const color = ACTIVITY_COLORS[entry.activity_type] || '#64748b';
                    const from = new Date(entry.from_time);
                    const to   = new Date(entry.to_time);
                    const dur  = Math.round((to - from) / 60000);
                    return (
                      <div key={entry.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 16,
                        border: `1px solid var(--color-border)`, borderLeft: `4px solid ${color}`,
                        borderRadius: 10, padding: '12px 16px', background: 'var(--color-bg)',
                      }}>
                        <div style={{ textAlign: 'center', minWidth: 60, flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color }}>{format(from, 'HH:mm')}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{format(to, 'HH:mm')}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 2, background: 'var(--color-surface-2)', borderRadius: 4, padding: '1px 4px' }}>{dur}m</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${color}22`, color }}>{entry.activity_type}</span>
                            <span className={`badge ${STATUS_CLASS[entry.status] || 'badge-draft'}`}>{entry.status}</span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                            {entry.description || <span style={{ color: 'var(--color-text-muted)' }}>No description</span>}
                          </p>
                          {entry.remarks && <p style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: 4 }}>📝 {entry.remarks}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
