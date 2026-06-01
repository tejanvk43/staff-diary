import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Loader2, CalendarDays, ChevronRight, BookOpen, Upload, Download } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import * as XLSX from 'xlsx';

const CARD_COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

// ─── Create / Rename Modal — Programme, Year, Section, Branch, Name ───────────────────────────────────
function BlockNameModal({ existing, onClose, onSave, programs, sections }) {
  const [educationType, setEducationType] = useState(existing?.education_type || programs[0]?.name || 'B-Tech');
  
  // Find selected program structure
  const selectedProg = programs.find(p => p.name === educationType) || programs[0];
  const availableYears = selectedProg?.years || [];
  const availableBranches = selectedProg?.branches || [];

  const [year, setYear] = useState(existing?.year || availableYears[0]?.year_number || 1);
  const [section, setSection] = useState(existing?.section || '');
  const [department, setDepartment] = useState(existing?.department || availableBranches[0]?.branch_name || 'General');
  const [name, setName] = useState(existing?.name || '');
  const [saving, setSaving] = useState(false);

  // Filter sections by program and year
  const availableSections = sections.filter(s => 
    s.education_type === educationType && 
    Number(s.year) === Number(year)
  );

  // Automatically update year/branch options when programme type changes
  const handleEduTypeChange = (val) => {
    setEducationType(val);
    const prog = programs.find(p => p.name === val);
    const years = prog?.years || [];
    const branches = prog?.branches || [];
    
    const defaultYear = years[0]?.year_number || 1;
    setYear(defaultYear);
    setDepartment(branches[0]?.branch_name || 'General');
    
    // Auto-suggest name
    const defaultSection = sections.find(s => s.education_type === val && Number(s.year) === Number(defaultYear))?.section_name || '';
    setSection(defaultSection);
    suggestName(val, defaultYear, defaultSection);
  };

  const handleYearChange = (val) => {
    const yrNum = parseInt(val);
    setYear(yrNum);
    const defaultSection = sections.find(s => s.education_type === educationType && Number(s.year) === yrNum)?.section_name || '';
    setSection(defaultSection);
    suggestName(educationType, yrNum, defaultSection);
  };

  const handleSectionChange = (val) => {
    setSection(val);
    suggestName(educationType, year, val);
  };

  const suggestName = (edu, yr, sec) => {
    const yrLabel = programs.find(p => p.name === edu)?.years?.find(y => y.year_number === yr)?.year_name || `Yr ${yr}`;
    const secSuffix = sec ? ` - ${sec}` : '';
    setName(`${edu} (${yrLabel})${secSuffix}`);
  };

  // Run initial name suggestion for new block if empty
  useEffect(() => {
    if (!existing && !name) {
      suggestName(educationType, year, section);
    }
  }, [programs, sections]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Block name is required.'); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        education_type: educationType,
        year: parseInt(year),
        section: section || null,
        department: department || 'General'
      });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleSave(); };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 2 }}>
              {existing ? 'Edit Block Timetable' : 'Create Timetable Block'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Configure programme, year, and section for this block
            </p>
          </div>
          <button
            className="btn-icon"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Programme *</label>
              <select className="input" value={educationType} onChange={e => handleEduTypeChange(e.target.value)}>
                {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year *</label>
              <select className="input" value={year} onChange={e => handleYearChange(e.target.value)}>
                {availableYears.map(y => <option key={y.year_number} value={y.year_number}>{y.year_name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="input" value={section} onChange={e => handleSectionChange(e.target.value)}>
                <option value="">— Select Section —</option>
                {availableSections.map(s => <option key={s.id} value={s.section_name}>{s.section_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Branch / Department</label>
              <select className="input" value={department} onChange={e => setDepartment(e.target.value)}>
                <option value="General">General</option>
                {availableBranches.map(b => <option key={b.id} value={b.branch_name}>{b.branch_name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="bt-name">Block Name</label>
            <input
              id="bt-name"
              className="input"
              value={name}
              placeholder="e.g. CSE-A 2nd Year, ECE Block B…"
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKey}
              style={{ fontSize: '1rem', padding: '10px 12px' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
            Cancel
          </button>
          <button
            id="save-bt-btn"
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? <Loader2 size={14} className="spinner" /> : <CalendarDays size={14} />}
            {existing ? 'Save Details' : 'Create Timetable'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BlockTimetablePage() {
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState([]);
  const [programs, setPrograms]     = useState([]);
  const [sections, setSections]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [btRes, progRes, secRes] = await Promise.all([
        api.get('/api/admin/block-timetables?source=manual'),
        api.get('/api/admin/programs/details'),
        api.get('/api/admin/sections'),
      ]);
      setTimetables(btRes.data.data || []);
      setPrograms(progRes.data.data || []);
      setSections(secRes.data.data || []);
    } catch (_) {
      toast.error('Failed to load timetables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Create: save then immediately open the editor
  const handleCreate = async (data) => {
    const res = await api.post('/api/admin/block-timetables', data);
    toast.success('Timetable created! Add your slots now.');
    navigate(`/admin/block-timetables/${res.data.id}`);
  };

  // Rename/update existing
  const handleRename = async (data) => {
    await api.put(`/api/admin/block-timetables/${editItem.id}`, data);
    toast.success('Block timetable updated.');
    load();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? All its periods will be removed.`)) return;
    try {
      await api.delete(`/api/admin/block-timetables/${id}`);
      toast.success('Deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  };



  return (
    <AppLayout title="Block Timetables">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Block Timetables</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Timing templates that define period slots &amp; break times for each class block
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.72rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '3px 10px', color: 'var(--color-primary)', cursor: 'pointer' }}
            onClick={() => navigate('/admin/section-timetables')}>
            <CalendarDays size={11} /> View Section-wise Timetables →
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            id="create-bt-btn"
            className="btn btn-primary"
            onClick={() => { setEditItem(null); setShowModal(true); }}
            disabled={loading || programs.length === 0}
          >
            <Plus size={14} /> New Timetable
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="empty-state">
          <Loader2 size={32} className="spinner" style={{ color: 'var(--color-primary)' }} />
        </div>

      ) : timetables.length === 0 ? (
        <div className="empty-state" style={{ padding: '70px 20px' }}>
          <CalendarDays size={56} style={{ opacity: 0.18, marginBottom: 14 }} />
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>No timetables yet</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 24, maxWidth: 320, textAlign: 'center' }}>
            Create a timetable block for each class or section and fill in the periods.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => { setEditItem(null); setShowModal(true); }}
            disabled={programs.length === 0}
          >
            <Plus size={14} /> Create First Block
          </button>
        </div>

      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>

          {/* Existing blocks */}
          {timetables.map((t, idx) => {
            const color = CARD_COLORS[idx % CARD_COLORS.length];
            
            // Look up year custom name
            const prog = programs.find(p => p.name === t.education_type);
            const yrLabel = prog?.years?.find(y => Number(y.year_number) === Number(t.year))?.year_name || `Year ${t.year}`;

            return (
              <div
                key={t.id}
                className="card"
                style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer' }}
                onClick={() => navigate(`/admin/block-timetables/${t.id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                {/* Colour strip */}
                <div style={{ height: 6, background: color }} />

                <div style={{ padding: '18px 20px' }}>
                  {/* Block name */}
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 10, lineHeight: 1.3 }}>
                    {t.name}
                  </div>

                  {/* Metadata tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${color}15`, color }}>
                      {t.education_type}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                      {yrLabel} {t.section ? `· ${t.section}` : ''}
                    </span>
                  </div>

                  {/* Period count pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
                    <BookOpen size={13} style={{ color }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {t.slot_count || 0} period{t.slot_count !== 1 ? 's' : ''} configured
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                    {/* Open editor */}
                    <button
                      id={`open-bt-${t.id}`}
                      className="btn btn-sm"
                      style={{
                        flex: 1, justifyContent: 'center', fontSize: '0.78rem', fontWeight: 600,
                        background: color, color: '#fff', border: 'none', borderRadius: 8,
                        display: 'flex', alignItems: 'center', gap: 5, padding: '7px 0',
                      }}
                      onClick={() => navigate(`/admin/block-timetables/${t.id}`)}
                    >
                      Open Editor <ChevronRight size={13} />
                    </button>

                    {/* Edit info */}
                    <button
                      id={`rename-bt-${t.id}`}
                      title="Edit timetable info"
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '7px 10px' }}
                      onClick={() => { setEditItem(t); setShowModal(true); }}
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Delete */}
                    <button
                      id={`delete-bt-${t.id}`}
                      title="Delete"
                      className="btn btn-sm"
                      style={{ padding: '7px 10px', background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.25)' }}
                      onClick={() => handleDelete(t.id, t.name)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* "+ Add" card */}
          <div
            onClick={() => { setEditItem(null); setShowModal(true); }}
            style={{
              border: '2px dashed var(--color-border)', borderRadius: 12, minHeight: 172,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--color-text-muted)', gap: 8,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <Plus size={24} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>New Block</span>
          </div>
        </div>
      )}

      {showModal && (
        <BlockNameModal
          existing={editItem}
          programs={programs}
          sections={sections}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={editItem ? handleRename : handleCreate}
        />
      )}
    </AppLayout>
  );
}
