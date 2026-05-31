import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";

type Student = { _id: string; firstName: string; lastName?: string; classLevel: number };
type Plan = { _id: string; name: string; totalAmount: number };

type Account = { _id: string; studentId: string; planId: string; startDate: string };

export function FeeAccountsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [create, setCreate] = useState({ studentId: "", planId: "", startDate: todayStr });
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const canCreate = useMemo(() => create.studentId.length > 0 && create.planId.length > 0, [create]);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [sRes, pRes, aRes] = await Promise.all([api.get("/students"), api.get("/fees/plans"), api.get("/fees/accounts")]);
        setStudents(sRes.data.students ?? []);
        setPlans(pRes.data.plans ?? []);
        setAccounts(aRes.data.accounts ?? []);
      } catch (e: any) {
        setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load");
      }
    })();
  }, []);

  async function onCreate() {
    setError(null);
    try {
      if (editingAccountId) {
        await api.put(`/fees/accounts/${editingAccountId}`, {
          planId: create.planId,
          startDate: create.startDate || undefined
        });
        setEditingAccountId(null);
      } else {
        await api.post("/fees/accounts", {
          studentId: create.studentId,
          planId: create.planId,
          startDate: create.startDate || undefined
        });
      }
      setError("Fee account created. Open student in mobile parent view to see installments.");
      // refresh accounts list
      const aRes = await api.get("/fees/accounts");
      setAccounts(aRes.data.accounts ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to create fee account");
    }
  }

  function onEditAccount(acc: Account) {
    setEditingAccountId(acc._id);
    setCreate({ studentId: acc.studentId, planId: acc.planId, startDate: acc.startDate });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onCancelEdit() {
    setEditingAccountId(null);
    setCreate({ studentId: '', planId: '', startDate: todayStr });
  }

  const enrichedAccounts = useMemo(() => {
    return accounts.map((acc) => {
      const student = students.find((s) => s._id === String(acc.studentId));
      const plan = plans.find((p) => p._id === String(acc.planId));
      return {
        ...acc,
        studentName: student ? `${student.firstName} ${student.lastName ?? ""}`.trim() : "(deleted)",
        classLevel: student?.classLevel ?? null,
        planName: plan?.name ?? "(deleted)"
      } as Account & { studentName: string; classLevel: number | null; planName: string };
    });
  }, [accounts, students, plans]);

  const filteredAccounts = useMemo(() => {
    return enrichedAccounts.filter((acc) => {
      if (classFilter) {
        if (String(acc.classLevel) !== String(classFilter)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          acc.studentName.toLowerCase().includes(q) ||
          acc.planName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedAccounts, search, classFilter]);

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
          <div style={{ display: 'inline-block' }} onClick={() => { (dateInputRef.current as any)?.showPicker?.() || dateInputRef.current?.focus(); }}>
            <input ref={dateInputRef} className="input" style={{ width: 160 }} type="date" value={create.startDate} onChange={(e) => setCreate((s) => ({ ...s, startDate: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" disabled={!canCreate} onClick={onCreate}>
              {editingAccountId ? 'Save' : 'Create'}
            </button>
            {editingAccountId ? (
              <button className="btn" onClick={onCancelEdit}>Cancel</button>
            ) : null}
          </div>
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

      <div style={{ height: 20 }} />

      <div className="panel" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Assigned fee accounts</div>
        <div className="row" style={{ gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input className="input" placeholder="Search student or plan" style={{ flex: 1 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" style={{ width: 160 }} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All classes</option>
            {[6,7,8,9,10].map((c) => (
              <option key={c} value={String(c)}>Class {c}</option>
            ))}
          </select>
          <button className="btn" onClick={() => { setSearch(''); setClassFilter(''); }}>Clear</button>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="muted">No accounts found.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Plan</th>
                <th>Start</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((a) => (
                <tr key={a._id}>
                  <td style={{ fontWeight: 800 }}>{(a as any).studentName}</td>
                  <td className="muted">{(a as any).classLevel}</td>
                  <td className="muted">{(a as any).planName}</td>
                  <td className="muted">{a.startDate}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn" onClick={() => onEditAccount(a)}>Edit</button>
                    </div>
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

