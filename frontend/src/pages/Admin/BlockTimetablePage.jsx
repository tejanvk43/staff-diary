import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Loader2, CalendarDays, ChevronRight, BookOpen } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

const CARD_COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

// ─── Simple name-only modal ───────────────────────────────────────────────────
function BlockNameModal({ existing, onClose, onSave }) {
  const [name, setName]     = useState(existing?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Block name is required.'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim() });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 400 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 2 }}>
              {existing ? 'Rename Block' : 'New Timetable Block'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {existing
                ? 'Update the block name.'
                : "Give this block a name — you'll add periods inside the editor."}
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

        {/* Name field */}
        <div className="form-group" style={{ marginBottom: 22 }}>
          <label className="form-label" htmlFor="bt-name">Block Name *</label>
          <input
            id="bt-name"
            className="input"
            autoFocus
            value={name}
            placeholder="e.g. CSE-A Block, ECE Morning Block…"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={{ fontSize: '1rem', padding: '10px 12px' }}
          />
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
            {existing ? 'Save Name' : 'Create Timetable'}
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
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/block-timetables?source=manual');
      setTimetables(res.data.data || []);
    } catch (_) {
      toast.error('Failed to load timetables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Create → immediately open editor
  const handleCreate = async (data) => {
    const res = await api.post('/api/admin/block-timetables', data);
    toast.success('Timetable created! Add your periods now.');
    navigate(`/admin/block-timetables/${res.data.id}`);
  };

  // Rename existing
  const handleRename = async (data) => {
    await api.put(`/api/admin/block-timetables/${editItem.id}`, data);
    toast.success('Block timetable renamed.');
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
          <div
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.72rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '3px 10px', color: 'var(--color-primary)', cursor: 'pointer' }}
            onClick={() => navigate('/admin/section-timetables')}
          >
            <CalendarDays size={11} /> View Section-wise Timetables →
          </div>
        </div>
        <button
          id="create-bt-btn"
          className="btn btn-primary"
          onClick={() => { setEditItem(null); setShowModal(true); }}
        >
          <Plus size={14} /> New Timetable
        </button>
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
            Create a block, give it a name, then open the editor to add periods.
          </p>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <Plus size={14} /> Create First Block
          </button>
        </div>

      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>

          {timetables.map((t, idx) => {
            const color = CARD_COLORS[idx % CARD_COLORS.length];
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
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 14, lineHeight: 1.3 }}>
                    {t.name}
                  </div>

                  {/* Period count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
                    <BookOpen size={13} style={{ color }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {t.slot_count || 0} period{t.slot_count !== 1 ? 's' : ''} configured
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
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

                    <button
                      id={`rename-bt-${t.id}`}
                      title="Rename"
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '7px 10px' }}
                      onClick={() => { setEditItem(t); setShowModal(true); }}
                    >
                      <Edit2 size={13} />
                    </button>

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

          {/* "+ New" card */}
          <div
            onClick={() => { setEditItem(null); setShowModal(true); }}
            style={{
              border: '2px dashed var(--color-border)', borderRadius: 12, minHeight: 160,
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
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={editItem ? handleRename : handleCreate}
        />
      )}
    </AppLayout>
  );
}
