import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Loader2, ArrowLeft, CalendarDays, Clock, Download, FileSpreadsheet, Printer } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import * as XLSX from 'xlsx';

const DAYS      = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat' };

// Slot accent colours — cycle through these for each unique time row
const ROW_COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899','#0ea5e9'];

const EXPORT_BTN = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '10px 16px', background: 'none', border: 'none',
  borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
  fontSize: '0.83rem', fontWeight: 600, color: 'var(--color-text)',
  textAlign: 'left', transition: 'background 0.1s',
};

// ─── Add / Edit Slot Modal ──────────────────────────────────────────────────────
function SlotModal({ slot, fromTime, onClose, onSave }) {
  const addHour = (t) => {
    if (!t) return '09:00';
    const [h, m] = t.split(':').map(Number);
    const total  = h * 60 + m + 60;
    return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
  };

  const [form, setForm] = useState({
    from_time: slot?.from_time?.slice(0,5) || fromTime || '08:00',
    to_time:   slot?.to_time?.slice(0,5)   || addHour(fromTime) || '09:00',
    short_name: slot?.short_name || slot?.notes || '',
    subject_type: slot?.subject_type || 'Theory',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Live duration
  const [fh, fm] = form.from_time.split(':').map(Number);
  const [th, tm] = form.to_time.split(':').map(Number);
  const dur = (th * 60 + tm) - (fh * 60 + fm);

  const handleSave = async () => {
    if (!form.from_time || !form.to_time) { toast.error('Both times are required.'); return; }
    if (form.from_time >= form.to_time)   { toast.error('End time must be after start time.'); return; }
    setSaving(true);
    try {
      await onSave({
        from_time:    form.from_time,
        to_time:      form.to_time,
        short_name:   form.short_name.trim() || null,
        subject_type: form.subject_type,
      });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 380 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 2 }}>
              {slot ? 'Edit Time Slot' : 'Add Time Slot'}
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Applies to <strong>all days</strong> (Mon – Sat)
            </p>
          </div>
          <button className="btn-icon"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Time range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="sl-from">Start Time</label>
            <input id="sl-from" type="time" className="input" value={form.from_time}
              onChange={e => set('from_time', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sl-to">End Time</label>
            <input id="sl-to" type="time" className="input" value={form.to_time}
              onChange={e => set('to_time', e.target.value)} />
          </div>
        </div>

        {/* Duration pill */}
        {dur > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
            padding: '6px 12px', background: 'var(--color-surface-2)',
            borderRadius: 8, fontSize: '0.78rem',
          }}>
            <Clock size={13} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{dur} min</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{form.from_time} – {form.to_time}</span>
          </div>
        )}

        {/* Slot Type */}
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" htmlFor="sl-type">Slot Type *</label>
          <select
            id="sl-type"
            className="input"
            value={form.subject_type}
            onChange={e => {
              const val = e.target.value;
              set('subject_type', val);
              // Prefill label if changing to Break and label is empty
              if (val === 'Break' && !form.short_name) {
                set('short_name', 'Break');
              } else if (val === 'Theory' && form.short_name === 'Break') {
                set('short_name', '');
              }
            }}
          >
            <option value="Theory">Regular Period</option>
            <option value="Break">Break / Lunch</option>
          </select>
        </div>

        {/* Label */}
        <div className="form-group" style={{ marginBottom: 22 }}>
          <label className="form-label" htmlFor="sl-label">Period Label <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
          <input
            id="sl-label"
            className="input"
            value={form.short_name}
            onChange={e => set('short_name', e.target.value)}
            placeholder="e.g.  DS,  DBMS,  Lunch Break…"
            style={{ fontWeight: 600 }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus={!slot}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
            Cancel
          </button>
          <button id="save-slot-btn" className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />}
            {slot ? 'Update' : 'Add Slot'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slot Card ──────────────────────────────────────────────────────────────────
function SlotCard({ slot, color, onEdit, onDelete }) {
  const [fh, fm] = (slot.from_time || '00:00').split(':').map(Number);
  const [th, tm] = (slot.to_time   || '00:00').split(':').map(Number);
  const dur = (th * 60 + tm) - (fh * 60 + fm);
  const label = slot.short_name || slot.notes || '—';

  const isBreak = slot.subject_type === 'Break';
  const cardColor = isBreak ? '#f59e0b' : color;
  const cardBg = isBreak ? 'rgba(245,158,11,0.08)' : `${color}12`;
  const cardBorder = isBreak ? 'rgba(245,158,11,0.25)' : `${color}30`;

  return (
    <div style={{
      background: cardBg, border: `1px solid ${cardBorder}`,
      borderLeft: `3px solid ${cardColor}`, borderRadius: 8,
      padding: '7px 8px', position: 'relative',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: cardColor, paddingRight: 44, lineHeight: 1.2 }}>
        {label} {isBreak && <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '1px 4px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#d97706', marginLeft: 4 }}>Break</span>}
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
        {slot.from_time?.slice(0,5)} – {slot.to_time?.slice(0,5)}
        <span style={{ opacity: 0.6, marginLeft: 4 }}>({dur}m)</span>
      </div>
      {/* Edit / Delete */}
      <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 3 }}>
        <button id={`edit-slot-${slot.id}`} title="Edit (all days)"
          onClick={e => { e.stopPropagation(); onEdit(slot); }}
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
          <Edit2 size={9} />
        </button>
        <button id={`del-slot-${slot.id}`} title="Remove (all days)"
          onClick={e => { e.stopPropagation(); onDelete(slot.id); }}
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center' }}>
          <Trash2 size={9} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Editor ────────────────────────────────────────────────────────────────
export default function BlockTimetableEditorPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState(null);
  const [slots, setSlots]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot]   = useState(null);
  const [clickTime, setClickTime] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/block-timetables/${id}/slots`);
      setTimetable(res.data.data.timetable);
      setSlots(res.data.data.slots);
    } catch (_) { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // Save: create/update across ALL days
  const handleSave = async (data) => {
    if (editSlot) {
      const sameTime = slots.filter(s => s.from_time?.slice(0,5) === editSlot.from_time?.slice(0,5));
      await Promise.all(sameTime.map(s =>
        api.put(`/api/admin/block-timetables/${id}/slots/${s.id}`, { ...data, day: s.day })
      ));
      toast.success('Updated across all days.');
    } else {
      await Promise.all(DAYS.map(day =>
        api.post(`/api/admin/block-timetables/${id}/slots`, { ...data, day })
      ));
      toast.success('Slot added for Mon – Sat.');
    }
    load();
  };

  // Delete all slots sharing the same from_time
  const handleDelete = async (slotId) => {
    if (!confirm('Remove this slot from all days?')) return;
    try {
      const target = slots.find(s => s.id === slotId);
      if (target) {
        const sameTime = slots.filter(s => s.from_time?.slice(0,5) === target.from_time?.slice(0,5));
        await Promise.all(sameTime.map(s =>
          api.delete(`/api/admin/block-timetables/${id}/slots/${s.id}`)
        ));
        toast.success('Removed from all days.');
      }
      load();
    } catch { toast.error('Failed to remove.'); }
  };

  const openAdd  = (time) => { setEditSlot(null); setClickTime(time); setShowModal(true); };
  const openEdit = (slot) => { setEditSlot(slot); setClickTime(slot.from_time?.slice(0,5)); setShowModal(true); };

  // Unique time rows — ONLY rows that have actual slots (sorted)
  const uniqueTimes = [...new Set(slots.map(s => s.from_time?.slice(0,5)))]
    .filter(Boolean)
    .sort();

  // Assign a stable colour to each unique time row
  const timeColor = {};
  uniqueTimes.forEach((t, i) => { timeColor[t] = ROW_COLORS[i % ROW_COLORS.length]; });

  // Get the slot for a specific day+time
  const getSlot = (day, timeStr) =>
    slots.find(s => s.day === day && s.from_time?.slice(0,5) === timeStr) || null;

  // ── Export ──────────────────────────────────────────────────────────
  const [showExport, setShowExport] = useState(false);

  const exportToExcel = () => {
    const header = ['Time From', 'Time To', 'Duration (min)', ...DAYS];
    const rows = uniqueTimes.map(timeStr => {
      const rep = slots.find(s => s.from_time?.slice(0,5) === timeStr);
      const [fh, fm] = timeStr.split(':').map(Number);
      const toStr = rep?.to_time?.slice(0,5) || '';
      const [th, tm] = toStr ? toStr.split(':').map(Number) : [0,0];
      const dur = (th*60+tm) - (fh*60+fm);
      const dayVals = DAYS.map(day => {
        const s = getSlot(day, timeStr);
        if (!s) return '';
        return s.short_name || s.notes || (s.subject_type === 'Break' ? 'Break' : 'Period');
      });
      return [timeStr, toStr, dur > 0 ? dur : '', ...dayVals];
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 14 }, ...DAYS.map(() => ({ wch: 18 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, timetable?.name || 'Block');
    XLSX.writeFile(wb, `${(timetable?.name || 'Block').replace(/\s+/g,'_')}_Timetable.xlsx`);
    setShowExport(false);
  };

  const handlePrint = () => { window.print(); setShowExport(false); };

  return (
    <AppLayout title={timetable?.name || 'Timetable Editor'}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/admin/block-timetables')}
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 2 }}>
              {timetable?.name || '…'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {uniqueTimes.length} time slot{uniqueTimes.length !== 1 ? 's' : ''} · click any empty cell or "+ Add Slot" to add
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary" onClick={() => setShowExport(v => !v)}>
              <Download size={14} /> Export
            </button>
            {showExport && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 50,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                minWidth: 180, overflow: 'hidden',
              }}>
                <button onClick={exportToExcel} style={EXPORT_BTN}>
                  <FileSpreadsheet size={14} style={{ color: '#10b981' }} /> Export as Excel
                </button>
                <button onClick={handlePrint} style={{ ...EXPORT_BTN, borderBottom: 'none' }}>
                  <Printer size={14} style={{ color: '#6366f1' }} /> Print / Save PDF
                </button>
              </div>
            )}
          </div>
          <button id="add-slot-btn" className="btn btn-primary" onClick={() => openAdd(null)}>
            <Plus size={14} /> Add Slot
          </button>
        </div>
      </div>

      {/* Grid — always visible */}
      {loading ? (
        <div className="empty-state"><Loader2 size={32} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: 620 }}>
            <colgroup>
              <col style={{ width: 80 }} />
              {DAYS.map(d => <col key={d} style={{ width: `${100 / DAYS.length}%` }} />)}
            </colgroup>

            {/* Header — explicit colors so days always show */}
            <thead>
              <tr>
                <th style={{
                  padding: '12px 10px',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)', borderRight: 'none',
                  borderRadius: '10px 0 0 0', textAlign: 'center',
                  fontSize: '0.68rem', fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  Time
                </th>
                {DAYS.map((day, i) => (
                  <th key={day} style={{
                    padding: '12px 8px',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)', borderLeft: 'none',
                    borderRadius: i === DAYS.length - 1 ? '0 10px 0 0' : 0,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                      {DAY_SHORT[day]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body — only configured time rows */}
            <tbody>
              {uniqueTimes.length === 0 ? (
                /* Empty state INSIDE the table so headers stay visible */
                <tr>
                  <td colSpan={DAYS.length + 1} style={{
                    padding: '56px 20px', textAlign: 'center',
                    border: '1px solid var(--color-border)', borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    background: 'var(--color-bg)',
                  }}>
                    <CalendarDays size={40} style={{ opacity: 0.18, marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>No slots configured yet</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                      Add a time slot — it will appear across all days automatically.
                    </div>
                    <button className="btn btn-primary" onClick={() => openAdd(null)}>
                      <Plus size={14} /> Add First Slot
                    </button>
                  </td>
                </tr>
              ) : (
                <>
                  {uniqueTimes.map((timeStr, rowIdx) => {
                    const isLast = rowIdx === uniqueTimes.length - 1;
                    const color  = timeColor[timeStr];
                    const rep    = slots.find(s => s.from_time?.slice(0,5) === timeStr);
                    return (
                      <tr key={timeStr}>
                        {/* Time label */}
                        <td style={{
                          padding: '8px', textAlign: 'center', verticalAlign: 'middle',
                          background: 'var(--color-surface-2)',
                          border: '1px solid var(--color-border)', borderTop: 'none', borderRight: 'none',
                          borderRadius: isLast ? '0 0 0 0' : 0,
                        }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 800, color }}>
                            {timeStr}
                          </div>
                          {rep && (
                            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                              – {rep.to_time?.slice(0,5)}
                            </div>
                          )}
                        </td>
                        {/* One cell per day */}
                        {DAYS.map((day, colIdx) => {
                          const cellSlot  = getSlot(day, timeStr);
                          const isLastCol = colIdx === DAYS.length - 1;
                          return (
                            <td key={day}
                              id={`cell-${day.toLowerCase()}-${timeStr.replace(':','')}`}
                              onClick={() => !cellSlot && openAdd(timeStr)}
                              style={{
                                padding: 6, verticalAlign: 'top',
                                border: '1px solid var(--color-border)', borderTop: 'none', borderLeft: 'none',
                                borderRadius: 0,
                                background: 'var(--color-bg)', minHeight: 64,
                                cursor: !cellSlot ? 'pointer' : 'default',
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => { if (!cellSlot) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                              onMouseLeave={e => { if (!cellSlot) e.currentTarget.style.background = 'var(--color-bg)'; }}
                            >
                              {cellSlot ? (
                                <SlotCard slot={cellSlot} color={color} onEdit={openEdit} onDelete={handleDelete} />
                              ) : (
                                <div className="add-hint" style={{
                                  height: '100%', minHeight: 52, display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                  opacity: 0, transition: 'opacity 0.15s', color: 'var(--color-text-muted)',
                                }}>
                                  <Plus size={14} />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* "+ Add new time row" footer */}
                  <tr>
                    <td colSpan={DAYS.length + 1}
                      onClick={() => openAdd(null)}
                      style={{
                        padding: '10px', textAlign: 'center',
                        border: '1px solid var(--color-border)', borderTop: 'none',
                        borderRadius: '0 0 10px 10px',
                        cursor: 'pointer', color: 'var(--color-text-muted)',
                        fontSize: '0.78rem', fontWeight: 600,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      <Plus size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                      Add another time slot
                    </td>
                    </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}


      <style>{`td:hover .add-hint { opacity: 1 !important; }`}</style>

      {showModal && (
        <SlotModal
          slot={editSlot}
          fromTime={clickTime}
          onClose={() => { setShowModal(false); setEditSlot(null); }}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
