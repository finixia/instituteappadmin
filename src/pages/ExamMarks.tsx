import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

type Exam = { _id: string; title: string; subject: string; classLevel: number; date: string; maxMarks: number; publishedAt?: string | null };
type Student = { _id: string; firstName: string; lastName?: string; classLevel: number };
type ExamScore = { _id: string; examId: string; studentId: string; marks: number; isAbsent: boolean };
type ExamResultRow = { student: Student | null; rank: number | null; marks: number | null; isAbsent: boolean; percent: number };

export function ExamMarksPage() {
  const { examId } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, { marks: string; isAbsent: boolean }>>({});
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [viewResults, setViewResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [savingPublish, setSavingPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const examRes = await api.get(`/exams/${examId}`);
        const nextExam: Exam = examRes.data.exam;
        const [studentsRes, scoresRes] = await Promise.all([
          api.get("/students", { params: { classLevel: nextExam.classLevel } }),
          api.get(`/exams/${nextExam._id}/scores`)
        ]);

        const nextStudents: Student[] = studentsRes.data.students ?? [];
        const nextScores: ExamScore[] = scoresRes.data.scores ?? [];
        const scoreMap = new Map(nextScores.map((score) => [score.studentId, score]));
        const nextSavedIds = Object.fromEntries(nextScores.map((score) => [score.studentId, true]));

        setExam(nextExam);
        setStudents(nextStudents);
        setScores(
          Object.fromEntries(
            nextStudents.map((student) => {
              const score = scoreMap.get(student._id);
              return [
                student._id,
                {
                  marks: score ? String(score.marks) : "",
                  isAbsent: score?.isAbsent ?? false
                }
              ];
            })
          )
        );
        setSavedIds(nextSavedIds);
      } catch (e: any) {
        setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load exam roster");
      } finally {
        setLoading(false);
      }
    })();
  }, [examId]);

  function updateScore(studentId: string, patch: Partial<{ marks: string; isAbsent: boolean }>) {
    setScores((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        ...patch
      }
    }));
    setSavedIds((current) => ({ ...current, [studentId]: false }));
  }

  async function saveStudent(studentId: string) {
    if (!exam) return;
    const entry = scores[studentId];
    if (!entry) return;

    setSavingId(studentId);
    setError(null);
    setNotice(null);
    try {
      await api.put(`/exams/${exam._id}/scores`, {
        studentId,
        marks: entry.isAbsent ? 0 : Number(entry.marks || 0),
        isAbsent: entry.isAbsent
      });
      setSavedIds((current) => ({ ...current, [studentId]: true }));
      setNotice("Marks saved successfully.");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to save marks");
    } finally {
      setSavingId(null);
    }
  }

  async function loadResults() {
    if (!exam) return;
    setError(null);
    try {
      const res = await api.get(`/exams/${exam._id}/results`);
      setResults(res.data.results ?? []);
      setNotice(res.data.published ? "Displaying published result rankings." : "Displaying preview of student ranks.");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load exam results");
    }
  }

  async function publishExam() {
    if (!exam) return;
    setSavingPublish(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.put(`/exams/${exam._id}/publish`);
      setExam(res.data.exam);
      setNotice("Results published. Parents can now view live rankings.");
      await loadResults();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to publish results");
    } finally {
      setSavingPublish(false);
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 18, marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Enter Marks</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            {exam ? `${exam.title} · ${exam.subject} · Class ${exam.classLevel} · Max ${exam.maxMarks}` : "Loading exam..."}
          </div>
          {exam?.publishedAt ? (
            <div className="muted" style={{ marginTop: 6 }}>
              Published on {new Date(exam.publishedAt).toLocaleDateString()}.
            </div>
          ) : null}
        </div>

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn" disabled={!exam} onClick={() => {
            setViewResults((current) => !current);
            if (!viewResults) loadResults();
          }}>
            {viewResults ? "Back to grading" : "View results"}
          </button>
          <button className="btn primary" disabled={!exam || savingPublish} onClick={publishExam}>
            {savingPublish ? "Publishing..." : exam?.publishedAt ? "Republish" : "Publish Results"}
          </button>
          <Link className="btn" to="/admin/exams">
            Back to Exams
          </Link>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 10 }}>{error}</div> : null}
      {notice ? <div className="muted" style={{ marginBottom: 10 }}>{notice}</div> : null}

      {viewResults ? (
        <div className="panel" style={{ padding: 16 }}>
          {loading ? (
            <div className="muted">Loading results...</div>
          ) : !exam ? (
            <div className="muted">Exam not found.</div>
          ) : results.length === 0 ? (
            <div className="muted">No results available yet for this exam.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Marks</th>
                  <th>Percent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={`${row.student?._id ?? index}-${index}`}>
                    <td style={{ fontWeight: 800 }}>{row.rank ?? "—"}</td>
                    <td style={{ fontWeight: 800 }}>{row.student ? `${row.student.firstName} ${row.student.lastName ?? ""}` : "Unknown"}</td>
                    <td className="muted">{row.isAbsent ? "Absent" : row.marks}</td>
                    <td className="muted">{row.isAbsent ? "—" : `${row.percent}%`}</td>
                    <td className="muted">{row.isAbsent ? "Absent" : "Present"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="panel" style={{ padding: 16 }}>
          {loading ? (
            <div className="muted">Loading roster...</div>
          ) : !exam ? (
            <div className="muted">Exam not found.</div>
          ) : students.length === 0 ? (
            <div className="muted">No students found for Class {exam.classLevel}.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Absent</th>
                  <th>Marks</th>
                  <th>Result</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const entry = scores[student._id] ?? { marks: "", isAbsent: false };
                  const marks = Number(entry.marks || 0);
                  const percent = exam && !entry.isAbsent ? Math.round((marks / exam.maxMarks) * 100) : 0;
                  const isSaved = savedIds[student._id] === true;

                  return (
                    <tr key={student._id}>
                      <td style={{ fontWeight: 800 }}>
                        {student.firstName} {student.lastName ?? ""}
                      </td>
                      <td>
                        <label className="row" style={{ gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={entry.isAbsent}
                            onChange={(e) => updateScore(student._id, { isAbsent: e.target.checked, marks: e.target.checked ? "0" : entry.marks })}
                          />
                          <span className="muted">Absent</span>
                        </label>
                      </td>
                      <td>
                        <input
                          className="input"
                          style={{ width: 110 }}
                          disabled={entry.isAbsent}
                          value={entry.marks}
                          onChange={(e) => updateScore(student._id, { marks: e.target.value.replace(/[^0-9]/g, "") })}
                          placeholder="0"
                        />
                      </td>
                      <td className="muted">{entry.isAbsent ? "Absent" : `${percent}%`}</td>
                      <td>
                        <button
                          className={isSaved ? "btn" : "btn primary"}
                          disabled={savingId === student._id || (!entry.isAbsent && Number(entry.marks || -1) > exam.maxMarks)}
                          onClick={() => saveStudent(student._id)}
                        >
                          {savingId === student._id ? "Saving..." : isSaved ? "Saved" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
