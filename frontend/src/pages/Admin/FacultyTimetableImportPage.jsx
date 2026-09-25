import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload, Download, Loader2, Calendar, BookOpen, User, X, CheckCircle, Search, Trash2, AlertTriangle, Plus, Save, Edit2 } from 'lucide-react';
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

  const [facultySearchText, setFacultySearchText] = useState('');
  const [allSubjects, setAllSubjects] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [clickDay, setClickDay] = useState(null);
  const [clickTime, setClickTime] = useState(null);
  const [setupData, setSetupData] = useState(null);

  const fileRef = useRef();

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const loadInitialData = async () => {
    try {
      const [usersRes, deptsRes, subjectsRes, sectionsRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/departments'),
        api.get('/api/admin/subjects'),
        api.get('/api/admin/sections')
      ]);
      setUsers(usersRes.data.data || []);
      setDepts(deptsRes.data.data || []);
      setAllSubjects(subjectsRes.data.data || []);
      setAllSections(sectionsRes.data.data || []);
    } catch (_) {
      toast.error('Failed to load initial data.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user?.role === 'HOD' && user?.department) {
      setSelectedDept(user.department);
    }
  }, [user]);

  const loadFacultyTimetable = async (employeeId) => {
    setLoadingTimetable(true);
    try {
      const res = await api.get(`/api/admin/users/${employeeId}/full`);
      const { timetable, setup } = res.data.data;
      setTimetableSlots(timetable || []);
      setSetupData(setup || null);
    } catch (_) {
      toast.error('Failed to load faculty timetable details.');
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
      setSetupData(null);
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

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Remove this timetable slot?')) return;
    const updatedSlots = timetableSlots.filter(s => String(s.id) !== String(slotId));
    await saveTimetableListToServer(updatedSlots);
  };

  const handleSaveSlot = async (newSlotData) => {
    let updatedSlots;
    if (editSlot) {
      updatedSlots = timetableSlots.map(s => String(s.id) === String(editSlot.id) ? { ...s, ...newSlotData } : s);
    } else {
      updatedSlots = [...timetableSlots, { id: `new-${Math.random()}`, ...newSlotData }];
    }
    await saveTimetableListToServer(updatedSlots);
  };

  const saveTimetableListToServer = async (slotsList) => {
    setSaving(true);
    try {
      const formattedSlots = slotsList.map(s => {
        const matchSubj = allSubjects.find(sub => sub.id === Number(s.subject_id)) || (setupData?.subjects || []).find(sub => sub.subject_id === Number(s.subject_id));
        return {
          day: s.day,
          from_time: s.from_time.slice(0, 5),
          to_time: s.to_time.slice(0, 5),
          subject_id: s.subject_id ? Number(s.subject_id) : null,
          subject_type: s.subject_type || (matchSubj ? matchSubj.subject_type : 'Theory'),
          education_type: s.education_type || (matchSubj ? matchSubj.education_type : null),
          year: s.year || (matchSubj ? matchSubj.year : null),
          section: s.section || null,
          room_number: s.room_number || null,
          block_id: s.block_id ? Number(s.block_id) : null
        };
      });

      await api.put(`/api/admin/users/${selectedFaculty}/timetable`, { slots: formattedSlots });
      toast.success('Timetable overrides updated successfully!');
      loadFacultyTimetable(selectedFaculty);
      setShowModal(false);
      setEditSlot(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save timetable.');
    } finally {
      setSaving(false);
    }
  };

  const addTimetableSlot = () => {
    setTimetableSlots(prev => [
      ...prev,
      {
        id: `new-${Math.random()}`,
        day: 'Monday',
        from_time: '09:00',
        to_time: '10:00',
        subject_id: '',
        subject_type: 'Theory',
        education_type: 'B-Tech',
        year: 1,
        section: '',
        room_number: ''
      }
    ]);
  };

  const removeTimetableSlot = (id) => {
    setTimetableSlots(prev => prev.filter(s => s.id !== id));
  };

  const updateTimetableSlot = (id, field, value) => {
    setTimetableSlots(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        if (field === 'subject_id' && value) {
          const matchSubj = allSubjects.find(sub => sub.id === Number(value));
          if (matchSubj) {
            updated.subject_type = matchSubj.subject_type;
            updated.education_type = matchSubj.education_type;
            updated.year = matchSubj.year;
          }
        }
        return updated;
      }
      return s;
    }));
  };

  const handleSaveTimetable = async () => {
    if (!selectedFaculty) return;
    setSaving(true);
    try {
      const formattedSlots = timetableSlots.map(s => {
        const matchSubj = allSubjects.find(sub => sub.id === Number(s.subject_id));
        return {
          day: s.day,
          from_time: s.from_time.slice(0, 5),
          to_time: s.to_time.slice(0, 5),
          subject_id: s.subject_id ? Number(s.subject_id) : null,
          subject_type: s.subject_type || (matchSubj ? matchSubj.subject_type : 'Theory'),
          education_type: s.education_type || (matchSubj ? matchSubj.education_type : null),
          year: s.year || (matchSubj ? matchSubj.year : null),
          section: s.section || null,
          room_number: s.room_number || null
        };
      });

      await api.put(`/api/admin/users/${selectedFaculty}/timetable`, { slots: formattedSlots });
      toast.success('Timetable updated successfully!');
      loadFacultyTimetable(selectedFaculty);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save timetable.');
    } finally {
      setSaving(false);
    }
  };

  const downloadTimetableTemplate = () => {
    const headers = [
      'PROGRAM', 'DAY', 'YEAR', 'Class & Section',
      'Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'
    ];
    const data = [
      {
        'PROGRAM': 'B.Tech',
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
        'PROGRAM': 'B.Tech',
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
    const matchesSearch = !facultySearchText ||
      u.full_name.toLowerCase().includes(facultySearchText.toLowerCase()) ||
      u.employee_id.toLowerCase().includes(facultySearchText.toLowerCase());
    return isFacultyOrHod && matchesDept && matchesSearch;
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 14, alignItems: 'flex-end' }}>
          <div>
            <label className="form-label" htmlFor="dept-select">Filter Department</label>
            <select
              id="dept-select"
              className="input"
              value={selectedDept}
              onChange={e => { setSelectedDept(e.target.value); handleFacultyChange(''); }}
              disabled={user?.role === 'HOD'}
            >
              {user?.role === 'HOD' ? (
                <option value={user.department}>{user.department}</option>
              ) : (
                <>
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.department_name}>{d.department_code}</option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="faculty-search-input">Search Faculty</label>
            <input
              id="faculty-search-input"
              className="input"
              placeholder="Type name or ID to filter dropdown..."
              value={facultySearchText}
              onChange={e => setFacultySearchText(e.target.value)}
            />
          </div>
          <div>
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
            Choose a department or search/select a faculty member from the dropdown to preview and edit their schedule.
          </p>
        </div>
      ) : (
        <>
          {timetableSlots.filter(s => !String(s.id).startsWith('new-')).length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, marginBottom: 20 }}>
              <Calendar size={48} style={{ opacity: 0.25, marginBottom: 12 }} />
              <h3 style={{ fontWeight: 600 }}>No timetable slots</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
                This faculty member has no periods mapped to their schedule. Use the editor below to add slots or upload a timetable sheet.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
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
                            borderBottom: isLast ? '1px solid var(--color-border)' : 'none',
                            borderRadius: isLast ? '0 0 0 10px' : 0, textAlign: 'center',
                            fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-muted)'
                          }}>
                            {day.slice(0, 3)}
                          </td>
                          {[1, 2, 3, 4, 5, 6].map((period, colIdx) => {
                            const isLastCol = colIdx === 5;
                            const slots = timetableSlots.filter(s => s.day === day && getPeriodNumber(s.from_time, s.education_type) === period);

                            return (
                              <td
                                key={period}
                                onClick={() => slots.length === 0 && openAdd(day, period)}
                                style={{
                                  padding: 6,
                                  border: '1px solid var(--color-border)',
                                  borderTop: 'none',
                                  borderLeft: 'none',
                                  borderBottom: isLast ? '1px solid var(--color-border)' : 'none',
                                  borderRadius: isLast && isLastCol ? '0 0 10px 0' : 0,
                                  verticalAlign: 'top',
                                  background: 'var(--color-bg)',
                                  cursor: slots.length === 0 ? 'pointer' : 'default',
                                  transition: 'background 0.15s',
                                  minHeight: 80,
                                  position: 'relative',
                                }}
                                onMouseEnter={e => { if (slots.length === 0) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                                onMouseLeave={e => { if (slots.length === 0) e.currentTarget.style.background = 'var(--color-bg)'; }}
                              >
                                {slots.length === 0 ? (
                                  <div
                                    className="empty-cell-hint"
                                    style={{
                                      height: '100%', minHeight: 64, display: 'flex', alignItems: 'center',
                                      justifyContent: 'center', opacity: 0,
                                      transition: 'opacity 0.15s',
                                      color: 'var(--color-text-muted)', fontSize: '0.7rem',
                                    }}
                                  >
                                    <Plus size={14} />
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {slots.map(s => (
                                      <AdminSlotCell
                                        key={s.id}
                                        slot={s}
                                        onEdit={openEdit}
                                        onDelete={handleDeleteSlot}
                                        isAdmin={user?.role === 'Admin' || user?.role === 'HOD'}
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
        </div>
      )}
      </>
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

      {showModal && setupData && (
        <SlotModal
          slot={editSlot}
          day={clickDay}
          fromTime={clickTime}
          myBlocks={setupData.blocks || []}
          myCourses={setupData.courses || []}
          mySubjects={setupData.subjects || []}
          onClose={() => { setShowModal(false); setEditSlot(null); }}
          onSave={handleSaveSlot}
        />
      )}

      {/* Global style for hover hint */}
      <style>{`
        td:hover .empty-cell-hint { opacity: 1 !important; }
      `}</style>
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

function AdminSlotCell({ slot, onEdit, onDelete, isAdmin }) {
  const color = TYPE_COLORS[slot.subject_type] || '#64748b';
  const bg = TYPE_BG[slot.subject_type] || 'rgba(100,116,139,0.06)';
  const border = TYPE_BORDER[slot.subject_type] || 'rgba(100,116,139,0.2)';

  let displayCode = slot.short_name || slot.subject_code || '';
  let displayBranch = '';
  if (displayCode.includes('_')) {
    const parts = displayCode.split('_');
    displayBranch = parts[0];
    displayCode = parts.slice(1).join('_');
  }
  const mainTitle = displayCode;

  const ROMAN_YEARS = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  const yrLabel = `${ROMAN_YEARS[slot.year] || slot.year} Year`;
  const currentMonth = new Date().getMonth();
  const isEvenSemester = currentMonth >= 0 && currentMonth <= 5;
  const semNumber = isEvenSemester ? (slot.year * 2) : (slot.year * 2 - 1);
  const semLabel = semNumber % 2 === 0 ? 'II Semester' : 'I Semester';
  const secLabel = slot.section ? `, ${slot.section}` : '';

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
      <div style={{ fontWeight: 700, fontSize: '0.78rem', color, lineHeight: 1.2, paddingRight: isAdmin ? 24 : 0 }}>
        {mainTitle}
      </div>

      {/* Class label */}
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.66rem', lineHeight: 1.3, paddingRight: isAdmin ? 24 : 0 }}>
        ({slot.education_type === 'B-Tech' ? 'B.Tech' : slot.education_type} {yrLabel} {semLabel}{secLabel})
      </div>

      {/* Timing and Block */}
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.66rem', fontWeight: 600, marginTop: 2, paddingRight: isAdmin ? 24 : 0 }}>
        {formattedTimings} {blockName ? `[${blockName}]` : ''}
      </div>

      {/* Action buttons */}
      {isAdmin && (
        <div style={{ position: 'absolute', top: 5, right: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <button
            title="Edit"
            onClick={(e) => { e.stopPropagation(); onEdit(slot); }}
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 5, padding: '2px 4px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <Edit2 size={10} />
          </button>
          <button
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(slot.id); }}
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 5, padding: '2px 4px', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center' }}
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

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

  const targetPeriod = fromTime || (slot ? getPeriodNumber(slot.from_time, slot.education_type) : null);

  const isBreakSlot = (s) => {
    if (!s) return false;
    const label = (s.short_name || '').toLowerCase();
    return s.subject_type === 'Break' ||
           label.includes('break') ||
           label.includes('lunch') ||
           label.includes('recess') ||
           label.includes('interval') ||
           label.includes('tea') ||
           label.includes('free');
  };

  useEffect(() => {
    if (!slot && fromTime && myBlocks.length > 0) {
      for (const block of myBlocks) {
        const matchingSlot = (block.slots || []).find(s => {
          if (isBreakSlot(s)) return false;
          const pNum = getPeriodNumber(s.from_time, block.education_type);
          return pNum === fromTime;
        });
        if (matchingSlot) {
          setCourseKey(`${block.education_type}|${block.year}|${block.section}`);
          break;
        }
      }
    }
  }, [slot, fromTime, myBlocks]);

  useEffect(() => {
    if (courseKey && myBlocks.length > 0) {
      const parts = courseKey.split('|');
      const eduType = parts[0];
      const yr = parseInt(parts[1], 10);
      const sec = parts[2];
      const matchingBlock = myBlocks.find(b => 
        b.education_type === eduType &&
        b.year === yr &&
        b.section === sec
      );
      if (matchingBlock) {
        setBlockId(matchingBlock.id);
      } else {
        setBlockId('');
      }
    } else {
      setBlockId('');
    }
  }, [courseKey, myBlocks]);

  useEffect(() => {
    if (targetPeriod && blockId && myBlocks.length > 0) {
      const block = myBlocks.find(b => String(b.id) === String(blockId));
      if (block) {
        const matchingSlot = (block.slots || []).find(s => {
          if (isBreakSlot(s)) return false;
          const pNum = getPeriodNumber(s.from_time, block.education_type);
          return pNum === targetPeriod;
        });
        if (matchingSlot) {
          setTimeSlot(`${matchingSlot.from_time}|${matchingSlot.to_time}`);
        } else {
          setTimeSlot('');
        }
      }
    }
  }, [blockId, targetPeriod, myBlocks]);

  const selectedBlock   = myBlocks.find(b => String(b.id) === String(blockId));
  const availableSlots  = (selectedBlock?.slots || []).filter(s => !isBreakSlot(s));

  const parsedCourse = courseKey
    ? { education_type: courseKey.split('|')[0], year: parseInt(courseKey.split('|')[1]), section: courseKey.split('|')[2] }
    : null;

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
    const found = mySubjects.find(s => String(s.subject_id || s.id) === String(subjectId));

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

        {/* Course / Class selector */}
        <div className="form-group">
          <label className="form-label">Course / Class *</label>
          {myCourses.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-danger)' }}>
              No courses configured for this faculty.
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

        {/* Time slot selector */}
        {blockId && (
          <div className="form-group">
            <label className="form-label">Time Slot *</label>
            {targetPeriod ? (
              (() => {
                const matched = (selectedBlock?.slots || []).find(s => 
                  !isBreakSlot(s) && getPeriodNumber(s.from_time, selectedBlock?.education_type) === targetPeriod
                );
                return matched ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      padding: '8px 16px',
                      background: 'rgba(6, 182, 212, 0.08)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0891b2',
                      fontFamily: 'monospace',
                    }}>
                      {formatTime12h(matched.from_time)} – {formatTime12h(matched.to_time)} (Period {targetPeriod})
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      (Extracted automatically for Period {targetPeriod})
                    </span>
                  </div>
                ) : (
                  <select className="input" value={timeSlot} onChange={e => setTimeSlot(e.target.value)}>
                    <option value="">— Select Time Slot —</option>
                    {availableSlots.map((s, idx) => (
                      <option key={idx} value={`${s.from_time}|${s.to_time}`}>
                        {formatTime12h(s.from_time)} – {formatTime12h(s.to_time)}
                      </option>
                    ))}
                  </select>
                );
              })()
            ) : (
              <select className="input" value={timeSlot} onChange={e => setTimeSlot(e.target.value)}>
                <option value="">— Select Time Slot —</option>
                {availableSlots.map((s, idx) => (
                  <option key={idx} value={`${s.from_time}|${s.to_time}`}>
                    {formatTime12h(s.from_time)} – {formatTime12h(s.to_time)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Subject selector */}
        {courseKey && (
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <select className="input" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              <option value="">— Select Subject —</option>
              {filteredSubjects.map((s, idx) => (
                <option key={idx} value={s.subject_id || s.id}>
                  {s.subject_code} – {s.subject_name} ({s.subject_type})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />} Save Slot
          </button>
        </div>
      </div>
    </div>
  );
}
