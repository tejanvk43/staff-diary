import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { BarChart2, Download, Loader2, Search } from 'lucide-react';
import api from '../../api/axios';
import AppLayout from '../../components/AppLayout';

const REPORT_TYPES = [
  { key: 'diary',       label: 'Diary Report',      endpoint: '/api/reports/diary' },
  { key: 'attendance',  label: 'Attendance Report',  endpoint: '/api/reports/attendance' },
  { key: 'leave',       label: 'Leave Report',       endpoint: '/api/reports/leave' },
  { key: 'conflicts',   label: 'Conflict Report',    endpoint: '/api/reports/conflicts' },
  { key: 'unassigned',  label: 'Unassigned Classes', endpoint: '/api/reports/unassigned' },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('diary');
  const [fromDate, setFromDate]     = useState(format(new Date(), 'yyyy-MM-01'));
  const [toDate, setToDate]         = useState(format(new Date(), 'yyyy-MM-dd'));
  const [users, setUsers]           = useState([]);
  const [selectedUser, setUser]     = useState('');
  const [status, setStatus]         = useState('');
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    api.get('/api/admin/users').then(r => setUsers(r.data.data || [])).catch(() => {});
  }, []);

  const activeReport = REPORT_TYPES.find(r => r.key === reportType);

  const generate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      if (selectedUser) params.append('employee_id', selectedUser);
      if (status)       params.append('status', status);

      const res = await api.get(`${activeReport.endpoint}?${params}`);
      setResults(res.data.data);
      toast.success('Report generated.');
    } catch (err) {
      toast.error('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    const params = new URLSearchParams({ from_date: fromDate, to_date: toDate, format: 'excel' });
    if (selectedUser) params.append('employee_id', selectedUser);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}${activeReport.endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeReport.key}_report_${fromDate}_${toDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download report.');
    }
  };

  const renderTable = (data) => {
    if (!data || (Array.isArray(data) && !data.length)) {
      return <div className="empty-state" style={{ padding: 40 }}><p>No data for selected filters.</p></div>;
    }

    // For attendance, data may be { summary, daily }
    const rows = Array.isArray(data) ? data : (data.summary || data.daily || []);
    if (!rows.length) return <div className="empty-state"><p>No data.</p></div>;

    const keys = Object.keys(rows[0]).filter(k => !['id', 'password_hash', 'reviewed_by'].includes(k));

    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>{keys.map(k => <th key={k}>{k.replace(/_/g, ' ')}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {keys.map(k => (
                  <td key={k} style={{ fontSize: '0.82rem' }}>
                    {row[k] === null || row[k] === undefined ? '—' : String(row[k]).slice(0, 80)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <AppLayout title="Reports">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div className="card" style={{ padding: 12 }}>
            <div className="sidebar-section" style={{ paddingTop: 8 }}>Report Types</div>
            {REPORT_TYPES.map(r => (
              <button
                key={r.key}
                id={`report-tab-${r.key}`}
                className={`sidebar-item ${reportType === r.key ? 'active' : ''}`}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => { setReportType(r.key); setResults(null); }}
              >
                <BarChart2 size={14} /> {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>{activeReport.label}</h2>
          </div>

          {/* Filters */}
          <div className="card" style={{ marginBottom: 20, padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {reportType !== 'conflicts' && reportType !== 'unassigned' && (
                <>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label className="form-label" htmlFor="report-from">From Date</label>
                    <input id="report-from" type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label className="form-label" htmlFor="report-to">To Date</label>
                    <input id="report-to" type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
                  </div>
                  <div style={{ flex: 2, minWidth: 180 }}>
                    <label className="form-label" htmlFor="report-user">Employee (optional)</label>
                    <select id="report-user" className="input" value={selectedUser} onChange={e => setUser(e.target.value)}>
                      <option value="">All Employees</option>
                      {users.map(u => <option key={u.employee_id} value={u.employee_id}>{u.full_name}</option>)}
                    </select>
                  </div>
                  {reportType === 'leave' && (
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label className="form-label" htmlFor="report-status">Status</label>
                      <select id="report-status" className="input" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  )}
                </>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button id="generate-report-btn" className="btn btn-primary" onClick={generate} disabled={loading}>
                  {loading ? <Loader2 size={14} className="spinner" /> : <Search size={14} />} Generate
                </button>
                {results && (
                  <button id="download-report-btn" className="btn btn-secondary" onClick={downloadExcel}>
                    <Download size={14} /> Excel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          {results !== null && renderTable(results)}
        </div>
      </div>
    </AppLayout>
  );
}
