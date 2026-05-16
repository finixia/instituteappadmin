import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

type ResultRow = {
  score: { marks: number; isAbsent: boolean };
  exam?: { title: string; subject: string; maxMarks: number; date: string };
};

export function StudentDetailPage() {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const [studentRes, resultsRes] = await Promise.all([api.get(`/students/${id}`), api.get(`/exams/student/${id}`)]);
        setStudent(studentRes.data.student);
        setResults(resultsRes.data.results ?? []);
      } catch (e: any) {
        setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load");
      }
    })();
  }, [id]);

  const presentResults = results.filter((row) => !row.score.isAbsent && row.exam);
  const averageMarks =
    presentResults.length > 0
      ? Math.round(
          presentResults.reduce((acc, row) => acc + (row.score.marks / (row.exam?.maxMarks ?? 1)) * 100, 0) / presentResults.length
        )
      : null;

  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Student</h2>
      {error ? <div className="error">{error}</div> : null}
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>
          {student ? `${student.firstName} ${student.lastName ?? ""}` : "—"}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Class: {student?.classLevel ?? "—"} · Active: {String(student?.isActive ?? "—")}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Parent phones: {(student?.parentPhones ?? []).join(", ")}
        </div>

        <div className="row" style={{ gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          <MetricCard label="Test records" value={String(results.length)} />
          <MetricCard label="Average score" value={averageMarks === null ? "—" : `${averageMarks}%`} />
          <MetricCard label="Absences" value={String(results.filter((row) => row.score.isAbsent).length)} />
        </div>
      </div>

      <div className="panel" style={{ padding: 16, marginTop: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Performance report</div>
        {results.length === 0 ? (
          <div className="muted">No exam results yet for this student.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Marks</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => {
                const exam = row.exam;
                const percent = exam && !row.score.isAbsent ? Math.round((row.score.marks / exam.maxMarks) * 100) : null;

                return (
                  <tr key={`${exam?.title ?? "exam"}-${index}`}>
                    <td style={{ fontWeight: 800 }}>{exam?.title ?? "Exam"}</td>
                    <td className="muted">{exam?.subject ?? "—"}</td>
                    <td className="muted">{exam?.date ?? "—"}</td>
                    <td className="muted">
                      {row.score.isAbsent ? "Absent" : `${row.score.marks}/${exam?.maxMarks ?? "—"}`}
                    </td>
                    <td className="muted">{row.score.isAbsent ? "Absent" : `${percent}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel" style={{ padding: 14, minWidth: 140 }}>
      <div className="muted" style={{ fontSize: 13 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900, fontSize: 24, marginTop: 4 }}>{value}</div>
    </div>
  );
}
