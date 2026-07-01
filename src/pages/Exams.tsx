import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { getApiErrorMessage } from "../api/error";
import { SUBJECT_OPTIONS } from "../constants/subjects";

type ExamComponent = { subject: string; maxMarks: number; passingMarks: number };
type Exam = {
  _id: string;
  title: string;
  examType?: "SINGLE" | "ENTRANCE";
  subject: string;
  components?: ExamComponent[];
  classLevel: number;
  date: string;
  maxMarks: number;
  passingMarks: number;
  scoreCount?: number;
};
type ExamFormState = {
  title: string;
  examType: "SINGLE" | "ENTRANCE";
  subject: string;
  components: Array<{ subject: string; maxMarks: string; passingMarks: string }>;
  classLevel: string;
  date: string;
  maxMarks: string;
  passingMarks: string;
};

const defaultExamForm = (): ExamFormState => ({
  title: "Unit Test",
  examType: "SINGLE",
  subject: SUBJECT_OPTIONS[0],
  components: [
    { subject: SUBJECT_OPTIONS[0], maxMarks: "", passingMarks: "" },
    { subject: SUBJECT_OPTIONS[1], maxMarks: "", passingMarks: "" }
  ],
  classLevel: "8",
  date: new Date().toISOString().slice(0, 10),
  maxMarks: "",
  passingMarks: ""
});

function getEntranceMaxMarks(form: ExamFormState) {
  return form.components.reduce((sum, component) => sum + Number(component.maxMarks || 0), 0);
}

function canSaveExam(form: ExamFormState) {
  const max = form.examType === "ENTRANCE" ? getEntranceMaxMarks(form) : Number(form.maxMarks);
  const passing = Number(form.passingMarks);
  const componentSubjects = form.components.map((component) => component.subject.trim().toLowerCase());
  const hasUniqueComponents = new Set(componentSubjects).size === componentSubjects.length;
  const hasValidComponents =
    form.examType === "SINGLE" ||
    (
      form.components.length >= 2 &&
      hasUniqueComponents &&
      form.components.every((component) => {
        const maxMarks = Number(component.maxMarks);
        const passingMarks = Number(component.passingMarks);
        return (
          component.subject.trim().length > 0 &&
          Number.isInteger(maxMarks) &&
          maxMarks > 0 &&
          Number.isInteger(passingMarks) &&
          passingMarks >= 0 &&
          passingMarks <= maxMarks
        );
      })
    );
  return (
    form.title.trim().length > 0 &&
    (form.examType === "ENTRANCE" || form.subject.trim().length > 0) &&
    hasValidComponents &&
    Number.isInteger(max) &&
    max > 0 &&
    Number.isInteger(passing) &&
    passing >= 0 &&
    passing <= max
  );
}

function buildExamPayload(form: ExamFormState) {
  return {
    title: form.title,
    examType: form.examType,
    subject: form.subject,
    components: form.examType === "ENTRANCE"
      ? form.components.map((component) => ({
        subject: component.subject,
        maxMarks: Number(component.maxMarks),
        passingMarks: Number(component.passingMarks)
      }))
      : [],
    classLevel: Number(form.classLevel),
    date: form.date,
    maxMarks: form.examType === "ENTRANCE" ? getEntranceMaxMarks(form) : Number(form.maxMarks),
    passingMarks: Number(form.passingMarks)
  };
}

function formFromExam(exam: Exam): ExamFormState {
  const components = exam.components?.length
    ? exam.components.map((component) => ({
      subject: component.subject,
      maxMarks: String(component.maxMarks),
      passingMarks: String(component.passingMarks)
    }))
    : [
      { subject: SUBJECT_OPTIONS[0], maxMarks: "", passingMarks: "" },
      { subject: SUBJECT_OPTIONS[1], maxMarks: "", passingMarks: "" }
    ];

  return {
    title: exam.title,
    examType: exam.examType ?? "SINGLE",
    subject: exam.examType === "ENTRANCE" ? SUBJECT_OPTIONS[0] : exam.subject,
    components,
    classLevel: String(exam.classLevel),
    date: exam.date,
    maxMarks: String(exam.maxMarks),
    passingMarks: String(exam.passingMarks)
  };
}

