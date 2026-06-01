import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Loader2, Edit2, CalendarDays, Settings, Download, FileSpreadsheet, Printer } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import FacultySetupPage from './FacultySetupPage';
import * as XLSX from 'xlsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

const getPeriodNumber = (fromTime, educationType) => {
  const time = fromTime?.slice(0, 5); // "08:40"
  if (!time) return null;

  let normTime = time;
  if (time.length === 4) normTime = '0' + time;

  const isDiploma = String(educationType).toLowerCase().includes('diploma');
  if (isDiploma) {
    const diplomaTimings = ['08:40', '10:10', '11:10', '13:00', '14:00', '15:00'];
    const idx = diplomaTimings.indexOf(normTime);
    if (idx !== -1) return idx + 1;
  } else {
    const btechTimings = ['08:40', '09:40', '11:10', '12:10', '14:00', '15:00'];
    const idx = btechTimings.indexOf(normTime);
    if (idx !== -1) return idx + 1;
  }

  // Fallbacks
  const btechTimings = ['08:40', '09:40', '11:10', '12:10', '14:00', '15:00'];
  const bIdx = btechTimings.indexOf(normTime);
  if (bIdx !== -1) return bIdx + 1;

  const diplomaTimings = ['08:40', '10:10', '11:10', '13:00', '14:00', '15:00'];
  const dIdx = diplomaTimings.indexOf(normTime);
  if (dIdx !== -1) return dIdx + 1;

  return null;
};

const TYPE_COLORS = { Theory: '#6366f1', Lab: '#10b981' };
const TYPE_BG     = { Theory: 'rgba(99,102,241,0.12)', Lab: 'rgba(16,185,129,0.12)' };
const TYPE_BORDER = { Theory: 'rgba(99,102,241,0.35)', Lab: 'rgba(16,185,129,0.35)' };

const EXPORT_BTN = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '10px 16px', background: 'none', border: 'none',
  borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
  fontSize: '0.83rem', fontWeight: 600, color: 'var(--color-text)',
  textAlign: 'left', transition: 'background 0.1s',
};


const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hStr = parts[0];
  const mStr = parts[1];
  let h = parseInt(hStr, 10);
  const amamp = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const hh = h < 10 ? '0' + h : h;
  return `${hh}:${mStr} ${amamp}`;
};

