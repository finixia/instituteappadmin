import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

type Student = { _id: string; firstName: string; lastName?: string; classLevel: number };
type Plan = { _id: string; name: string; totalAmount: number };

export function FeeAccountsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [create, setCreate] = useState({ studentId: "", planId: "", startDate: "" });
  const canCreate = useMemo(() => create.studentId.length > 0 && create.planId.length > 0, [create]);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, pRes] = await Promise.all([api.get("/students"), api.get("/fees/plans")]);
        setStudents(sRes.data.students ?? []);
        setPlans(pRes.data.plans ?? []);
      } catch (e: any) {
        setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load");
      }
    })();
  }, []);

  async function onCreate() {
    setError(null);
    try {
      await api.post("/fees/accounts", {
        studentId: create.studentId,
        planId: create.planId,
        startDate: create.startDate || undefined
      });
      setError("Fee account created. Open student in mobile parent view to see installments.");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to create fee account");
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Fee Accounts</h2>
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Create fee account</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <select className="select" style={{ flex: 1, minWidth: 260 }} value={create.studentId} onChange={(e) => setCreate((s) => ({ ...s, studentId: e.target.value }))}>
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.firstName} {s.lastName ?? ""} (Class {s.classLevel})
              </option>
            ))}
          </select>
          <select className="select" style={{ flex: 1, minWidth: 260 }} value={create.planId} onChange={(e) => setCreate((s) => ({ ...s, planId: e.target.value }))}>
            <option value="">Select fee plan</option>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} (₹{p.totalAmount})
              </option>
            ))}
          </select>
          <input className="input" style={{ width: 160 }} placeholder="Start YYYY-MM-DD" value={create.startDate} onChange={(e) => setCreate((s) => ({ ...s, startDate: e.target.value }))} />
          <button className="btn primary" disabled={!canCreate} onClick={onCreate}>
            Create
          </button>
        </div>
        {error ? (
          <div style={{ marginTop: 10 }} className={error.startsWith("Fee account created") ? "muted" : "error"}>
            {error}
          </div>
        ) : null}
        <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          Next: add list/search of accounts, mark installment paid, and automated reminders.
        </div>
      </div>
    </div>
  );
}

