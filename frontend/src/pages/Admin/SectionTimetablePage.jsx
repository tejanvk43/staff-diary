import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Loader2, CalendarDays, Search, ChevronDown, ChevronUp,
  User, BookOpen, Clock, Filter, LayoutGrid, Table2,
  Trash2, AlertTriangle, X, Download, FileSpreadsheet, Printer,
} from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import * as XLSX from 'xlsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

const TYPE_COLORS  = { Theory: '#6366f1', Lab: '#10b981', Break: '#f59e0b', Free: '#94a3b8' };
const TYPE_BG      = { Theory: 'rgba(99,102,241,0.07)', Lab: 'rgba(16,185,129,0.07)', Break: 'rgba(245,158,11,0.07)', Free: 'rgba(148,163,184,0.07)' };
const TYPE_BORDER  = { Theory: 'rgba(99,102,241,0.2)', Lab: 'rgba(16,185,129,0.2)', Break: 'rgba(245,158,11,0.2)', Free: 'rgba(148,163,184,0.2)' };
const PROG_COLORS  = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0ea5e9'];

const EXPORT_BTN = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '10px 16px', background: 'none', border: 'none',
  borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
  fontSize: '0.83rem', fontWeight: 600, color: 'var(--color-text)',
  textAlign: 'left', transition: 'background 0.1s',
};

