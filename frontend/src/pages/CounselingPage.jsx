import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Users, UserCheck, FileText, Plus, Trash2, Upload, Search, Calendar,
  UserPlus, ChevronRight, Loader2, Sparkles, Filter, CheckSquare, Square,
  Download, RefreshCw, BookOpen, Clock, AlertCircle
} from 'lucide-react';

export default function CounselingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isHod = user?.role === 'HOD';
  const isFaculty = user?.role === 'Faculty';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'students' : isHod ? 'students' : 'my-students');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  
  // Filtering & searching states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState(isHod ? user.department : '');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSec, setSelectedSec] = useState('');
  const [selectedCounselor, setSelectedCounselor] = useState('');
  const [selectedMappingCounselor, setSelectedMappingCounselor] = useState('');

  // Bulk / single student modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Single student form
  const [newStudent, setNewStudent] = useState({
    roll_number: '',
    name: '',
    department: '',
    year: '1',
    section: '',
  });

  // Counselor mapping state
  const [selectedRollNumbers, setSelectedRollNumbers] = useState([]);

  // Counseling record state (modal & data entry)
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [newRecord, setNewRecord] = useState({
    counseling_date: format(new Date(), 'yyyy-MM-dd'),
    discussion_points: '',
    action_taken: '',
  });
  const [savingRecord, setSavingRecord] = useState(false);

  // Reports state
  const [reportFilters, setReportFilters] = useState({
    roll_number: '',
    counselor_id: '',
    from_date: '',
    to_date: '',
    department: isHod ? user.department : '',
  });
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Load departments
      const deptRes = await api.get('/api/admin/departments');
      setDepartments(deptRes.data.data || []);
      
      // Load faculties
      const facRes = await api.get('/api/admin/faculty');
      const allFacs = facRes.data.data || [];
      if (isHod) {
        setFaculties(allFacs.filter(f => f.department === user.department));
      } else {
        setFaculties(allFacs);
      }

      await fetchStudents();
    } catch (err) {
      toast.error('Failed to load initial setup data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/counseling/students');
      setStudents(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load student directory.');
    }
  };

  // Add single student handler
  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (!newStudent.roll_number.trim() || !newStudent.name.trim() || !newStudent.department) {
      toast.error('Please fill in all required fields.');
      return;
    }
    try {
      await api.post('/api/counseling/students', {
        ...newStudent,
        department: newStudent.department || selectedDept
      });
      toast.success('Student added successfully!');
      setShowAddModal(false);
      setNewStudent({ roll_number: '', name: '', department: '', year: '1', section: '' });
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student.');
    }
  };

  const handleResetList = async () => {
    if (window.confirm("WARNING: Are you sure you want to reset the student list? This will delete ALL registered students and all counseling logs forever! This action cannot be undone.")) {
      try {
        await api.delete('/api/counseling/students-reset/all');
        toast.success('Student list cleared successfully.');
        setStudents([]);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to clear student list.');
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "roll_number,name,department,year,section,counselor_id\n"
      + "99NG1A0501,John Doe,Computer Science & Engineering,3,A,99NG1A1118\n"
      + "99NG1A0502,Jane Smith,Computer Science & Engineering,3,B,\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "students_bulk_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk upload handler
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      toast.error('Please select an Excel file to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('file', bulkFile);
    setBulkUploading(true);
    try {
      const res = await api.post('/api/counseling/students/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBulkResult(res.data);
      toast.success(res.data.message || 'Bulk upload processed.');
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk upload failed.');
    } finally {
      setBulkUploading(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (id, roll) => {
    if (!window.confirm(`Are you sure you want to delete student ${roll}? This will delete all their counseling history forever.`)) return;
    try {
      await api.delete(`/api/counseling/students/${id}`);
      toast.success('Student deleted.');
      fetchStudents();
    } catch (err) {
      toast.error('Failed to delete student.');
    }
  };

  // Counselor mapping action (HOD)
  const handleMapCounselor = async () => {
    if (selectedRollNumbers.length === 0) {
      toast.error('Please select at least one student.');
      return;
    }
    try {
      await api.put('/api/counseling/students/map', {
        counselor_id: selectedMappingCounselor || null,
        student_roll_numbers: selectedRollNumbers
      });
      toast.success(selectedMappingCounselor ? 'Students mapped to counselor successfully.' : 'Students unmapped successfully.');
      setSelectedRollNumbers([]);
      setSelectedMappingCounselor('');
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to map students.');
    }
  };

  // Fetch counseling records for selected student
  const openCounsellingModal = async (student) => {
    setSelectedStudent(student);
    setRecords([]);
    setRecordsLoading(true);
    try {
      const res = await api.get(`/api/counseling/students/${student.roll_number}/records`);
      setRecords(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load counseling records.');
    } finally {
      setRecordsLoading(false);
    }
  };

  // Submit counseling entry
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!newRecord.discussion_points.trim()) {
      toast.error('Please enter discussion points.');
      return;
    }
    setSavingRecord(true);
    try {
      await api.post('/api/counseling/records', {
        student_roll_number: selectedStudent.roll_number,
        ...newRecord
      });
      toast.success('Counseling session logged successfully!');
      setNewRecord({
        counseling_date: format(new Date(), 'yyyy-MM-dd'),
        discussion_points: '',
        action_taken: ''
      });
      // reload records
      const res = await api.get(`/api/counseling/students/${selectedStudent.roll_number}/records`);
      setRecords(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save counseling record.');
    } finally {
      setSavingRecord(false);
    }
  };

  // Generate reports
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setReportLoading(true);
    try {
      const res = await api.get('/api/counseling/reports', { params: reportFilters });
      setReportData(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load reports.');
    } finally {
      setReportLoading(false);
    }
  };

  // Multi-select helpers
  const handleSelectAll = (filtered) => {
    const filteredRolls = filtered.map(s => s.roll_number);
    const allSelected = filteredRolls.every(r => selectedRollNumbers.includes(r));
    if (allSelected) {
      setSelectedRollNumbers(prev => prev.filter(r => !filteredRolls.includes(r)));
    } else {
      setSelectedRollNumbers(prev => [...new Set([...prev, ...filteredRolls])]);
    }
  };

  const handleSelectRow = (roll) => {
    setSelectedRollNumbers(prev => 
      prev.includes(roll) ? prev.filter(r => r !== roll) : [...prev, roll]
    );
  };

  // Filter student lists
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept ? s.department === selectedDept : true;
    const matchesYear = selectedYear ? String(s.year) === selectedYear : true;
    const matchesSec = selectedSec ? s.section === selectedSec : true;
    const matchesCounselor = selectedCounselor ? s.counselor_id === selectedCounselor : true;
    
    // Scopes
    if (activeTab === 'my-students') {
      return s.counselor_id === user.employee_id && matchesSearch;
    }
    
    return matchesSearch && matchesDept && matchesYear && matchesSec && matchesCounselor;
  });

  return (
    <AppLayout title="Student Counselling">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Student Counselling Portal</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {isAdmin ? 'System-wide student counseling registry, directories, and uploads.' : isHod ? `Department student counselling mapping and status.` : 'Counselling entries and student mentoring sheets.'}
          </p>
        </div>

        {isAdmin && activeTab === 'students' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-danger" onClick={handleResetList}>
              <Trash2 size={15} />
              Reset Student List
            </button>
            <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)}>
              <Upload size={15} />
              Bulk Upload
            </button>
            <button className="btn btn-primary" onClick={() => {
              setNewStudent({ roll_number: '', name: '', department: departments[0]?.department_name || '', year: '1', section: '' });
              setShowAddModal(true);
            }}>
              <Plus size={15} />
              Add Student
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 24,
        background: 'var(--color-surface-2)', borderRadius: 12,
        padding: 4, border: '1px solid var(--color-border)',
        maxWidth: 640
      }}>
        {(isAdmin || isHod) && (
          <button
            onClick={() => setActiveTab('students')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.87rem',
              background: activeTab === 'students' ? 'var(--color-surface)' : 'transparent',
              color: activeTab === 'students' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: activeTab === 'students' ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.18s',
            }}
          >
            <Users size={16} />
            <span style={{ whiteSpace: 'nowrap' }}>Student Directory</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('my-students')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.87rem',
            background: activeTab === 'my-students' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'my-students' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            boxShadow: activeTab === 'my-students' ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
            transition: 'all 0.18s',
          }}
        >
          <UserCheck size={16} />
          <span style={{ whiteSpace: 'nowrap' }}>My Mapped Students</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('reports');
            setReportFilters(f => ({ ...f, department: isHod ? user.department : f.department }));
          }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.87rem',
            background: activeTab === 'reports' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'reports' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            boxShadow: activeTab === 'reports' ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
            transition: 'all 0.18s',
          }}
        >
          <FileText size={16} />
          <span style={{ whiteSpace: 'nowrap' }}>Counseling Reports</span>
        </button>
      </div>

      {/* Students / Mapping Directory Tab */}
      {activeTab === 'students' && (isAdmin || isHod) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Filters Card */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'end' }}>
              <div style={{ flex: 1, minWidth: 200 }} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Search Name / Roll No.</label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    className="input"
                    placeholder="Search students..."
                    style={{ paddingLeft: 34 }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {!isHod && (
                <div style={{ width: 200 }} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Department</label>
                  <select className="input" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.department_name}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ width: 100 }} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Year</label>
                <select className="input" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                  <option value="">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <div style={{ width: 100 }} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Section</label>
                <select className="input" value={selectedSec} onChange={e => setSelectedSec(e.target.value)}>
                  <option value="">All Sec</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div style={{ width: 180 }} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Counselor</label>
                <select className="input" value={selectedCounselor} onChange={e => setSelectedCounselor(e.target.value)}>
                  <option value="">All Counselors</option>
                  {faculties.map(f => (
                    <option key={f.employee_id} value={f.employee_id}>{f.full_name}</option>
                  ))}
                </select>
              </div>

              <button className="btn btn-secondary" onClick={() => {
                setSearchQuery('');
                setSelectedDept(isHod ? user.department : '');
                setSelectedYear('');
                setSelectedSec('');
                setSelectedCounselor('');
              }}>Reset</button>
            </div>
          </div>

          {/* Mapping Control Panel (HOD only) */}
          {isHod && (
            <div className="card" style={{ padding: 18, background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} color="var(--color-primary-light)" />
                    Map selected students to Counselor
                  </h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: 0 }}>
                    Selected: <strong>{selectedRollNumbers.length}</strong> students.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select
                    className="input"
                    style={{ width: 220, margin: 0 }}
                    value={selectedMappingCounselor}
                    onChange={e => setSelectedMappingCounselor(e.target.value)}
                  >
                    <option value="">-- Choose Counselor (or Unmap) --</option>
                    {faculties.map(f => (
                      <option key={f.employee_id} value={f.employee_id}>{f.full_name} ({f.short_name || f.employee_id})</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={handleMapCounselor}>Map Selected</button>
                </div>
              </div>
            </div>
          )}

          {/* Student Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    {isHod && (
                      <th style={{ width: 50, textAlign: 'center' }}>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', margin: '0 auto' }}
                          onClick={() => handleSelectAll(filteredStudents)}
                        >
                          {filteredStudents.length > 0 && filteredStudents.every(s => selectedRollNumbers.includes(s.roll_number)) ? (
                            <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </th>
                    )}
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Dept / Year / Sec</th>
                    <th>Mapped Counselor</th>
                    <th style={{ width: 140, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-muted)' }}>
                        <AlertCircle size={28} style={{ margin: '0 auto 10px', display: 'block' }} />
                        No students found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(s => (
                      <tr key={s.id} style={{ background: selectedRollNumbers.includes(s.roll_number) ? 'rgba(99,102,241,0.05)' : '' }}>
                        {isHod && (
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', margin: '0 auto' }}
                              onClick={() => handleSelectRow(s.roll_number)}
                            >
                              {selectedRollNumbers.includes(s.roll_number) ? (
                                <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </td>
                        )}
                        <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{s.roll_number}</td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ fontSize: '0.80rem' }}>
                          <span style={{ fontWeight: 600 }}>{s.department}</span>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', marginTop: 2 }}>
                            Year: {s.year} | Sec: {s.section || 'N/A'}
                          </div>
                        </td>
                        <td>
                          {s.counselor_name ? (
                            <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', fontWeight: 600 }}>
                              👤 {s.counselor_name}
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', fontWeight: 600 }}>
                              Unmapped
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => openCounsellingModal(s)}>
                              <BookOpen size={13} />
                              View Logs
                            </button>
                            {isAdmin && (
                              <button className="btn btn-sm btn-secondary" style={{ color: 'var(--color-danger)', borderColor: '#fca5a5' }} onClick={() => handleDeleteStudent(s.id, s.roll_number)}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Counselor Mapped Students Tab */}
      {activeTab === 'my-students' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ position: 'relative', maxWidth: 350 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search my mapped students..."
                style={{ paddingLeft: 34, margin: 0 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Dept / Year / Sec</th>
                  <th style={{ width: 180, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-muted)' }}>
                      No students mapped to you as counselor.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{s.roll_number}</td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td style={{ fontSize: '0.80rem' }}>
                        {s.department} (Year {s.year} - Sec {s.section || 'N/A'})
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => openCounsellingModal(s)}>
                          <Sparkles size={13} />
                          Mentoring &amp; Log Entry
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Counseling Reports Tab */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Filters Form */}
          <form className="card" style={{ padding: 18 }} onSubmit={handleGenerateReport}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'end' }}>
              <div style={{ width: 140 }} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. 201CSE01"
                  className="input"
                  value={reportFilters.roll_number}
                  onChange={e => setReportFilters(f => ({ ...f, roll_number: e.target.value }))}
                />
              </div>

              {!isHod && (
                <div style={{ width: 180 }} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Department</label>
                  <select className="input" value={reportFilters.department} onChange={e => setReportFilters(f => ({ ...f, department: e.target.value }))}>
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.department_name}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ width: 180 }} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Counselor</label>
                <select className="input" value={reportFilters.counselor_id} onChange={e => setReportFilters(f => ({ ...f, counselor_id: e.target.value }))}>
                  <option value="">All Counselors</option>
                  {faculties.map(f => (
                    <option key={f.employee_id} value={f.employee_id}>{f.full_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: 140 }} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>From Date</label>
                <input
                  type="date"
                  className="input"
                  value={reportFilters.from_date}
                  onChange={e => setReportFilters(f => ({ ...f, from_date: e.target.value }))}
                />
              </div>

              <div style={{ width: 140 }} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>To Date</label>
                <input
                  type="date"
                  className="input"
                  value={reportFilters.to_date}
                  onChange={e => setReportFilters(f => ({ ...f, to_date: e.target.value }))}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={reportLoading}>
                {reportLoading ? <Loader2 size={15} className="spinner" /> : <Filter size={15} />}
                Generate Report
              </button>
            </div>
          </form>

          {/* Report Results */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--color-border)' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>Counseling Session Logs ({reportData.length})</h4>
              {reportData.length > 0 && (
                <button className="btn btn-sm btn-secondary" onClick={() => window.print()}>
                  <Download size={13} />
                  Print / Export Report
                </button>
              )}
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student Info</th>
                    <th>Counselor</th>
                    <th>Discussion Points</th>
                    <th>Action Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-muted)' }}>
                        No records loaded. Use filters above to generate counseling reports.
                      </td>
                    </tr>
                  ) : (
                    reportData.map(r => (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {format(new Date(r.counseling_date), 'yyyy-MM-dd')}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.student_roll_number}</div>
                          <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            {r.student_department} | Year {r.year} | Sec {r.section || 'N/A'}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.counselor_name}</td>
                        <td style={{ whiteSpace: 'normal', minWidth: 200, fontSize: '0.82rem', lineHeight: 1.4 }}>
                          {r.discussion_points}
                        </td>
                        <td style={{ whiteSpace: 'normal', minWidth: 150, fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--color-primary-light)' }}>
                          {r.action_taken || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Counseling Records Modal / Mentoring Sheet */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedStudent(null)}>
          <div className="modal-box" style={{ maxWidth: 900, width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
              <div>
                <span className="badge" style={{ background: 'var(--color-primary-light)', color: '#fff', fontSize: '0.72rem', marginBottom: 4 }}>
                  ROLL: {selectedStudent.roll_number}
                </span>
                <h3 style={{ fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>{selectedStudent.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {selectedStudent.department} | Year {selectedStudent.year} | Sec {selectedStudent.section || 'N/A'}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedStudent(null)}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isFaculty && selectedStudent.counselor_id === user.employee_id ? '4fr 5fr' : '1fr', gap: 24, maxHeight: '60vh', overflowY: 'auto', paddingRight: 6 }}>
              
              {/* Form on Left for faculty counselor only */}
              {isFaculty && selectedStudent.counselor_id === user.employee_id && (
                <form onSubmit={handleRecordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, borderRight: '1px solid var(--color-border)', paddingRight: 20 }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-light)', margin: 0 }}>📝 Log Counseling Session</h4>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="rec-date">Session Date *</label>
                    <input
                      id="rec-date"
                      type="date"
                      className="input"
                      value={newRecord.counseling_date}
                      readOnly
                      style={{ background: 'var(--color-surface-3)', cursor: 'not-allowed' }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="rec-disc">Discussion Points / Student Issues *</label>
                    <textarea
                      id="rec-disc"
                      className="input"
                      rows={5}
                      placeholder="What was discussed with the student? Academic progress, attendance issues, personal challenges..."
                      value={newRecord.discussion_points}
                      onChange={e => setNewRecord(r => ({ ...r, discussion_points: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="rec-act">Action Taken / Suggestions</label>
                    <textarea
                      id="rec-act"
                      className="input"
                      rows={3}
                      placeholder="Counseling suggestions, warnings issued, steps planned for improvement..."
                      value={newRecord.action_taken}
                      onChange={e => setNewRecord(r => ({ ...r, action_taken: e.target.value }))}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={savingRecord} style={{ justifyContent: 'center' }}>
                    {savingRecord ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
                    Save Session Entry
                  </button>
                </form>
              )}

              {/* History list on Right */}
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} />
                  Counseling History (Stored Forever)
                </h4>

                {recordsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 size={24} className="spinner" /></div>
                ) : records.length === 0 ? (
                  <div style={{ padding: '24px 0', textSelf: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    No counseling sessions have been recorded for this student yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {records.map(r => (
                      <div key={r.id} style={{ padding: 14, borderRadius: 10, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                            📅 {format(new Date(r.counseling_date), 'yyyy-MM-dd')}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                            Counselor: {r.counselor_name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: 8, whiteSpace: 'normal', lineHeight: 1.4 }}>
                          <strong>Discussion:</strong> {r.discussion_points}
                        </div>
                        {r.action_taken && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', whiteSpace: 'normal', borderTop: '1px dashed var(--color-border)', paddingTop: 6 }}>
                            <strong>Action Taken:</strong> {r.action_taken}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Single Student Modal (Admin only) */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-box" style={{ maxWidth: 450 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 18 }}>Add Single Student</h3>
            <form onSubmit={handleAddStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="add-roll">Roll Number *</label>
                <input
                  id="add-roll"
                  type="text"
                  placeholder="e.g. 201CSE01"
                  className="input"
                  style={{ textTransform: 'uppercase' }}
                  value={newStudent.roll_number}
                  onChange={e => setNewStudent(s => ({ ...s, roll_number: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="add-name">Student Full Name *</label>
                <input
                  id="add-name"
                  type="text"
                  placeholder="e.g. John Doe"
                  className="input"
                  value={newStudent.name}
                  onChange={e => setNewStudent(s => ({ ...s, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="add-dept">Department *</label>
                <select id="add-dept" className="input" value={newStudent.department} onChange={e => setNewStudent(s => ({ ...s, department: e.target.value }))} required>
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.department_name}>{d.department_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="add-year">Year *</label>
                  <select id="add-year" className="input" value={newStudent.year} onChange={e => setNewStudent(s => ({ ...s, year: e.target.value }))} required>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="add-sec">Section</label>
                  <input
                    id="add-sec"
                    type="text"
                    placeholder="e.g. A"
                    className="input"
                    value={newStudent.section}
                    onChange={e => setNewStudent(s => ({ ...s, section: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal (Admin only) */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBulkModal(false)}>
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 10 }}>Bulk Upload Students</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
              Upload an Excel/CSV file with columns: <code>roll_number</code>, <code>name</code>, <code>department</code>, <code>year</code>, <code>section</code> (optional), and <code>counselor_id</code> (optional).
            </p>
            <button 
              type="button" 
              onClick={downloadTemplate} 
              style={{
                background: 'none', border: 'none', color: 'var(--color-primary)', 
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', 
                alignItems: 'center', gap: 6, padding: 0, marginBottom: 18, textDecoration: 'underline'
              }}
            >
              <Download size={14} /> Download Sample Excel/CSV Template
            </button>
            <form onSubmit={handleBulkUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="input"
                  onChange={e => setBulkFile(e.target.files[0])}
                  required
                />
              </div>

              {bulkUploading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)' }}>
                  <Loader2 size={16} className="spinner" />
                  <span>Processing file &amp; inserting students...</span>
                </div>
              )}

              {bulkResult && (
                <div style={{ padding: 14, borderRadius: 10, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Results:</div>
                  <div style={{ color: 'var(--color-success)' }}>✅ Successfully Added: {bulkResult.added}</div>
                  <div style={{ color: 'var(--color-danger)' }}>❌ Failed: {bulkResult.failed}</div>
                  {bulkResult.errors?.length > 0 && (
                    <div style={{ marginTop: 10, maxHeight: 120, overflowY: 'auto', fontSize: '0.75rem', background: 'var(--color-bg)', padding: 6, borderRadius: 4 }}>
                      {bulkResult.errors.map((err, idx) => (
                        <div key={idx} style={{ color: 'var(--color-danger)', marginBottom: 2 }}>
                          Row {err.row}: {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowBulkModal(false);
                  setBulkFile(null);
                  setBulkResult(null);
                }}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={bulkUploading}>
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
