import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SUBJECT_OPTIONS } from "../constants/subjects";

export function AttendancePage() {
  const navigate = useNavigate();
  const [startSessionOpen, setStartSessionOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState("8");
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECT_OPTIONS[0]);
  const [selectedMode, setSelectedMode] = useState<"MANUAL" | "FACE">("MANUAL");

  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Attendance</h2>
      <div className="muted" style={{ marginTop: 6, marginBottom: 24 }}>
        Manage student attendance for your institute.
      </div>

      <div className="row" style={{ gap: 24, flexWrap: "wrap" }}>
        <div className="panel" style={{ flex: 1, minWidth: 300, padding: 24, cursor: "pointer" }} onClick={() => navigate("/attendance/records")}>
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>📊 Attendance Records</div>
          <div className="muted">View and manage historical attendance data for all classes.</div>
        </div>

        <div className="panel" style={{ flex: 1, minWidth: 300, padding: 24, cursor: "pointer" }} onClick={() => setStartSessionOpen(true)}>
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>🚀 Start Session</div>
          <div className="muted">Begin a new attendance session for a class using manual or face recognition.</div>
        </div>
      </div>

      {startSessionOpen && (
        <StartSessionDialog
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          onClose={() => setStartSessionOpen(false)}
          onStart={() => {
            navigate(`/attendance/start?class=${selectedClass}&subject=${encodeURIComponent(selectedSubject)}&mode=${selectedMode}`);
            setStartSessionOpen(false);
          }}
        />
      )}
    </div>
  );
}

function StartSessionDialog({
  selectedClass,
  setSelectedClass,
  selectedSubject,
  setSelectedSubject,
  selectedMode,
  setSelectedMode,
  onClose,
  onStart
}: {
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  selectedSubject: string;
  setSelectedSubject: (value: string) => void;
  selectedMode: "MANUAL" | "FACE";
  setSelectedMode: (value: "MANUAL" | "FACE") => void;
  onClose: () => void;
  onStart: () => void;
}) {
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
      <div className="panel" style={{ width: "min(500px, 100%)", padding: 24 }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Start Attendance Session</div>
        <div className="muted" style={{ marginBottom: 20 }}>
          Select class and mode to begin marking attendance.
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Class</div>
          <select
            className="select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{ width: "100%" }}
          >
            {[6, 7, 8, 9, 10].map((level) => (
              <option key={level} value={String(level)}>
                Class {level}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Subject</div>
          <select
            className="select"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{ width: "100%" }}
          >
            {SUBJECT_OPTIONS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Mode</div>
          <div className="row" style={{ gap: 12 }}>
            <label style={{ flex: 1 }}>
              <input
                type="radio"
                name="mode"
                value="MANUAL"
                checked={selectedMode === "MANUAL"}
                onChange={(e) => setSelectedMode(e.target.value as "MANUAL")}
              />
              <span style={{ marginLeft: 8 }}>Manual</span>
            </label>
            <label style={{ flex: 1 }}>
              <input
                type="radio"
                name="mode"
                value="FACE"
                checked={selectedMode === "FACE"}
                onChange={(e) => setSelectedMode(e.target.value as "FACE")}
              />
              <span style={{ marginLeft: 8 }}>Face Recognition</span>
            </label>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end", gap: 12 }}>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={onStart}>
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}
