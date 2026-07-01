import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";

type Student = {
  _id: string;
  firstName: string;
  lastName?: string;
  classLevel: number;
  subjects?: string[];
  isActive?: boolean;
};

type AttendanceRecord = {
  _id: string;
  studentId: string;
  date: string;
  subject: string;
  mode: "ONLINE" | "OFFLINE";
  status: "PRESENT" | "ABSENT";
  student?: Student | null;
};

export function StartSessionPage() {
  const [searchParams] = useSearchParams();
  const classLevel = searchParams.get("class") || "8";
  const subject = searchParams.get("subject") || "Mathematics";
  const mode = searchParams.get("mode") || "MANUAL";

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [recognizedStudentId, setRecognizedStudentId] = useState<string>("");
  const [recognitionLoading, setRecognitionLoading] = useState(false);
  const [recognitionMessage, setRecognitionMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const date = new Date().toISOString().slice(0, 10);

  async function loadSession() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/attendance/session", {
        params: { date, classLevel, subject }
      });
      setStudents(res.data.students ?? []);
      setRecords(res.data.records ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load attendance session");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, [classLevel, subject]);

  const sessionRows = students.map((student) => {
    const record = records.find((r) => r.studentId === student._id);
    return { student, record };
  });

  async function mark(studentId: string, status: "PRESENT" | "ABSENT") {
    setSavingId(studentId);
    setError(null);
    try {
      const res = await api.post("/attendance/mark", { studentId, date, subject, mode: "ONLINE", status });
      const next = res.data.attendance as AttendanceRecord;
      setRecords((current) => {
        const remaining = current.filter((record) => record.studentId !== studentId);
        return [...remaining, next];
      });
      return true;
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to mark attendance");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function captureAndRecognize() {
    if (!videoRef.current || !canvasRef.current) {
      setRecognitionMessage("Camera is not available.");
      return;
    }

    setRecognitionLoading(true);
    setRecognitionMessage(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to capture image from camera.");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
      const res = await api.post("/attendance/recognize", {
        imageBase64,
        classLevel: Number(classLevel),
        subject
      });

      const match = res.data.match;
      if (!match) {
        setRecognitionMessage(res.data.message ?? "No student recognized.");
        setRecognizedStudentId("");
        return;
      }

      setRecognizedStudentId(match.studentId);
      const studentName = `${match.firstName} ${match.lastName ?? ""}`.trim();
      if (String(match.classLevel) !== String(classLevel)) {
        setRecognitionMessage(`${studentName} was recognized, but is not in Class ${classLevel}.`);
        return;
      }

      const enrolledStudent = students.find((student) => student._id === match.studentId);
      if (!enrolledStudent || !(enrolledStudent.subjects ?? []).includes(subject)) {
        setRecognitionMessage(`${studentName} was recognized, but is not enrolled for ${subject}.`);
        return;
      }

      const existingRecord = records.find((record) => record.studentId === match.studentId);
      if (existingRecord?.status === "PRESENT") {
        setRecognitionMessage(`${studentName} is already marked present.`);
        return;
      }

      setRecognitionMessage(`Recognized ${studentName}. Marking present...`);
      const marked = await mark(match.studentId, "PRESENT");
      if (marked) {
        setRecognitionMessage(`Recognized ${studentName}. Marked present automatically.`);
      }
    } catch (e: any) {
      setRecognitionMessage(e?.response?.data?.error?.message ?? e?.message ?? "Recognition failed.");
      setRecognizedStudentId("");
    } finally {
      setRecognitionLoading(false);
    }
  }

  useEffect(() => {
    if (mode !== "FACE") return;

    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setRecognitionMessage("Camera access is required for face recognition.");
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mode]);

  if (mode === "FACE") {
    const recognizedStudent = students.find((student) => student._id === recognizedStudentId);

    return (
      <div>
        <h2 style={{ marginTop: 18 }}>Face Recognition Attendance</h2>
        <div className="muted" style={{ marginTop: 6, marginBottom: 24 }}>
          Class {classLevel} · {subject} · {date} · Face Mode
        </div>

        {loading ? (
          <div className="muted">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="muted">No active students found for this class.</div>
        ) : (
          <div className="panel" style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
              Scan any student for Class {classLevel} · {subject}
            </div>
            <div className="muted" style={{ marginBottom: 24 }}>
              Face mode recognizes students in any order. Verified enrolled students are marked present automatically after scanning.
            </div>

            <div
              style={{
                width: 300,
                height: 300,
                background: "#000",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: 16,
                color: "#fff"
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div className="row" style={{ justifyContent: "center", gap: 12, marginBottom: 18 }}>
              <button
                className="btn primary"
                disabled={recognitionLoading || Boolean(savingId)}
                onClick={captureAndRecognize}
              >
                {recognitionLoading ? "Scanning..." : savingId ? "Marking..." : "Scan & Auto Mark"}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setRecognizedStudentId("");
                  setRecognitionMessage(null);
                }}
              >
                Reset
              </button>
            </div>

            {recognitionMessage ? (
              <div className="muted" style={{ marginBottom: 16 }}>
                {recognitionMessage}
              </div>
            ) : null}

            {recognizedStudent && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700 }}>
                  {recognizedStudent.firstName} {recognizedStudent.lastName ?? ""}
                </div>
                <div className="muted">Class {recognizedStudent.classLevel} · {subject}</div>
              </div>
            )}
          </div>
        )}

        {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
      </div>
    );
  }

  // Manual mode
  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Manual Attendance</h2>
      <div className="muted" style={{ marginTop: 6, marginBottom: 24 }}>
        Class {classLevel} · {subject} · {date} · Manual Mode
      </div>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="panel">
        {loading ? (
          <div style={{ padding: 16 }} className="muted">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: 16 }} className="muted">
            No active students found for this class and subject.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Current Status</th>
                <th>Mark Present</th>
                <th>Mark Absent</th>
              </tr>
            </thead>
            <tbody>
              {sessionRows.map(({ student, record }) => (
                <tr key={student._id}>
                  <td style={{ fontWeight: 800 }}>
                    {student.firstName} {student.lastName ?? ""}
                  </td>
                  <td className="muted">{student.classLevel}</td>
                  <td className="muted">{subject}</td>
                  <td>
                    {record ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: record.status === "PRESENT" ? "#ebf8ef" : "#fdeeee",
                          color: record.status === "PRESENT" ? "#22613a" : "#9a3131",
                          fontWeight: 800,
                          fontSize: 12
                        }}
                      >
                        {record.status}
                      </span>
                    ) : (
                      <span className="muted">Pending</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn primary"
                      disabled={savingId === student._id}
                      onClick={() => mark(student._id, "PRESENT")}
                    >
                      {savingId === student._id ? "Saving..." : "Present"}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn danger"
                      disabled={savingId === student._id}
                      onClick={() => mark(student._id, "ABSENT")}
                    >
                      {savingId === student._id ? "Saving..." : "Absent"}
                    </button>
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
