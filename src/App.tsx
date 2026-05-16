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

export function App() {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return (
      <Routes>
        <Route path="/*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentDetailPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/attendance/records" element={<AttendanceRecordsPage />} />
        <Route path="/attendance/start" element={<StartSessionPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/exams/:examId/marks" element={<ExamMarksPage />} />
        <Route path="/fees/plans" element={<FeePlansPage />} />
        <Route path="/fees/accounts" element={<FeeAccountsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
