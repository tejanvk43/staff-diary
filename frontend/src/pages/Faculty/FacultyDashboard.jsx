import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isToday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Send, Clock, BookOpen, Calendar, Loader2,
  Edit2, Trash2, AlertCircle, CheckCircle, CheckSquare, X, ChevronLeft, ChevronRight,
  CalendarDays, ArrowRight, Download, FileSpreadsheet, Printer, Save, Check, Briefcase,
} from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import * as XLSX from 'xlsx';

const ACTIVITY_TYPES = ['Teaching','Meeting','Research','Administration','Exam Duty','Lab Work','Other'];

const STATUS_CLASS = {
  Draft: 'badge-draft', Submitted: 'badge-submitted',
  Approved: 'badge-approved', Rejected: 'badge-rejected',
};

const ACTIVITY_COLORS = {
  Teaching: '#6366f1', Meeting: '#06b6d4', Research: '#8b5cf6',
  Administration: '#f59e0b', 'Exam Duty': '#ef4444', 'Lab Work': '#10b981', Other: '#64748b',
};

// ─── Time Range Picker ────────────────────────────────────────────────────────
function TimeInput({ label, id, value, onChange, min, max, error }) {
  return (
    <div style={{ flex: 1 }}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="time"
        className={`input ${error ? 'input-error' : ''}`}
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
        step="300"
      />
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 3 }}>{error}</p>}
    </div>
  );
}


