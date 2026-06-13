import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { LoginPage } from "./pages/Login";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/Dashboard";
import { StudentsPage } from "./pages/Students";
import { StudentDetailPage } from "./pages/StudentDetail";
import { AttendancePage } from "./pages/Attendance";
import { AttendanceRecordsPage } from "./pages/AttendanceRecords";
import { StartSessionPage } from "./pages/StartSession";
import { ExamsPage } from "./pages/Exams";
import { ExamMarksPage } from "./pages/ExamMarks";
import { FeePlansPage } from "./pages/FeePlans";
import { FeeAccountsPage } from "./pages/FeeAccounts";
import { LandingPage, PrivacyPolicyPage } from "./pages/PublicPages";
import { SettingsPage } from "./pages/Settings";

function AdminRoute() {
  const token = useAuthStore((s) => s.token);
  return token ? <Layout /> : <Navigate to="/admin/login" replace />;
}

function AdminLoginRoute() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/admin" replace /> : <LoginPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/admin/login" element={<AdminLoginRoute />} />
      <Route path="/admin" element={<AdminRoute />}>
        <Route index element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="attendance/records" element={<AttendanceRecordsPage />} />
        <Route path="attendance/start" element={<StartSessionPage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route path="exams/:examId/marks" element={<ExamMarksPage />} />
        <Route path="fees/plans" element={<FeePlansPage />} />
        <Route path="fees/accounts" element={<FeeAccountsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
