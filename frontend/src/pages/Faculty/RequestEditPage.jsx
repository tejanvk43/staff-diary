import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Edit2, Send, Loader2, BookOpen, AlertCircle, CheckSquare, Square } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import { format } from 'date-fns';

export default function RequestEditPage() {
  const [date, setDate] = useState('');
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState([]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Load user's edit requests
  const loadRequests = async () => {
    try {
      const res = await api.get('/api/requests/edit-requests');
      setMyRequests(res.data.data || []);
    } catch (_) {
      toast.error('Failed to load edit requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // When date changes, fetch entries for that date
  useEffect(() => {
    if (!date) {
      setEntries([]);
      setSelectedEntryIds([]);
      return;
    }
    const fetchEntries = async () => {
      setLoadingEntries(true);
      try {
        const res = await api.get(`/api/diary?date=${date}`);
        setEntries(res.data.data || []);
        setSelectedEntryIds([]);
      } catch (_) {
        toast.error('Failed to fetch diary entries for the selected date.');
      } finally {
        setLoadingEntries(false);
      }
    };
    fetchEntries();
  }, [date]);

  const handleToggleEntry = (id) => {
    const sId = String(id);
    setSelectedEntryIds(prev =>
      prev.includes(sId) ? prev.filter(x => x !== sId) : [...prev, sId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEntryIds.length === entries.length) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(entries.map(e => String(e.id)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) { toast.error('Please select a date.'); return; }
    if (selectedEntryIds.length === 0) { toast.error('Please select at least one diary entry.'); return; }
    if (!reason.trim()) { toast.error('Please provide a reason for editing.'); return; }

    setSubmitting(true);
    try {
      await Promise.all(
        selectedEntryIds.map(id =>
          api.post('/api/diary/request-edit', {
            diary_log_id: parseInt(id),
            reason: reason.trim()
          })
        )
      );
      toast.success(`Successfully submitted ${selectedEntryIds.length} edit request(s).`);
      setReason('');
      setDate('');
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit some edit requests.');
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_CLASS = {
    Pending: 'badge-pending', Approved: 'badge-approved', Rejected: 'badge-rejected',
  };

  return (
    <AppLayout title="Request Diary Edit">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, alignItems: 'flex-start' }}>
        {/* Form Column */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Request Diary Edit</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Submit requests to edit past or locked diary entries. HODs/Admins will review and approve.
            </p>
          </div>

          <div className="card" style={{ padding: 28 }}>
            <form onSubmit={handleSubmit}>
              {/* Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="request-date">Date of Diary Entries *</label>
                <input
                  id="request-date"
                  type="date"
                  className="input"
                  max={new Date().toLocaleDateString('en-CA')}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Entries for selected date */}
              {date && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Select Entries to Edit *</label>
                    {entries.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        style={{
                          background: 'none', border: 'none', color: 'var(--color-primary)',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        {selectedEntryIds.length === entries.length ? <CheckSquare size={14} /> : <Square size={14} />}
                        {selectedEntryIds.length === entries.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {loadingEntries ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--color-text-muted)', padding: 10 }}>
                      <Loader2 size={16} className="spinner" /> Loading entries...
                    </div>
                  ) : entries.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--color-danger)', padding: 10, background: 'rgba(239,68,68,0.05)', borderRadius: 8 }}>
                      <AlertCircle size={16} /> No diary entries found for this date.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {entries.map(entry => {
                        const from = new Date(entry.from_time).toTimeString().slice(0, 5);
                        const to = new Date(entry.to_time).toTimeString().slice(0, 5);
                        const isChecked = selectedEntryIds.includes(String(entry.id));
                        return (
                          <label
                            key={entry.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              padding: '12px 14px',
                              borderRadius: 10,
                              border: `1.5px solid ${isChecked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                              background: isChecked ? 'var(--color-surface-2)' : 'var(--color-surface)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            <input
                              type="checkbox"
                              name="diary-entry"
                              value={entry.id}
                              checked={isChecked}
                              onChange={() => handleToggleEntry(entry.id)}
                              style={{ marginTop: 3 }}
                            />
                            <div style={{ fontSize: '0.85rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                {from} – {to} &middot; <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{entry.activity_type}</span>
                              </div>
                              <div style={{ color: 'var(--color-text-muted)', marginTop: 2, fontSize: '0.80rem' }}>
                                {entry.description || 'No description provided.'}
                              </div>
                              <div style={{ marginTop: 6 }}>
                                <span className={`badge ${STATUS_CLASS[entry.status] || 'badge-draft'}`} style={{ fontSize: '0.68rem' }}>
                                  {entry.status}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label" htmlFor="request-reason">Reason for Edit *</label>
                <textarea
                  id="request-reason"
                  className="input"
                  rows={4}
                  placeholder="Explain why these diary entries need correction..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                />
              </div>

              <button
                id="submit-request-btn"
                type="submit"
                className="btn btn-primary"
                disabled={submitting || selectedEntryIds.length === 0}
                style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 10 }}
              >
                {submitting ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                Submit {selectedEntryIds.length > 0 ? `${selectedEntryIds.length} ` : ''}Edit Request{selectedEntryIds.length > 1 ? 's' : ''}
              </button>
            </form>
          </div>
        </div>

        {/* History Column */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Recent Edit Requests</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Monitor status and edit windows for your approved requests.
            </p>
          </div>

          {loadingRequests ? (
            <div className="empty-state"><Loader2 size={28} className="spinner" style={{ color: 'var(--color-primary)' }} /></div>
          ) : myRequests.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <BookOpen size={48} style={{ opacity: 0.2, marginBottom: 12, display: 'inline-block' }} />
              <p style={{ fontSize: '0.9rem' }}>No edit requests submitted yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myRequests.map(req => {
                const created = req.created_at ? format(new Date(req.created_at), 'MMM d, yyyy HH:mm') : '—';
                const expiry = req.edit_window_expires_at ? format(new Date(req.edit_window_expires_at), 'MMM d, yyyy HH:mm') : null;
                const isExpired = req.edit_window_expires_at ? new Date(req.edit_window_expires_at) < new Date() : false;

                return (
                  <div key={req.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          Requested on {created}
                        </span>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)', marginTop: 2 }}>
                          Entry ID: #{req.target_record_id}
                        </div>
                      </div>
                      <span className={`badge ${STATUS_CLASS[req.status] || 'badge-pending'}`}>
                        {req.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: 8, marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 2 }}>Reason</div>
                      <div style={{ color: 'var(--color-text)' }}>{req.reason}</div>
                    </div>

                    {req.status === 'Approved' && (
                      <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: isExpired ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                        <Edit2 size={12} />
                        {isExpired ? (
                          <span>Edit window expired on {expiry}</span>
                        ) : (
                          <span>Edit window active until {expiry}</span>
                        )}
                      </div>
                    )}

                    {req.status === 'Rejected' && req.remarks && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                        ❌ Rejected Remarks: {req.remarks}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
