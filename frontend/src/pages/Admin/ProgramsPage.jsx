import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, Layers, BookOpen, CalendarRange, Edit2, Check, X } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProg, setSavingProg] = useState(false);
  const [newProgName, setNewProgName] = useState('');

  // Editing state for programs, years, and branches
  const [editingProgId, setEditingProgId] = useState(null);
  const [editingProgName, setEditingProgName] = useState('');
  const [editingYearId, setEditingYearId] = useState(null);
  const [editingYearName, setEditingYearName] = useState('');
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [editingBranchName, setEditingBranchName] = useState('');

  // Local forms state for adding years and branches per program card
  // Indexed by program.id
  const [yearForms, setYearForms] = useState({});
  const [branchForms, setBranchForms] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/programs/details');
      setPrograms(res.data.data || []);
    } catch (_) {
      toast.error('Failed to load academic programmes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    if (!newProgName.trim()) {
      toast.error('Programme name is required.');
      return;
    }
    setSavingProg(true);
    try {
      await api.post('/api/admin/programs', { name: newProgName.trim() });
      toast.success('Programme created.');
      setNewProgName('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create programme.');
    } finally {
      setSavingProg(false);
    }
  };

  const handleDeleteProgram = async (id, name) => {
    if (!confirm(`Delete programme "${name}"? All associated years, branches, and sections will be affected.`)) return;
    try {
      await api.delete(`/api/admin/programs/${id}`);
      toast.success('Programme deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete programme.');
    }
  };

  const handleAddYear = async (progId) => {
    const form = yearForms[progId] || { number: '', name: '' };
    if (!form.number || !form.name.trim()) {
      toast.error('Both year number and year name are required.');
      return;
    }
    try {
      await api.post(`/api/admin/programs/${progId}/years`, {
        year_number: parseInt(form.number),
        year_name: form.name.trim()
      });
      toast.success('Year added.');
      setYearForms(prev => ({ ...prev, [progId]: { number: '', name: '' } }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add year.');
    }
  };

  const handleDeleteYear = async (progId, yearId) => {
    try {
      await api.delete(`/api/admin/programs/${progId}/years/${yearId}`);
      toast.success('Year deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete year.');
    }
  };

  const handleAddBranch = async (progId) => {
    const branchName = branchForms[progId] || '';
    if (!branchName.trim()) {
      toast.error('Branch name is required.');
      return;
    }
    try {
      await api.post(`/api/admin/programs/${progId}/branches`, {
        branch_name: branchName.trim()
      });
      toast.success('Branch added.');
      setBranchForms(prev => ({ ...prev, [progId]: '' }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add branch.');
    }
  };

  const handleDeleteBranch = async (progId, branchId) => {
    try {
      await api.delete(`/api/admin/programs/${progId}/branches/${branchId}`);
      toast.success('Branch deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete branch.');
    }
  };

  const updateYearForm = (progId, key, value) => {
    setYearForms(prev => ({
      ...prev,
      [progId]: {
        ...(prev[progId] || { number: '', name: '' }),
        [key]: value
      }
    }));
  };

  const handleUpdateProgram = async (progId) => {
    if (!editingProgName.trim()) {
      toast.error('Programme name is required.');
      return;
    }
    try {
      await api.put(`/api/admin/programs/${progId}`, { name: editingProgName.trim() });
      toast.success('Programme updated.');
      setEditingProgId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update programme.');
    }
  };

  const handleUpdateYear = async (progId, yearId) => {
    if (!editingYearName.trim()) {
      toast.error('Year name is required.');
      return;
    }
    try {
      await api.put(`/api/admin/programs/${progId}/years/${yearId}`, { year_name: editingYearName.trim() });
      toast.success('Year updated.');
      setEditingYearId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update year.');
    }
  };

  const handleUpdateBranch = async (progId, branchId) => {
    if (!editingBranchName.trim()) {
      toast.error('Branch name is required.');
      return;
    }
    try {
      await api.put(`/api/admin/programs/${progId}/branches/${branchId}`, { branch_name: editingBranchName.trim() });
      toast.success('Branch updated.');
      setEditingBranchId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update branch.');
    }
  };

  return (
    <AppLayout title="Programmes Management">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Academic Programmes</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Configure dynamic educational streams, assign year names, and map branch divisions.
        </p>
      </div>

      {/* Add New Programme Stream Card */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 28, maxWidth: 600 }}>
        <form onSubmit={handleCreateProgram} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label" htmlFor="new-prog-name" style={{ marginBottom: 6 }}>Create New Programme Stream</label>
            <input
              id="new-prog-name"
              className="input"
              value={newProgName}
              onChange={e => setNewProgName(e.target.value)}
              placeholder="e.g. M-Tech, B-Arch, MBA..."
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingProg} style={{ height: 42 }}>
            {savingProg ? <Loader2 size={14} className="spinner" /> : <Plus size={14} />} Create Stream
          </button>
        </form>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="empty-state"><Loader2 size={32} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
      ) : programs.length === 0 ? (
        <div className="empty-state">
          <Layers size={48} style={{ opacity: 0.3 }} />
          <h3 style={{ fontWeight: 600 }}>No programmes defined</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Get started by adding your first educational stream above.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
          {programs.map(prog => {
            const yForm = yearForms[prog.id] || { number: '', name: '' };
            const bForm = branchForms[prog.id] || '';

            return (
              <div key={prog.id} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Card Title Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
                  {editingProgId === prog.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Layers size={18} />
                      </div>
                      <input
                        type="text"
                        className="input"
                        style={{ fontSize: '1rem', fontWeight: 700, padding: '4px 8px', height: 36, flex: 1 }}
                        value={editingProgName}
                        onChange={e => setEditingProgName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={18} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>{prog.name}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                    {editingProgId === prog.id ? (
                      <>
                        <button
                          className="btn-icon"
                          style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.15)', padding: 7 }}
                          onClick={() => handleUpdateProgram(prog.id)}
                          title="Save name"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ background: 'rgba(100,116,139,0.08)', color: 'var(--color-text-muted)', border: '1px solid rgba(100,116,139,0.15)', padding: 7 }}
                          onClick={() => setEditingProgId(null)}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn-icon"
                          style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--color-primary)', border: '1px solid rgba(99,102,241,0.15)', padding: 7 }}
                          onClick={() => {
                            setEditingProgId(prog.id);
                            setEditingProgName(prog.name);
                          }}
                          title="Edit programme name"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.15)', padding: 7 }}
                          onClick={() => handleDeleteProgram(prog.id, prog.name)}
                          title="Delete programme stream"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Section: Years configuration */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <CalendarRange size={14} style={{ color: 'var(--color-primary-light)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Years Configuration
                    </span>
                  </div>

                  {/* List of years */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {prog.years?.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No years defined.</span>
                    ) : (
                      prog.years.map(y => (
                        <div key={y.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-2)', padding: '6px 12px', borderRadius: 8 }}>
                          {editingYearId === y.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                Year {y.year_number} (
                              </span>
                              <input
                                type="text"
                                className="input"
                                style={{ padding: '2px 6px', fontSize: '0.82rem', height: 26, flex: 1 }}
                                value={editingYearName}
                                onChange={e => setEditingYearName(e.target.value)}
                                autoFocus
                              />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>)</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                              Year {y.year_number} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 6 }}>({y.year_name})</span>
                            </span>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
                            {editingYearId === y.id ? (
                              <>
                                <button
                                  style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer', padding: 2 }}
                                  onClick={() => handleUpdateYear(prog.id, y.id)}
                                  title="Save year label"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                                  onClick={() => setEditingYearId(null)}
                                  title="Cancel"
                                >
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                                  onClick={() => {
                                    setEditingYearId(y.id);
                                    setEditingYearName(y.year_name);
                                  }}
                                  title="Edit year label"
                                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}
                                  onClick={() => handleDeleteYear(prog.id, y.id)}
                                  title="Remove year"
                                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Inline Add Year Form */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      className="input"
                      style={{ width: 68, padding: '6px 8px', fontSize: '0.82rem' }}
                      placeholder="No."
                      value={yForm.number}
                      onChange={e => updateYearForm(prog.id, 'number', e.target.value)}
                    />
                    <input
                      type="text"
                      className="input"
                      style={{ flex: 1, padding: '6px 8px', fontSize: '0.82rem' }}
                      placeholder="Custom Label (e.g. 1st Year)"
                      value={yForm.name}
                      onChange={e => updateYearForm(prog.id, 'name', e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleAddYear(prog.id)}
                      style={{ padding: '0 10px' }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Section: Associated Branches */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <BookOpen size={14} style={{ color: 'var(--color-primary-light)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Associated Branches
                    </span>
                  </div>

                  {/* List of branches */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {prog.branches?.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No branches associated.</span>
                    ) : (
                      prog.branches.map(b => (
                        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: 'var(--color-primary-light)', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
                          {editingBranchId === b.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input
                                type="text"
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-light)', width: 50, outline: 'none', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}
                                value={editingBranchName}
                                onChange={e => setEditingBranchName(e.target.value)}
                                autoFocus
                              />
                              <button
                                style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                onClick={() => handleUpdateBranch(prog.id, b.id)}
                                title="Save branch"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                onClick={() => setEditingBranchId(null)}
                                title="Cancel"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setEditingBranchId(b.id);
                                  setEditingBranchName(b.branch_name);
                                }}
                                title="Click to edit branch"
                              >
                                {b.branch_name}
                              </span>
                              <button
                                style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: 0.7 }}
                                onClick={() => {
                                  setEditingBranchId(b.id);
                                  setEditingBranchName(b.branch_name);
                                }}
                                title="Edit branch"
                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                              >
                                <Edit2 size={10} style={{ marginLeft: 2 }} />
                              </button>
                              <button
                                style={{ background: 'none', border: 'none', color: 'var(--color-primary-light)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', marginLeft: 2 }}
                                onClick={() => handleDeleteBranch(prog.id, b.id)}
                                title="Remove branch"
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-primary-light)'}
                              >
                                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>×</span>
                              </button>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Inline Add Branch Form */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="input"
                      style={{ flex: 1, padding: '6px 8px', fontSize: '0.82rem' }}
                      placeholder="Branch Code (e.g. CSE, ECE)"
                      value={bForm}
                      onChange={e => setBranchForms(prev => ({ ...prev, [prog.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleAddBranch(prog.id)}
                      style={{ padding: '0 10px' }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
