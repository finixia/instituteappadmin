import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { SUBJECT_OPTIONS } from "../constants/subjects";

type AttendanceRecord = {
  _id: string;
  studentId: string;
  date: string;
  subject: string;
  mode: "ONLINE" | "OFFLINE";
  status: "PRESENT" | "ABSENT";
  student?: {
    _id: string;
    firstName: string;
    lastName?: string;
    classLevel: number;
  } | null;
};

export function AttendanceRecordsPage() {
  const [classLevel, setClassLevel] = useState("8");
  const [subject, setSubject] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const studentSummaries = useMemo(() => {
    const byStudent = new Map<
      string,
      {
        studentName: string;
        totalPresents: number;
        totalSessions: number;
      }
    >();

    for (const record of records) {
      const key = record.studentId;
      const existing = byStudent.get(key);
      const studentName = record.student ? `${record.student.firstName} ${record.student.lastName ?? ""}`.trim() : "Student";

      if (!existing) {
        byStudent.set(key, {
          studentName,
          totalPresents: record.status === "PRESENT" ? 1 : 0,
          totalSessions: 1
        });
        continue;
      }

      existing.totalPresents += record.status === "PRESENT" ? 1 : 0;
      existing.totalSessions += 1;
    }

    return [...byStudent.values()].sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [records]);

  async function loadRecords(nextClassLevel: string, nextSubject: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/attendance/history", {
        params: {
          classLevel: nextClassLevel,
          ...(nextSubject ? { subject: nextSubject } : {}),
          limit: 500
        }
      });
      setRecords(res.data.records ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords(classLevel, subject);
  }, [classLevel, subject]);

  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Attendance Records</h2>
      <div className="muted" style={{ marginTop: 6, marginBottom: 24 }}>
        View historical attendance data for all classes.
      </div>

      <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
        <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label="Class">
            <select
              className="select"
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              style={{ width: 180 }}
            >
              {[6, 7, 8, 9, 10].map((level) => (
                <option key={level} value={String(level)}>
                  Class {level}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <select
              className="select"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: 180 }}
            >
              <option value="">All subjects</option>
              {SUBJECT_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <button className="btn" onClick={() => loadRecords(classLevel, subject)}>
            Refresh
          </button>
        </div>
        {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}
      </div>

      <div className="panel">
        {loading ? (
          <div style={{ padding: 16 }} className="muted">
            Loading attendance records...
          </div>
        ) : studentSummaries.length === 0 ? (
          <div style={{ padding: 16 }} className="muted">
            No attendance records found for Class {classLevel}{subject ? ` · ${subject}` : ""}.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Total Sessions</th>
                <th>Total Presents</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {studentSummaries.map((summary) => (
                <tr key={summary.studentName}>
                  <td style={{ fontWeight: 700 }}>{summary.studentName}</td>
                  <td className="muted">{summary.totalSessions}</td>
                  <td className="muted">{summary.totalPresents}</td>
                  <td className="muted">
                    {summary.totalSessions > 0 ? Math.round((summary.totalPresents / summary.totalSessions) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 180 }}>
      <div className="muted" style={{ marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