// ─── Smart Slot Modal (uses faculty setup data) ────────────────────────────────
function SlotModal({ slot, day, fromTime, onClose, onSave, myBlocks, myCourses, mySubjects }) {
  const [blockId,   setBlockId]   = useState(slot?.block_id    || '');
  const [timeSlot,  setTimeSlot]  = useState(
    slot ? `${slot.from_time}|${slot.to_time}` : ''
  );
  const [courseKey, setCourseKey] = useState(
    slot ? `${slot.education_type}|${slot.year}|${slot.section}` : ''
  );
  const [subjectId, setSubjectId] = useState(slot?.subject_id  || '');
  const [day_,      setDay]       = useState(slot?.day || day || 'Monday');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!slot && fromTime && myBlocks.length > 0) {
      for (const block of myBlocks) {
        const matchingSlot = (block.slots || []).find(s => {
          const pNum = getPeriodNumber(s.from_time, block.education_type);
          return pNum === fromTime;
        });
        if (matchingSlot) {
          setBlockId(block.id);
          setTimeSlot(`${matchingSlot.from_time}|${matchingSlot.to_time}`);
          break;
        }
      }
    }
  }, [slot, fromTime, myBlocks]);

  // Derived: time slots for selected block
  const selectedBlock   = myBlocks.find(b => String(b.id) === String(blockId));
  const availableSlots  = (selectedBlock?.slots || []).filter(s => {
    const isSBreak = s.subject_type === 'Break' || 
                     (s.short_name || '').toLowerCase().includes('break') || 
                     (s.short_name || '').toLowerCase().includes('lunch') || 
                     (s.short_name || '').toLowerCase().includes('recess') || 
                     (s.short_name || '').toLowerCase().includes('interval') || 
                     (s.short_name || '').toLowerCase().includes('tea') || 
                     (s.short_name || '').toLowerCase().includes('free');
    return !isSBreak;
  });

  // Derived: sections for selected course
  const parsedCourse = courseKey
    ? { education_type: courseKey.split('|')[0], year: parseInt(courseKey.split('|')[1]), section: courseKey.split('|')[2] }
    : null;

  // Derived: subjects filtered by course education_type
  const filteredSubjects = parsedCourse
    ? mySubjects.filter(s => s.education_type === parsedCourse.education_type)
    : mySubjects;

  const EDU_COLORS = { Diploma: '#f59e0b', 'B-Tech': '#6366f1', 'M-Tech': '#8b5cf6' };

  const handleSave = async () => {
    if (!blockId)   { toast.error('Select a block.'); return; }
    if (!timeSlot)  { toast.error('Select a time slot.'); return; }
    if (!courseKey) { toast.error('Select a course/class.'); return; }
    if (!day_)      { toast.error('Select a day.'); return; }

    const [from_time, to_time] = timeSlot.split('|');
    const found = mySubjects.find(s => String(s.id) === String(subjectId));

    setSaving(true);
    try {
      await onSave({
        block_id:       parseInt(blockId),
        day:            day_,
        from_time,
        to_time,
        education_type: parsedCourse.education_type,
        year:           parsedCourse.year,
        section:        parsedCourse.section,
        subject_id:     subjectId || null,
        short_name:     found?.subject_code || '',
        subject_type:   found?.subject_type || 'Theory',
        room_number:    selectedBlock?.name || '',
      });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save slot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 2 }}>{slot ? 'Edit Slot' : 'Add Slot'}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {day_} {timeSlot ? `· ${timeSlot.replace('|', ' – ')}` : ''}
            </p>
          </div>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Day selector */}
        <div className="form-group">
          <label className="form-label">Day *</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DAYS.map(d => (
              <button key={d} type="button" onClick={() => setDay(d)} style={{
                padding: '5px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', border: 'none',
                background: day_ === d ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: day_ === d ? '#fff' : 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}>
                {DAY_SHORT[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Block selector */}
        <div className="form-group">
          <label className="form-label">Block *</label>
          {myBlocks.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-danger)' }}>
              No blocks assigned. Complete your profile setup first.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {myBlocks.map(b => (
                <button key={b.id} type="button" onClick={() => { setBlockId(b.id); setTimeSlot(''); }}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                    cursor: 'pointer',
                    background: String(blockId) === String(b.id) ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: String(blockId) === String(b.id) ? '#fff' : 'var(--color-text)',
                    border: `1.5px solid ${String(blockId) === String(b.id) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    transition: 'all 0.15s',
                  }}
                >{b.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* Time slot selector */}
        {blockId && (
          <div className="form-group">
            <label className="form-label">Time Slot *</label>
            {availableSlots.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-warning)' }}>
                This block has no time slots defined yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableSlots.map((s, i) => {
                  const key = `${s.from_time}|${s.to_time}`;
                  return (
                    <button key={i} type="button" onClick={() => setTimeSlot(key)}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                        cursor: 'pointer',
                        background: timeSlot === key ? '#06b6d4' : 'var(--color-surface-2)',
                        color: timeSlot === key ? '#fff' : 'var(--color-text)',
                        border: `1.5px solid ${timeSlot === key ? '#06b6d4' : 'var(--color-border)'}`,
                        transition: 'all 0.15s', fontFamily: 'monospace',
                      }}
                    >
                      {s.from_time} – {s.to_time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Course / Class selector */}
        <div className="form-group">
          <label className="form-label">Course / Class *</label>
          {myCourses.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-danger)' }}>
              No courses configured. Complete your profile setup first.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {myCourses.map((c, i) => {
                const key = `${c.education_type}|${c.year}|${c.section}`;
                const col = EDU_COLORS[c.education_type] || '#64748b';
                return (
                  <button key={i} type="button" onClick={() => setCourseKey(key)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                      cursor: 'pointer',
                      background: courseKey === key ? `${col}22` : 'var(--color-surface-2)',
                      color: courseKey === key ? col : 'var(--color-text)',
                      border: `1.5px solid ${courseKey === key ? col : 'var(--color-border)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {c.education_type} · Yr {c.year} · {c.section}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Subject selector */}
        <div className="form-group">
          <label className="form-label">Subject</label>
          {mySubjects.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-warning)' }}>
              No subjects selected in your setup.
            </p>
          ) : (
            <select id="slot-subject" className="input" value={subjectId}
              onChange={e => setSubjectId(e.target.value)}>
              <option value="">— Select Subject —</option>
              {filteredSubjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.subject_code} – {s.subject_name} ({s.subject_type})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-slot-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />}
            {slot ? 'Update Slot' : 'Add Slot'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Slot Cell Component ───────────────────────────────────────────────────────
function SlotCell({ slot, onEdit, onDelete }) {
  const color  = TYPE_COLORS[slot.subject_type]  || '#64748b';
  const bg     = TYPE_BG[slot.subject_type]      || 'rgba(100,116,139,0.1)';
  const border = TYPE_BORDER[slot.subject_type]  || 'rgba(100,116,139,0.3)';

  let displayCode = slot.short_name || slot.subject_code || '';
  let displayBranch = '';
  if (displayCode.includes('_')) {
    const parts = displayCode.split('_');
    displayBranch = parts[0];
    displayCode = parts.slice(1).join('_');
  }
  const mainTitle = displayBranch ? `${displayCode} (${displayBranch})` : displayCode;

  const ROMAN_YEARS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  const yrLabel = `${ROMAN_YEARS[slot.year] || slot.year} Year`;
  const currentMonth = new Date().getMonth();
  const isEvenSemester = currentMonth >= 0 && currentMonth <= 5;
  const semNumber = isEvenSemester ? (slot.year * 2) : (slot.year * 2 - 1);
  const semLabel = semNumber % 2 === 0 ? 'II Semester' : 'I Semester';
  const secLabel = slot.section ? `, Sec-${slot.section.split('-').pop()}` : '';

  const formattedTimings = `${formatTime12h(slot.from_time)} - ${formatTime12h(slot.to_time)}`;
  const blockName = slot.room_number || '';

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: '7px 9px',
      position: 'relative',
      minHeight: 64,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      textAlign: 'center',
      justifyContent: 'center',
    }}>
      {/* Subject label */}
      <div style={{ fontWeight: 700, fontSize: '0.78rem', color, lineHeight: 1.2, paddingRight: 24 }}>
        {mainTitle}
      </div>

      {/* Class label */}
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.66rem', lineHeight: 1.3, paddingRight: 24 }}>
        ({slot.education_type === 'B-Tech' ? 'B.Tech' : slot.education_type} {yrLabel} {semLabel}{secLabel})
      </div>

      {/* Timing and Block */}
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.66rem', fontWeight: 600, marginTop: 2, paddingRight: 24 }}>
        {formattedTimings} {blockName ? `[${blockName}]` : ''}
      </div>

      {/* Action buttons */}
      <div style={{ position: 'absolute', top: 5, right: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <button
          id={`edit-slot-${slot.id}`}
          title="Edit"
          onClick={() => onEdit(slot)}
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 5, padding: '2px 4px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
        >
          <Edit2 size={10} />
        </button>
        <button
          id={`delete-slot-${slot.id}`}
          title="Delete"
          onClick={() => onDelete(slot.id)}
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 5, padding: '2px 4px', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center' }}
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const [slots, setSlots]             = useState([]);
  const [myBlocks, setMyBlocks]       = useState([]);
  const [myCourses, setMyCourses]     = useState([]);
  const [mySubjects, setMySubjects]   = useState([]);
  const [setupDone, setSetupDone]     = useState(null); // null=loading
  const [showSetup, setShowSetup]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editSlot, setEditSlot]       = useState(null);
  const [clickDay, setClickDay]       = useState(null);
  const [clickTime, setClickTime]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sr, br, cr, subr, setupRes] = await Promise.all([
        api.get('/api/timetable/mine'),
        api.get('/api/faculty/my-blocks-with-slots'),
        api.get('/api/faculty/my-courses'),
        api.get('/api/faculty/my-subjects'),
        api.get('/api/faculty/setup'),
      ]);
      setSlots(sr.data.data       || []);
      setMyBlocks(br.data.data    || []);
      setMyCourses(cr.data.data   || []);
      setMySubjects(subr.data.data || []);
      setSetupDone(setupRes.data.data.isComplete);
    } catch (_) { toast.error('Failed to load timetable.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    if (editSlot) {
      await api.put(`/api/timetable/${editSlot.id}`, data);
      toast.success('Slot updated.');
    } else {
      await api.post('/api/timetable', data);
      toast.success('Slot added.');
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this timetable slot?')) return;
    try {
      await api.delete(`/api/timetable/${id}`);
      toast.success('Slot removed.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const openAdd = (day, time) => {
    setEditSlot(null);
    setClickDay(day);
    setClickTime(time);
    setShowModal(true);
  };

  const openEdit = (slot) => {
    setEditSlot(slot);
    setClickDay(null);
    setClickTime(null);
    setShowModal(true);
  };

  const getSlotsForCell = (day, periodNum) => {
    return slots.filter(s => {
      if (s.day !== day) return false;
      const pNum = getPeriodNumber(s.from_time, s.education_type);
      return pNum === periodNum;
    });
  };

  const isCellBreak = (day, periodNum) => {
    return false;
  };

  const getBreakName = (day, periodNum) => {
    for (const b of myBlocks) {
      const found = (b.slots || []).find(s => {
        const pNum = getPeriodNumber(s.from_time, b.education_type);
        if (pNum !== periodNum) return false;
        
        const label = (s.short_name || '').toLowerCase();
        return s.subject_type === 'Break' ||
               label.includes('break') ||
               label.includes('lunch') ||
               label.includes('recess') ||
               label.includes('interval') ||
               label.includes('tea') ||
               label.includes('free');
      });
      if (found) {
        return found.short_name || 'Break';
      }
    }
    return 'Break';
  };

  const totalSlots = slots.length;
  const theoryCount = slots.filter(s => s.subject_type === 'Theory').length;
  const labCount    = slots.filter(s => s.subject_type === 'Lab').length;

  const activeDays = DAYS;

  // ── Export helpers ──────────────────────────────────────────────────────────
  const [showExport, setShowExport] = useState(false);

  const exportToExcel = () => {
    const periods = [1, 2, 3, 4, 5, 6];
    const header = ['Day', ...periods.map(p => `Period ${p}`)];
    const rows = DAYS.map(day => {
      const row = [day];
      periods.forEach(p => {
        const cell = getSlotsForCell(day, p);
        if (cell.length === 0) { row.push(''); return; }
        row.push(cell.map(s => {
          const sub = s.short_name || s.subject_code || '';
          const cls = `${s.education_type} Yr${s.year} ${s.section || ''}`;
          const time = `${s.from_time}–${s.to_time}`;
          return `${sub} (${cls}) ${time}`;
        }).join(' / '));
      });
      return row;
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 12 }, ...periods.map(() => ({ wch: 30 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'My Timetable');
    XLSX.writeFile(wb, `My_Timetable_${new Date().toLocaleDateString('en-CA')}.xlsx`);
    setShowExport(false);
  };

  const handlePrint = () => {
    window.print();
    setShowExport(false);
  };

  return (
    <AppLayout title="My Timetable">

      {/* Setup loading */}
      {setupDone === null && (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      )}

      {/* Setup incomplete OR user clicked "Edit Setup" */}
      {(setupDone === false || showSetup) && (
        <FacultySetupPage onComplete={() => { setShowSetup(false); load(); }} />
      )}

      {/* Full timetable UI */}
      {setupDone === true && !showSetup && (
        <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Weekly Timetable</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {totalSlots} periods &nbsp;·&nbsp;
            <span style={{ color: TYPE_COLORS.Theory }}>{theoryCount} Theory</span> &nbsp;·&nbsp;
            <span style={{ color: TYPE_COLORS.Lab }}>{labCount} Lab</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="edit-setup-btn"
            className="btn btn-secondary"
            onClick={() => setShowSetup(true)}
            title="Edit your profile setup"
          >
            <Settings size={14} /> Edit Setup
          </button>
          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              id="export-timetable-btn"
              className="btn btn-secondary"
              onClick={() => setShowExport(v => !v)}
            >
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
                <button onClick={handlePrint} style={EXPORT_BTN}>
                  <Printer size={14} style={{ color: '#6366f1' }} /> Print / Save PDF
                </button>
              </div>
            )}
          </div>
          <button id="add-slot-btn" className="btn btn-primary" onClick={() => openAdd(null, null)}>
            <Plus size={14} /> Add Slot
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {totalSlots > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {DAYS.map(d => {
            const count = slots.filter(s => s.day === d).length;
            return count > 0 ? (
              <div key={d} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 8, padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600,
              }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{DAY_SHORT[d]}</span>
                <span style={{ marginLeft: 6, color: 'var(--color-primary)' }}>{count}</span>
              </div>
            ) : null;
          })}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <Loader2 size={32} className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : totalSlots === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <CalendarDays size={52} style={{ opacity: 0.25, marginBottom: 12 }} />
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>No timetable slots yet</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
            Click any empty cell or the button above to add your first period.
          </p>
          <button className="btn btn-primary" onClick={() => openAdd(null, null)}>
            <Plus size={14} /> Add First Slot
          </button>
        </div>
      ) : (
        /* ── Grid Table ─────────────────────────────────────────────────────── */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 84 }} />
              {[1, 2, 3, 4, 5, 6].map(p => (
                <col key={p} style={{ width: `${100 / 6}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={{
                  padding: '12px 14px', fontSize: '0.78rem', fontWeight: 700,
                  color: 'var(--color-text)',
                  background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  borderRight: 'none', borderRadius: '10px 0 0 0', textAlign: 'center'
                }}>
                  Day
                </th>
                {[1, 2, 3, 4, 5, 6].map((p, i) => (
                  <th key={p} style={{
                    padding: '12px 8px', background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)', borderLeft: 'none',
                    borderRadius: i === 5 ? '0 10px 0 0' : 0, textAlign: 'center',
                    fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)'
                  }}>
                    Period {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, rowIdx) => {
                const isLast = rowIdx === DAYS.length - 1;
                return (
                  <tr key={day}>
                    <td style={{
                      padding: '14px 8px', background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)', borderTop: 'none', borderRight: 'none',
                      borderRadius: isLast ? '0 0 0 10px' : 0, textAlign: 'center',
                      fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)'
                    }}>
                      {DAY_SHORT[day]}
                    </td>
                    {[1, 2, 3, 4, 5, 6].map((p, colIdx) => {
                      const cellSlots = getSlotsForCell(day, p);
                      const isBreak = isCellBreak(day, p);
                      const breakName = isBreak ? getBreakName(day, p) : '';
                      const isLastCol = colIdx === 5;

                      return (
                        <td
                          key={p}
                          id={`cell-${day.toLowerCase()}-p${p}`}
                          onClick={() => cellSlots.length === 0 && !isBreak && openAdd(day, p)}
                          style={{
                            padding: 6,
                            border: '1px solid var(--color-border)',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRadius: isLast && isLastCol ? '0 0 10px 0' : 0,
                            verticalAlign: 'top',
                            background: isBreak ? 'rgba(251,191,36,0.04)' : 'var(--color-bg)',
                            cursor: cellSlots.length === 0 && !isBreak ? 'pointer' : 'default',
                            transition: 'background 0.15s',
                            minHeight: 80,
                            position: 'relative',
                          }}
                          onMouseEnter={e => { if (cellSlots.length === 0 && !isBreak) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                          onMouseLeave={e => { if (cellSlots.length === 0) e.currentTarget.style.background = isBreak ? 'rgba(251,191,36,0.04)' : 'var(--color-bg)'; }}
                        >
                          {isBreak ? (
                            <div style={{
                              height: '100%', minHeight: 64, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', color: '#d97706', fontSize: '0.75rem',
                              fontWeight: 600, background: 'rgba(251,191,36,0.08)', borderRadius: 8,
                              border: '1px dashed rgba(251,191,36,0.3)',
                            }}>
                              {breakName}
                            </div>
                          ) : cellSlots.length === 0 ? (
                            <div style={{
                              height: '100%', minHeight: 64, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', opacity: 0,
                              transition: 'opacity 0.15s',
                              color: 'var(--color-text-muted)', fontSize: '0.7rem',
                            }}
                              className="empty-cell-hint"
                            >
                              <Plus size={14} />
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {cellSlots.map(s => (
                                <SlotCell
                                  key={s.id}
                                  slot={s}
                                  onEdit={openEdit}
                                  onDelete={handleDelete}
                                />
                              ))}
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
      )}

      {/* Legend */}
      {totalSlots > 0 && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 16, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />
              {type}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', opacity: 0.7 }}>Click any empty cell to add a slot</span>
        </div>
      )}

      {/* Global style for hover hint */}
      <style>{`
        td:hover .empty-cell-hint { opacity: 1 !important; }
      `}</style>

      {showModal && (
        <SlotModal
          slot={editSlot}
          day={clickDay}
          fromTime={clickTime}
          myBlocks={myBlocks}
          myCourses={myCourses}
          mySubjects={mySubjects}
          onClose={() => { setShowModal(false); setEditSlot(null); }}
          onSave={handleSave}
        />
      )}
        </>
      )}
    </AppLayout>
  );
}
