import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Download, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import * as XLSX from 'xlsx';

// ─── Colour palette matching SubjectsPage ────────────────────────────────────
const TYPE_PALETTE = [
  { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },
  { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },
  { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
  { bg: 'rgba(236,72,153,0.15)', text: '#f472b6' },
  { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
  { bg: 'rgba(168,85,247,0.15)', text: '#c084fc' },
  { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },
  { bg: 'rgba(20,184,166,0.15)', text: '#2dd4bf' },
];

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function ConflictsPage() {
  const [conflicts, setConflicts]     = useState([]);
  const [subjectTypes, setTypes]      = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterDay, setFilterDay]     = useState('');
  const [filterType, setFilterType]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, tr] = await Promise.all([
        api.get('/api/reports/conflicts'),
        api.get('/api/admin/subject-types'),
      ]);
      setConflicts(cr.data.data || []);
      setTypes(tr.data.data || []);
    } catch (_) {
      toast.error('Failed to load conflicts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build name→colour lookup from ordered list (same algorithm as SubjectsPage)
  const colorMap = {};
  subjectTypes.forEach((t, idx) => {
    colorMap[t.name] = TYPE_PALETTE[idx % TYPE_PALETTE.length];
  });

  const getColor = (typeName) => colorMap[typeName] || TYPE_PALETTE[0];

  const filtered = conflicts.filter(c => {
    if (filterDay  && c.day          !== filterDay)  return false;
    if (filterType && c.subject_type !== filterType) return false;
    return true;
  });

  // Build name→short_name lookup from the loaded types list
  const shortNameMap = {};
  subjectTypes.forEach(t => { shortNameMap[t.name] = t.short_name || t.name; });

  const downloadExcel = () => {
    const rows = filtered.map(c => ({
      Day:           c.day,
      From:          c.from_time,
      To:            c.to_time,
      Room:          c.room_number,
      Type:          c.subject_type,
      Short_Name:    shortNameMap[c.subject_type] || c.subject_type,
      Faculty_Count: c.faculty_count,
      Faculty_Names: c.faculty_names,
      Departments:   c.departments || '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Conflicts');
    XLSX.writeFile(wb, 'timetable_conflicts.xlsx');
  };

  return (
    <AppLayout title="Timetable Conflicts">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Schedule Conflicts</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Rooms with more faculty than the configured limit for each subject type.
          </p>
        </div>
        <button id="download-conflicts-btn" className="btn btn-secondary"
          onClick={downloadExcel} disabled={!filtered.length}>
          <Download size={14} /> Download Excel
        </button>
      </div>

      {/* ── Stat Cards: total + one per type ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {/* Total */}
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{conflicts.length}</div>
          <div className="stat-label">Total Conflicts</div>
        </div>

        {/* One card per subject type */}
        {subjectTypes.map((t, idx) => {
          const col   = TYPE_PALETTE[idx % TYPE_PALETTE.length];
          const count = conflicts.filter(c => c.subject_type === t.name).length;
          return (
            <div key={t.id} className="stat-card" style={{ borderColor: count > 0 ? col.text : undefined, transition: 'border-color .2s' }}>
              <div className="stat-value" style={{ color: count > 0 ? col.text : 'var(--color-text-muted)' }}>
                {count}
              </div>
              <div className="stat-label">{t.name} Conflicts</div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select id="conflict-day-filter" className="input" style={{ maxWidth: 180 }}
          value={filterDay} onChange={e => setFilterDay(e.target.value)}>
          <option value="">All Days</option>
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select id="conflict-type-filter" className="input" style={{ maxWidth: 200 }}
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {subjectTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="empty-state">
          <Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} style={{ opacity: 0.5, color: 'var(--color-success)' }} />
          <h3 style={{ fontWeight: 600 }}>No Conflicts Found</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {filterDay || filterType
              ? 'No conflicts match the current filters.'
              : 'All timetable slots are within the configured faculty limits.'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Time Slot</th>
                <th>Room</th>
                <th>Type</th>
                <th style={{ textAlign: 'center' }}>Faculty Count</th>
                <th>Faculty Names</th>
                <th>Departments</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const col = getColor(c.subject_type);
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.day}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {c.from_time?.slice(0, 5)} – {c.to_time?.slice(0, 5)}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--color-primary-light)' }}>
                        {c.room_number || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: 6,
                          background: col.bg, color: col.text,
                        }}>
                          {c.subject_type}
                        </span>
                        {shortNameMap[c.subject_type] && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                            background: 'var(--color-surface-2)', color: 'var(--color-text-muted)',
                            fontFamily: 'monospace', letterSpacing: '0.05em',
                          }}>
                            {shortNameMap[c.subject_type]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 700, color: 'var(--color-danger)',
                        background: 'rgba(239,68,68,0.15)', padding: '2px 10px',
                        borderRadius: 6, fontSize: '0.875rem',
                      }}>
                        {c.faculty_count}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: 260 }}>
                      {c.faculty_names}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', maxWidth: 200 }}>
                      {c.departments || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
