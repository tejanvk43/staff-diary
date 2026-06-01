import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import LoginPage         from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

// Faculty / shared pages
import FacultyDashboard  from './pages/Faculty/FacultyDashboard';
import DiaryHistoryPage  from './pages/Faculty/DiaryHistoryPage';
import TimetablePage     from './pages/Faculty/TimetablePage';
import FacultySetupPage  from './pages/Faculty/FacultySetupPage';
import LeaveRequestPage  from './pages/Faculty/LeaveRequestPage';


import RequestEditPage   from './pages/Faculty/RequestEditPage';
import MyRequestsPage    from './pages/Faculty/MyRequestsPage';
import ProfilePage       from './pages/ProfilePage';

// Admin pages
import UserManagementPage from './pages/Admin/UserManagementPage';
import ApprovalsPage      from './pages/Admin/ApprovalsPage';
import ConflictsPage      from './pages/Admin/ConflictsPage';
import ReportsPage        from './pages/Admin/ReportsPage';
import SystemConfigPage   from './pages/Admin/SystemConfigPage';
import HolidaysPage       from './pages/Admin/HolidaysPage';
import SubjectsPage       from './pages/Admin/SubjectsPage';
import DepartmentsPage    from './pages/Admin/DepartmentsPage';
import SectionsPage       from './pages/Admin/SectionsPage';
import AttendancePage     from './pages/Admin/AttendancePage';
import BlockTimetablePage       from './pages/Admin/BlockTimetablePage';
import BlockTimetableEditorPage from './pages/Admin/BlockTimetableEditorPage';
import ProgramsPage       from './pages/Admin/ProgramsPage';
import FacultyTimetableImportPage from './pages/Admin/FacultyTimetableImportPage';
import SectionTimetablePage        from './pages/Admin/SectionTimetablePage';


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Force change password (protected but no role) */}
          <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          } />

          {/* Profile — all authenticated users */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          {/* Faculty / shared routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <FacultyDashboard />
            </ProtectedRoute>
          } />
          <Route path="/diary" element={
            <ProtectedRoute>
              <DiaryHistoryPage />
            </ProtectedRoute>
          } />
          <Route path="/timetable" element={
            <ProtectedRoute>
              <TimetablePage />
            </ProtectedRoute>
          } />
          <Route path="/setup" element={
            <ProtectedRoute>
              <FacultySetupPage />
            </ProtectedRoute>
          } />
          <Route path="/leave" element={
            <ProtectedRoute>
              <LeaveRequestPage />
            </ProtectedRoute>
          } />
          <Route path="/od" element={<Navigate to="/leave" replace />} />
          <Route path="/extra-hours" element={<Navigate to="/dashboard" replace />} />
          <Route path="/request-edit" element={
            <ProtectedRoute>
              <RequestEditPage />
            </ProtectedRoute>
          } />
          <Route path="/my-requests" element={
            <ProtectedRoute>
              <MyRequestsPage />
            </ProtectedRoute>
          } />

          {/* Admin + HOD shared routes */}
          <Route path="/admin/approvals" element={
            <ProtectedRoute roles={['Admin','HOD']}>
              <ApprovalsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/conflicts" element={
            <ProtectedRoute roles={['Admin','HOD']}>
              <ConflictsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute roles={['Admin','HOD']}>
              <ReportsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance" element={
            <ProtectedRoute roles={['Admin','HOD']}>
              <AttendancePage />
            </ProtectedRoute>
          } />

          {/* Admin-only routes */}
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['Admin']}>
              <UserManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/config" element={
            <ProtectedRoute roles={['Admin']}>
              <SystemConfigPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/holidays" element={
            <ProtectedRoute roles={['Admin']}>
              <HolidaysPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/subjects" element={
            <ProtectedRoute roles={['Admin']}>
              <SubjectsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/departments" element={
            <ProtectedRoute roles={['Admin']}>
              <DepartmentsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/sections" element={
            <ProtectedRoute roles={['Admin']}>
              <SectionsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/programs" element={
            <ProtectedRoute roles={['Admin']}>
              <ProgramsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/block-timetables" element={
            <ProtectedRoute roles={['Admin','HOD']}>
              <BlockTimetablePage />
            </ProtectedRoute>
          } />
          <Route path="/admin/block-timetables/:id" element={
            <ProtectedRoute roles={['Admin','HOD']}>
              <BlockTimetableEditorPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/faculty-timetable" element={
            <ProtectedRoute roles={['Admin','HOD']}>
              <FacultyTimetableImportPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/section-timetables" element={
            <ProtectedRoute roles={['Admin','HOD']}>
              <SectionTimetablePage />
            </ProtectedRoute>
          } />


          {/* Default redirects */}
          <Route path="/"    element={<Navigate to="/dashboard" replace />} />
          <Route path="*"    element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
