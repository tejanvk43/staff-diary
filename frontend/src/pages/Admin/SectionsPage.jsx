import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Loader2, LayoutGrid, Upload, Download } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import * as XLSX from 'xlsx';

function SectionModal({ section, departments, programs, blocks, onClose, onSave }) {
  const [form, setForm] = useState({
    section_name:   section?.section_name   || '',
    education_type: section?.education_type || programs[0]?.name || '',
    year:           section?.year           || 1,
    department:     section?.department     || '',
    block_id:       section?.block_id       || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedProg = programs.find(p => p.name === form.education_type);
  const availableYears = selectedProg?.years || [];
  const availableBranches = selectedProg?.branches || [];

  // Automatically select a valid year and reset branch if the programme type changes
  const handleEduTypeChange = (val) => {
    const prog = programs.find(p => p.name === val);
    const years = prog?.years || [];
    setForm(f => {
      const next = { ...f, education_type: val };
      if (!years.some(y => y.year_number === f.year)) {
        next.year = years[0]?.year_number || 1;
      }
      const branches = prog?.branches || [];
      if (f.department && !branches.some(b => b.branch_name === f.department)) {
        next.department = '';
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.section_name || !form.education_type || !form.year) {
      toast.error('Section name, programme, and year are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>{section ? 'Edit Section' : 'Add Section'}</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="sec-name">Section Name *</label>
            <input id="sec-name" className="input" value={form.section_name} onChange={e => set('section_name', e.target.value)} placeholder="e.g. CSE-A" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sec-edu">Programme *</label>
              <select id="sec-edu" className="input" value={form.education_type} onChange={e => handleEduTypeChange(e.target.value)}>
                {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sec-year">Year *</label>
              <select id="sec-year" className="input" value={form.year} onChange={e => set('year', parseInt(e.target.value))}>
                {availableYears.map(y => <option key={y.year_number} value={y.year_number}>{y.year_name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sec-dept">Associated Branch</label>
            <select id="sec-dept" className="input" value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">— Select Branch —</option>
              {availableBranches.map(b => <option key={b.id} value={b.branch_name}>{b.branch_name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sec-block">Timing Block</label>
            <select id="sec-block" className="input" value={form.block_id} onChange={e => set('block_id', e.target.value ? parseInt(e.target.value) : '')}>
              <option value="">— Select Timing Block —</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-sec-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="spinner" />}
            {section ? 'Update Section' : 'Add Section'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SectionsPage() {
  const [sections, setSections] = useState([]);
  const [departments, setDepts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [blocks, setBlocks]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSection, setEdit]   = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [showBulkSummary, setShowBulkSummary] = useState(false);
  const fileRef = useRef();

  // Filters
  const [eduFilter, setEduFilter]   = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [search, setSearch]         = useState('');

  const downloadSectionsTemplate = () => {
    const data = [
      {
        section_name: 'CSE-A',
        education_type: 'B-Tech',
        year: 2,
        department: 'CSE',
        block_name: 'U-BLOCK'
      },
      {
        section_name: 'ECE-A',
        education_type: 'B-Tech',
        year: 1,
        department: 'ECE',
        block_name: 'R-BLOCK'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'sections_bulk_template.xlsx');
  };

  const load = async () => {
    setLoading(true);
    try {
      const [secRes, deptRes, progRes, blockRes] = await Promise.all([
        api.get('/api/admin/sections'),
        api.get('/api/admin/departments'),
        api.get('/api/admin/programs/details'),
        api.get('/api/admin/block-timetables'),
      ]);
      setSections(secRes.data.data || []);
      setDepts(deptRes.data.data || []);
      setPrograms(progRes.data.data || []);
      setBlocks(blockRes.data.data || []);
    } catch (_) {
      toast.error('Failed to load sections data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (editSection) {
      await api.put(`/api/admin/sections/${editSection.id}`, form);
      toast.success('Section updated.');
    } else {
      await api.post('/api/admin/sections', form);
      toast.success('Section created.');
    }
    load();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete section "${name}"? This may impact faculty timetables.`)) return;
    try {
      await api.delete(`/api/admin/sections/${id}`);
      toast.success('Section deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete section.');
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const toastId = toast.loading('Uploading and importing section list...');
    try {
      const res = await api.post('/api/admin/sections/bulk', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { created, failed } = res.data.data;
      toast.success(`Bulk upload complete! Created: ${created}, Failed: ${failed}`, { id: toastId });
      setBulkResult(res.data.data);
      setShowBulkSummary(true);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk upload failed.', { id: toastId });
    }
    e.target.value = '';
  };

  // Filter sections
  const filtered = sections.filter(s => {
    const matchEdu = eduFilter === 'All' || s.education_type === eduFilter;
    const matchDept = deptFilter === 'All' || s.department === deptFilter;
    const matchText = s.section_name.toLowerCase().includes(search.toLowerCase()) ||
                      (s.department && s.department.toLowerCase().includes(search.toLowerCase()));
    return matchEdu && matchDept && matchText;
  });

  const eduColors = { 'B-Tech': '#6366f1', Diploma: '#f59e0b', 'M-Tech': '#8b5cf6' };

  return (
    <AppLayout title="Sections Management">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Class Sections</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Configure and manage sections (e.g. CSE-A, ECE-B) for student classes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button id="download-template-btn" className="btn btn-secondary" onClick={downloadSectionsTemplate}>
            <Download size={14} /> Download Template
          </button>
          <button id="bulk-upload-btn" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Bulk Upload
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleBulkUpload} />
          <button id="add-section-btn" className="btn btn-primary" onClick={() => { setEdit(null); setShowModal(true); }}>
            <Plus size={14} /> Add Section
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              className="input"
              placeholder="Search by section name or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ width: 150 }}>
            <select className="input" value={eduFilter} onChange={e => setEduFilter(e.target.value)}>
              <option value="All">All Programmes</option>
              {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ width: 180 }}>
            <select className="input" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.department_code}>{d.department_code}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <LayoutGrid size={48} style={{ opacity: 0.3 }} />
          <h3 style={{ fontWeight: 600 }}>No sections found</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Try adjusting filters or add a new section.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(s => {
            const col = eduColors[s.education_type] || '#64748b';
            return (
              <div key={s.id} style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `${col}18`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: col }}>{s.section_name.charAt(0)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                    {s.section_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    <span style={{ fontWeight: 600, color: col }}>{s.education_type}</span> · Yr {s.year}
                    {s.department && ` · ${s.department}`}
                    {s.block_name && (
                      <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
                        {` · Timing: ${s.block_name}`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    id={`edit-sec-${s.id}`}
                    className="btn btn-sm btn-secondary btn-icon"
                    onClick={() => { setEdit(s); setShowModal(true); }}
                    title="Edit"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    id={`delete-sec-${s.id}`}
                    className="btn btn-sm btn-icon"
                    style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
                    onClick={() => handleDelete(s.id, s.section_name)}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <SectionModal
          section={editSection}
          departments={departments}
          programs={programs}
          blocks={blocks}
          onClose={() => { setShowModal(false); setEdit(null); }}
          onSave={handleSave}
        />
      )}
      {showBulkSummary && (
        <BulkSummaryModal
          result={bulkResult}
          onClose={() => { setShowBulkSummary(false); setBulkResult(null); }}
        />
      )}
    </AppLayout>
  );
}

function BulkSummaryModal({ result, onClose }) {
  const { created, failed, errorRows } = result || {};
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>Section Import Summary</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '14px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>{created || 0}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Created Successfully</div>
          </div>
          <div style={{ background: failed ? 'rgba(239,68,68,0.1)' : 'var(--color-surface-2)', border: failed ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--color-border)', padding: '14px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: failed ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{failed || 0}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Failed Rows</div>
          </div>
        </div>

        {failed > 0 && errorRows && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Detailed Error Log
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {errorRows.map((err, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', padding: '6px 0', borderBottom: idx < errorRows.length - 1 ? '1px solid var(--color-surface-2)' : 'none', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', flexShrink: 0 }}>Row {err.row}</span>
                  <span style={{ color: 'var(--color-text)', lineHeight: 1.4 }}>{err.reasons.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
