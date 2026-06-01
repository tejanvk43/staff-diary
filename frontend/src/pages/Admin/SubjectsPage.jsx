import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Edit2, X, Loader2, BookOpen,
  Layers, Settings, Users, ChevronRight, AlertCircle,
} from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

// ─── Colour palette for dynamic subject type badges ──────────────────────────
const TYPE_PALETTE = [
  { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },  // indigo
  { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },  // emerald
  { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24' },  // amber
  { bg: 'rgba(236,72,153,0.15)', text: '#f472b6' },  // pink
  { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },  // blue
  { bg: 'rgba(168,85,247,0.15)', text: '#c084fc' },  // purple
  { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },  // red
  { bg: 'rgba(20,184,166,0.15)', text: '#2dd4bf' },  // teal
];

function typeColor(name, idx) {
  // Deterministic colour: use index from the list order
  const i = idx % TYPE_PALETTE.length;
  return TYPE_PALETTE[i];
}

// ─── Subject Modal ────────────────────────────────────────────────────────────
function SubjectModal({ subject, departments, programs, subjectTypes, onClose, onSave }) {
  const [form, setForm] = useState({
    subject_code:   subject?.subject_code   || '',
    subject_name:   subject?.subject_name   || '',
    subject_type:   subject?.subject_type   || (subjectTypes[0]?.name || ''),
    education_type: subject?.education_type || (programs[0]?.name || ''),
    year:           subject?.year           || 1,
    semester:       subject?.semester       || 1,
    department:     subject?.department     || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.subject_code || !form.subject_name || !form.department) {
      toast.error('Code, name, and department are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} style={{ color: '#818cf8' }} />
            </div>
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {subject ? 'Edit Subject' : 'Add Subject'}
            </h3>
          </div>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="sub-code">Subject Code *</label>
            <input id="sub-code" className="input" value={form.subject_code}
              onChange={e => set('subject_code', e.target.value)} placeholder="CS3001" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sub-type">Subject Type *</label>
            <select id="sub-type" className="input" value={form.subject_type}
              onChange={e => set('subject_type', e.target.value)}>
              {subjectTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="sub-name">Subject Name *</label>
            <input id="sub-name" className="input" value={form.subject_name}
              onChange={e => set('subject_name', e.target.value)} placeholder="Data Structures" />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="sub-dept">Department *</label>
            <select id="sub-dept" className="input" value={form.department}
              onChange={e => set('department', e.target.value)}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.department_name}>{d.department_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sub-edu">Education Type *</label>
            <select id="sub-edu" className="input" value={form.education_type}
              onChange={e => set('education_type', e.target.value)}>
              {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sub-year">Year</label>
            <input id="sub-year" type="number" className="input" min={1} max={4}
              value={form.year} onChange={e => set('year', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" htmlFor="sub-sem">Semester</label>
            <input id="sub-sem" type="number" className="input" min={1} max={8}
              value={form.semester} onChange={e => set('semester', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-subject-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />} {subject ? 'Update Subject' : 'Add Subject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subject Type Modal ───────────────────────────────────────────────────────
function SubjectTypeModal({ typeEntry, onClose, onSave }) {
  const [form, setForm] = useState({
    name:        typeEntry?.name        || '',
    short_name:  typeEntry?.short_name  || '',
    max_faculty: typeEntry?.max_faculty || 1,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim())       { toast.error('Type name is required.'); return; }
    if (!form.short_name.trim()) { toast.error('Short name (abbreviation) is required.'); return; }
    if (form.short_name.trim().length > 10) { toast.error('Short name must be 10 characters or fewer.'); return; }
    if (parseInt(form.max_faculty) < 1) { toast.error('Max faculty must be at least 1.'); return; }
    setSaving(true);
    try {
      await onSave({
        name:        form.name.trim(),
        short_name:  form.short_name.trim().toUpperCase(),
        max_faculty: parseInt(form.max_faculty),
      });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save type.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} style={{ color: '#c084fc' }} />
            </div>
            <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              {typeEntry ? 'Edit Subject Type' : 'New Subject Type'}
            </h3>
          </div>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="stype-name">Type Name *</label>
              <input id="stype-name" className="input" value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Drawing, Seminar, Elective" />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 110 }}>
              <label className="form-label" htmlFor="stype-short">Short Name *</label>
              <input
                id="stype-short"
                className="input"
                value={form.short_name}
                maxLength={10}
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                onChange={e => set('short_name', e.target.value.toUpperCase())}
                placeholder="e.g. DRW"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="stype-maxfac">Max Faculty per Room/Slot *</label>
            <input id="stype-maxfac" type="number" className="input" min={1} max={20}
              value={form.max_faculty} onChange={e => set('max_faculty', e.target.value)} />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              A conflict is reported when more faculty than this limit occupy the same room & slot for this type.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-stype-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />} {typeEntry ? 'Update' : 'Create Type'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubjectsPage() {
  const [activeTab, setActiveTab]   = useState('catalogue');
  const [subjects, setSubjects]     = useState([]);
  const [subjectTypes, setTypes]    = useState([]);
  const [departments, setDepts]     = useState([]);
  const [programs, setPrograms]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editSubject, setEditSubject]           = useState(null);
  const [showTypeModal, setShowTypeModal]       = useState(false);
  const [editType, setEditType]                 = useState(null);
  const [deptFilter, setDeptFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, tr, dr, pr] = await Promise.all([
        api.get('/api/admin/subjects'),
        api.get('/api/admin/subject-types'),
        api.get('/api/admin/departments'),
        api.get('/api/admin/programs'),
      ]);
      setSubjects(sr.data.data || []);
      setTypes(tr.data.data || []);
      setDepts(dr.data.data || []);
      setPrograms(pr.data.data || []);
    } catch (_) {
      toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build a name→colour index from the ordered list
  const typeColorMap = {};
  subjectTypes.forEach((t, idx) => { typeColorMap[t.name] = typeColor(t.name, idx); });

  // ── Subject handlers ──────────────────────────────────────────────────────
  const handleSaveSubject = async (form) => {
    if (editSubject) {
      await api.put(`/api/admin/subjects/${editSubject.id}`, form);
      toast.success('Subject updated.');
    } else {
      await api.post('/api/admin/subjects', form);
      toast.success('Subject created.');
    }
    load();
  };

  const handleDeleteSubject = async (id, name) => {
    if (!confirm(`Delete subject "${name}"?`)) return;
    try {
      await api.delete(`/api/admin/subjects/${id}`);
      toast.success('Subject deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  };

  // ── Subject Type handlers ─────────────────────────────────────────────────
  const handleSaveType = async (form) => {
    if (editType) {
      await api.put(`/api/admin/subject-types/${editType.id}`, form);
      toast.success('Subject type updated.');
    } else {
      await api.post('/api/admin/subject-types', form);
      toast.success('Subject type created.');
    }
    load();
  };

  const handleDeleteType = async (t) => {
    if (!confirm(`Delete subject type "${t.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/subject-types/${t.id}`);
      toast.success(`Type "${t.name}" deleted.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete type.');
    }
  };

  // ── Filtered subjects ─────────────────────────────────────────────────────
  const filtered = subjects.filter(s => {
    if (deptFilter && s.department !== deptFilter) return false;
    if (typeFilter && s.subject_type !== typeFilter) return false;
    return true;
  });

  // ── Shared tab style ──────────────────────────────────────────────────────
  const tabStyle = (key) => ({
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 18px', borderRadius: 8, fontWeight: 600,
    fontSize: '0.875rem', cursor: 'pointer', border: 'none', transition: 'all .2s',
    background: activeTab === key ? 'var(--color-primary)' : 'var(--color-surface-2)',
    color: activeTab === key ? '#fff' : 'var(--color-text-muted)',
    boxShadow: activeTab === key ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
  });

  return (
    <AppLayout title="Subject Management">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Subject Management</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {subjects.length} subjects · {subjectTypes.length} types configured
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeTab === 'catalogue' && (
            <button id="add-subject-btn" className="btn btn-primary"
              onClick={() => { setEditSubject(null); setShowSubjectModal(true); }}>
              <Plus size={14} /> Add Subject
            </button>
          )}
          {activeTab === 'types' && (
            <button id="add-type-btn" className="btn btn-primary"
              onClick={() => { setEditType(null); setShowTypeModal(true); }}>
              <Plus size={14} /> New Type
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={tabStyle('catalogue')} onClick={() => setActiveTab('catalogue')}>
          <BookOpen size={15} /> Subject Catalogue
        </button>
        <button id="tab-subject-types" style={tabStyle('types')} onClick={() => setActiveTab('types')}>
          <Layers size={15} /> Subject Types
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : (
        <>
          {/* ══════════════ CATALOGUE TAB ══════════════ */}
          {activeTab === 'catalogue' && (
            <>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <select id="subj-dept-filter" className="input" style={{ maxWidth: 220 }}
                  value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.department_name}>{d.department_code} — {d.department_name}</option>)}
                </select>
                <select id="subj-type-filter" className="input" style={{ maxWidth: 200 }}
                  value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="">All Types</option>
                  {subjectTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">
                  <BookOpen size={48} style={{ opacity: 0.3 }} />
                  <h3 style={{ fontWeight: 600 }}>No subjects found</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {deptFilter || typeFilter ? 'Try clearing the filters.' : 'Add your first subject to get started.'}
                  </p>
                  {!deptFilter && !typeFilter && (
                    <button className="btn btn-primary" style={{ marginTop: 12 }}
                      onClick={() => { setEditSubject(null); setShowSubjectModal(true); }}>
                      <Plus size={14} /> Add Subject
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Department</th>
                        <th>Education</th>
                        <th style={{ textAlign: 'center' }}>Yr</th>
                        <th style={{ textAlign: 'center' }}>Sem</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => {
                        const col = typeColorMap[s.subject_type] || TYPE_PALETTE[0];
                        return (
                          <tr key={s.id}>
                            <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>{s.subject_code}</span></td>
                            <td style={{ fontWeight: 500, fontSize: '0.875rem' }}>{s.subject_name}</td>
                            <td>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 9px', borderRadius: 6, background: col.bg, color: col.text }}>
                                {s.subject_type}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{s.department}</td>
                            <td style={{ fontSize: '0.8rem' }}>{s.education_type}</td>
                            <td style={{ fontSize: '0.8rem', textAlign: 'center' }}>{s.year}</td>
                            <td style={{ fontSize: '0.8rem', textAlign: 'center' }}>{s.semester}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                <button id={`edit-subj-${s.id}`} className="btn btn-sm btn-secondary btn-icon"
                                  onClick={() => { setEditSubject(s); setShowSubjectModal(true); }} title="Edit">
                                  <Edit2 size={12} />
                                </button>
                                <button id={`delete-subj-${s.id}`} className="btn btn-sm btn-icon"
                                  style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
                                  onClick={() => handleDeleteSubject(s.id, s.subject_name)} title="Delete">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ══════════════ SUBJECT TYPES TAB ══════════════ */}
          {activeTab === 'types' && (
            <>
              {/* Info banner */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
                borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                marginBottom: 20,
              }}>
                <AlertCircle size={16} style={{ color: '#818cf8', marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  Subject types control the <strong style={{ color: 'var(--color-text)' }}>Max Faculty</strong> limit used during conflict detection.
                  A timetable conflict is flagged when the number of faculty assigned to the same room &amp; time slot exceeds a type's limit.
                </p>
              </div>

              {subjectTypes.length === 0 ? (
                <div className="empty-state">
                  <Layers size={48} style={{ opacity: 0.3 }} />
                  <h3 style={{ fontWeight: 600 }}>No subject types configured</h3>
                  <button className="btn btn-primary" style={{ marginTop: 12 }}
                    onClick={() => { setEditType(null); setShowTypeModal(true); }}>
                    <Plus size={14} /> New Type
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {subjectTypes.map((t, idx) => {
                    const col = typeColor(t.name, idx);
                    const usageCount = subjects.filter(s => s.subject_type === t.name).length;
                    return (
                      <div key={t.id} style={{
                        background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
                        borderRadius: 14, padding: '18px 20px', position: 'relative',
                        transition: 'border-color .2s, box-shadow .2s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = col.text; e.currentTarget.style.boxShadow = `0 4px 20px ${col.bg}`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {/* Type badge + name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Layers size={18} style={{ color: col.text }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-display)' }}>{t.name}</div>
                              {t.short_name && (
                                <span style={{
                                  fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                                  background: col.bg, color: col.text, fontFamily: 'monospace', letterSpacing: '0.06em',
                                }}>
                                  {t.short_name}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {usageCount} subject{usageCount !== 1 ? 's' : ''} assigned
                            </div>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                          <div style={{ flex: 1, background: 'var(--color-surface-2)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <Users size={12} style={{ color: col.text }} />
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>MAX FACULTY</span>
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: col.text, lineHeight: 1 }}>{t.max_faculty}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>per room/slot</div>
                          </div>
                          <div style={{ flex: 1, background: 'var(--color-surface-2)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <BookOpen size={12} style={{ color: 'var(--color-text-muted)' }} />
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>SUBJECTS</span>
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>{usageCount}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>in catalogue</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button id={`edit-type-${t.id}`} className="btn btn-sm btn-secondary"
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                            onClick={() => { setEditType(t); setShowTypeModal(true); }}>
                            <Edit2 size={12} /> Edit
                          </button>
                          <button id={`delete-type-${t.id}`} className="btn btn-sm btn-icon"
                            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', padding: '6px 10px' }}
                            onClick={() => handleDeleteType(t)} title="Delete type">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {showSubjectModal && (
        <SubjectModal
          subject={editSubject}
          departments={departments}
          programs={programs}
          subjectTypes={subjectTypes}
          onClose={() => { setShowSubjectModal(false); setEditSubject(null); }}
          onSave={handleSaveSubject}
        />
      )}
      {showTypeModal && (
        <SubjectTypeModal
          typeEntry={editType}
          onClose={() => { setShowTypeModal(false); setEditType(null); }}
          onSave={handleSaveType}
        />
      )}
    </AppLayout>
  );
}
