import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload, Download, Loader2, Calendar, BookOpen, User, X, CheckCircle, Search, Trash2, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };
const TYPE_COLORS = { Theory: '#6366f1', Lab: '#10b981' };
const TYPE_BG     = { Theory: 'rgba(99,102,241,0.08)', Lab: 'rgba(16,185,129,0.08)' };
const TYPE_BORDER = { Theory: 'rgba(99,102,241,0.25)', Lab: 'rgba(16,185,129,0.25)' };

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

export default function FacultyTimetableImportPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepts] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [showBulkSummary, setShowBulkSummary] = useState(false);

  const fileRef = useRef();

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const loadInitialData = async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/departments')
      ]);
      setUsers(usersRes.data.data || []);
      setDepts(deptsRes.data.data || []);
    } catch (_) {
      toast.error('Failed to load filters data.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadFacultyTimetable = async (employeeId) => {
    setLoadingTimetable(true);
    try {
      const res = await api.get(`/api/timetable?employee_id=${employeeId}`);
      setTimetableSlots(res.data.data || []);
    } catch (_) {
      toast.error('Failed to load faculty timetable.');
    } finally {
      setLoadingTimetable(false);
    }
  };

  const handleFacultyChange = (empId) => {
    setSelectedFaculty(empId);
    if (empId) {
      loadFacultyTimetable(empId);
    } else {
      setTimetableSlots([]);
    }
  };

  const downloadTimetableTemplate = () => {
    const headers = [
      'PROGRAM', 'DAY', 'YEAR', 'Class & Section',
      'Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'
    ];
    const data = [
      {
        'PROGRAM': 'B-Tech',
        'DAY': 'Monday',
        'YEAR': '2',
        'Class & Section': 'CSE-A',
        'Period 1': 'DBMS - BS',
        'Period 2': 'DS - JD',
        'Period 3': 'MATHS - RK',
        'Period 4': 'COA - AB',
        'Period 5': 'OS - SM',
        'Period 6': 'WT - XY'
      },
      {
        'PROGRAM': 'B-Tech',
        'DAY': 'Tuesday',
        'YEAR': '2',
        'Class & Section': 'CSE-A',
        'Period 1': 'OS - SM',
        'Period 2': 'DBMS - BS',
        'Period 3': 'COA - AB',
        'Period 4': 'MATHS - RK',
        'Period 5': 'DS - JD',
        'Period 6': 'WT - XY'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'weekly_timetable_template.xlsx');
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setBulkLoading(true);
    const toastId = toast.loading('Importing weekly timetable from Excel...');
    try {
      const res = await api.post('/api/admin/block-timetables/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { blocksCreated, slotsImported } = res.data.data;
      toast.success(
        `Timetable import complete! Created: ${blocksCreated}, Imported: ${slotsImported}`,
        { id: toastId }
      );
      setBulkResult(res.data.data);
      setShowBulkSummary(true);
      if (selectedFaculty) {
        loadFacultyTimetable(selectedFaculty);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to import timetable from Excel.', { id: toastId });
    } finally {
      setBulkLoading(false);
      e.target.value = '';
    }
  };

  const handleResetTimetable = async () => {
    setResetLoading(true);
    const toastId = toast.loading('Resetting entire timetable...');
    try {
      const res = await api.delete('/api/timetable/reset-all');
      toast.success(res.data.message || 'Timetable reset successfully!', { id: toastId });
      setTimetableSlots([]);
      setShowResetModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset timetable.', { id: toastId });
    } finally {
      setResetLoading(false);
    }
  };

  // Filter users by role (Faculty or HOD) and selected department
  const filteredFacultyList = users.filter(u => {
    const isFacultyOrHod = u.role === 'Faculty' || u.role === 'HOD';
    const matchesDept = !selectedDept || u.department === selectedDept;
    return isFacultyOrHod && matchesDept;
  });

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

  // Timetable grid cell slots mapper
  const getSlotsForCell = (day, periodNum) => {
    return timetableSlots.filter(s => {
      if (s.day !== day) return false;
      const pNum = getPeriodNumber(s.from_time, s.education_type);
      return pNum === periodNum;
    });
  };

  return (
    <AppLayout title="Timetable for Faculty">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Timetable for Faculty</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Upload bulk timetables and manage faculty weekly slot schedules
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="download-fac-template-btn"
            className="btn btn-secondary"
            onClick={downloadTimetableTemplate}
            disabled={bulkLoading}
          >
            <Download size={14} /> Download Template
          </button>
          <button
            id="bulk-import-fac-timetable-btn"
            className="btn btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={bulkLoading}
          >
            {bulkLoading ? <Loader2 size={14} className="spinner" /> : <Upload size={14} />} Bulk Import
          </button>
          {user?.role === 'Admin' && (
            <button
              id="reset-timetable-btn"
              className="btn"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
              onClick={() => setShowResetModal(true)}
              disabled={bulkLoading || resetLoading}
            >
              <Trash2 size={14} /> Reset Timetable
            </button>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleBulkImport} />
        </div>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label" htmlFor="dept-select">Filter Department</label>
            <select
              id="dept-select"
              className="input"
              value={selectedDept}
              onChange={e => { setSelectedDept(e.target.value); handleFacultyChange(''); }}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.department_name}>{d.department_code}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1.5, minWidth: 240 }}>
            <label className="form-label" htmlFor="faculty-select">Select Faculty Member *</label>
            <select
              id="faculty-select"
              className="input"
              value={selectedFaculty}
              onChange={e => handleFacultyChange(e.target.value)}
            >
              <option value="">— Select a Faculty —</option>
              {filteredFacultyList.map(u => (
                <option key={u.employee_id} value={u.employee_id}>
                  {u.full_name} ({u.short_name || 'N/A'}) - {u.employee_id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timetable Display */}
      {loadingTimetable ? (
        <div className="empty-state" style={{ padding: '80px 20px' }}>
          <Loader2 size={32} className="spinner" style={{ color: 'var(--color-primary)' }} />
          <p style={{ marginTop: 10 }}>Loading timetable slots...</p>
        </div>
      ) : !selectedFaculty ? (
        <div className="empty-state" style={{ padding: '70px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <Search size={48} style={{ opacity: 0.25, marginBottom: 12 }} />
          <h3 style={{ fontWeight: 600 }}>Select a faculty member</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Choose a department or select a faculty member from the dropdown to preview their schedule.
          </p>
        </div>
      ) : timetableSlots.length === 0 ? (
        <div className="empty-state" style={{ padding: '70px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <Calendar size={48} style={{ opacity: 0.25, marginBottom: 12 }} />
          <h3 style={{ fontWeight: 600 }}>No timetable slots</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            This faculty member has no periods mapped to their schedule. Use bulk import to assign periods.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontWeight: 700 }}>
              Weekly Timetable for {users.find(u => u.employee_id === selectedFaculty)?.full_name}
            </span>
          </div>

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
                        const isLastCol = colIdx === 5;
                        return (
                          <td key={p} style={{
                            padding: 6, border: '1px solid var(--color-border)',
                            borderTop: 'none', borderLeft: 'none',
                            borderRadius: isLast && isLastCol ? '0 0 10px 0' : 0,
                            verticalAlign: 'top', background: 'var(--color-bg)',
                            minHeight: 80
                          }}>
                            {cellSlots.map(s => {
                              const color = TYPE_COLORS[s.subject_type] || '#64748b';
                              
                              let displayCode = s.short_name || s.subject_code || '';
                              let displayBranch = '';
                              if (displayCode.includes('_')) {
                                const parts = displayCode.split('_');
                                displayBranch = parts[0];
                                displayCode = parts.slice(1).join('_');
                              }
                              const mainTitle = displayCode;

                              const ROMAN_YEARS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
                              const yrLabel = `${ROMAN_YEARS[s.year] || s.year} Year`;
                              const currentMonth = new Date().getMonth();
                              const isEvenSemester = currentMonth >= 0 && currentMonth <= 5;
                              const semNumber = isEvenSemester ? (s.year * 2) : (s.year * 2 - 1);
                              const semLabel = semNumber % 2 === 0 ? 'II Semester' : 'I Semester';
                              const secLabel = s.section ? `, ${s.section}` : '';

                              const formattedTimings = `${formatTime12h(s.from_time)} - ${formatTime12h(s.to_time)}`;
                              const blockName = s.room_number || '';

                              return (
                                <div key={s.id} style={{
                                  background: TYPE_BG[s.subject_type] || 'rgba(100,116,139,0.06)',
                                  border: `1px solid ${TYPE_BORDER[s.subject_type] || 'rgba(100,116,139,0.2)'}`,
                                  borderLeft: `3px solid ${color}`, borderRadius: 6,
                                  padding: '6px 8px', fontSize: '0.7rem',
                                  display: 'flex', flexDirection: 'column', gap: 2,
                                  textAlign: 'center'
                                }}>
                                  <div style={{ fontWeight: 700, color }}>{mainTitle}</div>
                                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.64rem', lineHeight: 1.3 }}>
                                    ({s.education_type === 'B-Tech' ? 'B.Tech' : s.education_type} {yrLabel} {semLabel}{secLabel})
                                  </div>
                                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.64rem', fontWeight: 600, marginTop: 2 }}>
                                    {formattedTimings} {blockName ? `[${blockName}]` : ''}
                                  </div>
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Import Summary Modal */}
      {showBulkSummary && (
        <BulkSummaryModal
          result={bulkResult}
          onClose={() => { setShowBulkSummary(false); setBulkResult(null); }}
        />
      )}

      {showResetModal && (
        <ResetConfirmModal
          loading={resetLoading}
          onConfirm={handleResetTimetable}
          onClose={() => setShowResetModal(false)}
        />
      )}
    </AppLayout>
  );
}

function BulkSummaryModal({ result, onClose }) {
  const { blocksCreated, slotsImported, warnings } = result || {};
  const warnCount = warnings?.length || 0;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>Weekly Timetable Import Summary</h3>
          <button className="btn-icon" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }} onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '12px 6px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>{blocksCreated || 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Blocks Created</div>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px 6px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)' }}>{slotsImported || 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Periods Imported</div>
          </div>
          <div style={{ background: warnCount ? 'rgba(245,158,11,0.1)' : 'var(--color-surface-2)', border: warnCount ? '1px solid rgba(245,158,11,0.2)' : '1px solid var(--color-border)', padding: '12px 6px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: warnCount ? '#d97706' : 'var(--color-text-muted)' }}>{warnCount}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Warnings</div>
          </div>
        </div>

        {warnCount > 0 && warnings && (() => {
          const autoResolved = warnings.filter(w => w.startsWith('ℹ️') || w.includes('Auto-resolved'));
          const errors       = warnings.filter(w => w.startsWith('❌') || w.includes('Could not resolve'));
          const others       = warnings.filter(w => !autoResolved.includes(w) && !errors.includes(w));
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Import Messages
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {autoResolved.length > 0 && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                      ℹ️ {autoResolved.length} Auto-resolved
                    </span>
                  )}
                  {errors.length > 0 && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                      ❌ {errors.length} Error{errors.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {others.length > 0 && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                      ⚠️ {others.length} Warning{others.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {warnings.map((warn, idx) => {
                  const isInfo  = warn.startsWith('ℹ️') || warn.includes('Auto-resolved');
                  const isError = warn.startsWith('❌') || warn.includes('Could not resolve');
                  const color   = isInfo ? '#10b981' : isError ? '#ef4444' : '#d97706';
                  const bg      = isInfo ? 'rgba(16,185,129,0.06)' : isError ? 'rgba(239,68,68,0.06)' : 'transparent';
                  return (
                    <div key={idx} style={{
                      fontSize: '0.75rem', padding: '5px 8px', borderRadius: 6,
                      borderBottom: idx < warnings.length - 1 ? '1px solid var(--color-surface-2)' : 'none',
                      color, background: bg, lineHeight: 1.5
                    }}>
                      {warn}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ResetConfirmModal({ loading, onConfirm, onClose }) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText.trim() === 'RESET';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontWeight: 700, color: '#ef4444' }}>Reset Entire Timetable</h3>
          </div>
          <button
            className="btn-icon"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            onClick={onClose}
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        {/* Warning Banner */}
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>
            ⚠️ This action will <strong style={{ color: '#ef4444' }}>permanently delete ALL timetable records</strong> for
            every faculty member across all departments. This cannot be undone.
          </p>
        </div>

        {/* Confirmation Input */}
        <div style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="reset-confirm-input" style={{ marginBottom: 6, display: 'block' }}>
            Type <strong style={{ color: '#ef4444', fontFamily: 'monospace' }}>RESET</strong> to confirm:
          </label>
          <input
            id="reset-confirm-input"
            className="input"
            type="text"
            placeholder="Type RESET here..."
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            disabled={loading}
            style={{ borderColor: isConfirmed ? '#ef4444' : undefined }}
            autoFocus
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            id="confirm-reset-timetable-btn"
            className="btn"
            style={{
              background: isConfirmed ? '#ef4444' : 'rgba(239,68,68,0.3)',
              color: '#fff', border: 'none',
              cursor: isConfirmed && !loading ? 'pointer' : 'not-allowed',
              opacity: isConfirmed ? 1 : 0.6
            }}
            onClick={onConfirm}
            disabled={!isConfirmed || loading}
          >
            {loading ? <Loader2 size={14} className="spinner" /> : <Trash2 size={14} />}
            {loading ? 'Resetting...' : 'Reset All Timetable'}
          </button>
        </div>
      </div>
    </div>
  );
}
