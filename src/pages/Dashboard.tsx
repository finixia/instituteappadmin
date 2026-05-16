import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

type Student = { _id: string; isActive?: boolean; classLevel: number };
type AttendanceRecord = { _id: string; status: "PRESENT" | "ABSENT"; date: string };
type Exam = { _id: string; title: string; subject: string; date: string; classLevel: number; publishedAt?: string | null };

export function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [studentsRes, attendanceRes, examsRes] = await Promise.all([
          api.get("/students"),
          api.get("/attendance/history", { params: { to: today, limit: 200 } }),
          api.get("/exams")
        ]);

        setStudents(studentsRes.data.students ?? []);
        setAttendance(attendanceRes.data.records ?? []);
        setExams(examsRes.data.exams ?? []);
      } catch (e: any) {
        setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load dashboard");
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const activeStudents = students.filter((student) => student.isActive !== false).length;
    const todaysAttendance = attendance.filter((record) => record.date === today);
    const absentToday = todaysAttendance.filter((record) => record.status === "ABSENT").length;
    const upcomingExams = exams
      .filter((exam) => exam.date >= today && !exam.publishedAt)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);

    return {
      activeStudents,
      absentToday,
      recordedToday: todaysAttendance.length,
      upcomingExams
    };
  }, [attendance, exams, students]);

  const classBreakdown = useMemo(() => {
    const map = new Map<number, number>();
    for (const student of students) {
      map.set(student.classLevel, (map.get(student.classLevel) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [students]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-subtitle">A quick view of current student load, attendance coverage, and upcoming academic activity.</div>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="panel stat-card">
          <div className="stat-label">Active students</div>
          <div className="stat-value">{stats.activeStudents}</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-label">Attendance marked today</div>
          <div className="stat-value">{stats.recordedToday}</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-label">Absentees today</div>
          <div className="stat-value">{stats.absentToday}</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-label">Upcoming exams</div>
          <div className="stat-value">{stats.upcomingExams.length}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel square dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2 className="dashboard-card-title">Class distribution</h2>
              <div className="dashboard-card-subtitle">See how active students are spread across each class level.</div>
            </div>
            <div className="dashboard-card-badge">{classBreakdown.length} classes</div>
          </div>

          {classBreakdown.length === 0 ? (
            <div className="muted">No student data yet.</div>
          ) : (
            <div className="dashboard-list">
              {classBreakdown.map(([classLevel, count]) => (
                <div key={classLevel} className="dashboard-item">
                  <div>
                    <div className="dashboard-item-title">Class {classLevel}</div>
                    <div className="dashboard-item-meta">Current active enrollment</div>
                  </div>
                  <div className="dashboard-item-value">{count} students</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel square dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2 className="dashboard-card-title">Upcoming exams</h2>
              <div className="dashboard-card-subtitle">Only exams from today onward that still have unpublished results.</div>
            </div>
            <div className="dashboard-card-badge">{stats.upcomingExams.length} pending</div>
          </div>

          {stats.upcomingExams.length === 0 ? (
            <div className="muted">No exams scheduled yet.</div>
          ) : (
            <div className="dashboard-list">
              {stats.upcomingExams.map((exam) => (
                <div key={exam._id} className="dashboard-item">
                  <div>
                    <div className="dashboard-item-title">{exam.title}</div>
                    <div className="dashboard-item-meta">
                      {exam.subject} · Class {exam.classLevel}
                    </div>
                  </div>
                  <div className="dashboard-item-value">{exam.date}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
