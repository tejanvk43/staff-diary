import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Loader2, Plus, Trash2, Check, X, AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

export default function FacultySetupPage({ onComplete }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dbPrograms, setDbPrograms] = useState([]);
  const [programmes, setProgrammes] = useState({});
  const [assignments, setAssignments] = useState([]);

  const [allSections, setAllSections] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [assignedBlocks, setAssignedBlocks] = useState([]); // Loaded from admin block assignments
  const [allBlocks, setAllBlocks] = useState([]); // Loaded all block timetables in the system

  // Filter available options based on checked checkboxes
  const allowedPrograms = Object.keys(programmes).filter(p => programmes[p]);
  const activeProgramsChecked = allowedPrograms;

  // Auto-default the program field for all rows if only one program is checked
  useEffect(() => {
    if (allowedPrograms.length === 1) {
      const singleProg = allowedPrograms[0];
      setAssignments(prev => prev.map(a => {
        if (a.program !== singleProg) {
          return {
            ...a,
            program: singleProg,
            year: '',
            sectionId: '',
            subjectId: ''
          };
        }
        return a;
      }));
    }
  }, [programmes]);

  // Load setup data
  useEffect(() => {
    const loadSetupData = async () => {
      try {
        const [secRes, subjRes, setupRes, progDetailsRes, allBlocksRes] = await Promise.all([
          api.get('/api/faculty/sections'),
          api.get('/api/faculty/subjects'),
          api.get('/api/faculty/setup'),
          api.get('/api/admin/programs/details'),
          api.get('/api/faculty/blocks'),
        ]);

        const progsList = progDetailsRes.data.data || [];
        setDbPrograms(progsList);

        setAllSections(secRes.data.data || []);
        setAllSubjects(subjRes.data.data || []);
        setAllBlocks(allBlocksRes.data.data || []);

        const { courses: c, blocks: b, subjects: s } = setupRes.data.data;
        setAssignedBlocks(b || []);

        // 1. Reconstruct programmes checkboxes based on assigned blocks and db programs
        const pgMap = {};
        progsList.forEach(p => { pgMap[p.name] = false; });
        if (b.length) {
          b.forEach(x => {
            if (pgMap[x.education_type] !== undefined) {
              pgMap[x.education_type] = true;
            }
          });
        }
        setProgrammes(pgMap);

        // 2. Reconstruct assignments rows
        const loadedAssignments = [];
        if (b.length) {
          c.forEach(course => {
            // Find if this course matches an assigned block
            const block = b.find(blk =>
              blk.education_type === course.education_type &&
              Number(blk.year) === Number(course.year) &&
              blk.section === course.section
            );

            const matchingSubjects = s.filter(subj =>
              subj.education_type === course.education_type &&
              Number(subj.year) === Number(course.year)
            );

            if (block && matchingSubjects.length > 0) {
              matchingSubjects.forEach(subj => {
                loadedAssignments.push({
                  id: Math.random(),
                  program: course.education_type,
                  year: course.year,
                  sectionId: course.section_id,
                  subjectId: subj.subject_id
                });
              });
            } else if (block) {
              loadedAssignments.push({
                id: Math.random(),
                program: course.education_type,
                year: course.year,
                sectionId: course.section_id,
                subjectId: ''
              });
            }
          });
          setAssignments(loadedAssignments.length > 0 ? loadedAssignments : [
            { id: Math.random(), program: '', year: '', sectionId: '', subjectId: '' }
          ]);
        } else {
          // If no existing assigned blocks, show empty row
          setAssignments([
            { id: Math.random(), program: '', year: '', sectionId: '', subjectId: '' }
          ]);
        }
      } catch (err) {
        toast.error('Failed to load setup parameters.');
      } finally {
        setLoading(false);
      }
    };
    loadSetupData();
  }, []);

  const handleProgChange = (prog) => {
    setProgrammes(prev => {
      const next = { ...prev, [prog]: !prev[prog] };
      // If program is unchecked, remove any rows matching this program
      if (!next[prog]) {
        setAssignments(curr => {
          const filtered = curr.filter(a => a.program !== prog);
          return filtered.length > 0 ? filtered : [
            { id: Math.random(), program: '', year: '', sectionId: '', subjectId: '' }
          ];
        });
      }
      return next;
    });
  };

  const addRow = () => {
    setAssignments(prev => [
      ...prev,
      {
        id: Math.random(),
        program: allowedPrograms.length === 1 ? allowedPrograms[0] : '',
        year: '',
        sectionId: '',
        subjectId: ''
      }
    ]);
  };

  const removeRow = (id) => {
    setAssignments(prev => {
      const next = prev.filter(a => a.id !== id);
      return next.length > 0 ? next : [
        {
          id: Math.random(),
          program: allowedPrograms.length === 1 ? allowedPrograms[0] : '',
          year: '',
          sectionId: '',
          subjectId: ''
        }
      ];
    });
  };

  const updateAssignment = (id, field, value) => {
    setAssignments(prev => prev.map(a => {
      if (a.id === id) {
        const updated = { ...a, [field]: value };
        // Reset cascading values if parent selections change
        if (field === 'program') {
          updated.year = '';
          updated.sectionId = '';
          updated.subjectId = '';
        } else if (field === 'year') {
          updated.sectionId = '';
          updated.subjectId = '';
        }
        return updated;
      }
      return a;
    }));
  };

  const handleSave = async () => {
    const activeProgs = Object.keys(programmes).filter(k => programmes[k]);
    if (activeProgs.length === 0) {
      toast.error('Please check at least one Programme.');
      return;
    }

    const invalid = assignments.some(a => !a.program || !a.year || !a.sectionId || !a.subjectId);
    if (invalid) {
      toast.error('Please complete all dropdown selections or remove empty rows.');
      return;
    }

    setSaving(true);

    // Group rows into unique courses
    const courseMap = {};
    assignments.forEach(a => {
      const sec = allSections.find(s => s.id === Number(a.sectionId));
      if (sec) {
        const key = `${a.program}|${a.year}|${sec.section_name}`;
        courseMap[key] = {
          education_type: a.program,
          year: Number(a.year),
          section: sec.section_name,
          section_id: sec.id
        };
      }
    });
    const compiledCourses = Object.values(courseMap);

    // Unique subject IDs
    const compiledSubjectIds = [...new Set(assignments.map(a => Number(a.subjectId)))];

    // Build the final block IDs by matching the courses against all block timetables
    const finalBlockIds = [];
    compiledCourses.forEach(c => {
      const match = allBlocks.find(b =>
        b.education_type === c.education_type &&
        Number(b.year) === Number(c.year) &&
        b.section === c.section
      );
      if (match) {
        finalBlockIds.push(match.id);
      }
    });

    try {
      await api.post('/api/faculty/setup', {
        courses: compiledCourses,
        block_ids: finalBlockIds,
        subject_ids: compiledSubjectIds
      });

      toast.success('Profile setup saved successfully!');
      if (onComplete) onComplete();
      else navigate('/timetable');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save setup.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="My Setup">
        <div className="empty-state">
          <Loader2 size={32} className="spinner" style={{ color: 'var(--color-primary)' }} />
          <p>Loading your profile configuration...</p>
        </div>
      </AppLayout>
    );
  }

  const inner = (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
          Faculty Setup
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Select the subjects you teach for each assigned class block.
        </p>
      </div>

      {/* Warning banner if no block timetables in the system */}
      {allBlocks.length === 0 && (
        <div style={{
          padding: '14px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-danger)',
          fontWeight: 600, fontSize: '0.88rem',
        }}>
          <AlertCircle size={18} /> No class block timetables have been created in the system by the Administrator. Please contact your Admin to configure block timetables.
        </div>
      )}

      {/* Box 1: Select your Programmes */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
            Select your Programmes:
          </span>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {dbPrograms.map(prog => {
              const label = prog.name;
              const checked = programmes[prog.name];
              return (
                <label key={prog.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', userSelect: 'none', fontWeight: 600, fontSize: '0.9rem',
                  color: checked ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'color 0.15s'
                }}>
                  <input
                    type="checkbox"
                    checked={checked || false}
                    onChange={() => handleProgChange(prog.name)}
                    style={{
                      width: 17, height: 17, accentColor: 'var(--color-primary)',
                      cursor: 'pointer'
                    }}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Box 2: Table Section */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        {activeProgramsChecked.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <AlertCircle size={36} style={{ color: 'var(--color-text-subtle)', marginBottom: 8 }} />
            <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Select a programme first</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Check your programmes above to configure your class entries.
            </p>
          </div>
        ) : allBlocks.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <AlertCircle size={36} style={{ color: 'var(--color-danger)', marginBottom: 8 }} />
            <h3 style={{ fontWeight: 600, marginBottom: 4 }}>No Block Timetables Configured</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: 440 }}>
              No class block timetables have been created in the system yet. Please ask the administrator to create block timetables.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', margin: '0 -28px', padding: '0 28px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'none' }}>
                  <th style={{ color: 'var(--color-text-muted)', borderBottom: '2px solid var(--color-border)', width: 64, padding: '10px 8px', fontWeight: 700 }}>S.No</th>
                  <th style={{ color: 'var(--color-text-muted)', borderBottom: '2px solid var(--color-border)', width: 150, padding: '10px 8px', fontWeight: 700 }}>Program</th>
                  <th style={{ color: 'var(--color-text-muted)', borderBottom: '2px solid var(--color-border)', width: 120, padding: '10px 8px', fontWeight: 700 }}>Year</th>
                  <th style={{ color: 'var(--color-text-muted)', borderBottom: '2px solid var(--color-border)', width: 120, padding: '10px 8px', fontWeight: 700 }}>Section</th>
                  <th style={{ color: 'var(--color-text-muted)', borderBottom: '2px solid var(--color-border)', padding: '10px 8px', fontWeight: 700 }}>Subjects</th>
                  <th style={{ color: 'var(--color-text-muted)', borderBottom: '2px solid var(--color-border)', width: 70, padding: '10px 8px', textAlign: 'center', fontWeight: 700 }}></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((row, idx) => {
                  const selectedProg = dbPrograms.find(p => p.name === row.program);
                  const yearsConfig = selectedProg?.years || [];

                  // Years available in block timetables for the selected program
                  const allowedYears = [...new Set(allBlocks
                    .filter(b => b.education_type === row.program)
                    .map(b => Number(b.year))
                  )].sort();

                  // Sections available in block timetables for the selected program and year
                  const allowedSecNames = allBlocks
                    .filter(b => b.education_type === row.program && Number(b.year) === Number(row.year))
                    .map(b => b.section);

                  const sections = allSections.filter(s =>
                    s.education_type === row.program &&
                    Number(s.year) === Number(row.year) &&
                    (allowedSecNames.includes(s.section_name) || allowedSecNames.includes(null) || allowedSecNames.includes(''))
                  );

                  // Subjects available for this program and year
                  const subjects = allSubjects.filter(s =>
                    s.education_type === row.program &&
                    Number(s.year) === Number(row.year)
                  );

                  return (
                    <tr key={row.id} style={{ background: 'none' }} className="fade-in">
                      {/* S.No */}
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--color-text-muted)', verticalAlign: 'middle' }}>
                        {idx + 1}
                      </td>

                      {/* Program (default to text if single, dropdown if multiple) */}
                      <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                        {allowedPrograms.length === 1 ? (
                          <div style={{ padding: '8px 10px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                            {allowedPrograms[0]}
                          </div>
                        ) : (
                          <select
                            className="input"
                            style={{ padding: '8px 10px', fontSize: '0.85rem', fontWeight: 500 }}
                            value={row.program}
                            onChange={e => updateAssignment(row.id, 'program', e.target.value)}
                          >
                            <option value="">— Select —</option>
                            {allowedPrograms.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Year (only allow admin-assigned years for this program) */}
                      <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                        <select
                          className="input"
                          style={{ padding: '8px 10px', fontSize: '0.85rem', fontWeight: 500 }}
                          value={row.year}
                          disabled={!row.program}
                          onChange={e => updateAssignment(row.id, 'year', e.target.value)}
                        >
                          <option value="">— Select —</option>
                          {allowedYears.map(y => {
                            const config = yearsConfig.find(yc => yc.year_number === y);
                            return (
                              <option key={y} value={y}>{config ? config.year_name : `Year ${y}`}</option>
                            );
                          })}
                        </select>
                      </td>

                      {/* Section (only allow admin-assigned sections for this program and year) */}
                      <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                        <select
                          className="input"
                          style={{ padding: '8px 10px', fontSize: '0.85rem', fontWeight: 500 }}
                          value={row.sectionId}
                          disabled={!row.year}
                          onChange={e => updateAssignment(row.id, 'sectionId', e.target.value)}
                        >
                          <option value="">— Select —</option>
                          {sections.map(s => (
                            <option key={s.id} value={s.id}>{s.section_name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Subjects */}
                      <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                        <select
                          className="input"
                          style={{ padding: '8px 10px', fontSize: '0.85rem', fontWeight: 500 }}
                          value={row.subjectId}
                          disabled={!row.sectionId}
                          onChange={e => updateAssignment(row.id, 'subjectId', e.target.value)}
                        >
                          <option value="">— Select Subject —</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.subject_code} – {s.subject_name} ({s.subject_type})</option>
                          ))}
                        </select>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => removeRow(row.id)}
                          style={{
                            background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)',
                            border: '1px solid rgba(239,68,68,0.2)', padding: 7, cursor: 'pointer'
                          }}
                          title="Remove row"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Add Row Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addRow}
              style={{
                width: '100%', justifyContent: 'center', marginTop: 16,
                border: '2px dashed var(--color-border-dark)', background: 'var(--color-surface-2)',
                color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Plus size={14} /> Add Row
            </button>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          className="btn btn-secondary"
          onClick={() => onComplete ? onComplete() : navigate('/timetable')}
        >
          Cancel
        </button>
        <button
          id="complete-setup-btn"
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-soft))' }}
          disabled={saving || activeProgramsChecked.length === 0 || allBlocks.length === 0}
          onClick={handleSave}
        >
          {saving ? <Loader2 size={14} className="spinner" /> : <Check size={14} />}
          {saving ? 'Saving...' : 'Complete Setup'}
        </button>
      </div>
    </div>
  );

  if (!onComplete) {
    return <AppLayout title="My Setup">{inner}</AppLayout>;
  }
  return inner;
}
