import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Loader2, ArrowLeft, User, Mail, Phone, Landmark, Shield, BookOpen,
  Calendar, Clock, Plus, Trash2, Save, MapPin, Edit2, X, CheckCircle
} from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../hooks/useAuth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SUBJECT_TYPES = ['Theory', 'Lab'];

const TYPE_COLORS = { Theory: '#6366f1', Lab: '#10b981' };
const TYPE_BG     = { Theory: 'rgba(99,102,241,0.08)', Lab: 'rgba(16,185,129,0.08)' };
const TYPE_BORDER = { Theory: 'rgba(99,102,241,0.25)', Lab: 'rgba(16,185,129,0.25)' };

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

export default function AdminUserDetailPage() {
  const { employee_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHod = user?.role === 'HOD';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const [userData, setUserData] = useState(null);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [setupData, setSetupData] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [clickDay, setClickDay] = useState(null);
  const [clickTime, setClickTime] = useState(null);
  
  const [leavesHistory, setLeavesHistory] = useState([]);
  const [odsHistory, setOdsHistory] = useState([]);
  const [changeLogsHistory, setChangeLogsHistory] = useState([]);

  // Dropdown lists
  const [allSubjects, setAllSubjects] = useState([]);
  const [allSections, setAllSections] = useState([]);

  // Editable user profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    short_name: '',
    highest_qualification: '',
    department: '',
    designation: '',
    phone_number: '',
    email: '',
    role: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
  });

  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, subjectsRes, sectionsRes, deptsRes] = await Promise.all([
          api.get(`/api/admin/users/${employee_id}/full`),
          api.get('/api/admin/subjects'),
          api.get('/api/admin/sections'),
          api.get('/api/admin/departments')
        ]);

        const { user: userObj, timetable, setup, leaves, ods, changeLogs } = userRes.data.data;
        if (isHod && user?.department && userObj.department !== user.department) {
          toast.error('Access denied. This user belongs to a different department.');
          navigate('/admin/users');
          return;
        }
        setUserData(userObj);
        setTimetableSlots(timetable || []);
        setSetupData(setup);
        setLeavesHistory(leaves || []);
        setOdsHistory(ods || []);
        setChangeLogsHistory(changeLogs || []);

        setProfileForm({
          full_name:             userObj.full_name || '',
          short_name:            userObj.short_name || '',
          highest_qualification: userObj.highest_qualification || '',
          department:            userObj.department || '',
          designation:           userObj.designation || '',
          phone_number:          userObj.phone_number || '',
          email:                 userObj.email || '',
          role:                  userObj.role || 'Faculty',
          bank_name:             userObj.bank_name || '',
          bank_account_no:       userObj.bank_account_no || '',
          bank_ifsc:             userObj.bank_ifsc || '',
        });

        setAllSubjects(subjectsRes.data.data || []);
        setAllSections(sectionsRes.data.data || []);
        setDepartments(deptsRes.data.data || []);
      } catch (err) {
        toast.error('Failed to load user details.');
        navigate('/admin/users');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employee_id, navigate]);

  // Handle saving profile changes (including bank overwrite)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      await api.put(`/api/admin/users/${employee_id}`, profileForm);
      toast.success('User profile updated successfully.');
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        ...profileForm,
        bank_details_submitted: !!(profileForm.bank_name && profileForm.bank_account_no && profileForm.bank_ifsc)
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user profile.');
    } finally {
      setSavingUser(false);
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

      await api.put(`/api/admin/users/${employee_id}/timetable`, { slots: formattedSlots });
      toast.success('Timetable saved successfully!');
      
      const userRes = await api.get(`/api/admin/users/${employee_id}/full`);
      const { timetable, setup } = userRes.data.data;
      setTimetableSlots(timetable || []);
      setSetupData(setup);
      setShowModal(false);
      setEditSlot(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save timetable.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTimetable = async () => {
    setSaving(true);
    try {
      // Validate slots
      const formattedSlots = timetableSlots.map(s => {
        // Find subject details if they are empty
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

      await api.put(`/api/admin/users/${employee_id}/timetable`, { slots: formattedSlots });
      toast.success('Timetable updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save timetable.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="User Details">
        <div className="empty-state">
          <Loader2 size={32} className="spinner" style={{ color: 'var(--color-primary)' }} />
          <p>Loading user full profile & timetable...</p>
        </div>
      </AppLayout>
    );
  }

  const roleColor = userData?.role === 'Admin' ? '#6366f1' : userData?.role === 'HOD' ? '#06b6d4' : '#10b981';

  return (
    <AppLayout title={`User Details — ${userData?.full_name}`}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Top Header Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn-icon" onClick={() => navigate('/admin/users')} style={{ background: 'var(--color-surface-2)' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: 2 }}>
              {userData?.full_name}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Employee ID: {employee_id} · Department: {userData?.department}
            </p>
          </div>
        </div>

        {/* Profile Card & Setup overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 24, alignItems: 'start' }}>
          
          {/* User Details Editor Form */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
              <User size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{isHod ? "Staff Identity & Credentials" : "Edit Identity & Credentials"}</h3>
            </div>
            
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className="input"
                    value={profileForm.full_name}
                    onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                    required
                    disabled={isHod}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Name</label>
                  <input
                    className="input"
                    value={profileForm.short_name}
                    onChange={e => setProfileForm(f => ({ ...f, short_name: e.target.value }))}
                    disabled={isHod}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="input"
                    value={profileForm.email}
                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                    required
                    disabled={isHod}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="input"
                    value={profileForm.phone_number}
                    onChange={e => setProfileForm(f => ({ ...f, phone_number: e.target.value }))}
                    disabled={isHod}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    className="input"
                    value={profileForm.department}
                    onChange={e => setProfileForm(f => ({ ...f, department: e.target.value }))}
                    required
                    disabled={isHod}
                  >
                    <option value="">— Select —</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.department_name}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input
                    className="input"
                    value={profileForm.designation}
                    onChange={e => setProfileForm(f => ({ ...f, designation: e.target.value }))}
                    disabled={isHod}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Highest Qualification *</label>
                  <input
                    className="input"
                    value={profileForm.highest_qualification}
                    onChange={e => setProfileForm(f => ({ ...f, highest_qualification: e.target.value }))}
                    required
                    disabled={isHod}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select
                    className="input"
                    value={profileForm.role}
                    onChange={e => setProfileForm(f => ({ ...f, role: e.target.value }))}
                    required
                    disabled={isHod}
                  >
                    <option value="Faculty">Faculty</option>
                    <option value="HOD">HOD</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Overwrite Bank Account details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 16px', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                <Landmark size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Bank Details {isHod ? "(View Only)" : "(Manual Admin Overwrite)"}</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input
                    className="input"
                    value={profileForm.bank_name}
                    onChange={e => setProfileForm(f => ({ ...f, bank_name: e.target.value }))}
                    placeholder="e.g. State Bank of India"
                    disabled={isHod}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Account Number</label>
                  <input
                    className="input"
                    value={profileForm.bank_account_no}
                    onChange={e => setProfileForm(f => ({ ...f, bank_account_no: e.target.value }))}
                    placeholder="e.g. 10002345678"
                    disabled={isHod}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">IFSC Code</label>
                  <input
                    className="input"
                    value={profileForm.bank_ifsc}
                    onChange={e => setProfileForm(f => ({ ...f, bank_ifsc: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SBIN0001234"
                    style={{ textTransform: 'uppercase' }}
                    disabled={isHod}
                  />
                </div>
              </div>

              {!isHod && (
                <button type="submit" className="btn btn-primary" disabled={savingUser}>
                  {savingUser ? <Loader2 size={14} className="spinner" /> : <Save size={14} />} Save User Info
                </button>
              )}
            </form>
          </div>

          {/* Profile Sidebar Setup overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Quick Stats */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: `${roleColor}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: roleColor, fontSize: '1.2rem'
                }}>
                  {userData?.full_name?.charAt(0)}
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{userData?.full_name}</h4>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: `${roleColor}22`, color: roleColor }}>
                    {userData?.role}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Bank Setup Status:</span>
                  <span style={{ fontWeight: 600, color: userData?.bank_details_submitted ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {userData?.bank_details_submitted ? 'Submitted' : 'Pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>First Login Completed?</span>
                  <span style={{ fontWeight: 600 }}>{!userData?.is_first_login ? 'Yes' : 'No (Pending reset)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Timetable Slots:</span>
                  <span style={{ fontWeight: 600 }}>{timetableSlots.length} slot(s)</span>
                </div>
              </div>
            </div>

            {/* Setup Parameters Panel */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>Faculty Setup Overview</h4>
              {setupData ? (
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.68rem', marginBottom: 4 }}>Assigned Blocks</div>
                    {setupData.blocks?.length > 0 ? (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {setupData.blocks.map(b => (
                          <li key={b.block_id}>{b.block_name} ({b.education_type} Year {b.year} {b.section})</li>
                        ))}
                      </ul>
                    ) : <span style={{ color: 'var(--color-text-subtle)' }}>None configured</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.68rem', marginBottom: 4 }}>Subjects Assigned</div>
                    {setupData.subjects?.length > 0 ? (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {setupData.subjects.map(s => (
                          <li key={s.subject_id}>{s.subject_code} - {s.subject_name}</li>
                        ))}
                      </ul>
                    ) : <span style={{ color: 'var(--color-text-subtle)' }}>None configured</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.68rem', marginBottom: 4 }}>Weekly Other Works</div>
                    {setupData.otherWorks?.length > 0 ? (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {setupData.otherWorks.map(o => (
                          <li key={o.id}>{o.day} {o.from_time.slice(0, 5)}-{o.to_time.slice(0, 5)}: {o.duty_name}</li>
                        ))}
                      </ul>
                    ) : <span style={{ color: 'var(--color-text-subtle)' }}>None configured</span>}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No setup data available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Timetable Editing section */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{isHod ? "Weekly Timetable" : "Weekly Timetable & Overrides"}</h3>
            </div>
            {!isHod && (
              <button className="btn btn-primary" onClick={() => openAdd(null, null)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                <Plus size={14} /> Add Slot
              </button>
            )}
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
                            onClick={() => !isHod && slots.length === 0 && openAdd(day, period)}
                            style={{
                              padding: 8, border: '1px solid var(--color-border)',
                              borderTop: 'none', borderLeft: 'none',
                              borderRight: isLastCol ? '1px solid var(--color-border)' : 'none',
                              borderBottom: isLast ? '1px solid var(--color-border)' : 'none',
                              borderRadius: (isLast && isLastCol) ? '0 0 10px 0' : 0,
                              verticalAlign: 'top', background: 'var(--color-surface)',
                              cursor: (!isHod && slots.length === 0) ? 'pointer' : 'default',
                              position: 'relative'
                            }}
                            onMouseEnter={e => { if (!isHod && slots.length === 0) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                            onMouseLeave={e => { if (!isHod && slots.length === 0) e.currentTarget.style.background = 'var(--color-surface)'; }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {slots.map(s => (
                                <AdminSlotCell
                                  key={s.id}
                                  slot={s}
                                  onEdit={openEdit}
                                  onDelete={handleDeleteSlot}
                                  isAdmin={!isHod}
                                />
                              ))}
                              {!isHod && slots.length === 0 && (
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
                              )}
                            </div>
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

        {/* Histories Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          
          {/* Leaves History Card */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
              Leave History
            </h3>
            {leavesHistory.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>No leaves recorded.</p>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leavesHistory.map(lr => (
                  <div key={lr.id} style={{ fontSize: '0.78rem', padding: 8, background: 'var(--color-surface-2)', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{lr.leave_date} ({lr.leave_type})</span>
                      <span className={`badge badge-${lr.status.toLowerCase()}`}>{lr.status}</span>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Reason: {lr.reason}</div>
                    {lr.approved_by && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginTop: 2 }}>Approved by: {lr.approved_by}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OD History Card */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
              On-Duty (OD) History
            </h3>
            {odsHistory.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>No ODs recorded.</p>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {odsHistory.map(od => (
                  <div key={od.id} style={{ fontSize: '0.78rem', padding: 8, background: 'var(--color-surface-2)', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{od.od_date} ({od.session_type})</span>
                      <span className={`badge badge-${od.status.toLowerCase()}`}>{od.status}</span>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Place: {od.place}</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Purpose: {od.purpose}</div>
                    {od.approved_by && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginTop: 2 }}>Approved by: {od.approved_by}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Change Request Logs Audit Card */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
            Profile & Setup Modification Logs
          </h3>
          {changeLogsHistory.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>No modification requests logged.</p>
          ) : (
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'none' }}>
                    <th style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', padding: 6 }}>Requested</th>
                    <th style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', padding: 6 }}>Target</th>
                    <th style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', padding: 6 }}>Reason</th>
                    <th style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', padding: 6 }}>Status</th>
                    <th style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', padding: 6 }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {changeLogsHistory.map(log => (
                    <tr key={log.id} style={{ background: 'none' }}>
                      <td style={{ padding: 6 }}>{log.created_at ? new Date(log.created_at).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: 6, textTransform: 'capitalize' }}>{log.target_table?.replace(/_/g, ' ')}</td>
                      <td style={{ padding: 6 }}>{log.reason}</td>
                      <td style={{ padding: 6 }}>
                        <span className={`badge badge-${log.status?.toLowerCase()}`}>{log.status}</span>
                      </td>
                      <td style={{ padding: 6, fontStyle: 'italic' }}>{log.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
