import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { SUBJECT_OPTIONS } from "../constants/subjects";

type Student = {
  _id: string;
  firstName: string;
  lastName?: string;
  classLevel: number;
  subjects: string[];
  parentPhones: string[];
  isActive: boolean;
  admissionDate?: string;
};

type StudentFormState = {
  firstName: string;
  lastName: string;
  classLevel: string;
  subjects: string[];
  parentPhones: string;
  admissionDate: string;
};

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentLoginFor, setParentLoginFor] = useState<Student | null>(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [q, setQ] = useState("");
  const [classLevel, setClassLevel] = useState<string>("");

  const [create, setCreate] = useState<StudentFormState>({ firstName: "", lastName: "", classLevel: "8", subjects: ["Mathematics"], parentPhones: "9999999999", admissionDate: "" });
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const canCreate = useMemo(() => create.firstName.trim().length > 0 && create.parentPhones.trim().length > 0 && create.subjects.length > 0, [create]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (q.trim()) params.q = q.trim();
      if (classLevel) params.classLevel = classLevel;
      const res = await api.get("/students", { params });
      setStudents(res.data.students ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [q, classLevel]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate() {
    setError(null);
    try {
      const payload = {
        firstName: create.firstName.trim(),
        lastName: create.lastName.trim() || undefined,
        classLevel: Number(create.classLevel),
        subjects: create.subjects,
        parentPhones: create.parentPhones.split(",").map((s) => s.trim()).filter(Boolean),
        admissionDate: create.admissionDate || new Date().toISOString().slice(0, 10)
      };
      const res = await api.post("/students", payload);
      const studentId = res.data.student?._id;
      
      // Enroll face if provided
      if (faceImage && studentId) {
        try {
          await api.post(`/students/${studentId}/enroll-face`, {
            imageBase64: faceImage
          });
        } catch (faceErr: any) {
          console.error("Face enrollment failed:", faceErr);
          // Don't fail the student creation if face enrollment fails
        }
      }
      
      setCreate({ firstName: "", lastName: "", classLevel: create.classLevel, subjects: create.subjects, parentPhones: create.parentPhones, admissionDate: "" });
      setFaceImage(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to create");
    }
  }

  async function onUpdate(id: string) {
    setError(null);
    try {
      const payload = {
        firstName: create.firstName.trim(),
        lastName: create.lastName.trim() || undefined,
        classLevel: Number(create.classLevel),
        subjects: create.subjects,
        parentPhones: create.parentPhones.split(",").map((s) => s.trim()).filter(Boolean),
        admissionDate: create.admissionDate || new Date().toISOString().slice(0, 10)
      };
      await api.patch(`/students/${id}`, payload);
      
      // Enroll face if provided
      if (faceImage) {
        try {
          await api.post(`/students/${id}/enroll-face`, {
            imageBase64: faceImage
          });
        } catch (faceErr: any) {
          console.error("Face enrollment failed:", faceErr);
        }
      }
      
      setCreate({ firstName: "", lastName: "", classLevel: create.classLevel, subjects: create.subjects, parentPhones: create.parentPhones, admissionDate: "" });
      setFaceImage(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to update");
    }
  }

  async function handleDelete(student: Student) {
    if (!confirm(`Delete ${student.firstName}?`)) return;
    try {
      await api.delete(`/students/${student._id}`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to delete");
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Students</h2>
      <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="row" style={{ flex: 1, minWidth: 320 }}>
            <input className="input" placeholder="Search by first name" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="select" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="">All classes</option>
              {[6, 7, 8, 9, 10].map((c) => (
                <option key={c} value={String(c)}>
                  Class {c}
                </option>
              ))}
            </select>
            <button className="btn" onClick={load}>
              Refresh
            </button>
          </div>
          <button className="btn primary" onClick={() => setStudentModalOpen(true)}>
            Add Student
          </button>
        </div>
        {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}
      </div>

      <div className="panel">
        {loading ? (
          <div style={{ padding: 16 }} className="muted">
            Loading...
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: 16 }} className="muted">
            No students found.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Class</th>
                <th>Subjects</th>
                <th>Status</th>
                <th>Parents</th>
                <th style={{ width: 180 }}>Parent Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id}>
                  <td>
                    <Link to={`/students/${s._id}`} style={{ fontWeight: 800 }}>
                      {s.firstName} {s.lastName ?? ""}
                    </Link>
                  </td>
                  <td className="muted">{s.classLevel}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(s.subjects ?? []).map((subject) => (
                        <span
                          key={subject}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: "#eef4ff",
                            color: "#1e3a8a",
                            fontSize: 12,
                            fontWeight: 700
                          }}
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="muted">{s.isActive ? "Active" : "Inactive"}</td>
                  <td className="muted">{(s.parentPhones ?? []).join(", ")}</td>
                  <td>
                    <button className="btn primary" onClick={() => setParentLoginFor(s)}>
                      Create Parent Login
                    </button>
                  </td>
                  <td>
                    <button className="btn" onClick={() => setEditingStudent(s)} title="Edit">✏️</button>
                    <button className="btn danger" onClick={() => handleDelete(s)} title="Delete" style={{ marginLeft: 8 }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {parentLoginFor ? (
        <CreateParentLoginDialog
          student={parentLoginFor}
          onClose={() => setParentLoginFor(null)}
        />
      ) : null}

      {studentModalOpen || editingStudent ? (
        <CreateStudentDialog
          student={editingStudent}
          create={create}
          setCreate={setCreate}
          faceImage={faceImage}
          setFaceImage={setFaceImage}
          canCreate={canCreate}
          onClose={() => { setStudentModalOpen(false); setEditingStudent(null); setFaceImage(null); }}
          onCreate={async () => {
            if (editingStudent) {
              await onUpdate(editingStudent._id);
            } else {
              await onCreate();
            }
            setStudentModalOpen(false);
            setEditingStudent(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CreateStudentDialog({
  student,
  create,
  setCreate,
  faceImage,
  setFaceImage,
  canCreate,
  onClose,
  onCreate
}: {
  student?: Student | null;
  create: StudentFormState;
  setCreate: React.Dispatch<React.SetStateAction<StudentFormState>>;
  faceImage: string | null;
  setFaceImage: (image: string | null) => void;
  canCreate: boolean;
  onClose: () => void;
  onCreate: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const admissionDateRef = React.useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);

  useEffect(() => {
    if (student) {
      setCreate({
        firstName: student.firstName,
        lastName: student.lastName || "",
        classLevel: String(student.classLevel),
        subjects: student.subjects?.length ? student.subjects : ["Mathematics"],
        parentPhones: (student.parentPhones || []).map(p => p).join(", "),
        admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().slice(0, 10) : ""
      });
    }
  }, [student, setCreate]);

  function toggleSubject(subject: string) {
    setCreate((current) => {
      const hasSubject = current.subjects.includes(subject);
      return {
        ...current,
        subjects: hasSubject ? current.subjects.filter((item) => item !== subject) : [...current.subjects, subject]
      };
    });
  }

  async function handleCreate() {
    setSaving(true);
    try {
      await onCreate();
    } finally {
      setSaving(false);
    }
  }

  function startCamera() {
    setFaceError(null);
    setShowCamera(true);
  }

  function capturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL("image/jpeg");
        setFaceImage(imageData);
        stopCamera();
      }
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  }

  function handleFaceUpload(event: React.ChangeEvent<HTMLInputElement>) {
    setFaceError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setFaceImage((evt.target?.result as string) ?? null);
    };
    reader.onerror = () => {
      setFaceError("Failed to read the selected image.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

  function openAdmissionDatePicker() {
    const input = admissionDateRef.current;
    if (!input) return;
    input.focus();
    if ("showPicker" in input) {
      input.showPicker();
    }
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  useEffect(() => {
    if (!showCamera) return;

    let cancelled = false;

    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        setFaceError("Failed to access camera");
        setShowCamera(false);
      }
    }

    enableCamera();

    return () => {
      cancelled = true;
    };
  }, [showCamera]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
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
      <div className="panel" style={{ width: "min(920px, 100%)", padding: 16, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{student ? "Edit Student" : "Add Student"}</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {student ? "Update student profile and face enrollment." : "Create a student profile with face enrollment."}
            </div>
          </div>
          <button className="btn" onClick={handleClose}>
            Close
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 12, marginTop: 14 }}>
          <div style={{ gridColumn: "span 3", minWidth: 0 }}>
            <input className="input" placeholder="First name" value={create.firstName} onChange={(e) => setCreate((s) => ({ ...s, firstName: e.target.value }))} />
          </div>
          <div style={{ gridColumn: "span 3", minWidth: 0 }}>
            <input className="input" placeholder="Last name" value={create.lastName} onChange={(e) => setCreate((s) => ({ ...s, lastName: e.target.value }))} />
          </div>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <select className="select" value={create.classLevel} onChange={(e) => setCreate((s) => ({ ...s, classLevel: e.target.value }))}>
              {[6, 7, 8, 9, 10].map((c) => (
                <option key={c} value={String(c)}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "span 4", minWidth: 0 }}>
            <input className="input" placeholder="Parent phones (comma-separated)" value={create.parentPhones} onChange={(e) => setCreate((s) => ({ ...s, parentPhones: e.target.value }))} />
          </div>
          <div style={{ gridColumn: "span 4", minWidth: 0 }}>
            <div className="muted" style={{ marginBottom: 6 }}>Admission Date</div>
            <div className="row" style={{ gap: 8 }}>
              <input
                ref={admissionDateRef}
                className="input"
                type="date"
                value={create.admissionDate}
                onClick={openAdmissionDatePicker}
                onChange={(e) => setCreate((s) => ({ ...s, admissionDate: e.target.value }))}
              />
              <button className="btn" type="button" onClick={openAdmissionDatePicker} aria-label="Open admission date picker">
                📅
              </button>
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
            <div className="muted" style={{ marginBottom: 8 }}>Subjects</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SUBJECT_OPTIONS.map((subject) => {
                const active = create.subjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    className="btn"
                    onClick={() => toggleSubject(subject)}
                    style={{
                      background: active ? "#e8f0ff" : undefined,
                      borderColor: active ? "#2f5bea" : undefined,
                      color: active ? "#163082" : undefined
                    }}
                  >
                    {active ? "✓ " : ""}{subject}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, borderTop: "1px solid #e0e0e0", paddingTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Face Enrollment</div>
          
          {!faceImage ? (
            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={startCamera} disabled={showCamera}>
                📷 Capture Face
              </button>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleFaceUpload}
                style={{ display: "none" }}
              />
              <button className="btn" type="button" onClick={() => uploadInputRef.current?.click()}>
                📁 Upload Image
              </button>
            </div>
          ) : (
            <div>
              <img src={faceImage} alt="Captured face" style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: 8, marginBottom: 12 }} />
              <button className="btn" onClick={() => setFaceImage(null)}>
                Clear
              </button>
            </div>
          )}

          {showCamera && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  position: "relative",
                  width: "min(100%, 420px)",
                  aspectRatio: "4 / 3",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#0f172a",
                  border: "2px solid #cbd5e1",
                  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
                  marginBottom: 12
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: "12% 18%",
                    border: "2px dashed rgba(255,255,255,0.9)",
                    borderRadius: 20,
                    boxShadow: "0 0 0 999px rgba(15, 23, 42, 0.22)"
                  }}
                />
              </div>
              <div className="muted" style={{ marginBottom: 12 }}>
                Keep the face inside the highlighted frame, then click Capture.
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" onClick={capturePhoto}>
                  Capture
                </button>
                <button className="btn" onClick={stopCamera}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {faceError ? (
            <div className="error" style={{ marginTop: 8 }}>
              {faceError}
            </div>
          ) : null}
        </div>

        <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          Parent login is created separately from the `Create Parent Login` button in the student row.
        </div>

        <div className="row" style={{ justifyContent: "flex-end", marginTop: 16, gap: 8 }}>
          <button className="btn" onClick={handleClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!canCreate || saving} onClick={handleCreate}>
            {saving ? (student ? "Updating..." : "Creating...") : (student ? "Update Student" : "Create Student")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateParentLoginDialog({
  student,
  onClose
}: {
  student: Student;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.includes("@") && password.length >= 8 && !saving, [email, password, saving]);

  async function onCreate() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await api.post("/auth/users", {
        email,
        password,
        role: "PARENT",
        linkedStudentIds: [student._id]
      });
      setSuccess(`Created parent user: ${res.data.user?.email ?? email}`);
      setEmail("");
      setPassword("");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to create parent login");
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
      <div className="panel" style={{ width: "min(720px, 100%)", padding: 16 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Create Parent Login</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Student: {student.firstName} {student.lastName ?? ""} · Class {student.classLevel}
            </div>
          </div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 14 }} className="row">
          <div style={{ flex: 1 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Parent email
            </div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@example.com" autoComplete="email" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Temporary password (min 8 chars)
            </div>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="e.g. parent12345" autoComplete="new-password" />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button className="btn primary" disabled={!canSubmit} onClick={onCreate}>
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="error" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="muted" style={{ marginTop: 10 }}>
            {success}. Share the email/password with the parent to log in on the mobile app.
          </div>
        ) : null}
      </div>
    </div>
  );
}