const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = (h % 12) || 12;
  return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
};

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ sectionName, loading, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontWeight: 700 }}>Delete Section Timetable</h3>
          </div>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose} disabled={loading}>
            <X size={16} />
          </button>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
            This will permanently delete the timetable for <strong style={{ color: '#ef4444' }}>{sectionName}</strong> and all its period slots. Faculty timetable entries will also be removed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className="btn"
            style={{ background: '#ef4444', color: '#fff', border: 'none' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="spinner" /> : <Trash2 size={14} />}
            Delete Timetable
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Timetable Grid for one section ───────────────────────────────────────────
function SectionGrid({ slots, timetable }) {
  const isBreak = (s) => {
    const t = (s.subject_type || '').toLowerCase();
    const n = (s.short_name || s.subject_name || '').toLowerCase();
    return t === 'break' || n.includes('break') || n.includes('lunch') || n.includes('recess') || n.includes('tea') || n.includes('interval');
  };

  // Get unique periods (including breaks) sorted by time
  const periodTimes = [...new Set(
    slots.map(s => s.from_time?.slice(0, 5))
  )].filter(Boolean).sort();

  const getSlot = (day, time) =>
    slots.find(s => s.day === day && s.from_time?.slice(0, 5) === time);

  if (periodTimes.length === 0) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
        <CalendarDays size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
        <div>No periods configured for this section.</div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: 560 }}>
        <colgroup>
          <col style={{ width: 72 }} />
          {DAYS.map(d => <col key={d} style={{ width: `${100 / DAYS.length}%` }} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ padding: '8px 6px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRight: 'none', borderRadius: '8px 0 0 0', textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Period
            </th>
            {DAYS.map((day, i) => (
              <th key={day} style={{ padding: '8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderLeft: 'none', borderRadius: i === DAYS.length - 1 ? '0 8px 0 0' : 0, textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {DAY_SHORT[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodTimes.map((time, rowIdx) => {
            const isLast = rowIdx === periodTimes.length - 1;
            const repSlot = slots.find(s => s.from_time?.slice(0, 5) === time);
            return (
              <tr key={time}>
                <td style={{ padding: '6px 4px', textAlign: 'center', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderTop: 'none', borderRight: 'none', borderRadius: isLast ? '0 0 0 8px' : 0 }}>
                  <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.2 }}>
                    {fmt12(time)}
                  </div>
                  {repSlot && (
                    <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                      {fmt12(repSlot.to_time?.slice(0, 5))}
                    </div>
                  )}
                </td>
                {DAYS.map((day, colIdx) => {
                  const s = getSlot(day, time);
                  const isLastCol = colIdx === DAYS.length - 1;
                  const color  = TYPE_COLORS[s?.subject_type] || '#94a3b8';
                  const bg     = TYPE_BG[s?.subject_type]    || 'var(--color-bg)';
                  const border = TYPE_BORDER[s?.subject_type] || 'rgba(148,163,184,0.15)';

                  return (
                    <td key={day} style={{
                      padding: 5, verticalAlign: 'top', minHeight: 60,
                      border: '1px solid var(--color-border)', borderTop: 'none', borderLeft: 'none',
                      borderRadius: isLast && isLastCol ? '0 0 8px 0' : 0,
                      background: 'var(--color-bg)',
                    }}>
                      {s ? (
                        <div style={{
                          background: bg, border: `1px solid ${border}`,
                          borderLeft: `3px solid ${color}`, borderRadius: 5,
                          padding: '5px 6px', fontSize: '0.7rem',
                          display: 'flex', flexDirection: 'column', gap: 1,
                        }}>
                          <div style={{ fontWeight: 700, color, lineHeight: 1.2 }}>
                            {s.short_name || s.subject_name || '—'}
                          </div>
                          {s.faculty_name && (
                            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                              <User size={8} /> {s.faculty_name.split(' ').slice(-1)[0]}
                            </div>
                          )}
                          {s.subject_type === 'Lab' && (
                            <span style={{ fontSize: '0.55rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: 3, padding: '1px 4px', alignSelf: 'flex-start', marginTop: 1 }}>Lab</span>
                          )}
                        </div>
                      ) : (
                        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.6rem', color: 'var(--color-border)', fontWeight: 600 }}>—</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section Card (collapsible) ───────────────────────────────────────────────
function SectionCard({ timetable, index, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [slots, setSlots] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const color = PROG_COLORS[index % PROG_COLORS.length];
  const [showExport, setShowExport] = useState(false);

  const exportSectionToExcel = (e) => {
    e.stopPropagation();
    if (!slots) { toast.error('Expand the card first to load slots.'); return; }
    const header = ['Day', 'From', 'To', 'Subject', 'Short Code', 'Type', 'Faculty', 'Room'];
    const rows = [];
    DAYS.forEach(day => {
      const daySlots = slots.filter(s => s.day === day).sort((a,b) => a.from_time > b.from_time ? 1 : -1);
      daySlots.forEach(s => {
        rows.push([
          day,
          s.from_time?.slice(0,5) || '',
          s.to_time?.slice(0,5) || '',
          s.subject_name || s.short_name || '',
          s.short_name || '',
          s.subject_type || '',
          s.faculty_name || '',
          s.room_number || '',
        ]);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [12,10,10,30,14,10,24,12].map(wch => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, timetable.section || 'Section');
    XLSX.writeFile(wb, `${(timetable.name || 'Section').replace(/\s+/g,'_')}_Timetable.xlsx`);
    setShowExport(false);
  };

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && slots === null) {
      setLoadingSlots(true);
      try {
        const res = await api.get(`/api/admin/block-timetables/${timetable.id}/slots`);
        setSlots(res.data.data.slots || []);
      } catch {
        toast.error('Failed to load slots.');
      } finally {
        setLoadingSlots(false);
      }
    }
  };

  const periodCount = timetable.slot_count || 0;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      {/* Colour strip */}
      <div style={{ height: 4, background: color }} />

      {/* Header row — always visible */}
      <div
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
        onClick={handleExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          {/* Section badge */}
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: `${color}18`, border: `1.5px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.95rem', color,
          }}>
            {(timetable.section || timetable.name || '?').charAt(0)}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {timetable.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${color}15`, color }}>
                {timetable.education_type}
              </span>
              {timetable.section && (
                <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  Section: {timetable.section}
                </span>
              )}
              {timetable.department && timetable.department !== 'General' && (
                <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  {timetable.department}
                </span>
              )}
              <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <BookOpen size={9} /> {periodCount} slots
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Export dropdown */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(99,102,241,0.09)', color: 'var(--color-primary)', border: '1px solid rgba(99,102,241,0.22)', padding: '5px 8px' }}
              onClick={e => { e.stopPropagation(); setShowExport(v => !v); }}
              title="Export this section timetable"
            >
              <Download size={12} />
            </button>
            {showExport && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 50,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                minWidth: 185, overflow: 'hidden',
              }}>
                <button onClick={exportSectionToExcel} style={EXPORT_BTN}>
                  <FileSpreadsheet size={13} style={{ color: '#10b981' }} /> Export as Excel
                </button>
                <button onClick={e => { e.stopPropagation(); window.print(); setShowExport(false); }} style={{ ...EXPORT_BTN, borderBottom: 'none' }}>
                  <Printer size={13} style={{ color: '#6366f1' }} /> Print / Save PDF
                </button>
              </div>
            )}
          </div>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(239,68,68,0.09)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)', padding: '5px 8px' }}
            onClick={e => { e.stopPropagation(); onDelete(timetable); }}
            title="Delete section timetable"
          >
            <Trash2 size={12} />
          </button>
          {expanded
            ? <ChevronUp size={18} style={{ color: 'var(--color-text-muted)' }} />
            : <ChevronDown size={18} style={{ color: 'var(--color-text-muted)' }} />
          }
        </div>
      </div>

      {/* Expandable grid */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          {loadingSlots ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <Loader2 size={20} className="spinner" style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : (
            <div style={{ padding: '12px 14px' }}>
              <SectionGrid slots={slots || []} timetable={timetable} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SectionTimetablePage() {
  const navigate = useNavigate();

  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterProg, setFilterProg] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/block-timetables?source=imported');
      setTimetables(res.data.data || []);
    } catch {
      toast.error('Failed to load section timetables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/admin/block-timetables/${deleteTarget.id}`);
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Unique programmes and years for filters
  const programmes = [...new Set(timetables.map(t => t.education_type))].filter(Boolean).sort();
  const years      = [...new Set(timetables.map(t => t.year))].filter(Boolean).sort((a, b) => a - b);

  // Filtered list
  const filtered = timetables.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name?.toLowerCase().includes(q) || t.section?.toLowerCase().includes(q) || t.department?.toLowerCase().includes(q);
    const matchProg   = !filterProg || t.education_type === filterProg;
    const matchYear   = !filterYear || String(t.year) === String(filterYear);
    return matchSearch && matchProg && matchYear;
  });

  // Group by programme → year
  const grouped = {};
  for (const t of filtered) {
    const key = `${t.education_type}|Year ${t.year}`;
    if (!grouped[key]) grouped[key] = { label: `${t.education_type} — Year ${t.year}`, items: [] };
    grouped[key].items.push(t);
  }

  return (
    <AppLayout title="Section Timetables">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Section Timetables</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {timetables.length} section{timetables.length !== 1 ? 's' : ''} imported · click a card to view its weekly schedule
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/admin/faculty-timetable')}
        >
          <BookOpen size={14} /> Import Timetable
        </button>
        <button className="btn btn-secondary" onClick={() => window.print()} title="Print all section timetables">
          <Printer size={14} /> Print All
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 2, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Search by section name, department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Programme filter */}
          <div style={{ flex: 1, minWidth: 140 }}>
            <select className="input" value={filterProg} onChange={e => setFilterProg(e.target.value)}>
              <option value="">All Programmes</option>
              {programmes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {/* Year filter */}
          <div style={{ flex: 1, minWidth: 120 }}>
            <select className="input" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          {(search || filterProg || filterYear) && (
            <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => { setSearch(''); setFilterProg(''); setFilterYear(''); }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="empty-state">
          <Loader2 size={32} className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : timetables.length === 0 ? (
        <div className="empty-state" style={{ padding: '70px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <CalendarDays size={56} style={{ opacity: 0.18, marginBottom: 14 }} />
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>No section timetables yet</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 24, maxWidth: 340, textAlign: 'center' }}>
            Section-wise timetables are created when you bulk-import from an Excel file using the Timetable Import page.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/admin/faculty-timetable')}>
            <BookOpen size={14} /> Go to Import Page
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '50px 20px' }}>
          <Search size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
          <p style={{ color: 'var(--color-text-muted)' }}>No sections match your search.</p>
        </div>
      ) : (
        <div>
          {Object.values(grouped).map(group => (
            <div key={group.label} style={{ marginBottom: 32 }}>
              {/* Group header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                paddingBottom: 10, borderBottom: '1px solid var(--color-border)',
              }}>
                <CalendarDays size={15} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{group.label}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                  {group.items.length} section{group.items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Section cards */}
              {group.items.map((t, idx) => (
                <SectionCard
                  key={t.id}
                  timetable={t}
                  index={idx}
                  onDelete={tt => setDeleteTarget(tt)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          sectionName={deleteTarget.name}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