// ─── Styled Searchable Dropdown ───────────────────────────────────────────────
// options: [{ value, label (for search list), display? (short, for trigger) }]
function SearchableSelect({ id, label, value, onChange, options, placeholder, error, required }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef           = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedOpt  = options.find(o => o.value === value);
  // trigger shows short display label; fallback to value string
  const triggerLabel = selectedOpt?.display ?? selectedOpt?.label ?? value ?? '';

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function openDropdown() {
    // pre-fill query with current selection so user sees it highlighted
    setQuery(triggerLabel || '');
    setOpen(true);
  }

  function select(opt) {
    onChange(opt.value);
    setQuery('');
    setOpen(false);
  }

  // What to show in the trigger input
  const inputDisplayValue = open ? query : triggerLabel;

  return (
    <div style={{ position: 'relative', margin: 0 }} ref={wrapRef}>
      {label && (
        <label htmlFor={id} className="form-label" style={{ display: 'block', marginBottom: 6 }}>
          {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
        </label>
      )}

      {/* Trigger */}
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${
          error ? 'var(--color-danger)' :
          open  ? 'var(--color-primary)' :
          value ? 'rgba(99,102,241,0.45)' :
                  'var(--color-border)'
        }`,
        borderRadius: 9,
        background: value && !open ? 'rgba(99,102,241,0.04)' : 'var(--color-surface)',
        transition: 'all 0.15s',
        overflow: 'hidden',
      }}>
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={inputDisplayValue}
          placeholder={open ? 'Type to filter…' : placeholder}
          onFocus={openDropdown}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
          style={{
            flex: 1, padding: '9px 12px', background: 'transparent', border: 'none',
            outline: 'none', fontSize: '0.875rem',
            color: value && !open ? 'var(--color-primary)' : 'var(--color-text)',
            fontWeight: value && !open ? 600 : 400,
            cursor: 'text', minWidth: 0,
          }}
        />
        <button
          type="button" tabIndex={-1}
          onClick={() => open ? (setOpen(false), setQuery('')) : openDropdown()}
          style={{
            padding: '0 10px', height: '100%', background: 'transparent', border: 'none',
            cursor: 'pointer',
            color: value ? 'var(--color-primary)' : 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', zIndex: 9999, top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-primary)',
          borderRadius: 10, boxShadow: '0 10px 36px rgba(0,0,0,0.25)',
          maxHeight: 210, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '14px', color: 'var(--color-text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
              No matches found
            </div>
          ) : (
            filtered.map((opt, i) => {
              const isSel = opt.value === value;
              return (
                <div
                  key={i}
                  onMouseDown={e => { e.preventDefault(); select(opt); }}
                  style={{
                    padding: '9px 14px', cursor: 'pointer', fontSize: '0.875rem',
                    background: isSel ? 'rgba(99,102,241,0.13)' : 'transparent',
                    color: isSel ? 'var(--color-primary)' : 'var(--color-text)',
                    fontWeight: isSel ? 700 : 400,
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                  {isSel && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M2 7l3.5 3.5L12 3" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ─── Entry Modal ──────────────────────────────────────────────────────────────
function EntryModal({ onClose, onSave, existingEntry, todayStart, todayEnd, existingSlots, todaysPeriods, initialMode }) {
  const defaultFrom = existingEntry?.from_time
    ? new Date(existingEntry.from_time).toTimeString().slice(0,5) : '08:30';
  const defaultTo   = existingEntry?.to_time
    ? new Date(existingEntry.to_time).toTimeString().slice(0,5) : '09:30';

  const [fromTime, setFromTime] = useState(defaultFrom);
  const [toTime, setToTime]     = useState(defaultTo);
  const [activity, setActivity] = useState(existingEntry?.activity_type || 'Teaching');
  const [description, setDesc]  = useState(existingEntry?.description || '');
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState({});

  const [entryMode, setEntryMode] = useState(
    initialMode || (!existingEntry && todaysPeriods && todaysPeriods.length > 0 ? 'timetable' : 'other')
  );
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState('');
  const [notes, setNotes] = useState('');

  // ── Teaching extra fields ──
  const [teachYear,    setTeachYear]    = useState('');
  const [teachSection, setTeachSection] = useState('');
  const [teachSubject, setTeachSubject] = useState('');

  // ── Raw data from API ──
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const today = new Date().toLocaleDateString('en-CA');

  // Fetch sections + subjects once on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    Promise.all([
      api.get('/api/admin/sections').catch(() => ({ data: { data: [] } })),
      api.get('/api/admin/subjects').catch(() => ({ data: { data: [] } })),
    ]).then(([secRes, subRes]) => {
      if (cancelled) return;
      setSections(secRes.data.data || []);
      setSubjects(subRes.data.data || []);
    }).finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Derived option lists ──
  // Years: unique sorted year numbers
  const yearOptions = [...new Set(sections.map(s => s.year).filter(Boolean))]
    .sort((a, b) => a - b)
    .map(y => ({ value: String(y), label: `Year ${y}`, display: `Year ${y}` }));

  // Sections: filtered by selected year
  // display = just section_name (shown in trigger after selection)
  // label   = full context string (shown in dropdown list, used for search)
  const yearNum = teachYear;
  const sectionOptions = (yearNum
    ? sections.filter(s => String(s.year) === yearNum)
    : sections
  ).map(s => ({
    value:   s.section_name,
    display: s.section_name,                                              // short in trigger
    label:   [s.section_name, s.education_type, s.department]            // full in list
               .filter(Boolean).join(' · '),
  }));

  // Subjects: display = name only, label = full with code (for search)
  const subjectOptions = subjects.map(s => ({
    value:   s.subject_name ? `${s.subject_name} (${s.subject_code})` : s.subject_code,
    display: s.subject_name || s.subject_code,
    label:   s.subject_name ? `${s.subject_name} (${s.subject_code})` : s.subject_code,
  }));


  function buildDateTime(timeStr) {
    return `${today}T${timeStr}:00`;
  }

  function validate() {
    const errs = {};

    if (entryMode === 'timetable' && !existingEntry) {
      if (selectedPeriodIdx === '') { errs.period = 'Required'; return errs; }
    }

    if (!fromTime) errs.from = 'Required';
    if (!toTime)   errs.to   = 'Required';
    if (fromTime >= toTime) errs.to = 'End must be after start';
    if (fromTime < todayStart) errs.from = `Min ${todayStart}`;
    if (toTime > todayEnd)     errs.to   = `Max ${todayEnd}`;

    // Teaching-specific required fields
    if (entryMode === 'other' && activity === 'Teaching') {
      if (!teachYear.trim())    errs.teachYear    = 'Year is required';
      if (!teachSection.trim()) errs.teachSection = 'Section is required';
      if (!teachSubject.trim()) errs.teachSubject = 'Subject is required';
    }

    // Collision check
    const nf = fromTime, nt = toTime;
    const collision = existingSlots
      .filter(s => !existingEntry || s.id !== existingEntry.id)
      .some(s => {
        const ef = new Date(s.from_time).toTimeString().slice(0,5);
        const et = new Date(s.to_time).toTimeString().slice(0,5);
        return nf < et && nt > ef;
      });
    if (collision) errs.from = 'Overlaps with another entry';

    return errs;
  }

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      let finalDesc = description;

      if (entryMode === 'timetable' && !existingEntry) {
        const p = todaysPeriods[selectedPeriodIdx];
        const subjectStr = p.subject_name
          ? `${p.subject_name} (${p.subject_code})`
          : (p.short_name || p.subject_code || 'Teaching');
        finalDesc = notes.trim() ? `${subjectStr} - ${notes.trim()}` : subjectStr;
      } else if (entryMode === 'other' && activity === 'Teaching') {
        // Build: "Year X · SectionName · SubjectName - notes"
        const yearLabel = teachYear ? `Year ${teachYear}` : '';
        const parts = [yearLabel, teachSection, teachSubject].filter(Boolean).join(' · ');
        finalDesc = notes.trim() ? `${parts} - ${notes.trim()}` : parts;
      }

      await onSave({
        from_time:     buildDateTime(fromTime),
        to_time:       buildDateTime(toTime),
        activity_type: activity,
        description:   finalDesc,
      });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const isTeaching = activity === 'Teaching';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 620, width: '96vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            {existingEntry ? 'Edit Diary Entry' : 'Add Diary Entry'}
          </h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Mode Selector — only for new entries when timetable exists */}
        {!existingEntry && todaysPeriods && todaysPeriods.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { key: 'timetable', label: '📅 Regular Timetable' },
              { key: 'other',     label: '💼 Other Works' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setEntryMode(key)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.84rem',
                  border: `2px solid ${entryMode === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: entryMode === key ? 'rgba(99,102,241,0.07)' : 'var(--color-surface)',
                  color: entryMode === key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'all 0.15s',
                }}
              >{label}</button>
            ))}
          </div>
        )}

        {/* ── TIMETABLE MODE ── */}
        {entryMode === 'timetable' && !existingEntry ? (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="entry-period-select">Select Period *</label>
              <select
                id="entry-period-select"
                className={`input ${errors.period ? 'input-error' : ''}`}
                value={selectedPeriodIdx}
                onChange={e => {
                  const idx = e.target.value;
                  setSelectedPeriodIdx(idx);
                  if (idx !== '') {
                    const p = todaysPeriods[idx];
                    setFromTime(p.from_time.slice(0, 5));
                    setToTime(p.to_time.slice(0, 5));
                    setActivity(p.subject_type === 'Lab' ? 'Lab Work' : 'Teaching');
                    setErrors({});
                  }
                }}
              >
                <option value="">— Select a class period —</option>
                {todaysPeriods.map((p, idx) => (
                  <option key={idx} value={idx}>
                    {p.from_time.slice(0, 5)} – {p.to_time.slice(0, 5)} · {p.short_name || p.subject_code} ({p.subject_type})
                  </option>
                ))}
              </select>
              {errors.period && <p style={{ color: 'var(--color-danger)', fontSize: '0.72rem', marginTop: 3 }}>Please select a period</p>}
            </div>

            {selectedPeriodIdx !== '' && (
              <div style={{
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                borderRadius: 9, padding: '12px 16px', marginBottom: 14, fontSize: '0.85rem',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Time</div>
                  <div style={{ fontWeight: 700 }}>{todaysPeriods[selectedPeriodIdx].from_time.slice(0, 5)} – {todaysPeriods[selectedPeriodIdx].to_time.slice(0, 5)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Type</div>
                  <div style={{ fontWeight: 600, color: ACTIVITY_COLORS[activity] }}>{activity}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Subject</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {todaysPeriods[selectedPeriodIdx].subject_name
                      ? `${todaysPeriods[selectedPeriodIdx].subject_name} (${todaysPeriods[selectedPeriodIdx].subject_code})`
                      : todaysPeriods[selectedPeriodIdx].short_name}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="entry-notes">Notes / Topic Covered</label>
              <textarea id="entry-notes" className="input" rows={3}
                placeholder="Topic covered or notes for this class…"
                value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </>
        ) : (
          /* ── OTHER / FREE-FORM MODE ── */
          <>
            {/* Time row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <TimeInput id="entry-from" label="FROM" value={fromTime}
                onChange={v => { setFromTime(v); setErrors({}); }}
                min={todayStart} max={todayEnd} error={errors.from} />
              <TimeInput id="entry-to" label="TO" value={toTime}
                onChange={v => { setToTime(v); setErrors({}); }}
                min={fromTime} max={todayEnd} error={errors.to} />
            </div>

            {/* Activity type */}
            <div className="form-group">
              <label className="form-label" htmlFor="entry-activity">Activity Type</label>
              <select id="entry-activity" className="input" value={activity}
                onChange={e => { setActivity(e.target.value); setErrors({}); }}>
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* ── Teaching-specific fields ── */}
            {isTeaching && (
              <div style={{
                background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.18)',
                borderRadius: 10, padding: '14px 16px', marginBottom: 14,
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                  📚 Class Details
                </div>
                {loadingData ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', padding: '10px 0' }}>
                    <Loader2 size={14} className="spinner" style={{ marginRight: 6 }} />Loading…
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Row: Year + Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
                      <SearchableSelect
                        id="teach-year" label="Year" required
                        value={teachYear}
                        onChange={v => { setTeachYear(v); setTeachSection(''); setErrors(e => ({ ...e, teachYear: '' })); }}
                        options={yearOptions}
                        placeholder="Select year…"
                        error={errors.teachYear}
                      />
                      <SearchableSelect
                        id="teach-section" label="Class / Section" required
                        value={teachSection}
                        onChange={v => { setTeachSection(v); setErrors(e => ({ ...e, teachSection: '' })); }}
                        options={sectionOptions}
                        placeholder="Select section…"
                        error={errors.teachSection}
                      />
                    </div>
                    {/* Subject — full width */}
                    <SearchableSelect
                      id="teach-subject" label="Subject" required
                      value={teachSubject}
                      onChange={v => { setTeachSubject(v); setErrors(e => ({ ...e, teachSubject: '' })); }}
                      options={subjectOptions}
                      placeholder="Type or select a subject…"
                      error={errors.teachSubject}
                    />
                  </div>
                )}
              </div>
            )}


            {/* Description / Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="entry-desc">
                {isTeaching ? 'Notes / Topic Covered' : 'Description'}
              </label>
              <textarea id="entry-desc" className="input" rows={3}
                placeholder={isTeaching ? 'Topic covered, homework given, remarks…' : 'What did you do during this time?'}
                value={isTeaching ? notes : description}
                onChange={e => isTeaching ? setNotes(e.target.value) : setDesc(e.target.value)}
                style={{ resize: 'vertical' }} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-entry-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="spinner" /> : null}
            {existingEntry ? 'Update Entry' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Request Modal ───────────────────────────────────────────────────────
function EditRequestModal({ entry, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error('Please provide a reason.'); return; }
    setLoading(true);
    try {
      await onSubmit(entry.id, reason);
      toast.success('Edit request submitted.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700 }}>Request Edit for Past Entry</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
          This entry is locked. Your edit request will be reviewed by an administrator.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="edit-reason">Reason for Edit</label>
          <textarea
            id="edit-reason"
            className="input"
            rows={3}
            placeholder="Explain why this entry needs to be edited..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="submit-edit-request-btn" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 size={14} className="spinner" /> : null}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

function DateEditRequestModal({ date, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error('Please provide a reason.'); return; }
    setLoading(true);
    try {
      await onSubmit(reason);
      onClose();
    } catch (err) {
      // errors handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700 }}>Request Edit for Entire Date</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
          This entire date ({date}) is locked. Your edit request will be reviewed by an administrator.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="date-edit-reason">Reason for Requesting Permission</label>
          <textarea
            id="date-edit-reason"
            className="input"
            rows={3}
            placeholder="Explain why you need to write/edit diaries for this date..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="submit-date-edit-request-btn" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 size={14} className="spinner" /> : null}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Timetable Diary Table ────────────────────────────────────────────────────
// ─── Other Works Section ──────────────────────────────────────────────────────────────────────────
function OtherWorksSection({ entries, onEdit, onDelete, onSubmit, onRequestEdit, isLocked, title = 'Other Works Done' }) {
  const fmt12 = (d) => {
    const date = new Date(d);
    const h = date.getHours(), m = date.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${ap}`;
  };

  const STATUS_STYLES = {
    Draft:     { bg: 'rgba(245,158,11,0.1)',  color: '#d97706', border: 'rgba(245,158,11,0.3)'  },
    Submitted: { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', border: 'rgba(99,102,241,0.3)'  },
    Approved:  { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', border: 'rgba(16,185,129,0.3)'  },
    Rejected:  { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)'   },
  };

  return (
    <div style={{ marginTop: 20, marginBottom: 8 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Briefcase size={15} style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</span>
        <span style={{
          fontSize: '0.7rem', background: 'var(--color-surface-2)', borderRadius: 20,
          padding: '2px 8px', color: 'var(--color-text-muted)', fontWeight: 600,
        }}>{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(entry => {
          const color = ACTIVITY_COLORS[entry.activity_type] || '#64748b';
          const ss = STATUS_STYLES[entry.status] || {};
          const canEdit   = entry.status === 'Draft' && !isLocked;
          const canSubmit = entry.status === 'Draft';
          const canDelete = entry.status === 'Draft' && !isLocked;
          const needsEdit = (entry.status === 'Submitted' || entry.status === 'Approved') && !isLocked;

          return (
            <div key={entry.id} className="fade-in" style={{
              background: 'var(--color-surface)',
              border: `1px solid var(--color-border)`,
              borderLeft: `4px solid ${color}`,
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              {/* Left: time block */}
              <div style={{ textAlign: 'center', minWidth: 62, flexShrink: 0 }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-primary)', lineHeight: 1.3 }}>
                  {fmt12(entry.from_time)}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', margin: '2px 0' }}>to</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-primary)', lineHeight: 1.3 }}>
                  {fmt12(entry.to_time)}
                </div>
                {/* Status badge */}
                {entry.status && (
                  <span style={{
                    display: 'inline-block', marginTop: 6,
                    fontSize: '0.6rem', fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                    background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                  }}>{entry.status}</span>
                )}
              </div>

              {/* Middle: content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 8,
                    background: `${color}18`, color, letterSpacing: '0.02em',
                  }}>{entry.activity_type}</span>
                </div>
                <p style={{
                  fontSize: '0.875rem', color: 'var(--color-text)', margin: 0,
                  lineHeight: 1.5, wordBreak: 'break-word',
                }}>
                  {entry.description || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No description</span>}
                </p>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                {canEdit && (
                  <button className="btn-icon" title="Edit"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
                    onClick={() => onEdit(entry)}>
                    <Edit2 size={13} />
                  </button>
                )}
                {canSubmit && (
                  <button className="btn-icon" title="Submit"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                    onClick={() => onSubmit(entry.id)}>
                    <CheckSquare size={13} />
                  </button>
                )}
                {canDelete && (
                  <button className="btn-icon" title="Delete"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                    onClick={() => onDelete(entry.id)}>
                    <Trash2 size={13} />
                  </button>
                )}
                {needsEdit && (
                  <button className="btn-icon" title="Request Edit"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}
                    onClick={() => onRequestEdit(entry)}>
                    <AlertCircle size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Timetable Diary Table ─────────────────────────────────────────────────────
function TimetableDiaryTable({ periods, entries, otherEntries = [], onSave, isLocked, viewDate, onEdit, onDelete, onSubmit, onRequestEdit }) {
  const [notes, setNotes]         = useState({});
  const [otherNotes, setOtherNotes] = useState({});
  const [saving, setSaving]       = useState(false);
  const [savedRows, setSavedRows] = useState({});
  const [savedOther, setSavedOther] = useState({});

  const matchEntry = (period) => {
    const pFrom = period.from_time?.slice(0, 5);
    const pTo   = period.to_time?.slice(0, 5);
    return entries.find(e => {
      const eFrom = new Date(e.from_time).toTimeString().slice(0, 5);
      const eTo   = new Date(e.to_time).toTimeString().slice(0, 5);
      return eFrom <= pFrom && eTo >= pTo;
    }) || null;
  };

  const isBreak = (p) => {
    const t = (p.subject_type || '').toLowerCase();
    const n = (p.short_name || p.subject_code || '').toLowerCase();
    return t === 'break' || n.includes('break') || n.includes('lunch') ||
           n.includes('recess') || n.includes('tea') || n.includes('interval') || n.includes('free');
  };

  const fmt12 = (t) => {
    if (!t) return '';
    const [h, m] = (t?.slice(0, 5) || '').split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${ap}`;
  };

  const fmt12Date = (d) => {
    const date = new Date(d);
    const h = date.getHours(), m = date.getMinutes();
    return fmt12(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  };

  const buildDesc = (period, idx) => {
    const note = (notes[idx] ?? '').trim();
    if (period.isOtherWork) {
      return note ? `${period.short_name} - ${note}` : period.short_name;
    }
    const subjectStr = period.subject_name
      ? `${period.subject_name} (${period.subject_code})`
      : (period.short_name || period.subject_code || 'Teaching');
    return note ? `${subjectStr} - ${note}` : subjectStr;
  };

  // ── Save All: timetable rows + other-works draft rows ──
  const handleSaveAll = async () => {
    const tasks = [];

    // Timetable periods
    periods.forEach((period, idx) => {
      if (isBreak(period)) return;
      const existing = matchEntry(period);
      if (isLocked && !existing?.edit_approved) return;
      if (existing?.status === 'Submitted' || existing?.status === 'Approved') return;
      tasks.push({ kind: 'period', period, idx, existing });
    });

    // Other-works entries that are still Draft
    otherEntries.forEach(entry => {
      if (entry.status === 'Submitted' || entry.status === 'Approved') return;
      if (isLocked && !entry.edit_approved) return;
      tasks.push({ kind: 'other', entry });
    });

    if (tasks.length === 0) { toast('No editable entries to save.'); return; }

    setSaving(true);
    let ok = 0;
    const newSaved = {}, newSavedOther = {};

    await Promise.all(tasks.map(async (task) => {
      try {
        if (task.kind === 'period') {
          const { period, idx, existing } = task;
          let activityType = 'Teaching';
          if (period.isOtherWork) {
            const clean = String(period.short_name).toLowerCase();
            if (clean.includes('teach')) activityType = 'Teaching';
            else if (clean.includes('meet')) activityType = 'Meeting';
            else if (clean.includes('research')) activityType = 'Research';
            else if (clean.includes('admin')) activityType = 'Administration';
            else if (clean.includes('exam')) activityType = 'Exam Duty';
            else if (clean.includes('lab')) activityType = 'Lab Work';
            else activityType = 'Other';
          } else {
            activityType = period.subject_type === 'Lab' ? 'Lab Work' : 'Teaching';
          }
          const payload = {
            from_time:     `${viewDate}T${period.from_time.slice(0, 5)}:00`,
            to_time:       `${viewDate}T${period.to_time.slice(0, 5)}:00`,
            activity_type: activityType,
            description:   buildDesc(period, idx),
          };
          if (existing?.id) await api.put(`/api/diary/${existing.id}`, payload);
          else              await api.post('/api/diary', payload);
          newSaved[idx] = true;
        } else {
          const { entry } = task;
          const curNote = (otherNotes[entry.id] ?? entry.description ?? '').trim();
          await api.put(`/api/diary/${entry.id}`, {
            from_time:     entry.from_time,
            to_time:       entry.to_time,
            activity_type: entry.activity_type,
            description:   curNote,
          });
          newSavedOther[entry.id] = true;
        }
        ok++;
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to save an entry.');
      }
    }));

    setSaving(false);
    if (ok > 0) {
      setSavedRows(newSaved);
      setSavedOther(newSavedOther);
      toast.success(`${ok} entr${ok > 1 ? 'ies' : 'y'} saved!`);
      onSave();
      setTimeout(() => { setSavedRows({}); setSavedOther({}); }, 3000);
    }
  };

  const activePeriods = periods.filter(p => !isBreak(p));
  if (activePeriods.length === 0 && otherEntries.length === 0) return null;

  const STATUS_STYLES = {
    Draft:     { bg: 'rgba(245,158,11,0.1)',  color: '#d97706', border: 'rgba(245,158,11,0.3)'  },
    Submitted: { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', border: 'rgba(99,102,241,0.3)'  },
    Approved:  { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', border: 'rgba(16,185,129,0.3)'  },
    Rejected:  { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)'   },
  };

  // ── Merge periods + other entries into a single time-sorted list ──
  const periodItems = periods.map((p, idx) => ({
    kind: 'period',
    sortKey: p.from_time?.slice(0,5) || '00:00',
    period: p, idx,
  }));
  const otherItems = otherEntries.map(e => ({
    kind: 'other',
    sortKey: new Date(e.from_time).toTimeString().slice(0,5),
    entry: e,
  }));
  const allRows = [...periodItems, ...otherItems].sort((a,b) =>
    a.sortKey.localeCompare(b.sortKey)
  );

  const totalCount = activePeriods.length + otherEntries.length;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={16} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Today's Schedule</span>
          <span style={{
            fontSize: '0.72rem', background: 'var(--color-surface-2)', borderRadius: 20,
            padding: '2px 8px', color: 'var(--color-text-muted)', fontWeight: 600,
          }}>
            {activePeriods.length} period{activePeriods.length !== 1 ? 's' : ''}
            {otherEntries.length > 0 && ` + ${otherEntries.length} other`}
          </span>
        </div>
        {isLocked && (
          <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={12} /> Diary locked
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{ borderRadius: 12, border: '1px solid var(--color-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 520 }}>
            <colgroup>
              <col style={{ width: 120 }} />
              <col style={{ width: 185 }} />
              <col />
            </colgroup>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)' }}>
                <th style={TH}>Timing</th>
                <th style={TH}>Class &amp; Subject</th>
                <th style={{ ...TH, textAlign: 'left', borderRight: 'none' }}>Enter Your Diary</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map((row, rowIdx) => {

                // ─── BREAK row ───────────────────────────────────────────
                if (row.kind === 'period' && isBreak(row.period)) {
                  return (
                    <tr key={`br-${rowIdx}`} style={{ background: 'rgba(245,158,11,0.04)' }}>
                      <td colSpan={3} style={{
                        padding: '8px 18px', fontSize: '0.72rem', color: '#d97706',
                        fontWeight: 600, borderBottom: '1px solid var(--color-border)',
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                      }}>
                        ☕ {fmt12(row.period.from_time?.slice(0, 5))} – {fmt12(row.period.to_time?.slice(0, 5))} · {row.period.short_name || 'Break'}
                      </td>
                    </tr>
                  );
                }

                // ─── TIMETABLE PERIOD row ────────────────────────────────
                if (row.kind === 'period') {
                  const { period, idx } = row;
                  const existing    = matchEntry(period);
                  const defaultNote = existing
                    ? (existing.description || '')
                        .replace(/^.+?\([^)]+\) - /, '')
                        .replace(/^.+? - /, '')
                    : '';
                  const curNote    = notes[idx] !== undefined ? notes[idx] : defaultNote;
                  const statusStyle = existing ? STATUS_STYLES[existing.status] || {} : null;
                  const isSaved    = !!savedRows[idx];
                  const isDisabled = isLocked && !existing?.edit_approved;
                  const isSubmitted = existing?.status === 'Submitted' || existing?.status === 'Approved';

                  const yearLabel  = period.year ? `${period.year}${['st','nd','rd','th'][Math.min(period.year-1,3)]} Yr` : '';
                  const classLine  = [yearLabel, period.section].filter(Boolean).join(' · ');
                  const subjectLine = period.subject_name || period.short_name || period.subject_code || '—';

                  return (
                    <tr key={`p-${idx}`} style={{
                      background: isSaved ? 'rgba(16,185,129,0.04)' : 'var(--color-bg)',
                      borderLeft: isSaved ? '3px solid #10b981' : '3px solid transparent',
                      transition: 'background 0.3s, border-color 0.3s',
                    }}>
                      <td style={{ ...TD, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)', lineHeight: 1.3 }}>
                          {fmt12(period.from_time?.slice(0, 5))}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                          to {fmt12(period.to_time?.slice(0, 5))}
                        </div>
                        {existing && (
                          <span style={{
                            display: 'inline-block', marginTop: 5,
                            fontSize: '0.62rem', fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                            background: statusStyle?.bg, color: statusStyle?.color,
                            border: `1px solid ${statusStyle?.border}`,
                          }}>{existing.status}</span>
                        )}
                      </td>
                      <td style={TD}>
                        {classLine && (
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text)', marginBottom: 3 }}>
                            {classLine}
                          </div>
                        )}
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                          {subjectLine}
                        </div>
                        {period.subject_type === 'Lab' && (
                          <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', borderRadius: 4, padding: '1px 5px', display: 'inline-block', marginTop: 4 }}>Lab</span>
                        )}
                        {period.isOtherWork && (
                          <span style={{ fontSize: '0.6rem', background: 'rgba(245,158,11,0.12)', color: '#d97706', borderRadius: 4, padding: '1px 5px', display: 'inline-block', marginTop: 4 }}>Other Work</span>
                        )}
                      </td>
                      <td style={{ ...TD, padding: '8px 12px', borderRight: 'none' }}>
                        <textarea
                          rows={2}
                          disabled={isDisabled || isSubmitted}
                          value={curNote}
                          onChange={e => setNotes(n => ({ ...n, [idx]: e.target.value }))}
                          placeholder={
                            isDisabled      ? 'Diary locked — request edit permission' :
                            isSubmitted     ? 'Already submitted — request edit to modify' :
                                              'Topic covered, notes for this class…'
                          }
                          style={{
                            width: '100%', resize: 'vertical',
                            background: (isDisabled || isSubmitted) ? 'var(--color-surface-2)' : 'var(--color-bg)',
                            border: `1px solid ${isSaved ? 'rgba(16,185,129,0.5)' : 'var(--color-border)'}`,
                            borderRadius: 6, padding: '7px 10px', fontSize: '0.83rem',
                            color: 'var(--color-text)', fontFamily: 'inherit',
                            outline: 'none', transition: 'border-color 0.2s',
                            opacity: (isDisabled || isSubmitted) ? 0.6 : 1,
                            cursor: (isDisabled || isSubmitted) ? 'not-allowed' : 'text',
                          }}
                          onFocus={e => { if (!isDisabled && !isSubmitted) e.target.style.borderColor = 'var(--color-primary)'; }}
                          onBlur={e  => { e.target.style.borderColor = isSaved ? 'rgba(16,185,129,0.5)' : 'var(--color-border)'; }}
                        />
                      </td>
                    </tr>
                  );
                }

                // ─── OTHER WORKS row ─────────────────────────────────────
                const { entry } = row;
                const color     = ACTIVITY_COLORS[entry.activity_type] || '#64748b';
                const ss        = STATUS_STYLES[entry.status] || {};
                const isSavedOth = !!savedOther[entry.id];
                const isSubmitted = entry.status === 'Submitted' || entry.status === 'Approved';
                const isDisabled  = isLocked && !entry.edit_approved;
                const curNote     = otherNotes[entry.id] !== undefined ? otherNotes[entry.id] : (entry.description || '');

                return (
                  <tr key={`o-${entry.id}`} style={{
                    background: isSavedOth ? 'rgba(16,185,129,0.04)' : `${color}06`,
                    borderLeft: `3px solid ${isSavedOth ? '#10b981' : color}`,
                    transition: 'background 0.3s',
                  }}>
                    {/* Timing */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color, lineHeight: 1.3 }}>
                        {fmt12Date(entry.from_time)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        to {fmt12Date(entry.to_time)}
                      </div>
                      <span style={{
                        display: 'inline-block', marginTop: 5,
                        fontSize: '0.62rem', fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                        background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                      }}>{entry.status}</span>
                    </td>

                    {/* Activity type */}
                    <td style={TD}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                        background: `${color}18`, color, letterSpacing: '0.02em', marginBottom: 4,
                      }}>{entry.activity_type}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Other Works
                      </div>
                      {/* action icons */}
                      {!isDisabled && (
                        <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                          {!isSubmitted && (
                            <>
                              <button className="btn-icon" title="Edit in modal"
                                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', width: 26, height: 26 }}
                                onClick={() => onEdit(entry)}>
                                <Edit2 size={11} />
                              </button>
                              <button className="btn-icon" title="Submit"
                                style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', width: 26, height: 26 }}
                                onClick={() => onSubmit(entry.id)}>
                                <CheckSquare size={11} />
                              </button>
                              <button className="btn-icon" title="Delete"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', width: 26, height: 26 }}
                                onClick={() => onDelete(entry.id)}>
                                <Trash2 size={11} />
                              </button>
                            </>
                          )}
                          {isSubmitted && (
                            <button className="btn-icon" title="Request Edit"
                              style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', width: 26, height: 26 }}
                              onClick={() => onRequestEdit(entry)}>
                              <AlertCircle size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Diary textarea */}
                    <td style={{ ...TD, padding: '8px 12px', borderRight: 'none' }}>
                      <textarea
                        rows={2}
                        disabled={isDisabled || isSubmitted}
                        value={curNote}
                        onChange={e => setOtherNotes(n => ({ ...n, [entry.id]: e.target.value }))}
                        placeholder={
                          isDisabled  ? 'Diary locked — request edit permission' :
                          isSubmitted ? 'Already submitted — request edit to modify' :
                                        'Notes, remarks…'
                        }
                        style={{
                          width: '100%', resize: 'vertical',
                          background: (isDisabled || isSubmitted) ? 'var(--color-surface-2)' : 'var(--color-bg)',
                          border: `1px solid ${isSavedOth ? 'rgba(16,185,129,0.5)' : 'var(--color-border)'}`,
                          borderRadius: 6, padding: '7px 10px', fontSize: '0.83rem',
                          color: 'var(--color-text)', fontFamily: 'inherit',
                          outline: 'none', transition: 'border-color 0.2s',
                          opacity: (isDisabled || isSubmitted) ? 0.6 : 1,
                          cursor: (isDisabled || isSubmitted) ? 'not-allowed' : 'text',
                        }}
                        onFocus={e => { if (!isDisabled && !isSubmitted) e.target.style.borderColor = color; }}
                        onBlur={e  => { e.target.style.borderColor = isSavedOth ? 'rgba(16,185,129,0.5)' : 'var(--color-border)'; }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Save All footer */}
        {!isLocked && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Saves all periods &amp; other works at once
            </span>
            <button
              id="save-all-diary-btn"
              className="btn btn-primary"
              onClick={handleSaveAll}
              disabled={saving}
              style={{ minWidth: 110 }}
            >
              {saving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save All'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}





const TH = {
  padding: '11px 14px', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem',
  color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)',
};
const TD = {
  padding: '10px 12px', borderBottom: '1px solid var(--color-border)',
  borderRight: '1px solid var(--color-border)', verticalAlign: 'top',
};



function EntryCard({ entry, onEdit, onDelete, onSubmit, onRequestEdit, isToday, isTodayLocked }) {
  const from = new Date(entry.from_time);
  const to   = new Date(entry.to_time);
  const dur  = ((to - from) / 60000).toFixed(0);
  const color = ACTIVITY_COLORS[entry.activity_type] || '#64748b';

  return (
    <div className="fade-in" style={{
      background: 'var(--color-surface)',
      border: `1px solid var(--color-border)`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      transition: 'transform 0.15s',
    }}>
      {/* Time column */}
      <div style={{ textAlign: 'center', minWidth: 60, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color }}>
          {format(from, 'HH:mm')}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
          {format(to, 'HH:mm')}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4, background: 'var(--color-surface-2)', borderRadius: 4, padding: '2px 4px' }}>
          {dur}m
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px',
            borderRadius: 6, background: `${color}22`, color,
          }}>
            {entry.activity_type}
          </span>
          <span className={`badge ${STATUS_CLASS[entry.status] || 'badge-draft'}`}>
            {entry.status}
          </span>
          {entry.edit_approved ? (
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(16,185,129,0.1)',
              color: 'var(--color-success)',
              border: '1.5px solid rgba(16,185,129,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <CheckCircle size={10} /> Edit Unlocked
            </span>
          ) : null}
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: entry.remarks ? 6 : 0 }}>
          {entry.description || <span style={{ color: 'var(--color-text-muted)' }}>No description</span>}
        </p>
        {entry.remarks && (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-warning)', marginTop: 4 }}>
            📝 Remarks: {entry.remarks}
          </p>
        )}
        {!!entry.edit_approved && entry.edit_window_expires_at && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
            <span>⏳ Edit window active until: {format(new Date(entry.edit_window_expires_at), 'MMM d, HH:mm')}</span>
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        {entry.edit_approved ? (
          <>
            <button
              id={`edit-entry-${entry.id}`}
              className="btn btn-sm btn-secondary btn-icon"
              onClick={() => onEdit(entry)}
              title="Edit"
              style={{ padding: 7 }}
            >
              <Edit2 size={14} />
            </button>
            {entry.status === 'Draft' && (
              <>
                <button
                  id={`delete-entry-${entry.id}`}
                  className="btn btn-sm btn-icon"
                  onClick={() => onDelete(entry.id)}
                  title="Delete"
                  style={{ padding: 7, background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  id={`submit-entry-${entry.id}`}
                  className="btn btn-sm btn-success"
                  onClick={() => onSubmit(entry.id)}
                >
                  <Send size={12} /> Submit
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {isToday && !isTodayLocked && entry.status === 'Draft' && (
              <>
                <button
                  id={`edit-entry-${entry.id}`}
                  className="btn btn-sm btn-secondary btn-icon"
                  onClick={() => onEdit(entry)}
                  title="Edit"
                  style={{ padding: 7 }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  id={`delete-entry-${entry.id}`}
                  className="btn btn-sm btn-icon"
                  onClick={() => onDelete(entry.id)}
                  title="Delete"
                  style={{ padding: 7, background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  id={`submit-entry-${entry.id}`}
                  className="btn btn-sm btn-success"
                  onClick={() => onSubmit(entry.id)}
                >
                  <Send size={12} /> Submit
                </button>
              </>
            )}
            {(!isToday || isTodayLocked) && (entry.status === 'Draft' || entry.status === 'Submitted' || entry.status === 'Approved') && (
              <button
                id={`request-edit-${entry.id}`}
                className="btn btn-sm btn-secondary"
                onClick={() => onRequestEdit(entry)}
              >
                <Edit2 size={12} /> Request Edit
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [entries, setEntries]         = useState([]);
  const [holiday, setHoliday]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editEntry, setEditEntry]     = useState(null);
  const [modalInitialMode, setModalInitialMode] = useState(null);
  const [reqEditEntry, setReqEdit]    = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [config, setConfig]           = useState({ diary_start_time: '08:30', diary_end_time: '16:10' });
  const [myTimetable, setMyTimetable] = useState([]);
  const [myOtherWorks, setMyOtherWorks] = useState([]);
  const [hasTimetable, setHasTimetable] = useState(null); // null = loading

  const [dateEditStatus, setDateEditStatus] = useState(null);
  const [dateEditApproved, setDateEditApproved] = useState(false);
  const [dateEditExpires, setDateEditExpires] = useState(null);
  const [dateEditRemarks, setDateEditRemarks] = useState(null);
  const [showDateRequestModal, setShowDateRequestModal] = useState(false);

  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()];
  };

  const todayLocal = new Date().toLocaleDateString('en-CA');
  const [viewDate, setViewDate]       = useState(todayLocal);

  const isTodayView = viewDate === todayLocal;

  const isTodayLocked = (() => {
    if (!isTodayView) return false;
    const currentLocalTime = new Date().toTimeString().slice(0, 5);
    return currentLocalTime > config.diary_end_time;
  })();

  const isLocked = (!isTodayView && !dateEditApproved) || (isTodayView && (isTodayLocked || !!holiday) && !dateEditApproved);

  const loadConfig = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/config');
      const cfg = res.data.data;
      setConfig({
        diary_start_time: cfg.diary_start_time?.config_value || '08:30',
        diary_end_time:   cfg.diary_end_time?.config_value   || '16:10',
      });
    } catch (_) {}
  }, []);

  const checkTimetable = useCallback(async () => {
    try {
      const res = await api.get('/api/timetable/mine');
      const data = res.data.data || [];
      setMyTimetable(data);
      setHasTimetable(data.length > 0);
    } catch (_) {
      setHasTimetable(false);
    }
  }, []);

  const checkOtherWorks = useCallback(async () => {
    try {
      const res = await api.get('/api/faculty/setup');
      const data = res.data.data.otherWorks || [];
      setMyOtherWorks(data);
    } catch (_) {}
  }, []);

  const loadEntries = useCallback(async (date) => {
    setLoading(true);
    try {
      if (date === todayLocal) {
        const res = await api.get('/api/diary/today');
        setEntries(res.data.data.entries || []);
        setHoliday(res.data.data.holiday);
        setDateEditStatus(res.data.data.date_edit_status || null);
        setDateEditApproved(res.data.data.date_edit_approved || false);
        setDateEditExpires(res.data.data.date_edit_window_expires_at || null);
        setDateEditRemarks(res.data.data.date_edit_remarks || null);
      } else {
        const res = await api.get(`/api/diary?date=${date}`);
        setEntries(res.data.data || []);
        setHoliday(res.data.holiday || null);
        setDateEditStatus(res.data.date_edit_status || null);
        setDateEditApproved(res.data.date_edit_approved || false);
        setDateEditExpires(res.data.date_edit_window_expires_at || null);
        setDateEditRemarks(res.data.date_edit_remarks || null);
      }
    } catch (err) {
      toast.error('Failed to load diary entries.');
    } finally {
      setLoading(false);
    }
  }, [todayLocal]);

  useEffect(() => { loadConfig(); checkTimetable(); checkOtherWorks(); }, [loadConfig, checkTimetable, checkOtherWorks]);
  useEffect(() => { loadEntries(viewDate); }, [viewDate, loadEntries]);

  const handleSaveEntry = async (data) => {
    if (editEntry) {
      await api.put(`/api/diary/${editEntry.id}`, data);
      toast.success('Entry updated.');
    } else {
      await api.post('/api/diary', data);
      toast.success('Entry added.');
    }
    loadEntries(viewDate);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this diary entry?')) return;
    try {
      await api.delete(`/api/diary/${id}`);
      toast.success('Entry deleted.');
      loadEntries(viewDate);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const handleSubmitEntry = async (id) => {
    try {
      await api.post(`/api/diary/${id}/submit`);
      toast.success('Entry submitted.');
      loadEntries(viewDate);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit.');
    }
  };

  const handleSubmitDay = async () => {
    const drafts = entries.filter(e => e.status === 'Draft');
    if (!drafts.length) { toast('No draft entries to submit.'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/diary/submit-day');
      toast.success(`${drafts.length} entries submitted!`);
      loadEntries(viewDate);
    } catch (err) {
      toast.error('Failed to submit all.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRequest = async (entryId, reason) => {
    await api.post('/api/diary/request-edit', { diary_log_id: entryId, reason });
  };

  const handleDateEditRequest = async (reason) => {
    try {
      await api.post('/api/diary/request-edit', { date: viewDate, reason });
      toast.success('Date edit request submitted.');
      loadEntries(viewDate);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    }
  };

  const changeDate = (days) => {
    const d = new Date(viewDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const dateStr = d.toLocaleDateString('en-CA');
    if (dateStr > todayLocal) return; // can't go to future
    setViewDate(dateStr);
  };

  const draftCount     = entries.filter(e => e.status === 'Draft').length;
  const submittedCount = entries.filter(e => e.status === 'Submitted').length;
  const approvedCount  = entries.filter(e => e.status === 'Approved').length;

  // Timeline percentage helper
  const totalWindow = (() => {
    const [sh, sm] = config.diary_start_time.split(':').map(Number);
    const [eh, em] = config.diary_end_time.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  })();

  return (
    <AppLayout title="Daily Activity Diary">

      {/* ── Timetable gate ── */}
      {hasTimetable === null && (
        <div className="empty-state">
          <Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>
      )}

      {hasTimetable === false && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 0,
        }}>
          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(99,102,241,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <CalendarDays size={38} style={{ color: 'var(--color-primary)' }} />
          </div>

          <h2 style={{ fontWeight: 800, fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: 10 }}>
            Set up your Timetable first
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: 400, marginBottom: 28, lineHeight: 1.6 }}>
            Your diary auto-fills from your weekly timetable.
            Please add your class schedule before writing diary entries.
          </p>

          {/* Steps */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {[
              { n: '1', text: 'Go to My Timetable' },
              { n: '2', text: 'Add your class slots' },
              { n: '3', text: 'Come back and write diary' },
            ].map(step => (
              <div key={step.n} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 10, padding: '10px 16px', fontSize: '0.82rem',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                }}>{step.n}</span>
                {step.text}
              </div>
            ))}
          </div>

          <button
            id="go-to-timetable-btn"
            className="btn btn-primary"
            style={{ padding: '12px 28px', fontSize: '0.95rem' }}
            onClick={() => navigate('/timetable')}
          >
            <CalendarDays size={16} /> Go to My Timetable <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ── Diary UI — only shown when timetable exists ── */}
      {hasTimetable === true && (
        <>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            {/* Date navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-secondary btn-icon" onClick={() => changeDate(-1)}>
                <ChevronLeft size={16} />
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>
                  {format(new Date(viewDate), 'EEEE, MMMM d')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {isTodayView ? '📅 Today' : format(new Date(viewDate), 'yyyy')}
                </div>
              </div>
              {!isTodayView && (
                <button className="btn btn-secondary btn-icon" onClick={() => changeDate(1)}>
                  <ChevronRight size={16} />
                </button>
              )}
              {!isTodayView && (
                <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }}
                  onClick={() => setViewDate(todayLocal)}>
                  Back to Today
                </button>
              )}
            </div>



          </div>

          {/* Lock / Holiday / Approved banner block */}
          {(() => {
            const holidayText = holiday;

            if (dateEditApproved) {
              const remainingTimeStr = dateEditExpires 
                ? format(new Date(dateEditExpires), 'MMM d, HH:mm') 
                : 'limited window';
              return (
                <div style={{
                  padding: '14px 20px', 
                  background: 'rgba(16,185,129,0.1)', 
                  border: '1.5px solid rgba(16,185,129,0.25)',
                  borderRadius: 12, 
                  marginBottom: 20, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: 12, 
                  color: 'var(--color-success)',
                  fontWeight: 600, 
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={16} />
                    <span>
                      ✅ Edit window active! You can write and edit entries for this date until <strong>{remainingTimeStr}</strong>.
                    </span>
                  </div>
                </div>
              );
            }

            if (isLocked) {
              return (
                <div style={{
                  padding: '16px 20px',
                  background: 'rgba(99,102,241,0.04)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 12,
                  marginBottom: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                  {holidayText && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, color: '#fbbf24', fontWeight: 700, fontSize: '0.92rem'
                    }}>
                      <span>🎉 Holiday: {holidayText}</span>
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)', fontSize: '0.88rem' }}>
                      <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                      <div>
                        {dateEditStatus === 'Pending' ? (
                          <span>
                            ⏳ <strong>Edit request pending review</strong>. HOD or Administrator approval is required to write/modify entries.
                          </span>
                        ) : dateEditStatus === 'Rejected' ? (
                          <span>
                            ❌ <strong>Request rejected</strong>. Remarks: <span style={{ color: 'var(--color-danger)' }}>{dateEditRemarks || 'None'}</span>
                          </span>
                        ) : (
                          <span>
                            🔒 <strong>Diary Locked</strong>. Diary editing and writing for this date is restricted.
                          </span>
                        )}
                      </div>
                    </div>

                    {dateEditStatus === 'Pending' ? (
                      <button className="btn btn-secondary" disabled style={{ opacity: 0.6, cursor: 'not-allowed', fontSize: '0.8rem', padding: '6px 12px' }}>
                        Pending Review
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{
                          fontSize: '0.8rem',
                          padding: '8px 14px',
                          borderColor: 'var(--color-primary)',
                          color: 'var(--color-primary)',
                          background: 'transparent',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        onClick={() => setShowDateRequestModal(true)}
                      >
                        <Clock size={13} /> Request Edit Permission
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            if (holidayText) {
              return (
                <div style={{
                  padding: '12px 20px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#fbbf24',
                  fontWeight: 600, fontSize: '0.9rem'
                }}>
                  🎉 Holiday: {holidayText}
                </div>
              );
            }

            return null;
          })()}

          {/* Loading */}
          {loading ? (
            <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
          ) : (
            <>
              {/* ── Timetable Diary Table ── */}
              {isTodayView && (() => {
                const dayOfWeek = getDayOfWeek(viewDate);
                const todayRegularPeriods = myTimetable.filter(p => p.day === dayOfWeek);
                const todayOtherWorks = myOtherWorks.filter(ow => ow.day === dayOfWeek).map(ow => ({
                  day: ow.day,
                  from_time: ow.from_time,
                  to_time: ow.to_time,
                  subject_type: 'Other Work',
                  short_name: ow.duty_name,
                  subject_name: 'Other Work',
                  subject_code: 'OTHER',
                  isOtherWork: true
                }));
                const todayPeriods = [...todayRegularPeriods, ...todayOtherWorks].sort((a, b) =>
                  a.from_time.localeCompare(b.from_time)
                );
                return todayPeriods.length > 0 ? (
                  <>
                    {/* ── Other Works button — top of section ── */}
                    {!isLocked && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        <button
                          id="add-other-work-btn"
                          className="btn btn-secondary"
                          onClick={() => {
                            setEditEntry(null);
                            setModalInitialMode('other');
                            setShowModal(true);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            border: '1.5px dashed var(--color-border)',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text-muted)',
                            fontWeight: 600, fontSize: '0.82rem',
                            padding: '8px 16px', borderRadius: 9,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.color = 'var(--color-primary)';
                            e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.background = 'var(--color-surface)';
                          }}
                        >
                          <Briefcase size={14} />
                          + Add Other Works Done
                        </button>
                      </div>
                    )}
                    <TimetableDiaryTable
                      periods={todayPeriods}
                      entries={entries}
                      otherEntries={(() => {
                        const isBreakP = (p) => {
                          const t = (p.subject_type || '').toLowerCase();
                          const n = (p.short_name || p.subject_code || '').toLowerCase();
                          return t === 'break' || ['break','lunch','recess','tea','interval','free'].some(w => n.includes(w));
                        };
                        const active = todayPeriods.filter(p => !isBreakP(p));
                        return entries.filter(e => {
                          const eFrom = new Date(e.from_time).toTimeString().slice(0,5);
                          const eTo   = new Date(e.to_time).toTimeString().slice(0,5);
                          return !active.some(p => eFrom <= p.from_time?.slice(0,5) && eTo >= p.to_time?.slice(0,5));
                        });
                      })()}
                      onSave={() => loadEntries(viewDate)}
                      isLocked={isLocked}
                      viewDate={viewDate}
                      onEdit={(e) => { setEditEntry(e); setModalInitialMode('other'); setShowModal(true); }}
                      onDelete={handleDelete}
                      onSubmit={handleSubmitEntry}
                      onRequestEdit={(e) => setReqEdit(e)}
                    />
                  </>
                ) : null;
              })()}

              {/* ── Non-today view: show all entries in same table style ── */}
              {!isTodayView && entries.length > 0 && (
                <TimetableDiaryTable
                  periods={[]}
                  entries={[]}
                  otherEntries={entries}
                  onSave={() => loadEntries(viewDate)}
                  isLocked={isLocked}
                  viewDate={viewDate}
                  onEdit={(e) => { setEditEntry(e); setModalInitialMode('other'); setShowModal(true); }}
                  onDelete={handleDelete}
                  onSubmit={handleSubmitEntry}
                  onRequestEdit={(e) => setReqEdit(e)}
                />
              )}

              {/* ── Empty state (no timetable AND no entries) ── */}
              {!isTodayView && entries.length === 0 && (
                <div className="empty-state" style={{ padding: '60px 20px' }}>
                  <BookOpen size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <p style={{ fontWeight: 600 }}>No entries for this date</p>
                </div>
              )}
              {isTodayView && entries.length === 0 && myTimetable.filter(p => p.day === getDayOfWeek(viewDate)).length === 0 && (
                <div className="empty-state" style={{ padding: '60px 20px' }}>
                  <BookOpen size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>No timetable for today</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 18 }}>
                    No classes are scheduled for today. You can still log other activities.
                  </p>
                  {!isLocked && (
                    <button
                      id="add-other-work-empty-btn"
                      className="btn btn-primary"
                      onClick={() => { setEditEntry(null); setShowModal(true); }}
                    >
                      <Briefcase size={15} /> Add Other Works Done
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Modals */}
          {showModal && (
            <EntryModal
              existingEntry={editEntry}
              todayStart={config.diary_start_time}
              todayEnd={config.diary_end_time}
              existingSlots={entries}
              initialMode={modalInitialMode}
              todaysPeriods={myTimetable.filter(p => {
                if (p.day !== getDayOfWeek(viewDate)) return false;
                const label = (p.short_name || '').toLowerCase();
                const code = (p.subject_code || '').toLowerCase();
                const type = (p.subject_type || '').toLowerCase();
                return !label.includes('break') && !label.includes('lunch') && 
                       !label.includes('recess') && !label.includes('interval') && 
                       !label.includes('tea') && !label.includes('free') &&
                       !code.includes('break') && !code.includes('lunch') && 
                       !code.includes('recess') && !code.includes('interval') && 
                       !code.includes('tea') && !code.includes('free') &&
                       type !== 'break';
              })}
              onClose={() => { setShowModal(false); setEditEntry(null); setModalInitialMode(null); }}
              onSave={handleSaveEntry}
            />
          )}
          {reqEditEntry && (
            <EditRequestModal
              entry={reqEditEntry}
              onClose={() => setReqEdit(null)}
              onSubmit={handleEditRequest}
            />
          )}
          {showDateRequestModal && (
            <DateEditRequestModal
              date={viewDate}
              onClose={() => setShowDateRequestModal(false)}
              onSubmit={handleDateEditRequest}
            />
          )}
        </>
      )}
    </AppLayout>
  );
}