export function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [classFilter, setClassFilter] = useState("");

  const [create, setCreate] = useState<ExamFormState>(defaultExamForm);
  const entranceMaxMarks = useMemo(() => getEntranceMaxMarks(create), [create]);
  const canCreate = useMemo(() => canSaveExam(create), [create]);
  const filteredExams = useMemo(() => {
    if (!classFilter) return exams;
    return exams.filter((exam) => String(exam.classLevel) === classFilter);
  }, [classFilter, exams]);

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
      await api.post("/exams", buildExamPayload(create));
      await load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create exam."));
    }
  }

  async function onUpdate(exam: Exam, form: ExamFormState) {
    setError(null);
    await api.put(`/exams/${exam._id}`, buildExamPayload(form));
    setEditingExam(null);
    await load();
  }

  async function onDelete(exam: Exam) {
    const scoreCount = exam.scoreCount ?? 0;
    const message = scoreCount > 0
      ? `Delete ${exam.title}? This will also delete ${scoreCount} saved mark entr${scoreCount === 1 ? "y" : "ies"}.`
      : `Delete ${exam.title}?`;
    if (!confirm(message)) return;

    setError(null);
    try {
      await api.delete(`/exams/${exam._id}`);
      await load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to delete exam."));
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Exams</h2>

      <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Create exam</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} value={create.title} onChange={(e) => setCreate((s) => ({ ...s, title: e.target.value }))} placeholder="Title" />
          <select className="select" style={{ width: 190 }} value={create.examType} onChange={(e) => setCreate((s) => ({ ...s, examType: e.target.value as ExamFormState["examType"] }))}>
            <option value="SINGLE">Single subject</option>
            <option value="ENTRANCE">Entrance test</option>
          </select>
          {create.examType === "SINGLE" ? (
            <select className="select" style={{ flex: 1, minWidth: 200 }} value={create.subject} onChange={(e) => setCreate((s) => ({ ...s, subject: e.target.value }))}>
              {SUBJECT_OPTIONS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          ) : null}
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
          <input
            className="input"
            style={{ width: 120 }}
            value={create.examType === "ENTRANCE" ? String(entranceMaxMarks || "") : create.maxMarks}
            onChange={(e) => setCreate((s) => ({ ...s, maxMarks: e.target.value.replace(/[^0-9]/g, "") }))}
            disabled={create.examType === "ENTRANCE"}
            placeholder="Max marks"
          />
          <input className="input" style={{ width: 120 }} value={create.passingMarks} onChange={(e) => setCreate((s) => ({ ...s, passingMarks: e.target.value }))} placeholder="Passing marks" />
          <button className="btn primary" disabled={!canCreate} onClick={onCreate}>
            Create
          </button>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
        {create.examType === "ENTRANCE" ? (
          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
              Add subjects with contribution and passing marks. Total max marks is calculated automatically.
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {create.components.map((component, index) => (
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }} key={index}>
                  <select
                    className="select"
                    style={{ flex: 1, minWidth: 220 }}
                    value={component.subject}
                    onChange={(e) => setCreate((s) => ({
                      ...s,
                      components: s.components.map((item, itemIndex) => itemIndex === index ? { ...item, subject: e.target.value } : item)
                    }))}
                  >
                    {SUBJECT_OPTIONS.map((subject) => (
                      <option
                        key={subject}
                        value={subject}
                        disabled={create.components.some((item, itemIndex) => itemIndex !== index && item.subject === subject)}
                      >
                        {subject}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    style={{ width: 150 }}
                    value={component.maxMarks}
                    onChange={(e) => setCreate((s) => ({
                      ...s,
                      components: s.components.map((item, itemIndex) => itemIndex === index ? { ...item, maxMarks: e.target.value.replace(/[^0-9]/g, "") } : item)
                    }))}
                    placeholder="Contribution"
                  />
                  <input
                    className="input"
                    style={{ width: 150 }}
                    value={component.passingMarks}
                    onChange={(e) => setCreate((s) => ({
                      ...s,
                      components: s.components.map((item, itemIndex) => itemIndex === index ? { ...item, passingMarks: e.target.value.replace(/[^0-9]/g, "") } : item)
                    }))}
                    placeholder="Passing marks"
                  />
                  <button
                    className="btn"
                    type="button"
                    disabled={create.components.length <= 2}
                    onClick={() => setCreate((s) => ({ ...s, components: s.components.filter((_, itemIndex) => itemIndex !== index) }))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                onClick={() => setCreate((s) => ({ ...s, components: [...s.components, { subject: SUBJECT_OPTIONS[0], maxMarks: "", passingMarks: "" }] }))}
              >
                Add subject
              </button>
              <div className="muted">Entrance total: {entranceMaxMarks}</div>
            </div>
          </div>
        ) : null}
        {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Exam list</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <select
              className="select"
              style={{ width: 170 }}
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All classes</option>
              {[6, 7, 8, 9, 10].map((c) => (
                <option key={c} value={String(c)}>
                  Class {c}
                </option>
              ))}
            </select>
            <button className="btn" type="button" onClick={() => setClassFilter("")}>
              Clear
            </button>
          </div>
        </div>
        {loading ? (
          <div className="muted" style={{ padding: 16 }}>
            Loading...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="muted" style={{ padding: 16 }}>
            No exams found.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type / Subject</th>
                <th>Class</th>
                <th>Date</th>
                <th>Max</th>
                <th>Pass</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams.map((e) => {
                const hasEntries = (e.scoreCount ?? 0) > 0;
                return (
                  <tr key={e._id}>
                    <td style={{ fontWeight: 800 }}>{e.title}</td>
                    <td className="muted">
                      {e.examType === "ENTRANCE"
                        ? `Entrance: ${(e.components ?? []).map((component) => `${component.subject} ${component.maxMarks}/${component.passingMarks ?? 0}`).join(" + ")}`
                        : e.subject}
                    </td>
                    <td className="muted">{e.classLevel}</td>
                    <td className="muted">{e.date}</td>
                    <td className="muted">{e.maxMarks}</td>
                    <td className="muted">{e.passingMarks}</td>
                    <td>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <Link
                          className="btn primary"
                          style={hasEntries ? { background: "#15803d", borderColor: "#15803d" } : undefined}
                          title={hasEntries ? `${e.scoreCount} mark entries already saved` : "No marks entered yet"}
                          to={`/admin/exams/${e._id}/marks`}
                        >
                          Enter marks
                        </Link>
                        <button className="btn" type="button" onClick={() => setEditingExam(e)}>
                          Edit
                        </button>
                        <button className="btn danger" type="button" onClick={() => onDelete(e)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editingExam ? (
        <EditExamDialog
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSave={onUpdate}
        />
      ) : null}
    </div>
  );
}

function EditExamDialog({
  exam,
  onClose,
  onSave
}: {
  exam: Exam;
  onClose: () => void;
  onSave: (exam: Exam, form: ExamFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<ExamFormState>(() => formFromExam(exam));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entranceMaxMarks = useMemo(() => getEntranceMaxMarks(form), [form]);
  const canSave = useMemo(() => canSaveExam(form) && !saving, [form, saving]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(exam, form);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to update exam."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50
      }}
    >
      <div className="panel" style={{ width: "min(980px, 100%)", padding: 16, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Edit exam</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Update exam details for Class {exam.classLevel}.
            </div>
          </div>
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="row" style={{ marginTop: 14, flexWrap: "wrap" }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Title" />
          <select className="select" style={{ width: 190 }} value={form.examType} onChange={(e) => setForm((s) => ({ ...s, examType: e.target.value as ExamFormState["examType"] }))}>
            <option value="SINGLE">Single subject</option>
            <option value="ENTRANCE">Entrance test</option>
          </select>
          {form.examType === "SINGLE" ? (
            <select className="select" style={{ flex: 1, minWidth: 200 }} value={form.subject} onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}>
              {SUBJECT_OPTIONS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          ) : null}
          <select className="select" style={{ width: 140 }} value={form.classLevel} onChange={(e) => setForm((s) => ({ ...s, classLevel: e.target.value }))}>
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
            value={form.date}
            onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
            onFocus={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
          />
          <input
            className="input"
            style={{ width: 120 }}
            value={form.examType === "ENTRANCE" ? String(entranceMaxMarks || "") : form.maxMarks}
            onChange={(e) => setForm((s) => ({ ...s, maxMarks: e.target.value.replace(/[^0-9]/g, "") }))}
            disabled={form.examType === "ENTRANCE"}
            placeholder="Max marks"
          />
          <input className="input" style={{ width: 140 }} value={form.passingMarks} onChange={(e) => setForm((s) => ({ ...s, passingMarks: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Passing marks" />
        </div>

        {form.examType === "ENTRANCE" ? (
          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
              Total max marks is calculated from subject contributions.
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {form.components.map((component, index) => (
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }} key={index}>
                  <select
                    className="select"
                    style={{ flex: 1, minWidth: 220 }}
                    value={component.subject}
                    onChange={(e) => setForm((s) => ({
                      ...s,
                      components: s.components.map((item, itemIndex) => itemIndex === index ? { ...item, subject: e.target.value } : item)
                    }))}
                  >
                    {SUBJECT_OPTIONS.map((subject) => (
                      <option
                        key={subject}
                        value={subject}
                        disabled={form.components.some((item, itemIndex) => itemIndex !== index && item.subject === subject)}
                      >
                        {subject}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    style={{ width: 150 }}
                    value={component.maxMarks}
                    onChange={(e) => setForm((s) => ({
                      ...s,
                      components: s.components.map((item, itemIndex) => itemIndex === index ? { ...item, maxMarks: e.target.value.replace(/[^0-9]/g, "") } : item)
                    }))}
                    placeholder="Contribution"
                  />
                  <input
                    className="input"
                    style={{ width: 150 }}
                    value={component.passingMarks}
                    onChange={(e) => setForm((s) => ({
                      ...s,
                      components: s.components.map((item, itemIndex) => itemIndex === index ? { ...item, passingMarks: e.target.value.replace(/[^0-9]/g, "") } : item)
                    }))}
                    placeholder="Passing marks"
                  />
                  <button
                    className="btn"
                    type="button"
                    disabled={form.components.length <= 2}
                    onClick={() => setForm((s) => ({ ...s, components: s.components.filter((_, itemIndex) => itemIndex !== index) }))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                onClick={() => setForm((s) => ({ ...s, components: [...s.components, { subject: SUBJECT_OPTIONS[0], maxMarks: "", passingMarks: "" }] }))}
              >
                Add subject
              </button>
              <div className="muted">Entrance total: {entranceMaxMarks}</div>
            </div>
          </div>
        ) : null}

        {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}

        <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" type="button" disabled={!canSave} onClick={handleSave}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
