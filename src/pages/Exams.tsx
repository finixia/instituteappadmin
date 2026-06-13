import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { getApiErrorMessage } from "../api/error";
import { SUBJECT_OPTIONS } from "../constants/subjects";

type Exam = { _id: string; title: string; subject: string; classLevel: number; date: string; maxMarks: number; passingMarks: number };
type ExamFormState = { title: string; subject: string; classLevel: string; date: string; maxMarks: string; passingMarks: string };

export function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [create, setCreate] = useState<ExamFormState>({ title: "Unit Test", subject: SUBJECT_OPTIONS[0], classLevel: "8", date: new Date().toISOString().slice(0, 10), maxMarks: "", passingMarks: "" });
  const canCreate = useMemo(() => {
    const max = Number(create.maxMarks);
    const passing = Number(create.passingMarks);
    return (
      create.title.trim().length > 0 &&
      create.subject.trim().length > 0 &&
      Number.isInteger(max) &&
      max > 0 &&
      Number.isInteger(passing) &&
      passing >= 0 &&
      passing <= max
    );
  }, [create]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/exams");
      setExams(res.data.exams ?? []);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to load exams."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate() {
    setError(null);
    try {
      await api.post("/exams", {
        title: create.title,
        subject: create.subject,
        classLevel: Number(create.classLevel),
        date: create.date,
        maxMarks: Number(create.maxMarks),
        passingMarks: Number(create.passingMarks)
      });
      await load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create exam."));
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Exams</h2>

      <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Create exam</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} value={create.title} onChange={(e) => setCreate((s) => ({ ...s, title: e.target.value }))} placeholder="Title" />
          <select className="select" style={{ flex: 1, minWidth: 200 }} value={create.subject} onChange={(e) => setCreate((s) => ({ ...s, subject: e.target.value }))}>
            {SUBJECT_OPTIONS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 140 }} value={create.classLevel} onChange={(e) => setCreate((s) => ({ ...s, classLevel: e.target.value }))}>
            {[6, 7, 8, 9, 10].map((c) => (
              <option key={c} value={String(c)}>
                Class {c}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            style={{ width: 160 }}
            value={create.date}
            onChange={(e) => setCreate((s) => ({ ...s, date: e.target.value }))}
            onFocus={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
          />
          <input className="input" style={{ width: 120 }} value={create.maxMarks} onChange={(e) => setCreate((s) => ({ ...s, maxMarks: e.target.value }))} placeholder="Max marks" />
          <input className="input" style={{ width: 120 }} value={create.passingMarks} onChange={(e) => setCreate((s) => ({ ...s, passingMarks: e.target.value }))} placeholder="Passing marks" />
          <button className="btn primary" disabled={!canCreate} onClick={onCreate}>
            Create
          </button>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
        {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}
      </div>

      <div className="panel">
        {loading ? (
          <div className="muted" style={{ padding: 16 }}>
            Loading...
          </div>
        ) : exams.length === 0 ? (
          <div className="muted" style={{ padding: 16 }}>
            No exams yet.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Date</th>
                <th>Max</th>
                <th>Pass</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e._id}>
                  <td style={{ fontWeight: 800 }}>{e.title}</td>
                  <td className="muted">{e.subject}</td>
                  <td className="muted">{e.classLevel}</td>
                  <td className="muted">{e.date}</td>
                  <td className="muted">{e.maxMarks}</td>
                  <td className="muted">{e.passingMarks}</td>
                  <td>
                    <Link className="btn primary" to={`/admin/exams/${e._id}/marks`}>
                      Enter marks
                    </Link>
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
